// Configuration for Blockchain Network & Contract
const CONFIG = {
  // Default contract address (Update this with the address from Remix IDE after deployment)
  DEFAULT_CONTRACT_ADDRESS: "0x3523a03BdB20436214343f04192f81B438A2c264",
  
  // Supported Chain IDs (MetaMask Networks)
  SUPPORTED_NETWORKS: {
    11155111: {
      name: "Sepolia Testnet",
      currency: "ETH",
      explorer: "https://sepolia.etherscan.io",
      faucetUrl: "https://sepoliafaucet.com"
    },
    1: {
      name: "Ethereum Mainnet",
      currency: "ETH",
      explorer: "https://etherscan.io",
      faucetUrl: ""
    },
    17000: {
      name: "Holesky Testnet",
      currency: "ETH",
      explorer: "https://holesky.etherscan.io",
      faucetUrl: "https://holesky-faucet.pk910.de"
    },
    80002: {
      name: "Polygon Amoy Testnet",
      currency: "POL",
      explorer: "https://amoy.polygonscan.com",
      faucetUrl: "https://faucet.polygon.technology"
    },
    31337: {
      name: "Hardhat Localhost (8545)",
      currency: "ETH",
      explorer: "",
      faucetUrl: ""
    }
  },

  DEFAULT_ZONE: 1,
  // 1 ETH = 1e18 Wei
  WEI_PER_ETH: 1000000000000000000n
};
