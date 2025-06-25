// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./ViraStorage.sol";
import "./ViraMetaTransactions.sol";


contract ViraGovernedToken is ViraStorage, ViraMetaTransactions {
   
    // ✅ initialize invece del constructor
    function initialize() public initializer {
        __ERC20_init("ViraGovernedToken", "VGT");
        __Ownable_init();
        __EIP712_init("ViraGovernedToken", "1");
        authorizedOperators[msg.sender] = true;
        operatorList.push(msg.sender);
    }


    function addOperator(address operator) public onlyOwner {
        require(!authorizedOperators[operator], "Already an operator");
        authorizedOperators[operator] = true;
        operatorList.push(operator);
        emit OperatorAdded(operator);
    }

    function removeOperator(address operator) public onlyOwner {
        authorizedOperators[operator] = false;
        for (uint256 i = 0; i < operatorList.length; i++) {
            if (operatorList[i] == operator) {
                operatorList[i] = operatorList[operatorList.length - 1];
                operatorList.pop();
                break;
            }
        }
    }

    function addIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAdded(issuer); 
    }

    function removeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = false;
    }

    function registerUser(address user) public onlyAuthorized {
        require(balanceOf(user) == 0, "User already registered");
        if (!isHolder[user]) {
            holders.push(user);
            isHolder[user] = true;
        }
    }

    function adjustBalance(address user, int256 amount) public onlyIssuer {
        require(!isBlocked[user], "User is blocked");
        if (amount > 0) {
            _mint(user, uint256(amount));
        } else {
            _burn(user, uint256(-amount));
            
        }
    }

    function blockUser(address user) public onlyOperator {
        isBlocked[user] = true;
    }

    function unblockUser(address user) public onlyOperator {
        isBlocked[user] = false;
    }

  
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override{
        require(!isBlocked[from], "Sender is blocked");
        require(!isBlocked[to], "Recipient is blocked");
        super._beforeTokenTransfer(from, to, amount);

        if (!isHolder[to]) {
            holders.push(to);
            isHolder[to] = true;
        }
    }

     // ========== INTERNAL IMPLEMENTATIONS ==========

    function registerUserInternal(address sender, address user) internal override{
        require(authorizedOperators[sender] || authorizedIssuers[sender], "Not authorized");
        require(balanceOf(user) == 0, "User already registered");
        if (!isHolder[user]) {
            holders.push(user);
            isHolder[user] = true;
        }
    }

    
    function blockUserInternal(address sender, address user) internal override{
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = true;
    }

    function unblockUserInternal(address sender, address user) internal override{
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = false;
    }

    function adjustBalanceInternal(address sender, address user, int256 amount) internal override{
        require(authorizedIssuers[sender], "Not authorized issuer");
        require(!isBlocked[user], "User is blocked");
        if (amount > 0) {
            _mint(user, uint256(amount));
        } else {
            _burn(user, uint256(-amount));
        }
    }

}
