'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Clock, Shield, Zap, Medal, TrendingUp, CheckCircle2, Lock, Award, 
  Wallet, Droplets, Twitter, Github, ExternalLink, LayoutDashboard, Users, 
  Settings, LogOut, ChevronRight, Activity, Target
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('dashboard');

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
        const count = await publicClient.readContract({
          address: CONTRACTS.protocol,
          abi: PROTOCOL_ABI,
          functionName: 'getUserCount',
        }) as bigint;

        const userCount = Number(count);
        if (userCount === 0) return;

        const usersData = [];

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

        usersData.sort((a, b) => b.score - a.score);
        setLeaderboard(usersData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };

    fetchLeaderboard();
  }, [publicClient]);

  return (
    <div className="flex h-screen bg-arc-bg text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#020617] border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arc-teal to-arc-blue flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">ARC DISCIPLINE</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-arc-teal/10 text-arc-teal' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'leaderboard' ? 'bg-arc-teal/10 text-arc-teal' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            Leaderboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors">
            <Activity className="w-4 h-4" />
            Activity
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="glass rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">Your Score</span>
              <Trophy className="w-3 h-3 text-arc-teal" />
            </div>
            <div className="text-xl font-bold text-white">{score}</div>
            <div className="text-xs text-arc-teal">{level}</div>
          </div>
          
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;
              return (
                <div {...(!ready ? { 'aria-hidden': true, style: { opacity: 0 } } : {})}>
                  {connected ? (
                    <button onClick={openAccountModal} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-arc-blue to-arc-purple flex items-center justify-center text-xs font-bold">
                        {account.displayName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{account.displayName}</div>
                        <div className="text-xs text-white/50 truncate">{balance ? `${parseFloat(balance.formatted).toFixed(2)} USDC` : ''}</div>
                      </div>
                    </button>
                  ) : (
                    <button onClick={openConnectModal} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-arc-teal text-black font-medium text-sm hover:bg-arc-teal/90 transition-colors">
                      <Wallet className="w-4 h-4" />
                      Connect
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-arc-bg/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-white/50">Welcome back, developer.</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-arc-blue/10 text-arc-blue border border-arc-blue/30 text-sm hover:bg-arc-blue/20 transition-colors">
              <Droplets className="w-3.5 h-3.5" /> Faucet
            </a>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 border-l-4 border-arc-teal">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Arc Sparks</span>
                <Trophy className="w-4 h-4 text-arc-teal" />
              </div>
              <div className="text-3xl font-bold">{score}</div>
              <div className="text-xs text-white/40 mt-1">Level: {level}</div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-6 border-l-4 border-arc-blue">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Daily Tasks</span>
                <CheckCircle2 className="w-4 h-4 text-arc-blue" />
              </div>
              <div className="text-3xl font-bold">{2 - dailyUsed} <span className="text-lg text-white/40">/ 2</span></div>
              <div className="text-xs text-white/40 mt-1">Remaining today</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6 border-l-4 border-arc-purple">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Weekly Tasks</span>
                <Target className="w-4 h-4 text-arc-purple" />
              </div>
              <div className="text-3xl font-bold">{1 - weeklyUsed} <span className="text-lg text-white/40">/ 1</span></div>
              <div className="text-xs text-white/40 mt-1">Remaining this week</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6 border-l-4 border-arc-gold">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Reward Pool</span>
                <Award className="w-4 h-4 text-arc-gold" />
              </div>
              <div className="text-3xl font-bold">Claim</div>
              <Button 
                size="sm"
                className="mt-2 w-full bg-arc-gold/10 text-arc-gold hover:bg-arc-gold/20 border border-arc-gold/30 text-xs h-7"
                onClick={handleClaim}
                disabled={isClaiming || Number(score) < 100}
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </Button>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Tasks & Heatmap */}
            <div className="lg:col-span-2 space-y-8">
              {/* Active Tasks */}
              <Card className="glass border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-arc-teal" /> Active Tasks
                  </CardTitle>
                  <CardDescription>Stake USDC and commit code to earn rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {TASKS.map((task, i) => (
                    <div key={task.id} className={`p-4 rounded-xl border ${task.border} ${task.bg} transition-all hover:brightness-110`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className={`font-bold text-lg ${task.color}`}>{task.title}</h3>
                            <Badge className={`${task.bg} ${task.color} border-0`}>{task.reward}</Badge>
                          </div>
                          <p className="text-sm text-white/60 mb-2">{task.desc}</p>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.limit}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full md:w-64">
                          <div className="grid grid-cols-2 gap-2">
                            <Input 
                              placeholder="GitHub User" 
                              className="glass border-white/10 text-xs text-white placeholder:text-white/30 h-8"
                              value={githubs[task.id]}
                              onChange={(e) => setGithubs({...githubs, [task.id]: e.target.value})}
                            />
                            <Input 
                              type="number" 
                              placeholder="USDC" 
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
                          {isDeposited && approvingType === task.id && <p className="text-arc-teal text-[10px] text-center">Success!</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Heatmap */}
              <Heatmap score={Number(score)} />
            </div>

            {/* Right Column: Leaderboard */}
            <div className="lg:col-span-1">
              <Card className="glass border-0 h-full flex flex-col">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-arc-gold" /> Leaderboard
                  </CardTitle>
                  <CardDescription>Top developers ranked by Arc Sparks.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((user, index) => (
                      <div key={user.address} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white/40 w-6 text-center">
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
                    <div className="flex flex-col items-center justify-center h-48 text-white/30">
                      <Users className="w-10 h-10 mb-3" />
                      <p className="text-sm">No users yet</p>
                      <p className="text-xs mt-1">Be the first to deposit!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
