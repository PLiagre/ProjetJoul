// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./JoulToken.sol";

/**
 * @title JoulGovernance
 * @dev Système de gouvernance pour le protocole JOUL
 * - Vote avec tokens JOUL (1 JOUL = 1 vote)
 * - Quorum de 51%
 * - Période de vote de 7 jours
 * - Propositions pour modification des paramètres
 */
contract JoulGovernance is AccessControl, Pausable {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    JoulToken public immutable joulToken;

    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 51;
    uint256 public constant PROPOSAL_THRESHOLD = 100 * 1e18; // 100 JOUL minimum

    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Executed
    }

    struct Proposal {
        uint256 id;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        string description;
        bytes callData;
        address target;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
    }

    // Mapping séparé pour les votes
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => Proposal) public proposals;
    uint256 private _nextProposalId;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address target,
        string description,
        uint256 startTime,
        uint256 endTime
    );

    event ProposalCanceled(uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed proposalId);
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        bool support,
        uint256 weight
    );

    constructor(address _joulToken) {
        require(_joulToken != address(0), "Invalid JoulToken address");
        
        joulToken = JoulToken(_joulToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Crée une nouvelle proposition
     * @param target Adresse du contrat cible
     * @param description Description de la proposition
     * @param callData Données d'appel pour l'exécution
     */
    function propose(
        address target,
        string memory description,
        bytes memory callData
    ) external whenNotPaused returns (uint256) {
        require(
            joulToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD,
            "Insufficient tokens to propose"
        );
        require(target != address(0), "Invalid target address");
        require(bytes(description).length > 0, "Empty description");

        uint256 proposalId = _nextProposalId++;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + VOTING_PERIOD,
            description: description,
            callData: callData,
            target: target,
            forVotes: 0,
            againstVotes: 0,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(
            proposalId,
            msg.sender,
            target,
            description,
            block.timestamp,
            block.timestamp + VOTING_PERIOD
        );

        return proposalId;
    }

    /**
     * @dev Vote sur une proposition
     * @param proposalId ID de la proposition
     * @param support true pour voter pour, false pour voter contre
     */
    function castVote(uint256 proposalId, bool support) 
        external 
        whenNotPaused 
    {
        Proposal storage proposal = proposals[proposalId];
        require(
            block.timestamp >= proposal.startTime,
            "Voting not started"
        );
        require(
            block.timestamp <= proposal.endTime,
            "Voting ended"
        );
        require(
            !hasVoted[proposalId][msg.sender],
            "Already voted"
        );
        require(
            !proposal.executed && !proposal.canceled,
            "Proposal already executed or canceled"
        );

        uint256 votes = joulToken.balanceOf(msg.sender);
        require(votes > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }

        emit VoteCast(msg.sender, proposalId, support, votes);
    }

    /**
     * @dev Exécute une proposition qui a réussi
     * @param proposalId ID de la proposition
     */
    function execute(uint256 proposalId) 
        external 
        onlyRole(EXECUTOR_ROLE) 
        whenNotPaused 
    {
        Proposal storage proposal = proposals[proposalId];
        require(
            block.timestamp > proposal.endTime,
            "Voting period not ended"
        );
        require(
            !proposal.executed && !proposal.canceled,
            "Proposal already executed or canceled"
        );
        require(
            _quorumReached(proposalId) && _voteSucceeded(proposalId),
            "Quorum not reached or vote failed"
        );

        proposal.executed = true;

        (bool success,) = proposal.target.call(proposal.callData);
        require(success, "Proposal execution failed");

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Annule une proposition
     * @param proposalId ID de la proposition
     */
    function cancel(uint256 proposalId) 
        external 
        whenNotPaused 
    {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(
            !proposal.executed && !proposal.canceled,
            "Proposal already executed or canceled"
        );

        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    /**
     * @dev Vérifie si le quorum est atteint
     */
    function _quorumReached(uint256 proposalId) 
        private 
        view 
        returns (bool) 
    {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalSupply = joulToken.totalSupply();
        
        return totalVotes >= (totalSupply * QUORUM_PERCENTAGE) / 100;
    }

    /**
     * @dev Vérifie si le vote a réussi
     */
    function _voteSucceeded(uint256 proposalId) 
        private 
        view 
        returns (bool) 
    {
        Proposal storage proposal = proposals[proposalId];
        return proposal.forVotes > proposal.againstVotes;
    }

    /**
     * @dev Récupère l'état d'une proposition
     */
    function state(uint256 proposalId) 
        public 
        view 
        returns (ProposalState) 
    {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.timestamp <= proposal.startTime) {
            return ProposalState.Pending;
        }

        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }

        if (_quorumReached(proposalId) && _voteSucceeded(proposalId)) {
            return ProposalState.Succeeded;
        }

        return ProposalState.Defeated;
    }

    /**
     * @dev Pause le contrat
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Reprend les opérations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override requis par Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
