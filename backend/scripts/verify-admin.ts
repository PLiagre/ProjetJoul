import { ethers } from "hardhat";
import { UserManagement } from "../typechain-types";

async function main() {
  const userManagementAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const UserManagementFactory = await ethers.getContractFactory("UserManagement");
  const userManagement = (await UserManagementFactory.attach(
    userManagementAddress
  )) as UserManagement;

  const ADMIN_ROLE = await userManagement.ADMIN_ROLE();
  const hasRole = await userManagement.hasRole(ADMIN_ROLE, deployer);
  
  console.log(`Checking ADMIN_ROLE for address: ${deployer}`);
  console.log(`Has ADMIN_ROLE: ${hasRole}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
