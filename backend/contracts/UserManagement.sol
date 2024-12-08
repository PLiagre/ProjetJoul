// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title UserManagement
 * @dev Gestion des utilisateurs du système Joul
 * - Attribution des rôles (producteur/consommateur)
 * - Contrôle d'accès pour l'admin
 */
contract UserManagement is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    event UserAdded(address indexed user, bool isProducer);
    event UserRemoved(address indexed user);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Ajoute un nouvel utilisateur
     * @param user Adresse de l'utilisateur
     * @param isProducer true pour producteur, false pour consommateur
     */
    function addUser(address user, bool isProducer) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(user != address(0), "Invalid address");
        require(
            !hasRole(PRODUCER_ROLE, user) && !hasRole(CONSUMER_ROLE, user),
            "User already registered"
        );

        if (isProducer) {
            _grantRole(PRODUCER_ROLE, user);
        } else {
            _grantRole(CONSUMER_ROLE, user);
        }

        emit UserAdded(user, isProducer);
    }

    /**
     * @dev Supprime un utilisateur
     * @param user Adresse de l'utilisateur
     */
    function removeUser(address user) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(user != address(0), "Invalid address");
        require(
            hasRole(PRODUCER_ROLE, user) || hasRole(CONSUMER_ROLE, user),
            "User not registered"
        );

        if (hasRole(PRODUCER_ROLE, user)) {
            _revokeRole(PRODUCER_ROLE, user);
        }
        if (hasRole(CONSUMER_ROLE, user)) {
            _revokeRole(CONSUMER_ROLE, user);
        }

        emit UserRemoved(user);
    }

    /**
     * @dev Vérifie si un utilisateur est un producteur
     * @param user Adresse de l'utilisateur
     */
    function isProducer(address user) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(PRODUCER_ROLE, user);
    }

    /**
     * @dev Vérifie si un utilisateur est un consommateur
     * @param user Adresse de l'utilisateur
     */
    function isConsumer(address user) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(CONSUMER_ROLE, user);
    }

    /**
     * @dev Pause le contrat
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Reprend les opérations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
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
