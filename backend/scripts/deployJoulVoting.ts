import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying JoulVoting contract with account:", deployer.address);

  // Get the JOUL token addresses from both config files
  const contractAddressesPath = path.join(__dirname, "../../frontend/src/lib/contract-addresses.json");
  const contractAddressesAmoyPath = path.join(__dirname, "../../frontend/src/lib/contract-addresses-amoy.json");
  
  const contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  const contractAddressesAmoy = JSON.parse(fs.readFileSync(contractAddressesAmoyPath, "utf8"));
  
  const joulTokenAddress = contractAddresses.JOUL_TOKEN;
  const joulTokenAmoyAddress = contractAddressesAmoy.JOUL_TOKEN;

  if (!joulTokenAddress || !joulTokenAmoyAddress) {
    throw new Error("JOUL token address not found in contract addresses");
  }

  // Deploy JoulVoting contract
  const JoulVoting = await ethers.getContractFactory("JoulVoting");
  const joulVoting = await JoulVoting.deploy(joulTokenAddress);
  await joulVoting.waitForDeployment();

  const joulVotingAddress = await joulVoting.getAddress();
  console.log("JoulVoting deployed to:", joulVotingAddress);

  // Update both contract addresses files
  contractAddresses.JOUL_VOTING = joulVotingAddress;
  contractAddressesAmoy.JOUL_VOTING = joulVotingAddress;

  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  fs.writeFileSync(contractAddressesAmoyPath, JSON.stringify(contractAddressesAmoy, null, 2));
  console.log("Contract addresses updated in both files");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
