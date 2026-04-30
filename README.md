# Arc Discipline Protocol

On-chain discipline tracker built on **Arc Network**. Lock USDC, AI validates your progress, earn reputation.

## Concept

Users lock USDC into a smart contract for a personal goal (e.g., "Study 100 pages/day"). An AI agent monitors progress via file uploads, test results, or GitHub commits. If the goal is met, funds are refunded and the user earns a **Discipline Score** on-chain — usable as a trust signal in agentic marketplaces.

## Architecture

```
User → deposits USDC → Smart Contract → AI Validator → completeTask / failTask
```

| Component | Tech |
|-----------|------|
| Smart Contract | Solidity + OpenZeppelin |
| AI Validator | Python + web3.py + watchdog |
| Network | Arc Network (EVM-compatible) |

## Quick Start

```bash
# Install dependencies
npm install
pip install web3 watchdog

# Run mock tests
npx hardhat run scripts/mock_test.js

# Deploy to Arc Testnet
npx hardhat run scripts/deploy.js --network arcTestnet

# Start AI validator agent
python agent/validator.py
```

## Project Structure

```
├── contracts/
│   ├── DisciplineProtocol.sol   # Main contract
│   └── MockUSDC.sol             # Test ERC20
├── agent/
│   ├── validator.py             # AI file watcher
│   └── contract_abi.json        # Auto-generated ABI
├── scripts/
│   ├── deploy.js                # Deployment script
│   └── mock_test.js             # Local simulation
── hardhat.config.js
```

## License

MIT
