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

  const PRODUCTION_REWARD_RATE = 1n; // 0.1%
  const FIXED_REWARD = ethers.parseEther("0.5"); // 0.5 JOUL
  const DAILY_MINT_LIMIT = ethers.parseEther("1000000"); // 1M JOUL

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

    it("Should set the correct reward values", async function () {
      expect(await joulToken.PRODUCTION_REWARD_RATE()).to.equal(PRODUCTION_REWARD_RATE);
      expect(await joulToken.FIXED_REWARD()).to.equal(FIXED_REWARD);
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
      const expectedReward = (energyAmount * PRODUCTION_REWARD_RATE) / 1000n; // 0.1% reward rate

      await expect(joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), expectedReward, "PRODUCTION", energyAmount);

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
      const expectedReward = FIXED_REWARD;

      await expect(joulToken.connect(minter).mintPurchaseReward(await recipient.getAddress(), purchaseAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), FIXED_REWARD, "PURCHASE", purchaseAmount);

      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(expectedReward);
    });

    it("Should not allow minting to zero address", async function () {
      const purchaseAmount = ethers.parseEther("100");
      await expect(
        joulToken.connect(minter).mintPurchaseReward(ethers.ZeroAddress, purchaseAmount)
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should not allow minting with zero amount", async function () {
      await expect(
        joulToken.connect(minter).mintPurchaseReward(await recipient.getAddress(), 0)
      ).to.be.revertedWith("Amount must be positive");
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
      const expectedReward = FIXED_REWARD;

      await expect(joulToken.connect(minter).mintSaleReward(await recipient.getAddress(), saleAmount))
        .to.emit(joulToken, "RewardMinted")
        .withArgs(await recipient.getAddress(), FIXED_REWARD, "SALE", saleAmount);

      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(expectedReward);
    });

    it("Should not allow minting to zero address", async function () {
      const saleAmount = ethers.parseEther("100");
      await expect(
        joulToken.connect(minter).mintSaleReward(ethers.ZeroAddress, saleAmount)
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should not allow minting with zero amount", async function () {
      await expect(
        joulToken.connect(minter).mintSaleReward(await recipient.getAddress(), 0)
      ).to.be.revertedWith("Amount must be positive");
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
        .withArgs(await recipient.getAddress(), expectedReward, "PRODUCTION", energyAmount);
    });
  });

  describe("Daily Mint Limits", function () {
    it("Should track daily minted amount", async function () {
      const energyAmount = ethers.parseEther("1000");
      const expectedReward = (energyAmount * PRODUCTION_REWARD_RATE) / 1000n;
      
      await joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount);
      
      const block = await ethers.provider.getBlock("latest");
      if (!block) throw new Error("Block not found");
      const currentDay = Math.floor(block.timestamp / 86400);
      expect(await joulToken.dailyMintedAmount(currentDay)).to.equal(expectedReward);
    });

    it("Should emit DailyMintLimitUpdated event", async function () {
      const energyAmount = ethers.parseEther("1000");
      const expectedReward = (energyAmount * PRODUCTION_REWARD_RATE) / 1000n;
      
      const block = await ethers.provider.getBlock("latest");
      if (!block) throw new Error("Block not found");
      const currentDay = Math.floor(block.timestamp / 86400);
      await expect(joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount))
        .to.emit(joulToken, "DailyMintLimitUpdated")
        .withArgs(currentDay, expectedReward);
    });

    it("Should not allow minting above daily limit", async function () {
      // Need to mint more than 1M JOUL tokens
      // With (amount * 10^18) / 1000 calculation, we need amount > 1000 * 1M
      const largeAmount = ethers.parseEther("1000000001"); // Just over the limit
      
      await expect(
        joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), largeAmount)
      ).to.be.revertedWith("Daily mint limit exceeded");
    });

    it("Should reset daily limit after 24 hours", async function () {
      const energyAmount = ethers.parseEther("1000");
      await joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount);
      
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        joulToken.connect(minter).mintProductionReward(await recipient.getAddress(), energyAmount)
      ).to.not.be.reverted;
    });
  });

  describe("ERC20 Functionality", function () {
    beforeEach(async function () {
      // Mint some tokens for testing - 10000 Wh at 0.1% rate gives us 10 JOUL tokens
      await joulToken.connect(minter).mintProductionReward(await owner.getAddress(), ethers.parseEther("10000"));
    });

    it("Should allow token transfers", async function () {
      const amount = ethers.parseEther("1"); // Transfer 1 JOUL token
      await joulToken.connect(owner).transfer(await recipient.getAddress(), amount);
      expect(await joulToken.balanceOf(await recipient.getAddress())).to.equal(amount);
    });

    it("Should allow token approvals and transferFrom", async function () {
      const amount = ethers.parseEther("1"); // Transfer 1 JOUL token
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
