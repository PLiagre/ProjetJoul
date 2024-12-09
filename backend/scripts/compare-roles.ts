import { ethers } from "hardhat";
import { keccak256, toBytes } from "viem";
import { UserManagement } from "../typechain-types";

async function main() {
  const userManagementAddress = "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9";
  const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  // Get contract instance
  const UserManagementFactory = await ethers.getContractFactory("UserManagement");
  const userManagement = (await UserManagementFactory.attach(
    userManagementAddress
  )) as UserManagement;

  // Calculate contract roles using the same method as the contract
  const contractAdminRole = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const contractProducerRole = ethers.keccak256(ethers.toUtf8Bytes("PRODUCER_ROLE"));
  const contractConsumerRole = ethers.keccak256(ethers.toUtf8Bytes("CONSUMER_ROLE"));

  // Calculate frontend roles (using viem's keccak256)
  const frontendAdminRole = keccak256(toBytes('ADMIN_ROLE'));
  const frontendProducerRole = keccak256(toBytes('PRODUCER_ROLE'));
  const frontendConsumerRole = keccak256(toBytes('CONSUMER_ROLE'));

  console.log('Contract ADMIN_ROLE:', contractAdminRole);
  console.log('Frontend ADMIN_ROLE:', frontendAdminRole);
  console.log('Match:', contractAdminRole === frontendAdminRole);
  console.log();

  console.log('Contract PRODUCER_ROLE:', contractProducerRole);
  console.log('Frontend PRODUCER_ROLE:', frontendProducerRole);
  console.log('Match:', contractProducerRole === frontendProducerRole);
  console.log();

  console.log('Contract CONSUMER_ROLE:', contractConsumerRole);
  console.log('Frontend CONSUMER_ROLE:', frontendConsumerRole);
  console.log('Match:', contractConsumerRole === frontendConsumerRole);
  console.log();

  // Check if deployer has admin role using contract's hash
  const hasRole = await userManagement.hasRole(contractAdminRole, deployer);
  console.log(`Deployer (${deployer}) has ADMIN_ROLE:`, hasRole);

  // Also check using frontend's hash to compare
  const hasRoleFrontend = await userManagement.hasRole(frontendAdminRole, deployer);
  console.log(`Deployer (${deployer}) has ADMIN_ROLE (using frontend hash):`, hasRoleFrontend);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
