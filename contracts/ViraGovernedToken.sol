// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./ViraUserManagement.sol";
import "./ViraAuthorization.sol";
import "./ViraMetaTransactions.sol";


contract ViraGovernedToken is ViraUserManagement, ViraAuthorization, ViraMetaTransactions {
   
    // ✅ initialize invece del constructor
    function initialize() public initializer {
        __ERC20_init("ViraGovernedToken", "VGT");
        __Ownable_init();
        __EIP712_init("ViraGovernedToken", "1");
        authorizedOperators[msg.sender] = true;
        operatorList.push(msg.sender);
    }

    /**
     * @dev Override _beforeTokenTransfer to handle multiple inheritance
     */
    function _beforeTokenTransfer(
        address from, 
        address to, 
        uint256 amount
    ) internal override(ERC20Upgradeable, ViraUserManagement) {
        ViraUserManagement._beforeTokenTransfer(from, to, amount);
    }



    
     // ========== INTERNAL IMPLEMENTATIONS ==========
    
    /*function registerUserInternal(address sender, address user) internal override{
        require(authorizedOperators[sender] || authorizedIssuers[sender], "Not authorized");
        require(balanceOf(user) == 0, "User already registered");
        if (!isHolder[user]) {
            holders.push(user);
            isHolder[user] = true;
        }
    }*/
     // User management
    function registerUser(address user) external;
    function blockUser(address user) external;
    function unblockUser(address user) external;
    function adjustBalance(address user, int256 amount) external;

    // Authorization functions
    function addOperator(address operator) external;
    function removeOperator(address operator) external;
    function addIssuer(address issuer) external;
    function removeIssuer(address issuer) external;
    function addRelayer(address relayer) external;
    function removeRelayer(address relayer) external;


    /*
    function blockUserInternal(address sender, address user) internal {
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = true;
    }

    function unblockUserInternal(address sender, address user) internal{
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
    */
    

}
