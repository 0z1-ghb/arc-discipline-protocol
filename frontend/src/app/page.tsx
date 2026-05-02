'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Shield, Zap, Medal, TrendingUp, CheckCircle2, Lock, Award, Wallet, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CONTRACTS, PROTOCOL_ABI, POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { parseUnits, formatUnits } from 'viem';

const TASKS = [
  {
    id: 0,
    type: 'Daily',
    title: 'Bug Fix',
    desc: 'Fix small bugs and clean up code.',
    reward: '10 Arc Sparks',
    limit: '2 / day',
    color: 'text-arc-teal',
    border: 'border-arc-teal/30',
    bg: 'bg-arc-teal/5',
  },
  {
    id: 1,
    type: 'Weekly',
    title: 'Feature / Refactor',
    desc: 'Add new features or improve structure.',
    reward: '50 Arc Sparks',
    limit: '1 / week',
    color: 'text-arc-blue',
    border: 'border-arc-blue/30',
    bg: 'bg-arc-blue/5',
  },
  {
    id: 2,
    type: 'Monthly',
    title: 'New Project',
    desc: 'Develop a new module or project from scratch.',
    reward: '200 Arc Sparks',
    limit: '1 / month',
    color: 'text-arc-purple',
    border: 'border-arc-purple/30',
    bg: 'bg-arc-purple/5',
  },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [githubs, setGithubs] = useState<Record<number, string>>({ 0: '', 1: '', 2: '' });
  const [amounts, setAmounts] = useState<Record<number, string>>({ 0: '', 1: '', 2: '' });

  // Web3 Hooks
  const { data: scoreData } = useReadContract({
    address: CONTRACTS.protocol,
    abi: PROTOCOL_ABI,
    functionName: 'getScore',
    args: [address || '0x0'],
  });

  const { data: limits } = useReadContract({
    address: CONTRACTS.protocol,
    abi: PROTOCOL_ABI,
    functionName: 'getUserLimits',
    args: [address || '0x0'],
  });

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { isLoading: isDepositing, isSuccess: isDeposited } = useWaitForTransactionReceipt({ hash: depositHash });

  const { writeContract: claim, data: claimHash } = useWriteContract();
  const { isLoading: isClaiming, isSuccess: isClaimed } = useWaitForTransactionReceipt({ hash: claimHash });

  const [approvingType, setApprovingType] = useState<number | null>(null);

  const handleApprove = async (type: number) => {
    const amt = amounts[type];
    const gh = githubs[type];
    if (!amt || !gh || !address) return;
    setApprovingType(type);
    approve({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.protocol, parseUnits(amt, 6)],
    });
  };

  const handleDeposit = (type: number) => {
    const amt = amounts[type];
    const gh = githubs[type];
    if (!amt || !gh || !address) return;
    deposit({
      address: CONTRACTS.protocol,
      abi: PROTOCOL_ABI,
      functionName: 'deposit',
      args: [parseUnits(amt, 6), type, gh],
    });
  };

  const handleClaim = () => {
    claim({ address: CONTRACTS.pool, abi: POOL_ABI, functionName: 'claim' });
  };

  const score = scoreData ? Number((scoreData as any)[0]) : 0;
  const level = scoreData ? (scoreData as any)[1] : 'Novice';
  const dailyUsed = limits ? Number((limits as any)[0]) : 0;
  const weeklyUsed = limits ? Number((limits as any)[1]) : 0;
  const monthlyUsed = limits ? Number((limits as any)[2]) : 0;

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient) return;

    const fetchLeaderboard = async () => {
      try {
        // 1. Get User Count
        const count = await publicClient.readContract({
          address: CONTRACTS.protocol,
          abi: PROTOCOL_ABI,
          functionName: 'getUserCount',
        }) as bigint;

        const userCount = Number(count);
        if (userCount === 0) return;

        const usersData = [];

        // 2. Fetch Data for Each User
        // Note: In a production app, we'd use multicall3. Here we loop for simplicity.
        for (let i = 0; i < userCount; i++) {
          const userAddress = await publicClient.readContract({
            address: CONTRACTS.protocol,
            abi: PROTOCOL_ABI,
            functionName: 'allUsers',
            args: [BigInt(i)],
          }) as `0x${string}`;

          const scoreRes = await publicClient.readContract({
            address: CONTRACTS.protocol,
            abi: PROTOCOL_ABI,
            functionName: 'getScore',
            args: [userAddress],
          }) as [bigint, string];

          const depositedRes = await publicClient.readContract({
            address: CONTRACTS.protocol,
            abi: PROTOCOL_ABI,
            functionName: 'totalDeposited',
            args: [userAddress],
          }) as bigint;

          usersData.push({
            address: userAddress,
            score: Number(scoreRes[0]),
            level: scoreRes[1],
            deposited: Number(formatUnits(depositedRes, 6)),
          });
        }

        // 3. Sort by Score (Arc Sparks) Descending
        usersData.sort((a, b) => b.score - a.score);
        setLeaderboard(usersData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };

    fetchLeaderboard();
  }, [publicClient]);

  // Add a refresh button or interval if needed, but for now just on mount.

  return (
    <div className="min-h-screen text-white selection:bg-arc-teal/30 grid-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arc-teal to-arc-blue flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">ARC DISCIPLINE</span>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://faucet.testnet.arc.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="pill bg-arc-blue/10 text-arc-blue border-arc-blue/30 hover:bg-arc-blue/20 transition-colors"
            >
              <Droplets className="w-3 h-3" /> Faucet
            </a>
            {isConnected && (
              <div className="relative group">
                <div className="absolute inset-0 bg-arc-teal/20 rounded-full blur-md group-hover:bg-arc-teal/30 transition-all" />
                <div className="relative pill bg-arc-teal/10 text-arc-teal border-arc-teal/40 shadow-[0_0_15px_rgba(0,229,153,0.15)]">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="font-bold text-sm">{score.toString()}</span>
                  <span className="text-xs text-arc-teal/70 ml-0.5">pts</span>
                </div>
              </div>
            )}
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;
                return (
                  <div
                    {...(!ready ? { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } } : {})}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button onClick={openConnectModal} className="pill bg-arc-teal/10 text-arc-teal border-arc-teal/30 hover:bg-arc-teal/20 transition-colors">
                            <Wallet className="w-3 h-3" /> Connect Wallet
                          </button>
                        );
                      }
                      if (chain.unsupported) {
                        return (
                          <button onClick={openChainModal} className="pill bg-red-500/10 text-red-400 border-red-500/30">
                            Wrong network
                          </button>
                        );
                      }
                      return (
                        <button onClick={openAccountModal} className="pill hover:bg-white/10 transition-colors">
                          {balance && <span className="text-white/80">{parseFloat(balance.formatted).toFixed(2)} USDC</span>}
                          <span className="w-px h-3 bg-white/20 mx-1" />
                          <span className="text-white/60">{account.displayName}</span>
                        </button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center space-y-6 py-8"
        >
          <div className="pill mx-auto w-fit">
            <span className="w-2 h-2 rounded-full bg-arc-teal animate-pulse" />
            Live on Arc Testnet
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold">
            Code. Commit.{' '}
            <span className="gradient-text">Earn.</span>
          </h1>
          
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Bring your discipline on-chain. Stake USDC, validate GitHub commits, and earn Arc Sparks with every successful task.
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
            <div className="stat-card">
              <div className="text-2xl font-bold text-arc-teal">Live</div>
              <div className="text-xs text-white/50 mt-1">On Arc Testnet</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-arc-blue">24h</div>
              <div className="text-xs text-white/50 mt-1">Auto Deadline</div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-6 pt-2">
            <div className="feature-item">
              <CheckCircle2 className="w-4 h-4 text-arc-teal" />
              <span>AI-Validated Commits</span>
            </div>
            <div className="feature-item">
              <Lock className="w-4 h-4 text-arc-blue" />
              <span>On-Chain Staking</span>
            </div>
            <div className="feature-item">
              <Award className="w-4 h-4 text-arc-purple" />
              <span>Reward Pool</span>
            </div>
          </div>
        </motion.section>

        {/* Task Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TASKS.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`glass h-full hover:border-white/20 transition-all duration-300`}>
                <CardHeader className={`pb-2 ${task.bg} rounded-t-xl`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className={`text-xl ${task.color}`}>{task.title}</CardTitle>
                      <CardDescription className="text-white/50">{task.type} Task</CardDescription>
                    </div>
                    <Badge className={`${task.bg} ${task.color} border-0`}>{task.reward}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <p className="text-sm text-white/70">{task.desc}</p>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Clock className="w-3 h-3" /> Limit: {task.limit}
                  </div>
                  
                  <div className="space-y-2">
                    <Input 
                      placeholder="GitHub Username" 
                      className="glass border-white/10 text-white placeholder:text-white/30"
                      value={githubs[task.id]}
                      onChange={(e) => setGithubs({...githubs, [task.id]: e.target.value})}
                    />
                    <Input 
                      type="number" 
                      placeholder="Amount (USDC)" 
                      className="glass border-white/10 text-white placeholder:text-white/30"
                      value={amounts[task.id]}
                      onChange={(e) => setAmounts({...amounts, [task.id]: e.target.value})}
                    />
                  </div>

                  <Button 
                    className={`w-full ${task.bg} ${task.color} hover:brightness-110 border ${task.border}`}
                    onClick={() => {
                      if (approvingType === task.id && isApproved) {
                        handleDeposit(task.id);
                      } else {
                        handleApprove(task.id);
                      }
                    }}
                    disabled={isApproving || isDepositing || !githubs[task.id] || !amounts[task.id]}
                  >
                    {isDepositing ? 'Processing...' : isApproving ? 'Approving...' : isApproved && approvingType === task.id ? 'Deposit & Start' : 'Approve USDC'}
                  </Button>
                  {isApproved && approvingType === task.id && <p className="text-arc-teal text-xs text-center">Approved! Now click to deposit.</p>}
                  {isDeposited && <p className="text-arc-teal text-xs text-center">Deposit successful!</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* Monitor & Stats */}
        <section>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-arc-teal" /> Active Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-arc-teal">{2 - dailyUsed}</div>
                  <div className="text-xs text-white/50">Daily Left</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-arc-blue">{1 - weeklyUsed}</div>
                  <div className="text-xs text-white/50">Weekly Left</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-arc-purple">{1 - monthlyUsed}</div>
                  <div className="text-xs text-white/50">Monthly Left</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Arc Sparks Progress</span>
                  <span className="text-white">{score.toString()} / 1000</span>
                </div>
                <Progress value={(Number(score) / 1000) * 100} className="h-2 bg-white/10" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="text-sm text-white/60">
                  <span className="text-arc-gold font-medium">Reward Pool</span> • Score {'>'} 100
                </div>
                <Button 
                  size="sm"
                  className="bg-arc-gold text-black hover:bg-arc-gold/90 font-bold"
                  onClick={handleClaim}
                  disabled={isClaiming || Number(score) < 100}
                >
                  {isClaiming ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
              {isClaimed && <p className="text-arc-teal text-xs text-center">Reward claimed successfully!</p>}
            </CardContent>
          </Card>
        </section>

        {/* Leaderboard Section */}
        <section>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-arc-gold" /> Leaderboard
              </CardTitle>
              <CardDescription>Top developers ranked by Arc Sparks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-white/50 uppercase bg-white/5">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Rank</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3 text-right">Arc Sparks</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Total Deposited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      leaderboard.map((user, index) => (
                        <tr key={user.address} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="px-4 py-3 font-medium">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {user.address.slice(0, 6)}...{user.address.slice(-4)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs border-white/10">{user.level}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-arc-teal">
                            {user.score}
                          </td>
                          <td className="px-4 py-3 text-right text-white/70">
                            {user.deposited.toFixed(2)} USDC
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                          No users yet. Be the first to deposit!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
