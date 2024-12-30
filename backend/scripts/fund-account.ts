import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  
  // Your address
  const targetAddress = "0x5276736a83fb2Fb0601D01738cC81A612A3D9BCA";
  
  // Send 1000 ETH
  const tx = await signer.sendTransaction({
    to: targetAddress,
    value: ethers.parseEther("1000")
  });
  
  await tx.wait();
  console.log(`Sent 1000 ETH to ${targetAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
