import { task } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

async function main() {
  try {
    // Vérification des variables d'environnement requises
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is required in .env file");
    }
    if (!process.env.ENEDIS_ADDRESS) {
      throw new Error("ENEDIS_ADDRESS is required in .env file");
    }
    if (!process.env.POOL_ADDRESS) {
      throw new Error("POOL_ADDRESS is required in .env file");
    }

    // @ts-ignore
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Network: Polygon Mainnet");
    console.log("Explorer: https://www.polygonscan.com/");

    // Définition des adresses admin
    const mainDeployer = "0x5276736a83fb2Fb0601D01738cC81A612A3D9BCA";
    const secondAdmin = "0x8606684bD504EFBcb23B55C2729d77D328Fb62ad";
    const thirdAdmin = "0x4d6371994557c161B3133BE641C4Fa013169522d";
    const fourthAdmin = "0x8FC529c92f56E6787EF6110cDd7FBC1D7Cf6dCFa";

    // 1. Déploiement du JoulToken
    console.log("\nDeploying JoulToken...");
    // @ts-ignore
    const JoulToken = await hre.ethers.getContractFactory("JoulToken");
    const joulToken = await JoulToken.deploy();
    await joulToken.waitForDeployment();
    const joulTokenAddress = await joulToken.getAddress();
    console.log("JoulToken deployed to:", joulTokenAddress);
    console.log(`View on Polyscan: https://polygonscan.com/address/${joulTokenAddress}`);

    // 2. Déploiement du EnergyNFT
    console.log("\nDeploying EnergyNFT...");
    // @ts-ignore
    const EnergyNFT = await hre.ethers.getContractFactory("EnergyNFT");
    const energyNFT = await EnergyNFT.deploy();
    await energyNFT.waitForDeployment();
    const energyNFTAddress = await energyNFT.getAddress();
    console.log("EnergyNFT deployed to:", energyNFTAddress);
    console.log(`View on Polyscan: https://polygonscan.com/address/${energyNFTAddress}`);

    // 3. Déploiement du UserManagement
    console.log("\nDeploying UserManagement...");
    // @ts-ignore
    const UserManagement = await hre.ethers.getContractFactory("UserManagement");
    const userManagement = await UserManagement.deploy();
    await userManagement.waitForDeployment();
    const userManagementAddress = await userManagement.getAddress();
    console.log("UserManagement deployed to:", userManagementAddress);
    console.log(`View on Polyscan: https://polygonscan.com/address/${userManagementAddress}`);

    // 4. Déploiement du EnergyExchange
    console.log("\nDeploying EnergyExchange...");
    try {
      // Vérification des adresses
      console.log("Constructor arguments:");
      console.log("- JoulToken:", joulTokenAddress);
      console.log("- EnergyNFT:", energyNFTAddress);
      console.log("- UserManagement:", userManagementAddress);
      console.log("- ENEDIS:", process.env.ENEDIS_ADDRESS);
      console.log("- Pool:", process.env.POOL_ADDRESS);

      // @ts-ignore
      const EnergyExchange = await hre.ethers.getContractFactory("EnergyExchange");
      const energyExchange = await EnergyExchange.deploy(
        joulTokenAddress,
        energyNFTAddress,
        userManagementAddress,
        process.env.ENEDIS_ADDRESS,
        process.env.POOL_ADDRESS
      );
      await energyExchange.waitForDeployment();
      const energyExchangeAddress = await energyExchange.getAddress();
      console.log("EnergyExchange deployed to:", energyExchangeAddress);
      console.log(`View on Polyscan: https://polygonscan.com/address/${energyExchangeAddress}`);

      // Donner le DEFAULT_ADMIN_ROLE au déployeur sur EnergyNFT
      const NFT_DEFAULT_ADMIN_ROLE = await energyNFT.DEFAULT_ADMIN_ROLE();
      const nftAdminTx = await energyNFT.grantRole(NFT_DEFAULT_ADMIN_ROLE, deployer.address);
      await nftAdminTx.wait();
      console.log("Granted DEFAULT_ADMIN_ROLE to deployer for EnergyNFT");

      // 5. Déploiement du JoulVoting
      console.log("\nDeploying JoulVoting...");
      // @ts-ignore
      const JoulVoting = await hre.ethers.getContractFactory("JoulVoting");
      const joulVoting = await JoulVoting.deploy(joulTokenAddress);
      await joulVoting.waitForDeployment();
      const joulVotingAddress = await joulVoting.getAddress();
      console.log("JoulVoting deployed to:", joulVotingAddress);
      console.log(`View on Polyscan: https://polygonscan.com/address/${joulVotingAddress}`);

      // Donner le rôle ADMIN_ROLE aux administrateurs pour JoulVoting
      console.log("\nSetting up JoulVoting admin roles...");
      const VOTING_ADMIN_ROLE = await joulVoting.ADMIN_ROLE();
      
      // Main deployer
      const mainDeployerVotingTx = await joulVoting.grantRole(VOTING_ADMIN_ROLE, mainDeployer);
      await mainDeployerVotingTx.wait();
      console.log(`Granted ADMIN_ROLE to main deployer on JoulVoting: ${mainDeployer}`);
      
      // Second admin
      const secondAdminVotingTx = await joulVoting.grantRole(VOTING_ADMIN_ROLE, secondAdmin);
      await secondAdminVotingTx.wait();
      console.log(`Granted ADMIN_ROLE to second admin on JoulVoting: ${secondAdmin}`);
      
      // Third admin
      const thirdAdminVotingTx = await joulVoting.grantRole(VOTING_ADMIN_ROLE, thirdAdmin);
      await thirdAdminVotingTx.wait();
      console.log(`Granted ADMIN_ROLE to third admin on JoulVoting: ${thirdAdmin}`);
      
      // Fourth admin
      const fourthAdminVotingTx = await joulVoting.grantRole(VOTING_ADMIN_ROLE, fourthAdmin);
      await fourthAdminVotingTx.wait();
      console.log(`Granted ADMIN_ROLE to fourth admin on JoulVoting: ${fourthAdmin}`);

      // Configuration des rôles
      console.log("\nSetting up roles...");

      // Donner le rôle MINTER à EnergyExchange pour JoulToken
      const MINTER_ROLE = await joulToken.MINTER_ROLE();
      const mintTx = await joulToken.grantRole(MINTER_ROLE, energyExchangeAddress);
      await mintTx.wait();
      console.log("Granted MINTER_ROLE to EnergyExchange for JoulToken");

      // Donner le rôle MINTER à EnergyExchange pour EnergyNFT
      const NFT_MINTER_ROLE = await energyNFT.MINTER_ROLE();
      const nftMintTx = await energyNFT.grantRole(NFT_MINTER_ROLE, energyExchangeAddress);
      await nftMintTx.wait();
      console.log("Granted MINTER_ROLE to EnergyExchange for EnergyNFT");

      // Donner le rôle ADMIN à EnergyExchange pour UserManagement
      const USER_MANAGEMENT_ADMIN_ROLE = await userManagement.ADMIN_ROLE();
      const adminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, energyExchangeAddress);
      await adminTx.wait();
      console.log("Granted ADMIN_ROLE to EnergyExchange for UserManagement");

      // Explicitement donner le rôle ADMIN au déployeur pour UserManagement
      const deployerAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, deployer.address);
      await deployerAdminTx.wait();
      console.log("Granted ADMIN_ROLE to deployer for UserManagement");

      // Ajouter l'adresse du déployeur principal en tant qu'admin
      const mainDeployerTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, mainDeployer);
      await mainDeployerTx.wait();
      console.log(`Granted ADMIN_ROLE to main deployer: ${mainDeployer}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au déployeur principal
      const USER_MANAGEMENT_DEFAULT_ADMIN_ROLE = await userManagement.DEFAULT_ADMIN_ROLE();
      const mainDeployerDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, mainDeployer);
      await mainDeployerDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to main deployer on UserManagement: ${mainDeployer}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au déployeur principal sur EnergyExchange
      const ENEDIS_ROLE = await energyExchange.ENEDIS_ROLE();
      const ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE = await energyExchange.DEFAULT_ADMIN_ROLE();
      
      const mainDeployerEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, mainDeployer);
      await mainDeployerEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to main deployer: ${mainDeployer}`);
      
      const mainDeployerEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, mainDeployer);
      await mainDeployerEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to main deployer on EnergyExchange: ${mainDeployer}`);

      // Deuxième admin
      const secondAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, secondAdmin);
      await secondAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to second admin: ${secondAdmin}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au deuxième admin
      const secondAdminDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, secondAdmin);
      await secondAdminDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to second admin on UserManagement: ${secondAdmin}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au deuxième admin sur EnergyExchange
      const secondAdminEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, secondAdmin);
      await secondAdminEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to second admin: ${secondAdmin}`);
      
      const secondAdminEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, secondAdmin);
      await secondAdminEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to second admin on EnergyExchange: ${secondAdmin}`);

      // Troisième admin
      const thirdAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, thirdAdmin);
      await thirdAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to third admin: ${thirdAdmin}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au troisième admin
      const thirdAdminDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, thirdAdmin);
      await thirdAdminDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to third admin on UserManagement: ${thirdAdmin}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au troisième admin sur EnergyExchange
      const thirdAdminEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, thirdAdmin);
      await thirdAdminEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to third admin: ${thirdAdmin}`);
      
      const thirdAdminEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, thirdAdmin);
      await thirdAdminEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to third admin on EnergyExchange: ${thirdAdmin}`);

      // Quatrième admin
      const fourthAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, fourthAdmin);
      await fourthAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to fourth admin: ${fourthAdmin}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au quatrième admin
      const fourthAdminDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, fourthAdmin);
      await fourthAdminDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to fourth admin on UserManagement: ${fourthAdmin}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au quatrième admin sur EnergyExchange
      const fourthAdminEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, fourthAdmin);
      await fourthAdminEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to fourth admin: ${fourthAdmin}`);
      
      const fourthAdminEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, fourthAdmin);
      await fourthAdminEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to fourth admin on EnergyExchange: ${fourthAdmin}`);

      // Sauvegarder les adresses des contrats
      const deploymentInfo = {
        network: "polygon",
        contracts: {
          JoulToken: joulTokenAddress,
          EnergyNFT: energyNFTAddress,
          UserManagement: userManagementAddress,
          EnergyExchange: energyExchangeAddress,
          JoulVoting: joulVotingAddress,
          ENEDIS: process.env.ENEDIS_ADDRESS,
          Pool: process.env.POOL_ADDRESS
        },
        deployer: deployer.address,
        additionalAdmins: [
          mainDeployer,
          secondAdmin,
          thirdAdmin,
          fourthAdmin
        ],
        timestamp: new Date().toISOString()
      };

      // Sauvegarder les informations de déploiement
      const deploymentPath = path.join(__dirname, "..", "deployments");
      if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath);
      }
      fs.writeFileSync(
        path.join(deploymentPath, `deployment-${deploymentInfo.timestamp}.json`),
        JSON.stringify(deploymentInfo, null, 2)
      );

      // Mettre à jour les adresses pour le frontend
      const frontendAddresses = {
        JOUL_TOKEN: joulTokenAddress,
        ENERGY_NFT: energyNFTAddress,
        USER_MANAGEMENT: userManagementAddress,
        ENERGY_EXCHANGE: energyExchangeAddress,
        JOUL_VOTING: joulVotingAddress
      };

      const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "lib");
      if (!fs.existsSync(frontendPath)) {
        fs.mkdirSync(frontendPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(frontendPath, "contract-addresses.json"),
        JSON.stringify(frontendAddresses, null, 2)
      );

      console.log("\nDeployment successful! Contract addresses saved to:");
      console.log(`- ${deploymentPath}/deployment-${deploymentInfo.timestamp}.json`);
      console.log(`- ${frontendPath}/contract-addresses.json`);

      // Vérification des contrats sur Etherscan
      console.log("\nVerifying contracts on Polyscan...");

      // Attendre quelques blocs pour s'assurer que les contrats sont bien déployés
      console.log("Waiting for contract deployments to be confirmed...");
      await new Promise(resolve => setTimeout(resolve, 60000)); // 60 secondes d'attente pour mainnet

      try {
        // Vérifier JoulToken
        // @ts-ignore
        await hre.run("verify:verify", {
          address: joulTokenAddress,
          contract: "contracts/JoulToken.sol:JoulToken"
        });
        console.log("JoulToken verified successfully");

        // Vérifier EnergyNFT
        // @ts-ignore
        await hre.run("verify:verify", {
          address: energyNFTAddress,
          contract: "contracts/EnergyNFT.sol:EnergyNFT"
        });
        console.log("EnergyNFT verified successfully");

        // Vérifier UserManagement
        // @ts-ignore
        await hre.run("verify:verify", {
          address: userManagementAddress,
          contract: "contracts/UserManagement.sol:UserManagement"
        });
        console.log("UserManagement verified successfully");

        // Vérifier EnergyExchange
        // @ts-ignore
        await hre.run("verify:verify", {
          address: energyExchangeAddress,
          contract: "contracts/EnergyExchange.sol:EnergyExchange",
          constructorArguments: [
            joulTokenAddress,
            energyNFTAddress,
            userManagementAddress,
            process.env.ENEDIS_ADDRESS,
            process.env.POOL_ADDRESS
          ]
        });
        console.log("EnergyExchange verified successfully");

        // Vérifier JoulVoting
        // @ts-ignore
        await hre.run("verify:verify", {
          address: joulVotingAddress,
          contract: "contracts/JoulVoting.sol:JoulVoting",
          constructorArguments: [joulTokenAddress]
        });
        console.log("JoulVoting verified successfully");

      } catch (error) {
        console.error("Error during contract verification:", error);
        console.log("Contract verification failed, but deployment was successful");
      }

    } catch (error) {
      console.error("\nDeployment failed!");
      console.error("Error details:", error);
      throw error;
    }

  } catch (error) {
    console.error("\nDeployment failed!");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
