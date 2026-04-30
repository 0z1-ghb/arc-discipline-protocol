import os
import time
import json
import logging
import requests
from datetime import datetime, timezone

from dotenv import load_dotenv
from web3 import Web3

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# Ayarlar (.env'den okunur)
# ---------------------------------------------------------------------------

OFFLINE_MODE = os.getenv("OFFLINE_MODE", "true").lower() == "true"
RPC_URL = os.getenv("RPC_URL", "https://rpc.arc.network")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0xYourContractAddressHere")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
PENALTY_ADDRESS = os.getenv("PENALTY_ADDRESS", "0xYourPenaltyAddressHere")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

MIN_LINES = int(os.getenv("MIN_LINES", "10"))
MAX_LINES = int(os.getenv("MAX_LINES", "30"))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("agent.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ABI Yükleme
# ---------------------------------------------------------------------------

ABI_PATH = os.path.join(os.path.dirname(__file__), "contract_abi.json")
if os.path.exists(ABI_PATH):
    with open(ABI_PATH, "r") as f:
        CONTRACT_ABI = json.load(f)
else:
    CONTRACT_ABI = []

# ---------------------------------------------------------------------------
# Web3 Bağlantısı
# ---------------------------------------------------------------------------

def connect_web3():
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        raise ConnectionError(f"RPC bağlantısı kurulamadı: {RPC_URL}")
    logger.info(f"RPC bağlandı: {RPC_URL}")
    return w3

# ---------------------------------------------------------------------------
# Blockchain İşlemleri
# ---------------------------------------------------------------------------

def get_latest_pending_id(w3) -> int:
    """Blockchain'den en son bekleyen (pending) görev ID'sini bulur."""
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    try:
        total = contract.functions.commitmentCount().call()
        if total == 0:
            return 0
        
        # Sondan başa doğru kontrol et
        for i in range(total, 0, -1):
            status = contract.functions.getCommitment(i).call()
            # status: user, amount, goal, githubUsername, completed, failed, refunded
            # index 4: completed, index 5: failed
            if not status[4] and not status[5]:
                return i
        return 0
    except Exception as e:
        logger.error(f"ID bulma hatası: {e}")
        return 0

def call_complete_task(w3, commitment_id):
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    account = w3.eth.account.from_key(PRIVATE_KEY)
    nonce = w3.eth.get_transaction_count(account.address)
    
    tx = contract.functions.completeTask(commitment_id).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "chainId": w3.eth.chain_id,
    })
    
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    if receipt.status == 1:
        logger.info(f"completeTask başarılı! TX: {receipt.transactionHash.hex()}")
    else:
        logger.error(f"completeTask başarısız! TX: {receipt.transactionHash.hex()}")
    return receipt.transactionHash.hex()

# ---------------------------------------------------------------------------
# GitHub Doğrulama
# ---------------------------------------------------------------------------

def check_github_commit(username: str) -> bool:
    """
    Kullanıcının bugün 10-30 satır arası değişiklik içeren bir commit atıp atmadığını kontrol eder.
    """
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN ayarlanmamış. Kontrol atlanıyor.")
        return False

    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    url = f"https://api.github.com/users/{username}/events"
    
    try:
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            logger.error(f"GitHub API hatası: {resp.status_code}")
            return False
        
        events = resp.json()
        for event in events:
            if event['type'] == 'PushEvent':
                created_at = event['created_at'][:10] # YYYY-MM-DD
                
                if created_at == today:
                    commits = event['payload'].get('commits', [])
                    
                    # GitHub API bazen commits listesini payload'da vermez, sadece 'head' SHA'sini verir.
                    if not commits and 'head' in event['payload']:
                        logger.info("Payload'da commit listesi yok, 'head' SHA kullaniliyor.")
                        commits = [{'sha': event['payload']['head']}]
                    
                    for commit in commits:
                        sha = commit['sha']
                        repo_full_name = event['repo']['name'] # owner/repo
                        
                        try:
                            owner, repo_name = repo_full_name.split('/')
                            commit_url = f"https://api.github.com/repos/{owner}/{repo_name}/commits/{sha}"
                            commit_resp = requests.get(commit_url, headers=headers)
                            
                            if commit_resp.status_code == 200:
                                commit_data = commit_resp.json()
                                stats = commit_data.get('stats', {})
                                total_changes = stats.get('total', 0)
                                
                                if MIN_LINES <= total_changes <= MAX_LINES:
                                    logger.info(f"Geçerli commit bulundu! SHA: {sha}, Satır: {total_changes}")
                                    return True
                                else:
                                    logger.info(f"Commit bulundu ama satır sayısı ({total_changes}) aralık dışında [{MIN_LINES}-{MAX_LINES}]")
                        except Exception as e:
                            logger.warning(f"Commit detayları alınamadı: {e}")
                            continue
        return False
    except Exception as e:
        logger.error(f"GitHub kontrol hatası: {e}")
        return False

# ---------------------------------------------------------------------------
# Ana Döngü
# ---------------------------------------------------------------------------

def main():
    logger.info("=" * 60)
    logger.info("Discipline Protocol - GitHub Validator Agent")
    if OFFLINE_MODE:
        logger.info("MOD: OFFLINE (Sadece simülasyon)")
    logger.info("=" * 60)
    
    w3 = None
    if not OFFLINE_MODE:
        w3 = connect_web3()
    
    logger.info(f"Kontrol periyodu: 60 saniye. Min Satır: {MIN_LINES}, Max Satır: {MAX_LINES}")
    
    while True:
        try:
            if w3:
                commitment_id = get_latest_pending_id(w3)
                
                if commitment_id > 0:
                    logger.info(f"Bekleyen görev bulundu: ID {commitment_id}")
                    
                    # GitHub kullanıcı adını al
                    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
                    status = contract.functions.getCommitment(commitment_id).call()
                    username = status[3] # githubUsername
                    
                    logger.info(f"GitHub aktivitesi kontrol ediliyor: {username}")
                    
                    if check_github_commit(username):
                        if OFFLINE_MODE:
                            logger.info("[OFFLINE] completeTask çağrılırdı.")
                        else:
                            call_complete_task(w3, commitment_id)
                    else:
                        logger.info("Bugün için geçerli commit bulunamadı.")
                else:
                    logger.info("Bekleyen görev yok.")
            else:
                logger.info("Offline mod: Blockchain kontrolü yapılmıyor.")
            
            time.sleep(60) # Her dakika kontrol et
            
        except KeyboardInterrupt:
            logger.info("Agent durduruluyor...")
            break
        except Exception as e:
            logger.error(f"Döngü hatası: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()
