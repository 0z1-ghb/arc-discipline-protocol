import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Chain } from 'viem';
import { http } from 'wagmi';

export const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 18, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
};

export const config = getDefaultConfig({
  appName: 'Arc Discipline Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'YOUR_PROJECT_ID',
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http() },
  ssr: true,
});
