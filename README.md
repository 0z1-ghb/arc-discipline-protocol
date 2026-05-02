# Arc Discipline Protocol

On-chain discipline tracker built on **Arc Network**. Stake USDC, validate GitHub commits via AI, earn **Arc Sparks**, and climb the global Leaderboard.

🌐 **Live Demo:** [arc-discipline.vercel.app](https://arc-discipline.vercel.app) (Replace with actual URL)

## Concept

Users lock USDC into a smart contract for a personal coding goal. An **AI Agent** monitors progress via **GitHub commits**. If the goal is met (quality commit detected), funds are refunded and the user earns **Arc Sparks** on-chain. Failed stakes fund a **Reward Pool** for top performers.

## Key Features

### 1. Task Categories & Scoring
Users choose a task category when depositing. Points are awarded based on difficulty:
- **Daily (Bug Fixes):** 10 Arc Sparks (Max 2 per day)
- **Weekly (Features/Refactors):** 50 Arc Sparks (Max 1 per week)
- **Monthly (New Development):** 200 Arc Sparks (Max 1 per month)

### 2. AI Quality Filter (Anti-Spam)
The agent uses a rule-based filter to ensure only real code contributions are rewarded:
- **File Extension:** Only code files (`.py`, `.js`, `.sol`, `.ts`, etc.) are accepted.
- **Keywords:** Commits must contain programming keywords (`function`, `import`, `def`, `class`, etc.).
- **Task Matching:** Commit messages must match the task type (e.g., "fix:" for Daily tasks).

### 3. On-Chain Leaderboard
- **Global Ranking:** Real-time ranking of all users based on Arc Sparks.
- **Reputation Levels:** Novice → Disciplined → Elite → Legend (0-1000 scale).
- **Transparency:** All scores and deposits are stored on-chain.

### 4. Reward Pool (Survivor Model)
- **Penalties Fund Rewards:** Failed stakes are sent to the `RewardPool` contract.
- **Score-Based Claims:** Users with Arc Sparks >= 100 can claim rewards.
- **Proportional Distribution:** Higher scores get larger rewards from the pool.

### 5. Modern Frontend
- **Next.js + Vercel:** Fast, responsive dashboard.
- **Wallet Integration:** RainbowKit + wagmi for seamless connection.
- **Real-Time Stats:** Live monitoring of limits, progress, and leaderboard.
- **Arc Theme:** Glassmorphism UI with grid background and gradient accents.

## Architecture

```
User → Frontend (Next.js/Vercel) → Smart Contract (Arc) ↔ AI Validator (Python)
                                                              ↓
                                                        RewardPool (penalties → rewards)
```

| Component | Tech |
|-----------|------|
| Smart Contract | Solidity + OpenZeppelin |
| AI Validator | Python + web3.py + GitHub API |
| Frontend | Next.js + Tailwind + RainbowKit |
| Network | Arc Network (EVM-compatible) |

## Live Deployment

**Network:** Arc Testnet (Chain ID: 5042002)
**RPC:** `https://rpc.testnet.arc.network`

| Contract | Address |
|----------|---------|
| DisciplineProtocol | `0x985C50195021A96746559556375c0E4464275eEf` |
| RewardPool | `0xe253A8e6501a32D8197367064a13E67f8d3eEa65` |
| USDC | `0x3600000000000000000000000000000000000000` |

> 💡 **Get Test USDC:** [Circle Faucet](https://faucet.circle.com/)

## Quick Start

### Backend (Contract + Agent)
```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your values (RPC, Private Key, GitHub Token)

# Deploy to Arc Testnet
npx hardhat run scripts/deploy.js --network arcTestnet

# Start AI validator agent
python agent/validator.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── contracts/
│   ├── DisciplineProtocol.sol   # Main contract (Staking, Scoring, Leaderboard)
│   └── RewardPool.sol           # Penalty pool & reward distribution
├── agent/
│   ├── validator.py             # AI GitHub validator
│   └── contract_abi.json        # Auto-generated ABI
├── frontend/
│   ├── src/app/                 # Next.js pages & components
│   └── src/lib/                 # Contract ABIs & config
├── scripts/
│   └── deploy.js                # Deployment script
├── .env.example                 # Environment template
└── hardhat.config.js
```

## License

MIT
