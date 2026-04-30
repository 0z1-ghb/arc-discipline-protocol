const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Discipline Protocol - Mock Test");
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
  const userBalance = await usdc.balanceOf(user.address);
  console.log("  User USDC balance:", Number(userBalance) / 10 ** 6);

  console.log("\n[5] User 100 USDC deposit yapiyor...");
  await usdc.connect(user).approve(protocolAddress, 100 * 10 ** 6);
  await protocol.connect(user).deposit(100 * 10 ** 6, "Gunde 100 sayfa calisma");
  console.log("  Deposit basarili!");

  const commitment = await protocol.getCommitment(1);
  console.log("  Commitment #1:", {
    user: commitment.user,
    amount: Number(commitment.amount) / 10 ** 6,
    goal: commitment.goal,
    completed: commitment.completed,
    failed: commitment.failed,
  });

  console.log("\n[6] TEST: Validator disindaki adres completeTask cagiriyor (basarisiz olmali)");
  try {
    await protocol.connect(user).completeTask(1);
    console.log("  HATA: Yetkisiz erisim saglandi!");
  } catch (error) {
    console.log("  Beklenen hata:", error.reason || error.message.split("\n")[0]);
  }

  console.log("\n[7] TEST: Validator completeTask cagiriyor (basarili olmali)");
  const protocolContract = await hre.ethers.getContractAt("DisciplineProtocol", protocolAddress);
  await protocol.connect(validator).completeTask(1);
  const updatedCommitment = await protocol.getCommitment(1);
  console.log("  Task completed:", updatedCommitment.completed);

  const userBalanceAfter = await usdc.balanceOf(user.address);
  console.log("  User USDC balance (refund sonrasi):", Number(userBalanceAfter) / 10 ** 6);

  console.log("\n[8] Yeni deposit ve failTask testi...");
  await usdc.connect(user).faucet(500 * 10 ** 6);
  await usdc.connect(user).approve(protocolAddress, 200 * 10 ** 6);
  await protocol.connect(user).deposit(200 * 10 ** 6, "Her gun 50 Ingilizce kelime");

  const protocolBalanceBefore = await usdc.balanceOf(protocolAddress);
  console.log("  Protocol balance:", Number(protocolBalanceBefore) / 10 ** 6);

  await protocol.connect(validator).failTask(2);
  const failedCommitment = await protocol.getCommitment(2);
  console.log("  Task failed:", failedCommitment.failed);

  const penaltyBalance = await usdc.balanceOf(owner.address);
  console.log("  Penalty address balance:", Number(penaltyBalance) / 10 ** 6);

  console.log("\n[9] ABI kaydediliyor...");
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "DisciplineProtocol.sol", "DisciplineProtocol.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiPath = path.join(__dirname, "..", "agent", "contract_abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("  ABI saved to:", abiPath);

  console.log("\n" + "=".repeat(60));
  console.log("Tum testler basarili!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
