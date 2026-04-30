const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Arc Testnet USDC adresi
const ARC_TESTNET_USDC = "0xYourUSDCAddress"; // Faucet'ten aldigin USDC

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying Discipline Protocol to Arc Testnet");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "USDC");

  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name, `(chainId: ${network.chainId})`);

  if (network.chainId !== 5042002n) {
    console.error("\nHATA: Arc Testnet'e bagli degilsiniz! (chainId: 5042002)");
    process.exit(1);
  }

  // USDC adresi
  const usdcAddress = process.env.USDC_ADDRESS || ARC_TESTNET_USDC;
  console.log("\nUSDC Address:", usdcAddress);

  // Validator ve penalty adresleri
  const validator = deployer.address;
  const penaltyAddress = deployer.address;

  // Discipline Protocol kontratini deploy et
  console.log("\nDeploying DisciplineProtocol...");
  const DisciplineProtocol = await hre.ethers.getContractFactory("DisciplineProtocol");
  const protocol = await DisciplineProtocol.deploy(usdcAddress, validator, penaltyAddress);
  await protocol.waitForDeployment();
  const protocolAddress = await protocol.getAddress();
  console.log("DisciplineProtocol deployed to:", protocolAddress);

  // ABI kaydet
  const abiPath = path.join(__dirname, "..", "agent", "contract_abi.json");
  const artifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "artifacts", "contracts", "DisciplineProtocol.sol", "DisciplineProtocol.json"),
    "utf8"
  ));
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("ABI saved to:", abiPath);

  // .env guncelle
  const envExamplePath = path.join(__dirname, "..", ".env.example");
  const envContent = `# Arc Testnet Deployment
OFFLINE_MODE=false
RPC_URL=https://rpc.testnet.arc.network
CONTRACT_ADDRESS=${protocolAddress}
USDC_ADDRESS=${usdcAddress}
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
PENALTY_ADDRESS=${penaltyAddress}
WORD_COUNT_THRESHOLD=100
`;
  fs.writeFileSync(envExamplePath, envContent);
  console.log(".env.example updated");

  console.log("\n" + "=".repeat(60));
  console.log("Deployment complete!");
  console.log("Explorer: https://testnet.arcscan.app/address/" + protocolAddress);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
