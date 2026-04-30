const hre = require("hardhat");

async function main() {
  console.log("Deploying Discipline Protocol...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  // Mock USDC (test icin sahte ERC20)
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Mock USDC deployed to:", usdcAddress);

  // Validator ve penalty adresleri (test icin deployer ayni)
  const validator = deployer.address;
  const penaltyAddress = deployer.address;

  // Discipline Protocol kontratini deploy et
  const DisciplineProtocol = await hre.ethers.getContractFactory("DisciplineProtocol");
  const protocol = await DisciplineProtocol.deploy(usdcAddress, validator, penaltyAddress);
  await protocol.waitForDeployment();
  const protocolAddress = await protocol.getAddress();
  console.log("DisciplineProtocol deployed to:", protocolAddress);

  // ABI ve adresleri kaydet
  const fs = require("fs");
  const path = require("path");

  const abiPath = path.join(__dirname, "..", "agent", "contract_abi.json");
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "DisciplineProtocol.sol", "DisciplineProtocol.json"), "utf8")).abi;

  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("ABI saved to:", abiPath);

  const envPath = path.join(__dirname, "..", ".env.example");
  fs.writeFileSync(envPath, `CONTRACT_ADDRESS=${protocolAddress}\nUSDC_ADDRESS=${usdcAddress}\n`);
  console.log("Addresses saved to:", envPath);

  console.log("\nDeployment complete!");
  console.log("Update agent/validator.py with these addresses.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
