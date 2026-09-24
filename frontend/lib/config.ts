export const CHAIN_ID = 61999;
export const CHAIN_HEX = "0xf22f";
export const RPC_URL = "https://studio.genlayer.com/api";
export const EXPLORER_URL = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || "https://explorer-studio.genlayer.com";
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LATCH_CONTRACT || "";
export const NETWORK = {
  chainId: CHAIN_HEX,
  chainName: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
};

export function assertReleaseConfig() {
  const envChain = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || CHAIN_ID);
  const envRpc = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || RPC_URL;
  if (envChain !== CHAIN_ID) throw new Error(`Latch only supports chain ${CHAIN_ID}`);
  if (envRpc !== RPC_URL) throw new Error(`Latch only supports ${RPC_URL}`);
}
