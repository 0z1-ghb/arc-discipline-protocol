'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CONTRACTS, PROTOCOL_ABI, POOL_ABI } from '@/lib/contracts';
import { parseUnits } from 'viem';

const TASKS = [
  {
    id: 0,
    type: 'Daily',
    title: 'Bug Fix',
    desc: 'Fix small bugs and clean up code.',
    reward: '10 Pts',
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
    reward: '50 Pts',
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
    reward: '200 Pts',
    limit: '1 / month',
    color: 'text-arc-purple',
    border: 'border-arc-purple/30',
    bg: 'bg-arc-purple/5',
  },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [github, setGithub] = useState('');
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

  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { isLoading: isDepositing, isSuccess: isDeposited } = useWaitForTransactionReceipt({ hash: depositHash });

  const { writeContract: claim, data: claimHash } = useWriteContract();
  const { isLoading: isClaiming, isSuccess: isClaimed } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleDeposit = (type: number) => {
    const amt = amounts[type];
    if (!amt || !github || !address) return;
    deposit({
      address: CONTRACTS.protocol,
      abi: PROTOCOL_ABI,
      functionName: 'deposit',
      args: [parseUnits(amt, 6), type, github],
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

  return (
    <div className="min-h-screen text-white selection:bg-arc-teal/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arc-teal to-arc-blue flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">ARC DISCIPLINE</span>
          </div>
          <div className="flex items-center gap-4">
            {isConnected && (
              <Badge variant="outline" className="glass text-arc-teal border-arc-teal/30">
                <Trophy className="w-3 h-3 mr-1" /> {score.toString()} pts • {level}
              </Badge>
            )}
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center space-y-4 py-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
            Code. Commit. Earn.
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Bring your discipline on-chain. Earn USDC with GitHub commits, boost your score, and claim rewards.
          </p>
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
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
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
                    onClick={() => handleDeposit(task.id)}
                    disabled={isDepositing || !github || !amounts[task.id]}
                  >
                    {isDepositing ? 'Processing...' : 'Deposit & Start'}
                  </Button>
                  {isDeposited && <p className="text-arc-teal text-xs text-center">Deposit successful!</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* Monitor & Stats */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <span className="text-white/60">Score Progress</span>
                  <span className="text-white">{score.toString()} / 1000</span>
                </div>
                <Progress value={(Number(score) / 1000) * 100} className="h-2 bg-white/10" />
              </div>
            </CardContent>
          </Card>

          {/* Claim Section */}
          <Card className="glass border-arc-gold/20">
            <CardHeader>
              <CardTitle className="text-arc-gold">Reward Pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60">Claim rewards from the pool if your score is above 100.</p>
              <Button 
                className="w-full bg-arc-gold text-black hover:bg-arc-gold/90 font-bold"
                onClick={handleClaim}
                disabled={isClaiming || Number(score) < 100}
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </Button>
              {isClaimed && <p className="text-arc-teal text-xs text-center">Reward claimed successfully!</p>}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
