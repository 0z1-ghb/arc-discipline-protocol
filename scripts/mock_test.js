const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Discipline Protocol - Scoring System Test");
  console.log("=".repeat(60));

  const [owner, user, validator] = await hre.ethers.getSigners();
  console.log("\n[1] Hesaplar:");
  console.log("  Owner:", owner.address);
  console.log("  User:", user.address);
  console.log("  Validator:", validator.address);

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("\n[2] Mock USDC deployed:", usdcAddress);

  const DisciplineProtocol = await hre.ethers.getContractFactory("DisciplineProtocol");
  const protocol = await DisciplineProtocol.deploy(usdcAddress, validator.address, owner.address);
  await protocol.waitForDeployment();
  const protocolAddress = await protocol.getAddress();
  console.log("[3] DisciplineProtocol deployed:", protocolAddress);

  console.log("\n[4] User'a 1000 USDC faucet...");
  await usdc.connect(user).faucet(1000 * 10 ** 6);
  
  console.log("\n[5] User 100 USDC deposit yapiyor (Commitment #1)...");
  // Yeni deposit fonksiyonu githubUsername parametresi aliyor
  await usdc.connect(user).approve(protocolAddress, 100 * 10 ** 6);
  await protocol.connect(user).deposit(100 * 10 ** 6, "Gunde 100 sayfa calisma", "test-user");
  
  // Başlangıç skoru kontrolü
  let scoreData = await protocol.getScore(user.address);
  console.log("  Baslangic Skoru:", Number(scoreData.score), "| Seviye:", scoreData.level);

  console.log("\n[6] TEST: Validator completeTask cagiriyor (Basari)...");
  await protocol.connect(validator).completeTask(1);
  
  // Skor artışı kontrolü
  scoreData = await protocol.getScore(user.address);
  console.log("  Yeni Skor:", Number(scoreData.score), "| Seviye:", scoreData.level);
  console.log("  Beklenen: +10 Puan -> Novice (0-99)");

  const userBalanceAfter = await usdc.balanceOf(user.address);
  console.log("  User USDC balance (refund sonrasi):", Number(userBalanceAfter) / 10 ** 6);

  console.log("\n[7] TEST: Yeni deposit ve failTask (Basarisizlik)...");
  await usdc.connect(user).approve(protocolAddress, 200 * 10 ** 6);
  await protocol.connect(user).deposit(200 * 10 ** 6, "Her gun 50 Ingilizce kelime", "test-user");
  
  // Fail öncesi skor
  scoreData = await protocol.getScore(user.address);
  console.log("  Fail Oncesi Skor:", Number(scoreData.score), "| Seviye:", scoreData.level);

  await protocol.connect(validator).failTask(2);
  
  // Skor düşüşü kontrolü
  scoreData = await protocol.getScore(user.address);
  console.log("  Fail Sonrasi Skor:", Number(scoreData.score), "| Seviye:", scoreData.level);
  console.log("  Beklenen: -20 Puan -> (10 - 20 = 0, min 0) -> Novice");

  const penaltyBalance = await usdc.balanceOf(owner.address);
  console.log("  Penalty address balance:", Number(penaltyBalance) / 10 ** 6);

  console.log("\n[8] ABI kaydediliyor...");
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "DisciplineProtocol.sol", "DisciplineProtocol.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiPath = path.join(__dirname, "..", "agent", "contract_abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("  ABI saved to:", abiPath);

  console.log("\n" + "=".repeat(60));
  console.log("Scoring System Test Basarili!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
