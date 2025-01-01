import { ethers } from "hardhat";

async function main() {
  try {
    console.log("Testing RPC connection to Polygon Amoy...");
    
    // Test basic RPC methods
    console.log("\nBasic RPC checks:");
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("Latest block:", blockNumber);
    
    const block = await ethers.provider.getBlock("latest");
    console.log("Block timestamp:", new Date(Number(block?.timestamp) * 1000).toLocaleString());
    
    const network = await ethers.provider.getNetwork();
    console.log("Network:", {
      name: network.name,
      chainId: network.chainId
    });

    // Test gas estimation
    console.log("\nGas estimation test:");
    const [signer] = await ethers.getSigners();
    const gasPrice = await ethers.provider.getFeeData();
    console.log("Gas price:", {
      gasPrice: gasPrice.gasPrice?.toString(),
      maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
    });

    // Test simple transaction gas estimation
    const estimatedGas = await ethers.provider.estimateGas({
      to: signer.address,
      value: ethers.parseEther("0.0001")
    });
    console.log("Estimated gas for simple transfer:", estimatedGas.toString());

    // Test provider response time
    console.log("\nProvider response time test:");
    const start = Date.now();
    await ethers.provider.getBlockNumber();
    const end = Date.now();
    console.log("Response time:", end - start, "ms");

    console.log("\nRPC appears to be functioning normally");
    
  } catch (error) {
    console.error("\nRPC check failed:");
    console.error(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
