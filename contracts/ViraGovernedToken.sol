// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";


import "./ViraAuthorization.sol";
import "./ViraMetaTransactions.sol";


contract ViraGovernedToken is ERC20Upgradeable,OwnableUpgradeable, ViraAuthorization, ViraMetaTransactions {
   
    function initialize() public initializer {
        __ERC20_init("ViraGovernedToken", "VGT");
        __Ownable_init(msg.sender);
        __EIP712_init("ViraGovernedToken", "1");
        authorizedOperators[msg.sender] = true;
        operatorList.push(msg.sender);
    }

    function _update(address from, address to, uint256 amount) internal override(ERC20Upgradeable) {
        require(!isBlocked[from], "Sender is blocked");
        require(!isBlocked[to], "Recipient is blocked");
        super._update(from, to, amount);

        if (to != address(0) && !isHolder[to]) {
            holders.push(to);
            isHolder[to] = true;
        }
        }

    /**
     * @dev Returns the name of the token
     */
    function name() public view virtual override(ERC20Upgradeable) returns (string memory) {
        return ERC20Upgradeable.name();
    }

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() public view virtual override(ERC20Upgradeable) returns (string memory) {
        return ERC20Upgradeable.symbol();
    }


    /**
     * @dev Returns the total amount of tokens
     */
    function totalSupply() public view virtual override(ERC20Upgradeable) returns (uint256) {
        return ERC20Upgradeable.totalSupply();
    }

    /**
     * @dev Moves amount tokens from the caller's account to to
     */
    function transfer(address to, uint256 amount) public virtual override(ERC20Upgradeable) returns (bool) {
        return ERC20Upgradeable.transfer(to, amount);
    }

}
