import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  
  // Get the current nonce from the network
  const nonce = await ethers.provider.getTransactionCount(address);
  
  console.log(`Address: ${address}`);
  console.log(`Current nonce on network: ${nonce}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
