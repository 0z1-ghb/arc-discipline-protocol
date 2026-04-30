"""
Discipline Protocol - AI Validator Agent

Bu script, kullanıcının günlük çalışma dosyasını izler ve
hedefe ulaşıldığında Arc Network üzerindeki akıllı kontratı
tetikleyerek görevi tamamlar.

Kullanim:
    python agent/validator.py
"""

import os
import time
import json
import logging
from datetime import datetime

from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from web3 import Web3

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# Ayarlar (.env'den okunur, yoksa varsayılan değerler kullanılır)
# ---------------------------------------------------------------------------

OFFLINE_MODE = os.getenv("OFFLINE_MODE", "true").lower() == "true"
RPC_URL = os.getenv("RPC_URL", "https://rpc.arc.network")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0xYourContractAddressHere")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
PENALTY_ADDRESS = os.getenv("PENALTY_ADDRESS", "0xYourPenaltyAddressHere")

# Izlenecek klasör yolu
WATCH_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# Dosya adi
TARGET_FILE = "daily_study.txt"

# Hedef kelime sayisi
WORD_COUNT_THRESHOLD = 100

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("agent.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Kontrat ABI (DisciplineProtocol.sol derlendikten sonra buraya yapistirilacak)
# ---------------------------------------------------------------------------

# Kontrat ABI (deploy veya mock_test sonrasi otomatik olusur)
ABI_PATH = os.path.join(os.path.dirname(__file__), "contract_abi.json")

if os.path.exists(ABI_PATH):
    with open(ABI_PATH, "r") as f:
        CONTRACT_ABI = json.load(f)
else:
    CONTRACT_ABI = [
        {
            "inputs": [{"internalType": "uint256", "name": "_commitmentId", "type": "uint256"}],
            "name": "completeTask",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "uint256", "name": "_commitmentId", "type": "uint256"}],
            "name": "failTask",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "uint256", "name": "_commitmentId", "type": "uint256"}],
            "name": "getCommitment",
            "outputs": [
                {"internalType": "address", "name": "user", "type": "address"},
                {"internalType": "uint256", "name": "amount", "type": "uint256"},
                {"internalType": "string", "name": "goal", "type": "string"},
                {"internalType": "bool", "name": "completed", "type": "bool"},
                {"internalType": "bool", "name": "failed", "type": "bool"},
                {"internalType": "bool", "name": "refunded", "type": "bool"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
    ]

# ---------------------------------------------------------------------------
# Web3 baglantisi
# ---------------------------------------------------------------------------


def connect_web3() -> Web3:
    """Arc Network RPC'ye baglanir ve Web3 instance dondurur."""
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        raise ConnectionError(f"RPC baglantisi kurulamadi: {RPC_URL}")
    logger.info(f"RPC baglantisi kuruldu: {RPC_URL}")
    return w3


# ---------------------------------------------------------------------------
# Dosya dogrulama
# ---------------------------------------------------------------------------


def validate_study_file(file_path: str) -> bool:
    """
    Dosyayi dogrular:
    - Bugun guncellenmis olmali
    - Kelime sayisi esik degerin uzerinde olmali

    Returns:
        bool: Dosya hedefi karsiliyorsa True
    """
    if not os.path.exists(file_path):
        logger.warning(f"Dosya bulunamadi: {file_path}")
        return False

    # Son degisiklik tarihini kontrol et
    mtime = os.path.getmtime(file_path)
    modified_date = datetime.fromtimestamp(mtime).date()
    today = datetime.now().date()

    if modified_date != today:
        logger.info(f"Dosya bugun guncellenmemis. Son degisiklik: {modified_date}")
        return False

    # Kelime sayisini hesapla
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        word_count = len(content.split())

    logger.info(f"Kelime sayisi: {word_count} (esik: {WORD_COUNT_THRESHOLD})")

    if word_count > WORD_COUNT_THRESHOLD:
        logger.info("SUCCESS: Hedef karsilandi!")
        return True

    logger.info(f"FAIL: Kelime sayisi esik degerin altinda ({word_count}/{WORD_COUNT_THRESHOLD})")
    return False


# ---------------------------------------------------------------------------
# On-chain islemler
# ---------------------------------------------------------------------------


def call_complete_task(w3: Web3, commitment_id: int) -> str:
    """
    Akıllı kontratta completeTask fonksiyonunu cagirir.

    Args:
        w3: Web3 instance
        commitment_id: Tamamlanan taahhut ID'si

    Returns:
        str: Islem hash'i
    """
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

    # Validator hesabini hazirla
    account = w3.eth.account.from_key(PRIVATE_KEY)

    # Nonce al
    nonce = w3.eth.get_transaction_count(account.address)

    # Islemi olustur
    tx = contract.functions.completeTask(commitment_id).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "chainId": w3.eth.chain_id,
    })

    # Islemi imzala ve gonder
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    # Onay bekle
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        logger.info(f"completeTask basarili! TX: {receipt.transactionHash.hex()}")
    else:
        logger.error(f"completeTask basarisiz! TX: {receipt.transactionHash.hex()}")

    return receipt.transactionHash.hex()


def call_fail_task(w3: Web3, commitment_id: int) -> str:
    """
    Akıllı kontratta failTask fonksiyonunu cagirir.

    Args:
        w3: Web3 instance
        commitment_id: Basarisiz taahhut ID'si

    Returns:
        str: Islem hash'i
    """
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

    account = w3.eth.account.from_key(PRIVATE_KEY)
    nonce = w3.eth.get_transaction_count(account.address)

    tx = contract.functions.failTask(commitment_id).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "chainId": w3.eth.chain_id,
    })

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        logger.info(f"failTask basarili! TX: {receipt.transactionHash.hex()}")
    else:
        logger.error(f"failTask basarisiz! TX: {receipt.transactionHash.hex()}")

    return receipt.transactionHash.hex()


# ---------------------------------------------------------------------------
# Dosya izleyici (Watchdog)
# ---------------------------------------------------------------------------


class StudyFileHandler(FileSystemEventHandler):
    """daily_study.txt dosyasindaki degisiklikleri izler."""

    def __init__(self, w3, commitment_id: int, offline: bool = False):
        self.w3 = w3
        self.commitment_id = commitment_id
        self.offline = offline
        self.last_processed = 0
        super().__init__()

    def on_modified(self, event):
        if event.is_directory:
            return

        file_path = os.path.abspath(event.src_path)
        target_path = os.path.abspath(os.path.join(WATCH_DIR, TARGET_FILE))

        if file_path != target_path:
            return

        now = time.time()
        if now - self.last_processed < 1:
            return
        self.last_processed = now

        logger.info(f"Dosya degisikligi algilandi: {file_path}")

        is_success = validate_study_file(file_path)

        if is_success:
            if self.offline:
                logger.info("[OFFLINE] completeTask cagirilirdi. TX gonderilmedi.")
            else:
                try:
                    tx_hash = call_complete_task(self.w3, self.commitment_id)
                    logger.info(f"Hedef tamamlandi! TX: {tx_hash}")
                except Exception as e:
                    logger.error(f"On-chain islem hatasi: {e}")
        else:
            if self.offline:
                logger.info("[OFFLINE] failTask cagirilirdi. TX gonderilmedi.")
            logger.info("Hedef karsilanmadi. Bekleniyor...")


# ---------------------------------------------------------------------------
# Ana calistirma
# ---------------------------------------------------------------------------


def main():
    """AI ajanini baslatir ve dosyayi izlemeye baslar."""
    logger.info("=" * 60)
    logger.info("Discipline Protocol - AI Validator Agent baslatiliyor")
    if OFFLINE_MODE:
        logger.info("MOD: OFFLINE (RPC baglantisi yapilmayacak)")
    logger.info("=" * 60)

    w3 = None
    if not OFFLINE_MODE:
        w3 = connect_web3()

    target_path = os.path.join(WATCH_DIR, TARGET_FILE)
    os.makedirs(WATCH_DIR, exist_ok=True)

    if not os.path.exists(target_path):
        logger.info(f"Ornek dosya olusturuluyor: {target_path}")
        with open(target_path, "w", encoding="utf-8") as f:
            f.write("Bugunku calisma notlarimi buraya yazacagim...\n")

    commitment_id = 1

    event_handler = StudyFileHandler(w3, commitment_id, offline=OFFLINE_MODE)
    observer = Observer()
    observer.schedule(event_handler, WATCH_DIR, recursive=False)
    observer.start()

    logger.info(f"Dosya izleniyor: {WATCH_DIR}")
    logger.info(f"Hedef: {WORD_COUNT_THRESHOLD}+ kelime, bugun guncellenmis")
    logger.info("Agent calisiyor. Durdurmak icin Ctrl+C basin.")

    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        logger.info("Agent durduruluyor...")
        observer.stop()

    observer.join()
    logger.info("Agent kapatildi.")


if __name__ == "__main__":
    main()
