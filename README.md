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
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your values

# Run mock tests
npx hardhat run scripts/mock_test.js

# Deploy to Arc Testnet
npx hardhat run scripts/deploy.js --network arcTestnet

# Start AI validator agent
python agent/validator.py
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description |
|----------|-------------|
| `OFFLINE_MODE` | `true` for local testing, `false` for on-chain |
| `RPC_URL` | Arc Network RPC endpoint |
| `CONTRACT_ADDRESS` | Deployed contract address |
| `PRIVATE_KEY` | Validator wallet private key |
| `PENALTY_ADDRESS` | Address that receives failed stakes |

> **Never commit `.env` to git.** It is ignored by `.gitignore`.

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
├── .env.example                 # Environment template
├── requirements.txt             # Python dependencies
└── hardhat.config.js
```

## License

MIT
