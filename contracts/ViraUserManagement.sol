// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ViraStorage.sol";
import "./ViraMetaTransactions.sol";
/**
 * @title ViraUserManagement
 * @dev Handles user registration, blocking, and balance adjustments
 */
abstract contract ViraUserManagement is ViraStorage, ViraMetaTransactions {
    
    // ========== USER REGISTRATION ==========
    
    function registerUser(address user) public onlyAuthorized {
        registerUserInternal(msg.sender, user);
    }

    function registerUserInternal(address sender, address user) internal virtual override{
        require(authorizedOperators[sender] || authorizedIssuers[sender], "Not authorized");
        require(balanceOf(user) == 0, "User already registered");
        if (!isHolder[user]) {
            holders.push(user);
            isHolder[user] = true;
        }
    }

    // ========== USER BLOCKING ==========
    
    function blockUser(address user) public onlyOperator {
        blockUserInternal(msg.sender, user);
    }

    function blockUserInternal(address sender, address user) internal virtual override{
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = true;
    }

    function unblockUser(address user) public onlyOperator {
        unblockUserInternal(msg.sender, user);
    }

    function unblockUserInternal(address sender, address user) internal virtual override {
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = false;
    }

    // ========== BALANCE MANAGEMENT ==========
    
    function adjustBalance(address user, int256 amount) public onlyIssuer {
        adjustBalanceInternal(msg.sender, user, amount);
    }

    function adjustBalanceInternal(address sender, address user, int256 amount) internal virtual override {
        require(authorizedIssuers[sender], "Not authorized issuer");
        require(!isBlocked[user], "User is blocked");
        if (amount > 0) {
            _mint(user, uint256(amount));
        } else {
            _burn(user, uint256(-amount));
        }
    }

    // ========== TOKEN TRANSFER OVERRIDE ==========
    
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        require(!isBlocked[from], "Sender is blocked");
        require(!isBlocked[to], "Recipient is blocked");
        super._beforeTokenTransfer(from, to, amount);

        if (to != address(0) && !isHolder[to]) {
            holders.push(to);
            isHolder[to] = true;
        }
    }

    
}