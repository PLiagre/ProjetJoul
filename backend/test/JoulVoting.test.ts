import { expect } from "chai";
import { ethers } from "hardhat";
import { JoulVoting, JoulToken, IAccessControl } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("JoulVoting", function () {
  let joulVoting: JoulVoting & IAccessControl;
  let joulToken: JoulToken;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();

    const JoulToken = await ethers.getContractFactory("JoulToken");
    joulToken = await JoulToken.deploy();

    const JoulVoting = await ethers.getContractFactory("JoulVoting");
    joulVoting = (await JoulVoting.deploy(await joulToken.getAddress())) as JoulVoting & IAccessControl;

    // Give MINTER_ROLE to owner for testing
    const MINTER_ROLE = await joulToken.MINTER_ROLE();
    await joulToken.grantRole(MINTER_ROLE, owner.address);
  });

  describe("Deployment", () => {
    it("Should set up roles correctly", async () => {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      
      expect(await joulVoting.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await joulVoting.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the correct JoulToken address", async () => {
      expect(await joulVoting.joulToken()).to.equal(await joulToken.getAddress());
    });

    it("Should initialize with VotingSessionStarted status", async () => {
      expect(await joulVoting.workflowStatus()).to.equal(0);
    });

    it("Should initialize proposals with correct distributions", async () => {
      const proposal0 = await joulVoting.proposals(0);
      expect(proposal0.producerShare).to.equal(65);
      expect(proposal0.enedisShare).to.equal(15);
      expect(proposal0.joulShare).to.equal(10);
      expect(proposal0.poolShare).to.equal(10);

      const proposal1 = await joulVoting.proposals(1);
      expect(proposal1.producerShare).to.equal(75);
      expect(proposal1.enedisShare).to.equal(20);
      expect(proposal1.joulShare).to.equal(3);
      expect(proposal1.poolShare).to.equal(2);

      const proposal2 = await joulVoting.proposals(2);
      expect(proposal2.producerShare).to.equal(65);
      expect(proposal2.enedisShare).to.equal(20);
      expect(proposal2.joulShare).to.equal(5);
      expect(proposal2.poolShare).to.equal(10);
    });
  });

  describe("Voting Mechanism", () => {
    beforeEach(async () => {
      // Give tokens to voters
      await joulToken.mintProductionReward(voter1.address, ethers.parseEther("1000"));
      await joulToken.mintProductionReward(voter2.address, ethers.parseEther("1000"));
      await joulToken.mintProductionReward(voter3.address, ethers.parseEther("1000"));

      // Approve tokens for voting
      await joulToken.connect(voter1).approve(await joulVoting.getAddress(), ethers.parseEther("1"));
      await joulToken.connect(voter2).approve(await joulVoting.getAddress(), ethers.parseEther("1"));
      await joulToken.connect(voter3).approve(await joulVoting.getAddress(), ethers.parseEther("1"));
    });

    it("Should allow voter with JOUL tokens to vote", async () => {
      await joulVoting.connect(voter1).setVote(0);
      const voter = await joulVoting.getVoter(voter1.address);
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedProposalId).to.equal(0);
    });

    it("Should burn 1 JOUL token when voting", async () => {
      const balanceBefore = await joulToken.balanceOf(voter1.address);
      await joulVoting.connect(voter1).setVote(0);
      const balanceAfter = await joulToken.balanceOf(voter1.address);
      expect(balanceBefore - balanceAfter).to.equal(ethers.parseEther("1"));
    });

    it("Should not allow voting without enough JOUL tokens", async () => {
      // Transfer all tokens to make balance insufficient
      const balance = await joulToken.balanceOf(voter1.address);
      await joulToken.connect(voter1).transfer(owner.address, balance);
      await expect(
        joulVoting.connect(voter1).setVote(0)
      ).to.be.revertedWithCustomError(joulVoting, "InsufficientJoulTokens");
    });

    it("Should not allow voting twice for same proposal", async () => {
      await joulVoting.connect(voter1).setVote(0);
      await expect(
        joulVoting.connect(voter1).setVote(0)
      ).to.be.revertedWithCustomError(joulVoting, "AlreadyVoted");
    });

    it("Should not allow voting for different proposal due to insufficient tokens", async () => {
      await joulVoting.connect(voter1).setVote(0);
      await expect(
        joulVoting.connect(voter1).setVote(1)
      ).to.be.revertedWithCustomError(joulVoting, "InsufficientJoulTokens");
    });

    it("Should not allow voting for invalid proposal", async () => {
      await expect(
        joulVoting.connect(voter1).setVote(99)
      ).to.be.revertedWithCustomError(joulVoting, "InvalidProposalId");
    });

    it("Should track vote counts correctly", async () => {
      await joulVoting.connect(voter1).setVote(0);
      await joulVoting.connect(voter2).setVote(1);
      await joulVoting.connect(voter3).setVote(0);

      expect(await joulVoting.getProposalVoteCount(0)).to.equal(2);
      expect(await joulVoting.getProposalVoteCount(1)).to.equal(1);
      expect(await joulVoting.getProposalVoteCount(2)).to.equal(0);
    });

    it("Should not allow voting when session is ended", async () => {
      await joulVoting.connect(owner).endVotingSession();
      await expect(
        joulVoting.connect(voter1).setVote(0)
      ).to.be.revertedWithCustomError(joulVoting, "VotingSessionNotStarted");
    });

    it("Should not allow non-admin to end voting session", async () => {
      await expect(
        joulVoting.connect(voter1).endVotingSession()
      ).to.be.revertedWithCustomError(joulVoting, "AccessControlUnauthorizedAccount")
        .withArgs(voter1.address, ADMIN_ROLE);
    });

    it("Should allow another admin to end voting session", async () => {
      // Grant ADMIN_ROLE to voter1
      await (joulVoting as IAccessControl).connect(owner).grantRole(ADMIN_ROLE, voter1.address);

      // voter1 should now be able to end voting session
      await joulVoting.connect(voter1).endVotingSession();
      expect(await joulVoting.workflowStatus()).to.equal(1); // VotingSessionEnded
    });
  });

  describe("Vote Tallying", () => {
    beforeEach(async () => {
      // Setup votes
      await joulToken.mintProductionReward(voter1.address, ethers.parseEther("1000"));
      await joulToken.mintProductionReward(voter2.address, ethers.parseEther("1000"));
      await joulToken.connect(voter1).approve(await joulVoting.getAddress(), ethers.parseEther("1"));
      await joulToken.connect(voter2).approve(await joulVoting.getAddress(), ethers.parseEther("1"));
      
      await joulVoting.connect(voter1).setVote(0);
      await joulVoting.connect(voter2).setVote(1);
    });

    it("Should correctly determine the winning proposal", async () => {
      await joulVoting.connect(owner).endVotingSession();
      await joulVoting.connect(owner).tallyVotes();
      expect(await joulVoting.winningProposalID()).to.equal(0);
    });

    it("Should not allow non-admin to tally votes", async () => {
      await joulVoting.connect(owner).endVotingSession();
      await expect(
        joulVoting.connect(voter2).tallyVotes()
      ).to.be.revertedWithCustomError(joulVoting, "AccessControlUnauthorizedAccount")
        .withArgs(voter2.address, ADMIN_ROLE);
    });

    it("Should not allow tallying before voting ends", async () => {
      await expect(
        joulVoting.connect(owner).tallyVotes()
      ).to.be.revertedWithCustomError(joulVoting, "VotingSessionNotEnded");
    });

    it("Should allow admin to tally votes and return correct winning distribution", async () => {
      // Grant ADMIN_ROLE to voter2
      await (joulVoting as IAccessControl).connect(owner).grantRole(ADMIN_ROLE, voter2.address);
      
      await joulVoting.connect(owner).endVotingSession();
      await joulVoting.connect(owner).tallyVotes();
      
      const winningDist = await joulVoting.getWinningDistribution();
      expect(winningDist.producerShare).to.equal(65);
      expect(winningDist.enedisShare).to.equal(15);
      expect(winningDist.joulShare).to.equal(10);
      expect(winningDist.poolShare).to.equal(10);
    });

    it("Should not allow getting winning distribution before tally", async () => {
      await joulVoting.connect(owner).endVotingSession();
      await expect(
        joulVoting.getWinningDistribution()
      ).to.be.revertedWithCustomError(joulVoting, "VotesNotTallied");
    });

    it("Should handle tie votes correctly", async () => {
      // Add another vote to make it tie
      await joulToken.mintProductionReward(voter3.address, ethers.parseEther("1000"));
      await joulToken.connect(voter3).approve(await joulVoting.getAddress(), ethers.parseEther("1"));
      await joulVoting.connect(voter3).setVote(1);

      await joulVoting.connect(owner).endVotingSession();
      await joulVoting.connect(owner).tallyVotes();
      
      // In case of tie, the first proposal with highest votes wins
      expect(await joulVoting.winningProposalID()).to.equal(1);
    });

    it("Should allow admin to start new voting session after tally", async () => {
      await joulVoting.connect(owner).endVotingSession();
      await joulVoting.connect(owner).tallyVotes();
      
      // Grant ADMIN_ROLE to voter3
      await (joulVoting as IAccessControl).connect(owner).grantRole(ADMIN_ROLE, voter3.address);
      
      // voter3 should be able to start new session
      await joulVoting.connect(voter3).startVotingSession();
      
      expect(await joulVoting.workflowStatus()).to.equal(0);
      expect(await joulVoting.getProposalVoteCount(0)).to.equal(0);
      expect(await joulVoting.getProposalVoteCount(1)).to.equal(0);
    });

    it("Should not allow non-admin to start new voting session", async () => {
      await joulVoting.connect(owner).endVotingSession();
      await joulVoting.connect(owner).tallyVotes();
      
      await expect(
        joulVoting.connect(voter1).startVotingSession()
      ).to.be.revertedWithCustomError(joulVoting, "AccessControlUnauthorizedAccount")
        .withArgs(voter1.address, ADMIN_ROLE);
    });
  });
});
