const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Check Discipline Score");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  const protocolAddress = process.env.CONTRACT_ADDRESS;

  if (!protocolAddress) {
    console.error("\nERROR: CONTRACT_ADDRESS must be set in .env");
    process.exit(1);
  }

  const protocol = await ethers.getContractAt("DisciplineProtocol", protocolAddress);

  // Check signer's score by default, or use env variable if provided
  const targetAddress = process.env.CHECK_ADDRESS || signer.address;
  console.log("\nChecking address:", targetAddress);

  const [score, level] = await protocol.getScore(targetAddress);

  console.log("\nScore:", score.toString());
  console.log("Level:", level);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
