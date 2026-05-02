'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Shield, Zap, Medal, TrendingUp, CheckCircle2, Lock, Award, Wallet, Droplets, Twitter, Github, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heatmap } from '@/components/ui/heatmap';
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
              href="https://faucet.circle.com/" 
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min">
          
          {/* Hero Section - Full Width */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="col-span-full glass rounded-xl p-8 text-center flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-arc-teal/5 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="pill mx-auto w-fit">
                <span className="w-2 h-2 rounded-full bg-arc-teal animate-pulse" />
                Live on Arc Testnet
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold">
                Code. Commit.{' '}
                <span className="gradient-text">Earn.</span>
              </h1>
              
              <p className="text-lg text-white/60 max-w-xl mx-auto">
                Stake USDC, validate GitHub commits, and earn Arc Sparks.
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <div className="feature-item">
                  <CheckCircle2 className="w-4 h-4 text-arc-teal" />
                  <span>AI-Validated</span>
                </div>
                <div className="feature-item">
                  <Lock className="w-4 h-4 text-arc-blue" />
                  <span>On-Chain</span>
                </div>
                <div className="feature-item">
                  <Award className="w-4 h-4 text-arc-purple" />
                  <span>Rewards</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Tasks Column (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-full md:col-span-5 glass rounded-xl p-5 flex flex-col gap-4 max-h-[600px] overflow-y-auto custom-scrollbar"
          >
            <h2 className="text-xl font-bold flex items-center gap-2 sticky top-0 bg-[#020617]/80 backdrop-blur-sm py-2 z-10">
              <Zap className="w-5 h-5 text-arc-teal" /> Active Tasks
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {TASKS.map((task, i) => (
                <div key={task.id} className={`p-4 rounded-lg border ${task.border} ${task.bg} transition-all hover:brightness-110`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className={`font-bold ${task.color}`}>{task.title}</h3>
                      <p className="text-xs text-white/50">{task.type} • Limit: {task.limit}</p>
                    </div>
                    <Badge className={`${task.bg} ${task.color} border-0`}>{task.reward}</Badge>
                  </div>
                  <p className="text-xs text-white/60 mb-3">{task.desc}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input 
                      placeholder="GitHub Username" 
                      className="glass border-white/10 text-xs text-white placeholder:text-white/30 h-8"
                      value={githubs[task.id]}
                      onChange={(e) => setGithubs({...githubs, [task.id]: e.target.value})}
                    />
                    <Input 
                      type="number" 
                      placeholder="Amount (USDC)" 
                      className="glass border-white/10 text-xs text-white placeholder:text-white/30 h-8"
                      value={amounts[task.id]}
                      onChange={(e) => setAmounts({...amounts, [task.id]: e.target.value})}
                    />
                  </div>

                  <Button 
                    size="sm"
                    className={`w-full h-8 text-xs ${task.bg} ${task.color} hover:brightness-110 border ${task.border}`}
                    onClick={() => {
                      if (approvingType === task.id && isApproved) {
                        handleDeposit(task.id);
                      } else {
                        handleApprove(task.id);
                      }
                    }}
                    disabled={isApproving || isDepositing || !githubs[task.id] || !amounts[task.id]}
                  >
                    {isDepositing ? 'Processing...' : isApproving ? 'Approving...' : isApproved && approvingType === task.id ? 'Deposit' : 'Approve USDC'}
                  </Button>
                  {isDeposited && approvingType === task.id && <p className="text-arc-teal text-[10px] text-center mt-1">Success!</p>}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Leaderboard Column (4 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-full md:col-span-4 glass rounded-xl p-5 flex flex-col h-[600px]"
          >
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Medal className="w-5 h-5 text-arc-gold" /> Leaderboard
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {leaderboard.length > 0 ? (
                leaderboard.map((user, index) => (
                  <div key={user.address} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white/40 w-6">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div>
                        <div className="text-xs font-mono text-white/80">{user.address.slice(0, 6)}...{user.address.slice(-4)}</div>
                        <div className="text-[10px] text-white/40">{user.level}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-arc-teal">{user.score}</div>
                      <div className="text-[10px] text-white/40">{user.deposited.toFixed(1)} USDC</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/30">
                  <Trophy className="w-8 h-8 mb-2" />
                  <p className="text-xs">No users yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar Column (3 cols) - Stats + Reward */}
          <div className="col-span-full md:col-span-3 flex flex-col gap-4">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-5 flex flex-col justify-between flex-1"
            >
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-arc-blue" /> Stats
                </h2>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="p-1.5 rounded bg-white/5">
                    <div className="text-base font-bold text-arc-teal">{2 - dailyUsed}</div>
                    <div className="text-[9px] text-white/50">Daily</div>
                  </div>
                  <div className="p-1.5 rounded bg-white/5">
                    <div className="text-base font-bold text-arc-blue">{1 - weeklyUsed}</div>
                    <div className="text-[9px] text-white/50">Weekly</div>
                  </div>
                  <div className="p-1.5 rounded bg-white/5">
                    <div className="text-base font-bold text-arc-purple">{1 - monthlyUsed}</div>
                    <div className="text-[9px] text-white/50">Monthly</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-white/60">
                  <span>Progress</span>
                  <span>{score.toString()} / 1000</span>
                </div>
                <Progress value={(Number(score) / 1000) * 100} className="h-1 bg-white/10" />
              </div>
            </motion.div>

            {/* Reward Pool - Compact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-xl p-4 flex flex-col justify-center items-center text-center border-arc-gold/20"
            >
              <Award className="w-5 h-5 text-arc-gold mb-1.5" />
              <h3 className="text-sm font-bold text-arc-gold mb-0.5">Reward Pool</h3>
              <p className="text-[10px] text-white/50 mb-2">Score {'>'} 100</p>
              <Button 
                size="sm"
                className="w-full bg-arc-gold/10 text-arc-gold hover:bg-arc-gold/20 border border-arc-gold/30 font-bold text-[10px] h-7"
                onClick={handleClaim}
                disabled={isClaiming || Number(score) < 100}
              >
                {isClaiming ? 'Claiming...' : 'Claim'}
              </Button>
              {isClaimed && <p className="text-arc-teal text-[9px] mt-1.5">Claimed!</p>}
            </motion.div>
          </div>

          {/* Heatmap - Full Width Bottom */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="col-span-full"
          >
            <Heatmap score={Number(score)} />
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-arc-teal to-arc-blue flex items-center justify-center">
              <Shield className="w-3 h-3 text-black" />
            </div>
            <div className="text-sm text-white/60">
              <span className="font-medium text-white">Arc Discipline</span>
              <span className="mx-2">•</span>
              © 2026 • Build on Arc
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="https://docs.arc.network/" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1">
              Docs <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://github.com/0z1-ghb/arc-discipline-protocol" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1">
              Audit <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a href="https://x.com/0z1_x" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://github.com/0z1-ghb" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
