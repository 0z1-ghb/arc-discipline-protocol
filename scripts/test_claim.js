const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Test Claim Flow");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("\nSigner:", signer.address);

  const protocolAddress = process.env.CONTRACT_ADDRESS;
  const poolAddress = process.env.REWARD_POOL_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;

  if (!protocolAddress || !poolAddress || !usdcAddress) {
    console.error("\nERROR: Missing CONTRACT_ADDRESS, REWARD_POOL_ADDRESS, or USDC_ADDRESS in .env");
    process.exit(1);
  }

  const protocol = await ethers.getContractAt("DisciplineProtocol", protocolAddress);
  const rewardPool = await ethers.getContractAt("RewardPool", poolAddress);
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);

  // 1. Check Score
  let [score, level] = await protocol.getScore(signer.address);
  console.log("\nCurrent Score:", score.toString(), level);

  // 2. Boost Score if needed (Min 100 required to claim)
  if (score < 100n) {
    console.log("\nScore < 100. Boosting score by creating and completing tasks...");
    
    while (score < 100n) {
      const amount = ethers.parseUnits("0.1", 6); // 0.1 USDC
      
      // Approve
      console.log(`Approving ${ethers.formatUnits(amount, 6)} USDC...`);
      const approveTx = await usdc.connect(signer).approve(protocolAddress, amount);
      await approveTx.wait();
      
      // Deposit
      console.log(`Depositing for task boost...`);
      const tx = await protocol.connect(signer).deposit(amount, "Boost task", "0z1-ghb");
      const receipt = await tx.wait();
      
      // Find ID from event
      const event = receipt.logs.find(log => {
        try { return protocol.interface.parseLog(log).name === "Deposited"; } catch { return false; }
      });
      const id = protocol.interface.parseLog(event).args.commitmentId.toString();
      
      // Complete (Validator only)
      await protocol.connect(signer).completeTask(id);
      
      [score, level] = await protocol.getScore(signer.address);
      console.log(`Task ${id} completed. New Score: ${score}`);
    }
  } else {
    console.log("\nScore is sufficient (>= 100).");
  }

  // 3. Check Pool Balance
  const poolBal = await usdc.balanceOf(poolAddress);
  console.log("\nRewardPool Balance:", ethers.formatUnits(poolBal, 6), "USDC");

  if (poolBal === 0n) {
    console.log("Pool is empty, nothing to claim.");
    return;
  }

  // 4. Claim
  console.log("\nAttempting to claim reward...");
  const claimTx = await rewardPool.connect(signer).claim();
  await claimTx.wait();
  console.log("Claim successful!");

  // 5. Check User Balance
  const userBal = await usdc.balanceOf(signer.address);
  console.log("\nUser USDC Balance:", ethers.formatUnits(userBal, 6), "USDC");
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
