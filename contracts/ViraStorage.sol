// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

/**
 * @title ViraStorage
 * @dev Storage contract containing all state variables and events
 */
abstract contract ViraStorage is Initializable, ERC20Upgradeable, OwnableUpgradeable, EIP712Upgradeable {
    
    mapping(address => bool) public authorizedOperators;
    mapping(address => bool) public authorizedIssuers;
    mapping(address => bool) public authorizedRelayers;
    mapping(address => bool) public isBlocked;
    mapping(address => uint256) public nonces;
    
    // User lists
    address[] public holders;
    address[] public issuerList;
    address[] public operatorList;
    address[] public relayerList;
    mapping(address => bool) internal isHolder;

    // Meta-transactions
    struct MetaTransaction {
        uint256 nonce;
        address from;
        bytes functionCall;
    }

    // Constants
    bytes32 internal constant META_TRANSACTION_TYPEHASH = keccak256(
        bytes("MetaTransaction(uint256 nonce,address from,bytes functionCall)")
    );

    // Events
    event IssuerAdded(address indexed issuer);
    event OperatorAdded(address indexed operator);
    event RelayerAdded(address indexed relayer);
    event MetaTransactionExecuted(address indexed user, address indexed relayer, bytes4 functionSelector);
    

    // Modifiers
    modifier onlyOperator() {
        require(authorizedOperators[msg.sender], "Not authorized operator");
        _;
    }

    modifier onlyIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedOperators[msg.sender] || authorizedIssuers[msg.sender],
            "Not authorized"
        );
        _;
    }

    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        _;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}