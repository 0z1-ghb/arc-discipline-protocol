const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Discipline Protocol - Scoring System Test");
  console.log("=".repeat(60));

  const [owner, user, validator] = await hre.ethers.getSigners();
  console.log("\n[1] Accounts:");
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

  console.log("\n[4] Fauceting 1000 USDC to User...");
  await usdc.connect(user).faucet(1000 * 10 ** 6);
  
  console.log("\n[5] User depositing 100 USDC (Commitment #1)...");
  // New deposit function takes githubUsername parameter
  await usdc.connect(user).approve(protocolAddress, 100 * 10 ** 6);
  await protocol.connect(user).deposit(100 * 10 ** 6, "Study 100 pages daily", "test-user");
  
  // Check initial score
  let scoreData = await protocol.getScore(user.address);
  console.log("  Initial Score:", Number(scoreData.score), "| Level:", scoreData.level);

  console.log("\n[6] TEST: Validator calls completeTask (Success)...");
  await protocol.connect(validator).completeTask(1);
  
  // Check score increase
  scoreData = await protocol.getScore(user.address);
  console.log("  New Score:", Number(scoreData.score), "| Level:", scoreData.level);
  console.log("  Expected: +10 Points -> Novice (0-99)");

  const userBalanceAfter = await usdc.balanceOf(user.address);
  console.log("  User USDC balance (after refund):", Number(userBalanceAfter) / 10 ** 6);

  console.log("\n[7] TEST: New deposit and failTask (Failure)...");
  await usdc.connect(user).approve(protocolAddress, 200 * 10 ** 6);
  await protocol.connect(user).deposit(200 * 10 ** 6, "Learn 50 English words daily", "test-user");
  
  // Score before fail
  scoreData = await protocol.getScore(user.address);
  console.log("  Score Before Fail:", Number(scoreData.score), "| Level:", scoreData.level);

  await protocol.connect(validator).failTask(2);
  
  // Check score decrease
  scoreData = await protocol.getScore(user.address);
  console.log("  Score After Fail:", Number(scoreData.score), "| Level:", scoreData.level);
  console.log("  Expected: -20 Points -> (10 - 20 = 0, min 0) -> Novice");

  const penaltyBalance = await usdc.balanceOf(owner.address);
  console.log("  Penalty address balance:", Number(penaltyBalance) / 10 ** 6);

  console.log("\n[8] Saving ABI...");
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "DisciplineProtocol.sol", "DisciplineProtocol.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiPath = path.join(__dirname, "..", "agent", "contract_abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("  ABI saved to:", abiPath);

  console.log("\n" + "=".repeat(60));
  console.log("Scoring System Test Successful!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
