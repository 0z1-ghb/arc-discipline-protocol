const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Manual Fail Task (For Testing)");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("\nValidator:", signer.address);

  const protocolAddress = process.env.CONTRACT_ADDRESS;

  if (!protocolAddress) {
    console.error("\nERROR: CONTRACT_ADDRESS must be set in .env");
    process.exit(1);
  }

  const protocol = await ethers.getContractAt("DisciplineProtocol", protocolAddress);

  // Get task ID from arguments or default to latest
  const taskId = process.argv[2];
  if (!taskId) {
    console.error("\nUsage: npx hardhat run scripts/fail_task.js --network arcTestnet <TASK_ID>");
    process.exit(1);
  }

  console.log(`\nAttempting to fail Task ID: ${taskId}...`);

  try {
    const tx = await protocol.connect(signer).failTask(taskId);
    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Task failed successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("Error failing task:", error.message);
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
