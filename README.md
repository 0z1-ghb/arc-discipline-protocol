# Arc Discipline Protocol

On-chain discipline tracker built on **Arc Network**. Users stake USDC against coding goals, an AI agent validates GitHub commits, and successful developers earn **Arc Sparks** while failures fund a community Reward Pool.

## How It Works

1. **Stake:** User locks USDC and selects a task type (Daily, Weekly, Monthly).
2. **Commit:** User pushes code to GitHub within the 24-hour deadline.
3. **Validate:** AI Agent checks commit quality, keywords, and timestamps.
4. **Reward:** Valid commits refund USDC + award Arc Sparks. Failed stakes go to the Reward Pool.

## Core Features

### Task System
- **Daily (Bug Fixes):** 10 Arc Sparks (Max 2/day)
- **Weekly (Features/Refactors):** 50 Arc Sparks (Max 1/week)
- **Monthly (New Projects):** 200 Arc Sparks (Max 1/month)

### AI Quality Filter
Prevents spam by validating:
- File extensions (`.py`, `.js`, `.ts`, `.sol`, etc.)
- Programming keywords (`function`, `import`, `class`, etc.)
- Task-type matching (e.g., "fix:" for Daily tasks)
- Timestamps (commits must be newer than the stake)

### Reputation & Leaderboard
- **Score Scale:** 0–1000 Arc Sparks
- **Levels:** Novice → Disciplined → Elite → Legend
- **Global Ranking:** On-chain leaderboard sorted by score

### Reward Pool (Survivor Model)
- Failed stakes are transferred to the `RewardPool` contract.
- Users with score ≥ 100 can claim proportional rewards.
- Incentivizes consistent, high-quality contributions.

## Architecture

```
User → Smart Contract (Arc) ↔ AI Validator (Python + GitHub API)
                                ↓
                          RewardPool
```

| Component | Technology |
|-----------|------------|
| Smart Contracts | Solidity + OpenZeppelin |
| AI Validator | Python + web3.py + GitHub API |
| Network | Arc Network (EVM-compatible) |

## Deployment

**Network:** Arc Testnet (Chain ID: 5042002)  
**RPC:** `https://rpc.testnet.arc.network`

| Contract | Address |
|----------|---------|
| DisciplineProtocol | `0x985C50195021A96746559556375c0E4464275eEf` |
| RewardPool | `0xe253A8e6501a32D8197367064a13E67f8d3eEa65` |
| USDC | `0x3600000000000000000000000000000000000000` |

> 💡 **Get Test USDC:** [Circle Faucet](https://faucet.circle.com/)

## Quick Start

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with RPC, Private Key, and GitHub Token

# Deploy contracts
npx hardhat run scripts/deploy.js --network arcTestnet

# Start AI validator
python agent/validator.py
```

## Project Structure

```
├── contracts/
│   ├── DisciplineProtocol.sol   # Staking, scoring, leaderboard
│   └── RewardPool.sol           # Penalty collection & distribution
├── agent/
│   ├── validator.py             # GitHub validation & on-chain execution
│   └── contract_abi.json        # Contract ABI
├── scripts/
│   └── deploy.js                # Deployment script
└── hardhat.config.js
```

## License

MIT
