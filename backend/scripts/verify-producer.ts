import { ethers } from "hardhat";
import { keccak256, toBytes } from "viem";
import { UserManagement } from "../typechain-types";

async function main() {
  const userManagementAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";  // From latest deployment
  const producerAddress = "0xA106FFeBF2152450b1958F0cA297dcEBFd883fb4";  // Updated address

  console.log('Using UserManagement contract at:', userManagementAddress);
  console.log('Checking producer status for:', producerAddress);

  // Get contract instance
  const UserManagementFactory = await ethers.getContractFactory("UserManagement");
  const userManagement = (await UserManagementFactory.attach(
    userManagementAddress
  )) as UserManagement;

  try {
    // Check producer status
    console.log('\nChecking producer status...');
    const isProducer = await userManagement.isProducer(producerAddress);
    console.log('isProducer():', isProducer);

    // Check using hasRole
    const producerRole = ethers.keccak256(ethers.toUtf8Bytes("PRODUCER_ROLE"));
    const hasRole = await userManagement.hasRole(producerRole, producerAddress);
    console.log('hasRole(PRODUCER_ROLE):', hasRole);

    // Get the admin address for verification
    const [deployer] = await ethers.getSigners();
    console.log('\nDeployer address:', deployer.address);
    const adminRole = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    const isAdmin = await userManagement.hasRole(adminRole, deployer.address);
    console.log('Deployer is admin:', isAdmin);

  } catch (error) {
    console.error('\nError occurred:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
