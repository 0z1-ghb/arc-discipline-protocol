'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import protocolAbi from '../abi/DisciplineProtocol.json';
import rewardPoolAbi from '../abi/RewardPool.json';
import erc20Abi from '../abi/ERC20.json';

const PROTOCOL_ADDRESS = '0xa3E9E5EDbC28762Bbf07FeeE5FE43EC05A75495a';
const POOL_ADDRESS = '0xC3Cdf0c7EeF66eb3B79a678C8337536538F650CD';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [goal, setGoal] = useState('');
  const [github, setGithub] = useState('');

  // Read Score
  const { data: scoreData } = useReadContract({
    address: PROTOCOL_ADDRESS as `0x${string}`,
    abi: protocolAbi.abi,
    functionName: 'getScore',
    args: [address || '0x0000000000000000000000000000000000000000'],
  });

  // USDC Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi.abi,
    functionName: 'allowance',
    args: [address || '0x0000000000000000000000000000000000000000', PROTOCOL_ADDRESS],
  });

  // Approve
  const { writeContract: approve, data: approveHash, reset: resetApprove } = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Deposit
  const { writeContract: deposit, data: depositHash, reset: resetDeposit } = useWriteContract();
  const { isLoading: isDepositing, isSuccess: isDeposited } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Claim
  const { writeContract: claim, data: claimHash } = useWriteContract();
  const { isLoading: isClaiming, isSuccess: isClaimed } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  const handleApprove = () => {
    if (!amount) return;
    approve({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi.abi,
      functionName: 'approve',
      args: [PROTOCOL_ADDRESS, parseUnits(amount, 6)],
    });
  };

  const handleDeposit = () => {
    if (!amount || !goal || !github) return;
    deposit({
      address: PROTOCOL_ADDRESS as `0x${string}`,
      abi: protocolAbi.abi,
      functionName: 'deposit',
      args: [parseUnits(amount, 6), goal, github],
    });
  };

  const handleClaim = () => {
    claim({
      address: POOL_ADDRESS as `0x${string}`,
      abi: rewardPoolAbi.abi,
      functionName: 'claim',
    });
  };

  const isAllowanceSufficient = allowance && amount ? allowance >= parseUnits(amount, 6) : false;

  return (
    <main className="min-h-screen bg-[#0b0e11] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-[#00e599]">Arc Discipline Protocol</h1>
          <ConnectButton />
        </header>

        {isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Score Card */}
            <div className="bg-[#151a21] p-6 rounded-xl border border-gray-800">
              <h2 className="text-gray-400 text-sm mb-2">Your Reputation</h2>
              <div className="text-4xl font-bold">
                {scoreData ? `${scoreData[0].toString()} pts` : 'Loading...'}
              </div>
              <div className="text-[#00e599] mt-1">
                {scoreData ? scoreData[1] : ''}
              </div>
            </div>

            {/* Deposit Card */}
            <div className="bg-[#151a21] p-6 rounded-xl border border-gray-800">
              <h2 className="text-xl font-bold mb-4">New Commitment</h2>
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  className="w-full bg-[#0b0e11] border border-gray-700 rounded p-2 text-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Goal (e.g. Fix login bug)"
                  className="w-full bg-[#0b0e11] border border-gray-700 rounded p-2 text-white"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="GitHub Username"
                  className="w-full bg-[#0b0e11] border border-gray-700 rounded p-2 text-white"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
                
                {!isAllowanceSufficient ? (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || !amount}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded transition disabled:opacity-50"
                  >
                    {isApproving ? 'Approving...' : 'Approve USDC'}
                  </button>
                ) : (
                  <button
                    onClick={handleDeposit}
                    disabled={isDepositing || !amount || !goal || !github}
                    className="w-full bg-[#00e599] hover:bg-[#00cc88] text-black font-bold py-2 rounded transition disabled:opacity-50"
                  >
                    {isDepositing ? 'Depositing...' : 'Deposit & Start'}
                  </button>
                )}
                
                {isApproved && <p className="text-yellow-400 text-sm">Approved! Now click Deposit.</p>}
                {isDeposited && <p className="text-green-400 text-sm">Deposit successful!</p>}
              </div>
            </div>

            {/* Reward Pool Card */}
            <div className="bg-[#151a21] p-6 rounded-xl border border-gray-800 md:col-span-2">
              <h2 className="text-xl font-bold mb-4">Reward Pool</h2>
              <p className="text-gray-400 mb-4">
                Claim rewards from the penalty pool based on your score.
              </p>
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded transition disabled:opacity-50"
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </button>
              {isClaimed && <p className="text-green-400 text-sm mt-2">Reward claimed!</p>}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">Connect your wallet to start</p>
          </div>
        )}
      </div>
    </main>
  );
}
