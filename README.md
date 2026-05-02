# Arc Discipline Protocol

On-chain discipline tracker built on **Arc Network**. Lock USDC, AI validates your progress, earn reputation.

## Concept

Users lock USDC into a smart contract for a personal goal. An AI agent monitors progress via **GitHub commits**. If the goal is met (quality commit detected), funds are refunded and the user earns a **Discipline Score** on-chain.

## Key Features

### 1. Task Categories & Scoring
Users choose a task category when depositing. Points are awarded based on difficulty:
- **Daily (Bug Fixes):** 10 Points (Max 2 per day)
- **Weekly (Features/Refactors):** 50 Points (Max 1 per week)
- **Monthly (New Development):** 200 Points (Max 1 per month)

### 2. Quality Filter (Anti-Spam)
The agent uses a rule-based filter to ensure only real code contributions are rewarded:
- **File Extension:** Only code files (`.py`, `.js`, `.sol`, `.ts`, etc.) are accepted. Text/Image files are ignored.
- **Keywords:** Commits must contain programming keywords (`function`, `import`, `def`, `class`, etc.).
- **No Minimum Lines:** Even 1-line bug fixes are accepted if they contain valid code logic.

### 2. Timestamp Protection (No Double Spending)
- **Fresh Work Only:** The agent only accepts commits made **after** the task was created.
- **No Reuse:** Users cannot reuse old commits to claim rewards for new tasks.

### 3. Auto-Fail (24h Deadline)
- **Time Limit:** Each task has a **24-hour deadline**.
- **Automatic Penalty:** If the deadline passes without a valid commit, the agent automatically triggers `failTask`.
- **Consequence:** The locked USDC is sent to the **RewardPool**, and the user's reputation score decreases by 20 points. Successful users can later claim rewards from this pool based on their score.

### 4. Reward Pool (Survivor Pool Model)
- **Penalties Fund Rewards:** Failed stakes are sent to the `RewardPool` contract.
- **Score-Based Claims:** Users with a Discipline Score >= 100 can claim rewards.
- **Proportional Distribution:** Reward = `(PoolBalance * UserScore) / 1000`. Higher scores get larger rewards.

## Architecture

```
User → deposits USDC + GitHub Username → Smart Contract → AI Validator (GitHub API) → completeTask / failTask
                                                              ↓
                                                        RewardPool (penalties distributed to top users)
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
| `CONTRACT_ADDRESS` | Deployed DisciplineProtocol contract address |
| `REWARD_POOL_ADDRESS` | Deployed RewardPool contract address |
| `PRIVATE_KEY` | Validator wallet private key |
| `GITHUB_TOKEN` | GitHub Personal Access Token (Classic) for API access |

> **Never commit `.env` to git.** It is ignored by `.gitignore`.

## Project Structure

```
├── contracts/
│   ├── DisciplineProtocol.sol   # Main contract
│   ├── RewardPool.sol           # Penalty pool & reward distribution
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
