import { ethers } from "hardhat";
import { EnergyExchange, UserManagement } from "../typechain-types";

async function main() {
  const energyExchangeAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";  // From latest deployment
  const producerAddress = "0x699e2dB0CA77d29bcADF53c6ecCe6C05Abea6906";

  console.log('Using EnergyExchange contract at:', energyExchangeAddress);
  console.log('Adding producer:', producerAddress);

  // Get contract instance
  const EnergyExchangeFactory = await ethers.getContractFactory("EnergyExchange");
  const energyExchange = (await EnergyExchangeFactory.attach(
    energyExchangeAddress
  )) as EnergyExchange;

  try {
    // Add the user as a producer
    console.log('\nAdding user as producer...');
    const tx = await energyExchange.addUser(producerAddress, true);
    await tx.wait();
    console.log('Successfully added user as producer');

    // Verify the addition through UserManagement contract
    const userManagementAddress = await energyExchange.userManagement();
    const UserManagementFactory = await ethers.getContractFactory("UserManagement");
    const userManagement = (await UserManagementFactory.attach(
      userManagementAddress
    )) as UserManagement;

    const isProducer = await userManagement.isProducer(producerAddress);
    console.log('\nVerifying producer status:');
    console.log('isProducer():', isProducer);

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
