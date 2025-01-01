import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  
  // Get current fee data
  const feeData = await ethers.provider.getFeeData();
  
  // Send a small amount of MATIC to yourself with higher gas price
  const tx = await signer.sendTransaction({
    to: address,
    value: ethers.parseEther("0"),
    maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * BigInt(2) : undefined, // Double the current gas price
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * BigInt(2) : undefined,
    nonce: 64 // Use the current stuck nonce
  });

  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");
  
  await tx.wait();
  
  console.log("Transaction confirmed!");
  console.log("You can now proceed with new transactions.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
