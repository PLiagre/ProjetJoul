import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const HARDHAT_DEFAULT_PRIVATE_KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // This is the private key for 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      accounts: process.env.PRIVATE_KEY ? [HARDHAT_DEFAULT_PRIVATE_KEY, process.env.PRIVATE_KEY] : [HARDHAT_DEFAULT_PRIVATE_KEY],
      gas: 5000000,
      gasMultiplier: 1.5,
      blockGasLimit: 30000000
    },
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gas: 5000000,
      gasMultiplier: 2,
      blockGasLimit: 30000000,
      timeout: 60000
    },
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    polygon: {
      url: "https://polygon-mainnet.infura.io/v3/a4eab9824c4f45e4b54c43987b900dee",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gas: 12000000,
      gasMultiplier: 5,
      blockGasLimit: 30000000,
      timeout: 300000
    }
  },
  etherscan: {
    apiKey: {
      polygon: "R4JEH18X7TI1PRTNJFKC7GJPBWVS1HTAER",
      polygonAmoy: "R4JEH18X7TI1PRTNJFKC7GJPBWVS1HTAER"
    }
  }
};

export default config;
