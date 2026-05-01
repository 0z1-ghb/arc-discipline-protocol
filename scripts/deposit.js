const hre = require("hardhat");
const { ethers } = require("hardhat");

// USDC has 6 decimals
const DECIMALS = 6;

async function main() {
  console.log("=".repeat(60));
  console.log("Deposit USDC to Discipline Protocol");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("\nSigner:", signer.address);

  const protocolAddress = process.env.CONTRACT_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;

  if (!protocolAddress || !usdcAddress) {
    console.error("\nERROR: CONTRACT_ADDRESS and USDC_ADDRESS must be set in .env");
    process.exit(1);
  }

  console.log("Protocol:", protocolAddress);
  console.log("USDC:", usdcAddress);

  // Get contract instances
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);
  const protocol = await ethers.getContractAt("DisciplineProtocol", protocolAddress);

  // Configuration
  const amountUSDC = process.env.DEPOSIT_AMOUNT || "1"; // Default 1 USDC
  const goal = process.env.DEPOSIT_GOAL || "Test goal from script";
  const githubUsername = process.env.GITHUB_USERNAME || "test-user";

  const amountWei = ethers.parseUnits(amountUSDC, DECIMALS);

  console.log(`\nAmount: ${amountUSDC} USDC (${amountWei} units)`);
  console.log("Goal:", goal);
  console.log("GitHub:", githubUsername);

  // Step 1: Check USDC Balance
  const balance = await usdc.balanceOf(signer.address);
  console.log("\nYour USDC Balance:", ethers.formatUnits(balance, DECIMALS));
  if (balance < amountWei) {
    console.error("ERROR: Insufficient USDC balance!");
    process.exit(1);
  }

  // Step 2: Approve USDC spending
  console.log("\n[1] Approving USDC spending...");
  const currentAllowance = await usdc.allowance(signer.address, protocolAddress);
  if (currentAllowance < amountWei) {
    const approveTx = await usdc.connect(signer).approve(protocolAddress, amountWei);
    console.log("Approve TX sent:", approveTx.hash);
    await approveTx.wait();
    console.log("Approve confirmed!");
  } else {
    console.log("Allowance sufficient, skipping approve.");
  }

  // Step 3: Deposit
  console.log("\n[2] Calling deposit...");
  const depositTx = await protocol.connect(signer).deposit(amountWei, goal, githubUsername);
  console.log("Deposit TX sent:", depositTx.hash);
  const receipt = await depositTx.wait();

  console.log("\nDeposit successful!");
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Get commitment ID from logs (optional but helpful)
  const event = receipt.logs.find(log => {
    try {
      const parsed = protocol.interface.parseLog(log);
      return parsed.name === "Deposited";
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = protocol.interface.parseLog(event);
    console.log("Commitment ID:", parsed.args.commitmentId.toString());
  }

  console.log("\n" + "=".repeat(60));
  console.log("Done! Now wait for the agent to validate your commit.");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
