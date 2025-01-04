// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title JoulVoting Contract
 * @dev Implements a voting system for Pol distribution proposals
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
        bool hasVoted;
        uint votedProposalId;
    }

    enum WorkflowStatus {
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    // Custom errors
    error VotingSessionNotStarted();
    error AlreadyVoted();
    error InvalidProposalId();
    error InsufficientJoulTokens();
    error VotingSessionNotEnded();
    error VotesNotTallied();

    // Fixed distribution proposals
    Distribution[3] public proposals = [
        Distribution(65, 15, 10, 10), // Proposal 1
        Distribution(75, 20, 3, 2),   // Proposal 2
        Distribution(65, 20, 5, 10)   // Proposal 3
    ];

    WorkflowStatus public workflowStatus;
    uint public winningProposalID;
    uint[] public proposalVoteCounts;
    
    IERC20 public immutable joulToken;
    mapping(address => Voter) public voters;

    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event Voted(address voter, uint proposalId);

    constructor(address _joulToken) Ownable(msg.sender) {
        joulToken = IERC20(_joulToken);
        proposalVoteCounts = new uint[](3);
        workflowStatus = WorkflowStatus.VotingSessionStarted;
    }

    /**
     * @notice Starts a new voting session by resetting all votes and voter statuses
     */
    function startVotingSession() external onlyOwner {
        // Reset all vote counts
        for (uint i = 0; i < proposalVoteCounts.length; i++) {
            proposalVoteCounts[i] = 0;
        }
        
        // Reset winning proposal
        winningProposalID = 0;
        
        // Set status to started
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.VotesTallied, WorkflowStatus.VotingSessionStarted);
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
        if (_id >= 3) revert InvalidProposalId();
        return proposalVoteCounts[_id];
    }

    /**
     * @notice Casts a vote for a proposal
     * @param _id The ID of the proposal to vote for (0-2)
     */
    function setVote(uint _id) external {
        if (workflowStatus != WorkflowStatus.VotingSessionStarted) revert VotingSessionNotStarted();
        if (voters[msg.sender].hasVoted && voters[msg.sender].votedProposalId == _id) revert AlreadyVoted();
        if (_id >= 3) revert InvalidProposalId();
        if (joulToken.balanceOf(msg.sender) < 1 ether) revert InsufficientJoulTokens();

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
     * @notice Ends the voting session
     */
    function endVotingSession() external onlyOwner {
        if (workflowStatus != WorkflowStatus.VotingSessionStarted) revert VotingSessionNotStarted();
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /**
     * @notice Tallies the votes and determines the winning proposal
     */
    function tallyVotes() external onlyOwner {
        if (workflowStatus != WorkflowStatus.VotingSessionEnded) revert VotingSessionNotEnded();
        
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
        if (workflowStatus != WorkflowStatus.VotesTallied) revert VotesNotTallied();
        return proposals[winningProposalID];
    }
}
