import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { UserManagement } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("UserManagement", function () {
  let userManagement: UserManagement;
  let owner: HardhatEthersSigner;
  let admin: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, admin, user1, user2] = await ethers.getSigners();

    const UserManagement = await ethers.getContractFactory("UserManagement");
    userManagement = await UserManagement.deploy();

    const ADMIN_ROLE = await userManagement.ADMIN_ROLE();
    await userManagement.grantRole(ADMIN_ROLE, admin.address);
  });

  describe("User Addition", () => {
    it("Should add producer correctly", async () => {
      await userManagement.connect(admin).addUser(user1.address, true);
      expect(await userManagement.isProducer(user1.address)).to.be.true;
      expect(await userManagement.isConsumer(user1.address)).to.be.true;
    });

    it("Should add consumer correctly", async () => {
      await userManagement.connect(admin).addUser(user1.address, false);
      expect(await userManagement.isProducer(user1.address)).to.be.false;
      expect(await userManagement.isConsumer(user1.address)).to.be.true;
    });

    it("Should not allow non-admin to add user", async () => {
      await expect(
        userManagement.connect(user1).addUser(user2.address, true)
      ).to.be.revertedWithCustomError(userManagement, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow adding zero address", async () => {
      await expect(
        userManagement.connect(admin).addUser(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("User Removal Process", () => {
    beforeEach(async () => {
      await userManagement.connect(admin).addUser(user1.address, true);
    });

    it("Should initiate user removal correctly", async () => {
      await userManagement.connect(admin).initiateUserRemoval(user1.address);
      const removalTimestamp = await userManagement.removalTimestamp(user1.address);
      expect(removalTimestamp).to.be.gt(0);
    });

    it("Should not allow non-admin to initiate removal", async () => {
      await expect(
        userManagement.connect(user2).initiateUserRemoval(user1.address)
      ).to.be.revertedWithCustomError(userManagement, "AccessControlUnauthorizedAccount");
    });

    it("Should respect grace period for user removal", async () => {
      await userManagement.connect(admin).initiateUserRemoval(user1.address);
      
      // Try to finalize before grace period
      await expect(
        userManagement.connect(admin).finalizeUserRemoval(user1.address)
      ).to.be.revertedWith("Grace period not ended");

      // Wait for grace period
      await time.increase(24 * 3600);

      // Should succeed after grace period
      await userManagement.connect(admin).finalizeUserRemoval(user1.address);
      expect(await userManagement.isProducer(user1.address)).to.be.false;
      expect(await userManagement.isConsumer(user1.address)).to.be.false;
    });

    it("Should allow cancellation of removal process", async () => {
      await userManagement.connect(admin).initiateUserRemoval(user1.address);
      await userManagement.connect(admin).cancelUserRemoval(user1.address);
      
      expect(await userManagement.removalTimestamp(user1.address)).to.equal(0);
      expect(await userManagement.isProducer(user1.address)).to.be.true;
    });

    it("Should not allow cancellation by non-admin", async () => {
      await userManagement.connect(admin).initiateUserRemoval(user1.address);
      await expect(
        userManagement.connect(user2).cancelUserRemoval(user1.address)
      ).to.be.revertedWithCustomError(userManagement, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow cancellation if no removal pending", async () => {
      await expect(
        userManagement.connect(admin).cancelUserRemoval(user1.address)
      ).to.be.revertedWith("No removal pending");
    });
  });

  describe("Pause Functionality", () => {
    it("Should allow admin to pause and unpause", async () => {
      await userManagement.connect(admin).pause();
      expect(await userManagement.paused()).to.be.true;

      await userManagement.connect(admin).unpause();
      expect(await userManagement.paused()).to.be.false;
    });

    it("Should prevent operations while paused", async () => {
      await userManagement.connect(admin).pause();
      
      await expect(
        userManagement.connect(admin).addUser(user1.address, true)
      ).to.be.revertedWithCustomError(userManagement, "EnforcedPause");
    });

    it("Should not allow non-admin to pause", async () => {
      await expect(
        userManagement.connect(user1).pause()
      ).to.be.revertedWithCustomError(userManagement, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Role Checks", () => {
    it("Should correctly identify producer role", async () => {
      await userManagement.connect(admin).addUser(user1.address, true);
      expect(await userManagement.isProducer(user1.address)).to.be.true;
    });

    it("Should correctly identify consumer role", async () => {
      await userManagement.connect(admin).addUser(user1.address, false);
      expect(await userManagement.isConsumer(user1.address)).to.be.true;
      expect(await userManagement.isProducer(user1.address)).to.be.false;
    });

    it("Should return false for non-existent user", async () => {
      expect(await userManagement.isProducer(user2.address)).to.be.false;
      expect(await userManagement.isConsumer(user2.address)).to.be.false;
    });
  });
});
