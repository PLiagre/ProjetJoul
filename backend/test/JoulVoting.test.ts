import { expect } from "chai";
import { ethers } from "hardhat";
import {
  Contract,
  ContractTransactionResponse,
  EventLog,
  Log
} from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { JoulVoting, JoulToken } from "../typechain-types";

describe("JoulVoting", function () {
  let joulVoting: JoulVoting;
  let joulToken: JoulToken;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;
  let nonVoter: HardhatEthersSigner;

  enum WorkflowStatus {
    RegisteringVoters,
    VotingSessionStarted,
    VotingSessionEnded,
    VotesTallied
  }

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    // Deploy JoulToken first
    const JoulToken = await ethers.getContractFactory("JoulToken");
    joulToken = await JoulToken.deploy() as JoulToken;
    await joulToken.waitForDeployment();

    // Deploy JoulVoting with JoulToken address
    const JoulVoting = await ethers.getContractFactory("JoulVoting");
    joulVoting = await JoulVoting.deploy(await joulToken.getAddress()) as JoulVoting;
    await joulVoting.waitForDeployment();

    // Grant MINTER_ROLE to owner for testing
    const MINTER_ROLE = await joulToken.MINTER_ROLE();
    await joulToken.grantRole(MINTER_ROLE, await owner.getAddress());

    // Mint some JOUL tokens to voters for testing (using production rewards)
    const energyAmount = ethers.parseEther("1000"); // 1000 Wh to get 10 JOUL (1% rate)
    await joulToken.mintProductionReward(await voter1.getAddress(), energyAmount);
    await joulToken.mintProductionReward(await voter2.getAddress(), energyAmount);
    await joulToken.mintProductionReward(await voter3.getAddress(), energyAmount);

    // Approve JoulVoting contract to spend tokens (1 JOUL per vote)
    const approveAmount = ethers.parseEther("10"); // Approve all 10 JOUL tokens
    await joulToken.connect(voter1).approve(await joulVoting.getAddress(), approveAmount);
    await joulToken.connect(voter2).approve(await joulVoting.getAddress(), approveAmount);
    await joulToken.connect(voter3).approve(await joulVoting.getAddress(), approveAmount);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await joulVoting.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the correct JoulToken address", async function () {
      expect(await joulVoting.joulToken()).to.equal(await joulToken.getAddress());
    });

    it("Should initialize with RegisteringVoters status", async function () {
      expect(await joulVoting.workflowStatus()).to.equal(WorkflowStatus.RegisteringVoters);
    });

    it("Should initialize proposals with correct distributions", async function () {
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

  describe("Voter Registration", function () {
    it("Should allow owner to register a voter", async function () {
      await expect(joulVoting.addVoter(await voter1.getAddress()))
        .to.emit(joulVoting, "VoterRegistered")
        .withArgs(await voter1.getAddress());

      const voter = await joulVoting.getVoter(await voter1.getAddress());
      expect(voter.isRegistered).to.be.true;
      expect(voter.hasVoted).to.be.false;
    });

    it("Should not allow non-owner to register a voter", async function () {
      await expect(
        joulVoting.connect(voter1).addVoter(await voter2.getAddress())
      ).to.be.revertedWithCustomError(joulVoting, "OwnableUnauthorizedAccount");
    });

    it("Should not allow registering the same voter twice", async function () {
      await joulVoting.addVoter(await voter1.getAddress());
      await expect(
        joulVoting.addVoter(await voter1.getAddress())
      ).to.be.revertedWith("Already registered");
    });

    it("Should not allow registering voters after voting session starts", async function () {
      await joulVoting.startVotingSession();
      await expect(
        joulVoting.addVoter(await voter1.getAddress())
      ).to.be.revertedWith("Voters registration is not open");
    });
  });

  describe("Voting Session Management", function () {
    it("Should allow owner to start voting session", async function () {
      await expect(joulVoting.startVotingSession())
        .to.emit(joulVoting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.VotingSessionStarted);
    });

    it("Should allow owner to end voting session", async function () {
      await joulVoting.startVotingSession();
      await expect(joulVoting.endVotingSession())
        .to.emit(joulVoting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    });

    it("Should not allow ending voting session before starting", async function () {
      await expect(joulVoting.endVotingSession())
        .to.be.revertedWith("Voting session hasn't started");
    });

    it("Should not allow non-owner to manage voting session", async function () {
      await expect(joulVoting.connect(voter1).startVotingSession())
        .to.be.revertedWithCustomError(joulVoting, "OwnableUnauthorizedAccount");
      
      await joulVoting.startVotingSession();
      await expect(joulVoting.connect(voter1).endVotingSession())
        .to.be.revertedWithCustomError(joulVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Voting Mechanism", function () {
    beforeEach(async function () {
      await joulVoting.addVoter(await voter1.getAddress());
      await joulVoting.addVoter(await voter2.getAddress());
      await joulVoting.startVotingSession();
    });

    it("Should allow registered voter to vote", async function () {
      await expect(joulVoting.connect(voter1).setVote(1))
        .to.emit(joulVoting, "Voted")
        .withArgs(await voter1.getAddress(), 1);

      const voter = await joulVoting.getVoter(await voter1.getAddress());
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedProposalId).to.equal(1);
    });

    it("Should burn 1 JOUL token when voting", async function () {
      const balanceBefore = await joulToken.balanceOf(await voter1.getAddress());
      await joulVoting.connect(voter1).setVote(1);
      const balanceAfter = await joulToken.balanceOf(await voter1.getAddress());
      
      expect(balanceBefore - balanceAfter).to.equal(ethers.parseEther("1"));
    });

    it("Should not allow voting without enough JOUL tokens", async function () {
      // Transfer all tokens away
      const balance = await joulToken.balanceOf(await voter1.getAddress());
      await joulToken.connect(voter1).transfer(await nonVoter.getAddress(), balance);
      
      await expect(joulVoting.connect(voter1).setVote(1))
        .to.be.revertedWith("Insufficient JOUL tokens");
    });

    it("Should not allow voting twice", async function () {
      await joulVoting.connect(voter1).setVote(1);
      await expect(joulVoting.connect(voter1).setVote(2))
        .to.be.revertedWith("Already voted");
    });

    it("Should not allow voting for invalid proposal", async function () {
      await expect(joulVoting.connect(voter1).setVote(3))
        .to.be.revertedWith("Invalid proposal ID");
    });

    it("Should not allow non-registered voters to vote", async function () {
      await expect(joulVoting.connect(nonVoter).setVote(1))
        .to.be.revertedWith("You're not a registered voter");
    });

    it("Should not allow voting before session starts", async function () {
      const JoulVoting = await ethers.getContractFactory("JoulVoting");
      const newVoting = await JoulVoting.deploy(await joulToken.getAddress()) as JoulVoting;
      await newVoting.addVoter(await voter1.getAddress());
      
      await expect(newVoting.connect(voter1).setVote(1))
        .to.be.revertedWith("Voting session hasn't started");
    });

    it("Should track vote counts correctly", async function () {
      await joulVoting.connect(voter1).setVote(1);
      await joulVoting.connect(voter2).setVote(1);
      
      expect(await joulVoting.getProposalVoteCount(1)).to.equal(2);
    });
  });

  describe("Vote Tallying", function () {
    beforeEach(async function () {
      await joulVoting.addVoter(await voter1.getAddress());
      await joulVoting.addVoter(await voter2.getAddress());
      await joulVoting.addVoter(await voter3.getAddress());
      await joulVoting.startVotingSession();
      
      await joulVoting.connect(voter1).setVote(0);
      await joulVoting.connect(voter2).setVote(1);
      await joulVoting.connect(voter3).setVote(1);
      
      await joulVoting.endVotingSession();
    });

    it("Should correctly determine the winning proposal", async function () {
      await joulVoting.tallyVotes();
      expect(await joulVoting.winningProposalID()).to.equal(1);
    });

    it("Should not allow tallying before voting ends", async function () {
      const newVoting = await (await ethers.getContractFactory("JoulVoting"))
        .deploy(await joulToken.getAddress()) as JoulVoting;
      await newVoting.startVotingSession();
      
      await expect(newVoting.tallyVotes())
        .to.be.revertedWith("Voting session not ended");
    });

    it("Should return correct winning distribution", async function () {
      await joulVoting.tallyVotes();
      const winningDist = await joulVoting.getWinningDistribution();
      
      expect(winningDist.producerShare).to.equal(75);
      expect(winningDist.enedisShare).to.equal(20);
      expect(winningDist.joulShare).to.equal(3);
      expect(winningDist.poolShare).to.equal(2);
    });

    it("Should not allow getting winning distribution before tally", async function () {
      const newVoting = await (await ethers.getContractFactory("JoulVoting"))
        .deploy(await joulToken.getAddress()) as JoulVoting;
      
      await expect(newVoting.getWinningDistribution())
        .to.be.revertedWith("Votes not tallied yet");
    });
  });
});
