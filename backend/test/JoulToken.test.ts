import { expect } from "chai";
import { ethers } from "hardhat";
import {
  Contract,
  ContractTransactionResponse,
  EventLog,
  Log
} from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { JoulToken } from "../typechain-types";

describe("JoulToken", function () {
  let joulToken: JoulToken;
  let owner: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let pauser: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let nonAuthorized: HardhatEthersSigner;

  const PRODUCTION_REWARD_RATE = 10n; // 1%
  const PURCHASE_REWARD_RATE = 5n;    // 0.5%
  const SALE_REWARD_RATE = 5n;        // 0.5%

  beforeEach(async function () {
    [owner, minter, pauser, recipient, nonAuthorized] = await ethers.getSigners();

    const JoulToken = await ethers.getContractFactory("JoulToken");
    joulToken = await JoulToken.deploy() as JoulToken;
    await joulToken.waitForDeployment();

    // Setup roles
    const MINTER_ROLE = await joulToken.MINTER_ROLE();
    const PAUSER_ROLE = await joulToken.PAUSER_ROLE();
    await joulToken.grantRole(MINTER_ROLE, await minter.getAddress());
    await joulToken.grantRole(PAUSER_ROLE, await pauser.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await joulToken.name()).to.equal("JOUL Energy Token");
      expect(await joulToken.symbol()).to.equal("JOUL");
    });

    it("Should set the right owner", async function () {
      const DEFAULT_ADMIN_ROLE = await joulToken.DEFAULT_ADMIN_ROLE();
      expect(await joulToken.hasRole(DEFAULT_ADMIN_ROLE, await owner.getAddress())).to.be.true;
    });

    it("Should set the correct reward rates", async function () {
      expect(await joulToken.PRODUCTION_REWARD_RATE()).to.equal(PRODUCTION_REWARD_RATE);
      expect(await joulToken.PURCHASE_REWARD_RATE()).to.equal(PURCHASE_REWARD_RATE);
      expect(await joulToken.SALE_REWARD_RATE()).to.equal(SALE_REWARD_RATE);
    });
  });

  describe("Access Control", function () {
    it("Should grant MINTER_ROLE correctly", async function () {
      const MINTER_ROLE = await joulToken.MINTER_ROLE();
      expect(await joulToken.hasRole(MINTER_ROLE, await minter.getAddress())).to.be.true;
    });

    it("Should grant PAUSER_ROLE correctly", async function () {
      const PAUSER_ROLE = await joulToken.PAUSER_ROLE();
      expect(await joulToken.hasRole(PAUSER_ROLE, await pauser.getAddress())).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      const MINTER_ROLE = await joulToken.MINTER_ROLE();
      await expect(
        joulToken.connect(nonAuthorized).grantRole(MINTER_ROLE, await nonAuthorized.getAddress())
      ).to.be.revertedWithCustomError(joulToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Production Rewards", function () {
    it("Should mint correct amount for production rewards", async function () {
      const energyAmount = ethers.parseEther("1000"); // 1000 Wh
      const expectedReward = (energyAmount * PRODUCTION_REWARD_RATE) / 1000n; // 1%

      await expect(joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), expectedReward, "PRODUCTION");

      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(expectedReward);
    });

    it("Should not allow non-minter to mint production rewards", async function () {
      await expect(
        joulToken.connect(nonAuthorized).mintProductionReward(await recipient.getAddress(), 1000n)
      ).to.be.revertedWithCustomError(joulToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Purchase Rewards", function () {
    it("Should mint correct amount for purchase rewards", async function () {
      const purchaseAmount = ethers.parseEther("100"); // 100 MATIC
      const expectedReward = (purchaseAmount * PURCHASE_REWARD_RATE) / 1000n; // 0.5%

      await expect(joulToken.connect(minter).mintPurchaseReward(await recipient.getAddress(), purchaseAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), expectedReward, "PURCHASE");

      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(expectedReward);
    });

    it("Should not allow non-minter to mint purchase rewards", async function () {
      await expect(
        joulToken.connect(nonAuthorized).mintPurchaseReward(await recipient.getAddress(), 1000n)
      ).to.be.revertedWithCustomError(joulToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Sale Rewards", function () {
    it("Should mint correct amount for sale rewards", async function () {
      const saleAmount = ethers.parseEther("100"); // 100 MATIC
      const expectedReward = (saleAmount * SALE_REWARD_RATE) / 1000n; // 0.5%

      await expect(joulToken.connect(minter).mintSaleReward(await recipient.getAddress(), saleAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), expectedReward, "SALE");

      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(expectedReward);
    });

    it("Should not allow non-minter to mint sale rewards", async function () {
      await expect(
        joulToken.connect(nonAuthorized).mintSaleReward(await recipient.getAddress(), 1000n)
      ).to.be.revertedWithCustomError(joulToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow pauser to pause", async function () {
      await joulToken.connect(pauser).pause();
      expect(await joulToken.paused()).to.be.true;
    });

    it("Should allow pauser to unpause", async function () {
      await joulToken.connect(pauser).pause();
      await joulToken.connect(pauser).unpause();
      expect(await joulToken.paused()).to.be.false;
    });

    it("Should not allow non-pauser to pause", async function () {
      await expect(
        joulToken.connect(nonAuthorized).pause()
      ).to.be.revertedWithCustomError(joulToken, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow minting when paused", async function () {
      await joulToken.connect(pauser).pause();
      await expect(
        joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), 1000n)
      ).to.be.revertedWithCustomError(joulToken, "EnforcedPause");
    });

    it("Should allow minting after unpause", async function () {
      await joulToken.connect(pauser).pause();
      await joulToken.connect(pauser).unpause();

      const energyAmount = ethers.parseEther("1000");
      const expectedReward = (energyAmount * PRODUCTION_REWARD_RATE) / 1000n;

      await expect(joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), expectedReward, "PRODUCTION");
    });
  });

  describe("ERC20 Functionality", function () {
    beforeEach(async function () {
      // Mint some tokens for testing
      await joulToken.connect(minter).mintProductionReward(await owner.getAddress(), ethers.parseEther("1000"));
    });

    it("Should allow token transfers", async function () {
      // We minted from 1000 Wh at 1% rate, so we have 10 JOUL tokens
      const amount = ethers.parseEther("5"); // Transfer half of our tokens
      await joulToken.connect(owner).transfer(await recipient.getAddress(), amount);
      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(amount);
    });

    it("Should allow token approvals and transferFrom", async function () {
      // We minted from 1000 Wh at 1% rate, so we have 10 JOUL tokens
      const amount = ethers.parseEther("5"); // Transfer half of our tokens
      await joulToken.connect(owner).approve(await recipient.getAddress(), amount);
      await joulToken.connect(recipient).transferFrom(
        await owner.getAddress(),
        await nonAuthorized.getAddress(),
        amount
      );
      expect(await joulToken.balanceOf(await nonAuthorized.getAddress())).to.equal(amount);
    });

    it("Should not allow transfer more than balance", async function () {
      const balance = await joulToken.balanceOf(await owner.getAddress());
      await expect(
        joulToken.connect(owner).transfer(await recipient.getAddress(), balance + 1n)
      ).to.be.revertedWithCustomError(joulToken, "ERC20InsufficientBalance");
    });

    it("Should not allow transferFrom more than approved", async function () {
      const amount = ethers.parseEther("100");
      await joulToken.connect(owner).approve(await recipient.getAddress(), amount);
      await expect(
        joulToken.connect(recipient).transferFrom(
          await owner.getAddress(),
          await nonAuthorized.getAddress(),
          amount + 1n
        )
      ).to.be.revertedWithCustomError(joulToken, "ERC20InsufficientAllowance");
    });
  });
});
