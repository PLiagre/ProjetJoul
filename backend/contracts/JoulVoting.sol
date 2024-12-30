// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title JoulVoting Contract
 * @dev Implements a voting system for MATIC distribution proposals
 */
contract JoulVoting is Ownable {
    using SafeERC20 for IERC20;

    struct Distribution {
        uint8 producerShare;
        uint8 enedisShare;
        uint8 joulShare;
        uint8 poolShare;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    // Fixed distribution proposals
    Distribution[3] public proposals = [
        Distribution(65, 15, 10, 10), // Proposal 1
        Distribution(75, 20, 3, 2),   // Proposal 2
        Distribution(65, 20, 5, 10)   // Proposal 3
    ];

    WorkflowStatus public workflowStatus;
    uint public winningProposalID;
    uint[] public proposalVoteCounts;
    
    IERC20 public joulToken;
    mapping(address => Voter) public voters;

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event Voted(address voter, uint proposalId);

    constructor(address _joulToken) Ownable(msg.sender) {
        joulToken = IERC20(_joulToken);
        proposalVoteCounts = new uint[](3);
    }

    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a registered voter");
        _;
    }

    /**
     * @notice Returns the details of a voter
     * @param _addr The address of the voter
     */
    function getVoter(address _addr) external view returns (Voter memory) {
        return voters[_addr];
    }

    /**
     * @notice Returns the vote count for a proposal
     * @param _id The ID of the proposal (0-2)
     */
    function getProposalVoteCount(uint _id) external view returns (uint) {
        require(_id < 3, "Invalid proposal ID");
        return proposalVoteCounts[_id];
    }

    /**
     * @notice Registers a new voter (producer or consumer)
     * @param _addr The address of the voter to register
     */
    function addVoter(address _addr) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Voters registration is not open");
        require(!voters[_addr].isRegistered, "Already registered");
        
        voters[_addr].isRegistered = true;
        emit VoterRegistered(_addr);
    }

    /**
     * @notice Casts a vote for a proposal
     * @param _id The ID of the proposal to vote for (0-2)
     */
    function setVote(uint _id) external onlyVoters {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session hasn't started");
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(_id < 3, "Invalid proposal ID");
        require(joulToken.balanceOf(msg.sender) >= 1 ether, "Insufficient JOUL tokens");

        // Burn 1 JOUL token by sending to dead address
        joulToken.safeTransferFrom(
            msg.sender, 
            address(0x000000000000000000000000000000000000dEaD),
            1 ether
        );

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _id;
        proposalVoteCounts[_id]++;

        emit Voted(msg.sender, _id);
    }

    /**
     * @notice Starts the voting session
     */
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Invalid workflow status");
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.VotingSessionStarted);
    }

    /**
     * @notice Ends the voting session
     */
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session hasn't started");
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /**
     * @notice Tallies the votes and determines the winning proposal
     */
    function tallyVotes() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Voting session not ended");
        
        uint winningVoteCount = 0;
        
        for (uint p = 0; p < 3; p++) {
            if (proposalVoteCounts[p] > winningVoteCount) {
                winningVoteCount = proposalVoteCounts[p];
                winningProposalID = p;
            }
        }
        
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    /**
     * @notice Returns the winning distribution proposal
     */
    function getWinningDistribution() external view returns (Distribution memory) {
        require(workflowStatus == WorkflowStatus.VotesTallied, "Votes not tallied yet");
        return proposals[winningProposalID];
    }
}
