# Arc Discipline Protocol

On-chain discipline tracker built on **Arc Network**. Lock USDC, AI validates your progress, earn reputation.

## Concept

Users lock USDC into a smart contract for a personal goal. An AI agent monitors progress via **GitHub commits**. If the goal is met (quality commit detected), funds are refunded and the user earns a **Discipline Score** on-chain.

## Quality Filter (Anti-Spam)

The agent uses a rule-based filter to ensure only real code contributions are rewarded:
- **File Extension:** Only code files (`.py`, `.js`, `.sol`, `.ts`, etc.) are accepted. Text/Image files are ignored.
- **Keywords:** Commits must contain programming keywords (`function`, `import`, `def`, `class`, etc.).
- **Minimum Lines:** At least **3 lines** of changes are required.

## Architecture

```
User → deposits USDC + GitHub Username → Smart Contract → AI Validator (GitHub API) → completeTask / failTask
```

| Component | Tech |
|-----------|------|
| Smart Contract | Solidity + OpenZeppelin |
| AI Validator | Python + web3.py + GitHub API |
| Network | Arc Network (EVM-compatible) |

## Quick Start

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your values (RPC, Private Key, GitHub Token)

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
| `GITHUB_TOKEN` | GitHub Personal Access Token (Classic) for API access |
| `MIN_LINES` | Minimum lines changed to count as valid commit (default: 3) |

> **Never commit `.env` to git.** It is ignored by `.gitignore`.

## Project Structure

```
├── contracts/
│   ├── DisciplineProtocol.sol   # Main contract
│   └── MockUSDC.sol             # Test ERC20
├── agent/
│   ├── validator.py             # AI GitHub validator
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
