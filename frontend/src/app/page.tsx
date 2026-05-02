'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Zap, Medal, Trophy, Droplets, Wallet, 
  LayoutDashboard, GitBranch, Award, Settings, 
  Globe, Bell, ChevronRight, Clock, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heatmap } from '@/components/ui/heatmap';
import { CONTRACTS, PROTOCOL_ABI, POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { parseUnits, formatUnits } from 'viem';

const TASKS = [
  {
    id: 0,
    title: 'Optimize Gas: L2 Bridging',
    desc: 'Reduce calldata overhead for rollup submissions.',
    reward: '10 Arc Sparks',
    status: 'High Priority',
    color: 'text-arc-teal',
    border: 'border-l-arc-teal',
  },
  {
    id: 1,
    title: 'UI: Governance Portal',
    desc: 'Implement voting visualizer for proposal #42.',
    reward: '50 Arc Sparks',
    status: 'In Progress',
    color: 'text-arc-blue',
    border: 'border-l-arc-blue',
  },
  {
    id: 2,
    title: 'New Project: Staking Module',
    desc: 'Develop a new module or project from scratch.',
    reward: '200 Arc Sparks',
    status: 'Open',
    color: 'text-arc-purple',
    border: 'border-l-arc-purple',
  },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [githubs, setGithubs] = useState<Record<number, string>>({ 0: '', 1: '', 2: '' });
  const [amounts, setAmounts] = useState<Record<number, string>>({ 0: '', 1: '', 2: '' });
  const [activeTab, setActiveTab] = useState('build');

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
    <div className="flex flex-col h-screen bg-[#09090b] text-white overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#09090b]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold tracking-tight">ARC DISCIPLINE</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <button onClick={() => setActiveTab('build')} className={`font-medium ${activeTab === 'build' ? 'text-arc-blue border-b-2 border-arc-blue pb-4 mt-4' : 'text-white/50 hover:text-white'}`}>Build</button>
            <button onClick={() => setActiveTab('tasks')} className={`font-medium ${activeTab === 'tasks' ? 'text-arc-blue border-b-2 border-arc-blue pb-4 mt-4' : 'text-white/50 hover:text-white'}`}>Tasks</button>
            <button onClick={() => setActiveTab('leaderboard')} className={`font-medium ${activeTab === 'leaderboard' ? 'text-arc-blue border-b-2 border-arc-blue pb-4 mt-4' : 'text-white/50 hover:text-white'}`}>Leaderboard</button>
            <button className="text-white/50 hover:text-white font-medium">Governance</button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Globe className="w-4 h-4 text-white/50 cursor-pointer hover:text-white" />
          <Bell className="w-4 h-4 text-white/50 cursor-pointer hover:text-white" />
          <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-white/70 hover:text-white">Faucet</a>
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;
              return (
                <div {...(!ready ? { 'aria-hidden': true, style: { opacity: 0 } } : {})}>
                  {connected ? (
                    <button onClick={openAccountModal} className="px-3 py-1.5 rounded bg-white/5 text-xs hover:bg-white/10 transition">
                      {account.displayName}
                    </button>
                  ) : (
                    <button onClick={openConnectModal} className="px-3 py-1.5 rounded bg-arc-blue/20 text-arc-blue text-xs font-medium hover:bg-arc-blue/30 transition">
                      Connect Wallet
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-[#09090b] p-4 flex flex-col gap-6 hidden lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-arc-blue to-arc-purple flex items-center justify-center text-xs font-bold">
              {address ? address.slice(2, 4) : 'AD'}
            </div>
            <div>
              <div className="text-sm font-medium">ARC DEVELOPER</div>
              <div className="text-[10px] text-white/40">Arc Testnet Active</div>
            </div>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-arc-blue/10 text-arc-blue text-sm font-medium">
              <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:bg-white/5 hover:text-white text-sm transition">
              <GitBranch className="w-4 h-4" /> Repositories
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:bg-white/5 hover:text-white text-sm transition">
              <Award className="w-4 h-4" /> Rewards
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:bg-white/5 hover:text-white text-sm transition">
              <Settings className="w-4 h-4" /> Settings
            </button>
          </nav>

          <div className="mt-auto">
            <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm">
              Deploy Contract
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-arc-blue">
              Code. Commit. Earn.
            </h1>
            <p className="text-white/50 max-w-2xl">
              High-performance contributions for the Arc Protocol. Disciplined execution rewarded in Arc Sparks.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Active Tasks (Left - 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-white/80">Active Tasks</h2>
                <Badge variant="outline" className="bg-arc-blue/10 text-arc-blue border-arc-blue/20 text-[10px]">3 Available</Badge>
              </div>
              
              {TASKS.map((task, i) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass rounded-xl p-5 border-l-4 ${task.border} bg-white/[0.02] hover:bg-white/[0.04] transition-all group`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-arc-blue transition-colors">{task.title}</h3>
                      <p className="text-xs text-white/40 mt-1">{task.desc}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${task.color}`}>{task.reward}</div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider">{task.status}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        placeholder="GitHub User" 
                        className="bg-black/20 border-white/10 text-xs text-white placeholder:text-white/20 h-8 focus-visible:ring-arc-blue"
                        value={githubs[task.id]}
                        onChange={(e) => setGithubs({...githubs, [task.id]: e.target.value})}
                      />
                      <Input 
                        type="number" 
                        placeholder="USDC" 
                        className="bg-black/20 border-white/10 text-xs text-white placeholder:text-white/20 h-8 focus-visible:ring-arc-blue"
                        value={amounts[task.id]}
                        onChange={(e) => setAmounts({...amounts, [task.id]: e.target.value})}
                      />
                    </div>
                    <Button 
                      size="sm"
                      className="w-full h-8 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      onClick={() => {
                        if (approvingType === task.id && isApproved) {
                          handleDeposit(task.id);
                        } else {
                          handleApprove(task.id);
                        }
                      }}
                      disabled={isApproving || isDepositing || !githubs[task.id] || !amounts[task.id]}
                    >
                      {isDepositing ? 'Processing...' : isApproving ? 'Approving...' : isApproved && approvingType === task.id ? 'Submit PR' : 'Approve USDC'}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Top Architects (Middle - 4 cols) */}
            <div className="lg:col-span-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white/80">Top Architects</h2>
              </div>
              <div className="glass rounded-xl p-1 bg-white/[0.02]">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((user, index) => (
                    <div key={user.address} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-5 ${index === 0 ? 'text-arc-gold' : 'text-white/30'}`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-[10px]">
                          {user.address.slice(2, 4)}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white group-hover:text-arc-blue transition-colors">
                            {user.address.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">{user.score.toLocaleString()}</div>
                        <div className="text-[10px] text-white/30">Sparks</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-white/20 text-sm">
                    No architects yet.
                  </div>
                )}
              </div>
            </div>

            {/* Your Vault (Right - 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-sm font-semibold text-white/80 mb-2">Your Vault</h2>
              
              <div className="glass rounded-xl p-5 bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5">
                <div className="text-xs text-white/40 mb-1">Claimable Rewards</div>
                <div className="text-3xl font-bold text-white mb-4">
                  {score} <span className="text-sm font-normal text-white/40">Sparks</span>
                </div>
                
                <Button 
                  className="w-full bg-arc-blue hover:bg-arc-blue/90 text-white text-sm font-medium h-9"
                  onClick={handleClaim}
                  disabled={isClaiming || Number(score) < 100}
                >
                  {isClaiming ? 'Claiming...' : 'Claim to Wallet'}
                </Button>
                
                <div className="flex justify-between mt-4 text-[10px] text-white/30">
                  <span>Next Batch: 14h</span>
                  <span>Fee: 0.002 ETH</span>
                </div>
              </div>

              <div className="glass rounded-xl p-4 bg-white/[0.02] border border-white/5">
                <div className="text-xs text-white/40 mb-1">Contribution Rank</div>
                <div className="text-lg font-bold text-white">
                  {leaderboard.length > 0 && leaderboard.findIndex(u => u.address === address) !== -1 
                    ? `Top ${Math.round(((leaderboard.findIndex(u => u.address === address) + 1) / leaderboard.length) * 100)}%` 
                    : 'Unranked'}
                </div>
              </div>

              <div className="glass rounded-xl p-4 bg-white/[0.02] border border-white/5">
                <div className="text-xs text-white/40 mb-1">Streak</div>
                <div className="text-lg font-bold text-arc-teal">
                  {dailyUsed > 0 ? 'Active' : 'Start Today'}
                </div>
              </div>
            </div>

            {/* Coding Consistency (Bottom - Full Width) */}
            <div className="col-span-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white/80">Coding Consistency</h2>
                  <p className="text-xs text-white/40">Your contribution history over the last 6 months.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 rounded-sm bg-white/5" />
                    <div className="w-2 h-2 rounded-sm bg-arc-blue/30" />
                    <div className="w-2 h-2 rounded-sm bg-arc-blue" />
                  </div>
                  <span>More</span>
                </div>
              </div>
              <div className="glass rounded-xl p-6 bg-white/[0.02] border border-white/5">
                <Heatmap score={Number(score)} />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
