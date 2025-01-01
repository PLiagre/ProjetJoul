import { ethers } from "hardhat";

async function main() {
  try {
    // Get network status
    console.log("Checking Polygon Amoy network status...");
    
    // Get latest block
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("Latest block number:", blockNumber);
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network name:", network.name);
    console.log("Network chain ID:", network.chainId);
    
    // Try to get latest block details
    const block = await ethers.provider.getBlock("latest");
    console.log("Latest block timestamp:", new Date(Number(block?.timestamp) * 1000).toLocaleString());
    console.log("Latest block hash:", block?.hash);
    
    // Check if we can get the gas price
    const feeData = await ethers.provider.getFeeData();
    console.log("Current gas price:", feeData.gasPrice?.toString());
    
    console.log("\nNetwork appears to be responding normally");
  } catch (error) {
    console.error("\nError checking network status:");
    console.error(error);
    console.log("\nNetwork might be experiencing issues");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
