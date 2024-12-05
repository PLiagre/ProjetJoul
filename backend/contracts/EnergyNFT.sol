// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EnergyNFT
 * @dev Implementation of the Energy NFT certificate with metadata
 */
contract EnergyNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextTokenId;

    struct EnergyMetadata {
        uint256 quantity;     // Amount of energy in Wh
        string energyType;    // Type of energy (solar, wind, etc.)
        uint256 timestamp;    // Production timestamp
        address producer;     // Producer address
    }

    // Mapping from token ID to energy metadata
    mapping(uint256 => EnergyMetadata) private _energyMetadata;

    event EnergyNFTMinted(
        uint256 indexed tokenId,
        address indexed producer,
        uint256 quantity,
        string energyType,
        uint256 timestamp
    );

    constructor() ERC721("JOUL Energy Certificate", "JEC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new Energy NFT
     * @param to Address receiving the NFT
     * @param quantity Amount of energy in Wh
     * @param energyType Type of energy produced
     * @param tokenURI IPFS URI containing additional metadata
     */
    function mintEnergyNFT(
        address to,
        uint256 quantity,
        string memory energyType,
        string memory tokenURI
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        _energyMetadata[tokenId] = EnergyMetadata({
            quantity: quantity,
            energyType: energyType,
            timestamp: block.timestamp,
            producer: to
        });

        emit EnergyNFTMinted(
            tokenId,
            to,
            quantity,
            energyType,
            block.timestamp
        );

        return tokenId;
    }

    /**
     * @dev Get energy metadata for a specific token
     * @param tokenId The ID of the token
     */
    function getEnergyMetadata(uint256 tokenId) 
        external 
        view 
        returns (
            uint256 quantity,
            string memory energyType,
            uint256 timestamp,
            address producer
        ) 
    {
        require(ownerOf(tokenId) != address(0), "EnergyNFT: Token does not exist");
        EnergyMetadata memory metadata = _energyMetadata[tokenId];
        return (
            metadata.quantity,
            metadata.energyType,
            metadata.timestamp,
            metadata.producer
        );
    }

    // Required overrides
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal virtual override(ERC721) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
