import { expect } from "chai";
import { ethers } from "hardhat";
import { EnergyNFT, JoulToken, EnergyExchange, UserManagement } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("EnergyNFT", function () {
  let energyNFT: EnergyNFT;
  let joulToken: JoulToken;
  let energyExchange: EnergyExchange;
  let userManagement: UserManagement;
  let owner: HardhatEthersSigner;
  let producer: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let enedis: HardhatEthersSigner;
  let pool: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, producer, consumer, enedis, pool] = await ethers.getSigners();

    // Deploy JoulToken
    const JoulToken = await ethers.getContractFactory("JoulToken");
    joulToken = await JoulToken.deploy();

    // Deploy UserManagement
    const UserManagement = await ethers.getContractFactory("UserManagement");
    userManagement = await UserManagement.deploy();

    // Deploy EnergyNFT
    const EnergyNFT = await ethers.getContractFactory("EnergyNFT");
    energyNFT = await EnergyNFT.deploy();

    // Deploy EnergyExchange
    const EnergyExchange = await ethers.getContractFactory("EnergyExchange");
    energyExchange = await EnergyExchange.deploy(
      await joulToken.getAddress(),
      await energyNFT.getAddress(),
      await userManagement.getAddress(),
      enedis.address,
      pool.address
    );

    // Setup roles
    const MINTER_ROLE = await energyNFT.MINTER_ROLE();
    await energyNFT.grantRole(MINTER_ROLE, await energyExchange.getAddress());
  });

  describe("Certificate Management", () => {
    it("Should mint certificate correctly", async () => {
      const quantity = 1000;
      const energyType = "Solar";
      const uri = "ipfs://test";

      await energyNFT.connect(owner).mintCertificate(
        consumer.address,
        quantity,
        energyType,
        uri
      );

      const tokenId = 0;
      expect(await energyNFT.ownerOf(tokenId)).to.equal(consumer.address);
      
      const data = await energyNFT.getCertificateData(tokenId);
      expect(data.quantity).to.equal(quantity);
      expect(data.energyType).to.equal(energyType);
      expect(data.producer).to.equal(consumer.address);
    });

    it("Should get certificate data correctly", async () => {
      const quantity = 1000;
      const energyType = "Solar";
      const uri = "ipfs://test";

      await energyNFT.connect(owner).mintCertificate(
        consumer.address,
        quantity,
        energyType,
        uri
      );

      const data = await energyNFT.getCertificateData(0);
      expect(data.quantity).to.equal(quantity);
      expect(data.energyType).to.equal(energyType);
      expect(data.producer).to.equal(consumer.address);
      expect(data.timestamp).to.be.gt(0);
    });

    it("Should burn certificate when called by owner", async () => {
      await energyNFT.connect(owner).mintCertificate(
        consumer.address,
        1000,
        "Solar",
        "ipfs://test"
      );

      await energyNFT.connect(consumer).burn(0);
      
      await expect(energyNFT.ownerOf(0))
        .to.be.revertedWithCustomError(energyNFT, "ERC721NonexistentToken");
    });

    it("Should not allow non-owner to burn certificate", async () => {
      await energyNFT.connect(owner).mintCertificate(
        consumer.address,
        1000,
        "Solar",
        "ipfs://test"
      );

      await expect(energyNFT.connect(producer).burn(0))
        .to.be.revertedWith("Caller is not owner or approved");
    });

    it("Should not allow getting data for non-existent certificate", async () => {
      await expect(energyNFT.getCertificateData(999))
        .to.be.revertedWith("Certificate does not exist");
    });

    it("Should return correct token URI", async () => {
      const uri = "ipfs://test";
      await energyNFT.connect(owner).mintCertificate(
        consumer.address,
        1000,
        "Solar",
        uri
      );

      expect(await energyNFT.tokenURI(0)).to.equal(uri);
    });

    it("Should not allow minting with zero quantity", async () => {
      await expect(
        energyNFT.connect(owner).mintCertificate(
          consumer.address,
          0,
          "Solar",
          "ipfs://test"
        )
      ).to.be.revertedWith("Quantity must be greater than 0");
    });

    it("Should not allow minting to zero address", async () => {
      await expect(
        energyNFT.connect(owner).mintCertificate(
          ethers.ZeroAddress,
          1000,
          "Solar",
          "ipfs://test"
        )
      ).to.be.revertedWith("Invalid recipient address");
    });
  });
});
