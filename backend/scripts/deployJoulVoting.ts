import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying JoulVoting contract with account:", deployer.address);

  // Get the JOUL token address from the existing contract addresses
  const contractAddressesPath = path.join(__dirname, "../../frontend/src/lib/contract-addresses-amoy.json");
  const contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  const joulTokenAddress = contractAddresses.joulToken;

  if (!joulTokenAddress) {
    throw new Error("JOUL token address not found in contract addresses");
  }

  // Deploy JoulVoting contract
  const JoulVoting = await ethers.getContractFactory("JoulVoting");
  const joulVoting = await JoulVoting.deploy(joulTokenAddress);
  await joulVoting.waitForDeployment();

  const joulVotingAddress = await joulVoting.getAddress();
  console.log("JoulVoting deployed to:", joulVotingAddress);

  // Update contract addresses file
  contractAddresses.joulVoting = joulVotingAddress;
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  console.log("Contract addresses updated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
