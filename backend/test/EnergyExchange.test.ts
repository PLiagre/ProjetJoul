import { expect } from "chai";
import { ethers } from "hardhat";
import {
  Contract,
  ContractTransactionResponse,
  EventLog,
  Log
} from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  EnergyExchange,
  JoulToken,
  EnergyNFT,
  UserManagement,
} from "../typechain-types";

describe("EnergyExchange", function () {
  let energyExchange: EnergyExchange;
  let joulToken: JoulToken;
  let energyNFT: EnergyNFT;
  let userManagement: UserManagement;
  let owner: HardhatEthersSigner;
  let enedis: HardhatEthersSigner;
  let producer: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let pool: HardhatEthersSigner;
  let platform: HardhatEthersSigner;

  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ENEDIS_ROLE = ethers.id("ENEDIS_ROLE");
  const PAUSER_ROLE = ethers.id("PAUSER_ROLE");
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const VALIDATION_DEADLINE = 24 * 60 * 60; // 24 hours in seconds

  beforeEach(async function () {
    [owner, enedis, producer, consumer, pool, platform] = await ethers.getSigners();

    // Deploy JoulToken
    const JoulToken = await ethers.getContractFactory("JoulToken");
    joulToken = await JoulToken.deploy() as JoulToken;
    await joulToken.waitForDeployment();

    // Deploy EnergyNFT
    const EnergyNFT = await ethers.getContractFactory("EnergyNFT");
    energyNFT = await EnergyNFT.deploy() as EnergyNFT;
    await energyNFT.waitForDeployment();

    // Deploy UserManagement
    const UserManagement = await ethers.getContractFactory("UserManagement");
    userManagement = await UserManagement.deploy() as UserManagement;
    await userManagement.waitForDeployment();

    // Deploy EnergyExchange
    const EnergyExchange = await ethers.getContractFactory("EnergyExchange");
    energyExchange = await EnergyExchange.deploy(
      await joulToken.getAddress(),
      await energyNFT.getAddress(),
      await userManagement.getAddress(),
      await enedis.getAddress(),
      await pool.getAddress()
    ) as EnergyExchange;
    await energyExchange.waitForDeployment();

    // Setup roles
    await joulToken.grantRole(await joulToken.MINTER_ROLE(), await energyExchange.getAddress());
    await energyNFT.grantRole(await energyNFT.MINTER_ROLE(), await energyExchange.getAddress());
    await userManagement.grantRole(ADMIN_ROLE, await energyExchange.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await energyExchange.hasRole(DEFAULT_ADMIN_ROLE, await owner.getAddress())).to.be.true;
    });

    it("Should set the right ENEDIS role", async function () {
      expect(await energyExchange.hasRole(ENEDIS_ROLE, await enedis.getAddress())).to.be.true;
    });

    it("Should set the right contract addresses", async function () {
      expect(await energyExchange.joulToken()).to.equal(await joulToken.getAddress());
      expect(await energyExchange.energyNFT()).to.equal(await energyNFT.getAddress());
      expect(await energyExchange.userManagement()).to.equal(await userManagement.getAddress());
      expect(await energyExchange.enedisAddress()).to.equal(await enedis.getAddress());
      expect(await energyExchange.poolAddress()).to.equal(await pool.getAddress());
    });
  });

  describe("User Management", function () {
    it("Should allow admin to add a producer", async function () {
      await energyExchange.addUser(await producer.getAddress(), true);
      expect(await userManagement.isProducer(await producer.getAddress())).to.be.true;
    });

    it("Should allow admin to add a consumer", async function () {
      await energyExchange.addUser(await consumer.getAddress(), false);
      expect(await userManagement.isConsumer(await consumer.getAddress())).to.be.true;
    });

    it("Should allow admin to remove a user", async function () {
      await energyExchange.addUser(await producer.getAddress(), true);
      await energyExchange.removeUser(await producer.getAddress());
      expect(await userManagement.isProducer(await producer.getAddress())).to.be.false;
    });

    it("Should not allow non-admin to add a user", async function () {
      await expect(
        energyExchange.connect(producer).addUser(await consumer.getAddress(), false)
      ).to.be.revertedWithCustomError(energyExchange, "AccessControlUnauthorizedAccount")
        .withArgs(await producer.getAddress(), DEFAULT_ADMIN_ROLE);
    });
  });

  describe("Offer Creation and Validation", function () {
    beforeEach(async function () {
      await energyExchange.addUser(await producer.getAddress(), true);
    });

    it("Should allow producer to create an offer", async function () {
      const tx = await energyExchange.connect(producer).createOffer(
        1000n, // quantity
        ethers.parseEther("0.001"), // pricePerUnit
        "solar"
      );

      const receipt = await tx.wait();
      const event = (receipt?.logs[0] as EventLog);
      expect(event.eventName).to.equal("OfferCreated");
      expect(event.args[1]).to.equal(await producer.getAddress()); // producer is the second argument
    });

    it("Should not allow non-producer to create an offer", async function () {
      await expect(
        energyExchange.connect(consumer).createOffer(1000n, ethers.parseEther("0.001"), "solar")
      ).to.be.revertedWith("Not a producer");
    });

    it("Should allow ENEDIS to validate offer creation", async function () {
      const tx = await energyExchange.connect(producer).createOffer(
        1000n,
        ethers.parseEther("0.001"),
        "solar"
      );
      const receipt = await tx.wait();
      const event = (receipt?.logs[0] as EventLog);
      const offerId = event.args[0]; // offerId is the first argument

      await energyExchange.connect(enedis).validateOfferCreation(offerId, true);
      const offer = await energyExchange.offers(offerId);
      expect(offer.isActive).to.be.true;
    });

    it("Should mint JOUL tokens on successful offer validation", async function () {
      const tx = await energyExchange.connect(producer).createOffer(
        1000n,
        ethers.parseEther("0.001"),
        "solar"
      );
      const receipt = await tx.wait();
      const event = (receipt?.logs[0] as EventLog);
      const offerId = event.args[0];

      const balanceBefore = await joulToken.balanceOf(await producer.getAddress());
      await energyExchange.connect(enedis).validateOfferCreation(offerId, true);
      const balanceAfter = await joulToken.balanceOf(await producer.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(10n); // 1% of 1000
    });
  });

  describe("Offer Purchase and Validation", function () {
    let offerId: bigint;
    const quantity = 1000n;
    const pricePerUnit = ethers.parseEther("0.001");

    beforeEach(async function () {
      await energyExchange.addUser(await producer.getAddress(), true);
      await energyExchange.addUser(await consumer.getAddress(), false);

      const tx = await energyExchange.connect(producer).createOffer(
        quantity,
        pricePerUnit,
        "solar"
      );
      const receipt = await tx.wait();
      const event = (receipt?.logs[0] as EventLog);
      offerId = event.args[0];
      await energyExchange.connect(enedis).validateOfferCreation(offerId, true);
    });

    it("Should allow consumer to purchase an offer", async function () {
      const totalPrice = quantity * pricePerUnit;
      await expect(
        energyExchange.connect(consumer).purchaseOffer(offerId, { value: totalPrice })
      ).to.emit(energyExchange, "OfferPurchased")
        .withArgs(offerId, await consumer.getAddress(), totalPrice);
    });

    it("Should not allow purchase with incorrect payment", async function () {
      const incorrectPrice = ethers.parseEther("0.5");
      await expect(
        energyExchange.connect(consumer).purchaseOffer(offerId, { value: incorrectPrice })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should distribute fees correctly on validation", async function () {
      const totalPrice = quantity * pricePerUnit;
      await energyExchange.connect(consumer).purchaseOffer(offerId, { value: totalPrice });

      const producerBalanceBefore = await ethers.provider.getBalance(await producer.getAddress());
      const enedisBalanceBefore = await ethers.provider.getBalance(await enedis.getAddress());
      const poolBalanceBefore = await ethers.provider.getBalance(await pool.getAddress());

      await energyExchange.connect(enedis).validateAndDistribute(offerId, true);

      const producerBalanceAfter = await ethers.provider.getBalance(await producer.getAddress());
      const enedisBalanceAfter = await ethers.provider.getBalance(await enedis.getAddress());
      const poolBalanceAfter = await ethers.provider.getBalance(await pool.getAddress());

      // Check fee distribution (75%, 20%, 3%, 2%) with larger tolerance for gas costs
      const tolerance = ethers.parseEther("0.001"); // Increased tolerance
      expect(producerBalanceAfter - producerBalanceBefore).to.be.closeTo(
        totalPrice * 750n / 1000n,
        tolerance
      );
      expect(enedisBalanceAfter - enedisBalanceBefore).to.be.closeTo(
        totalPrice * 200n / 1000n,
        tolerance
      );
      expect(poolBalanceAfter - poolBalanceBefore).to.be.closeTo(
        totalPrice * 20n / 1000n,
        tolerance
      );
    });

    it("Should mint NFT certificate on successful validation", async function () {
      const totalPrice = quantity * pricePerUnit;
      await energyExchange.connect(consumer).purchaseOffer(offerId, { value: totalPrice });
      await energyExchange.connect(enedis).validateAndDistribute(offerId, true);

      expect(await energyNFT.balanceOf(await consumer.getAddress())).to.equal(1n);
    });

    it("Should refund buyer on failed validation", async function () {
      const totalPrice = quantity * pricePerUnit;
      await energyExchange.connect(consumer).purchaseOffer(offerId, { value: totalPrice });

      const balanceBefore = await ethers.provider.getBalance(await consumer.getAddress());
      await energyExchange.connect(enedis).validateAndDistribute(offerId, false);
      const balanceAfter = await ethers.provider.getBalance(await consumer.getAddress());

      expect(balanceAfter - balanceBefore).to.be.closeTo(
        totalPrice,
        ethers.parseEther("0.01") // Allow for gas costs
      );
    });
  });

  describe("Deadline Management", function () {
    let offerId: bigint;
    const quantity = 1000n;
    const pricePerUnit = ethers.parseEther("0.001");

    beforeEach(async function () {
      await energyExchange.addUser(await producer.getAddress(), true);
      await energyExchange.addUser(await consumer.getAddress(), false);

      const tx = await energyExchange.connect(producer).createOffer(quantity, pricePerUnit, "solar");
      const receipt = await tx.wait();
      const event = (receipt?.logs[0] as EventLog);
      offerId = event.args[0];
      await energyExchange.connect(enedis).validateOfferCreation(offerId, true);
      
      const totalPrice = quantity * pricePerUnit;
      await energyExchange.connect(consumer).purchaseOffer(offerId, { value: totalPrice });
    });

    it("Should not allow validation after deadline", async function () {
      await time.increase(VALIDATION_DEADLINE + 1);
      
      await expect(
        energyExchange.connect(enedis).validateAndDistribute(offerId, true)
      ).to.be.revertedWith("Validation deadline exceeded");
    });

    it("Should allow cancellation after deadline", async function () {
      await time.increase(VALIDATION_DEADLINE + 1);
      
      const balanceBefore = await ethers.provider.getBalance(await consumer.getAddress());
      await energyExchange.connect(consumer).cancelExpiredOffer(offerId);
      const balanceAfter = await ethers.provider.getBalance(await consumer.getAddress());

      expect(balanceAfter - balanceBefore).to.be.closeTo(
        quantity * pricePerUnit,
        ethers.parseEther("0.01") // Allow for gas costs
      );
    });

    it("Should not allow cancellation before deadline", async function () {
      await expect(
        energyExchange.connect(consumer).cancelExpiredOffer(offerId)
      ).to.be.revertedWith("Validation deadline not exceeded");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow pauser to pause", async function () {
      await energyExchange.pause();
      expect(await energyExchange.paused()).to.be.true;
    });

    it("Should allow pauser to unpause", async function () {
      await energyExchange.pause();
      await energyExchange.unpause();
      expect(await energyExchange.paused()).to.be.false;
    });

    it("Should not allow non-pauser to pause", async function () {
      await expect(
        energyExchange.connect(producer).pause()
      ).to.be.revertedWithCustomError(energyExchange, "AccessControlUnauthorizedAccount")
        .withArgs(await producer.getAddress(), PAUSER_ROLE);
    });

    it("Should prevent operations while paused", async function () {
      await energyExchange.pause();
      await expect(
        energyExchange.addUser(await producer.getAddress(), true)
      ).to.be.revertedWithCustomError(energyExchange, "EnforcedPause");
    });
  });
});
