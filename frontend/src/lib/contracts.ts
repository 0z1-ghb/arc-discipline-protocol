export const CONTRACTS = {
  protocol: '0x9BcfE9Fa208d07bAb530467F26d16838dF65c1B7',
  pool: '0xee70729Ac9156A801cDf395cDD68E5C06A58aD7f',
  usdc: '0x3600000000000000000000000000000000000000',
} as const;

export const PROTOCOL_ABI = [
  { inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }, { internalType: 'uint8', name: '_taskType', type: 'uint8' }, { internalType: 'string', name: '_githubUsername', type: 'string' }], name: 'deposit', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: '_user', type: 'address' }], name: 'getScore', outputs: [{ internalType: 'uint256', name: 'score', type: 'uint256' }, { internalType: 'string', name: 'level', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: '_user', type: 'address' }], name: 'getUserLimits', outputs: [{ internalType: 'uint256', name: 'dailyCount', type: 'uint256' }, { internalType: 'uint256', name: 'weeklyCount', type: 'uint256' }, { internalType: 'uint256', name: 'monthlyCount', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

export const POOL_ABI = [
  { inputs: [], name: 'claim', outputs: [], stateMutability: 'nonpayable', type: 'function' },
] as const;

export const ERC20_ABI = [
  { inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;
