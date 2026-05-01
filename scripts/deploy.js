const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Arc Testnet USDC address
const ARC_TESTNET_USDC = "0xYourUSDCAddress"; // USDC received from faucet

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
    console.error("\nERROR: Not connected to Arc Testnet! (chainId: 5042002)");
    process.exit(1);
  }

  // USDC address
  const usdcAddress = process.env.USDC_ADDRESS || ARC_TESTNET_USDC;
  console.log("\nUSDC Address:", usdcAddress);

  // Validator address
  const validator = deployer.address;

  // Deploy RewardPool first (needs USDC and Protocol address, but Protocol needs Pool address)
  // Circular dependency!
  // Solution: Deploy Pool with a dummy protocol address, then deploy Protocol with Pool address, then update Pool's protocol address?
  // Or: Deploy Protocol first with a dummy pool address, then deploy Pool with Protocol address, then update Protocol's pool address.
  // Let's do: Deploy Protocol with deployer as pool (temp), then deploy Pool with Protocol address, then update Protocol.
  
  console.log("\n[1] Deploying DisciplineProtocol (Temp Pool)...");
  const DisciplineProtocol = await hre.ethers.getContractFactory("DisciplineProtocol");
  const protocol = await DisciplineProtocol.deploy(usdcAddress, validator, deployer.address);
  await protocol.waitForDeployment();
  const protocolAddress = await protocol.getAddress();
  console.log("DisciplineProtocol deployed to:", protocolAddress);

  console.log("\n[2] Deploying RewardPool...");
  const RewardPool = await hre.ethers.getContractFactory("RewardPool");
  const rewardPool = await RewardPool.deploy(usdcAddress, protocolAddress);
  await rewardPool.waitForDeployment();
  const rewardPoolAddress = await rewardPool.getAddress();
  console.log("RewardPool deployed to:", rewardPoolAddress);

  console.log("\n[3] Linking Protocol to RewardPool...");
  await protocol.setRewardPool(rewardPoolAddress);
  console.log("Protocol linked to RewardPool!");

  // Save ABI
  const abiPath = path.join(__dirname, "..", "agent", "contract_abi.json");
  const artifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "artifacts", "contracts", "DisciplineProtocol.sol", "DisciplineProtocol.json"),
    "utf8"
  ));
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("ABI saved to:", abiPath);

  // Update .env.example
  const envExamplePath = path.join(__dirname, "..", ".env.example");
  const envContent = `# Arc Testnet Deployment
OFFLINE_MODE=false
RPC_URL=https://rpc.testnet.arc.network
CONTRACT_ADDRESS=${protocolAddress}
REWARD_POOL_ADDRESS=${rewardPoolAddress}
USDC_ADDRESS=${usdcAddress}
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
`;
  fs.writeFileSync(envExamplePath, envContent);
  console.log(".env.example updated");

  console.log("\n" + "=".repeat(60));
  console.log("Deployment complete!");
  console.log("Protocol: https://testnet.arcscan.app/address/" + protocolAddress);
  console.log("Pool: https://testnet.arcscan.app/address/" + rewardPoolAddress);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
