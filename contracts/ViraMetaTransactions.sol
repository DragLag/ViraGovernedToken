// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

//import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ViraStorage.sol";

/**
 * @title ViraMetaTransactions
 * @dev Handles meta-transaction functionality
 */
abstract contract ViraMetaTransactions is ViraStorage {
    using ECDSA for bytes32;

    // ========== META-TRANSACTION EXECUTION ==========

    function executeMetaTransaction(
        address userAddress,
        bytes memory functionCall,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public onlyRelayer returns (bytes memory) {
        MetaTransaction memory metaTx = MetaTransaction({
            nonce: nonces[userAddress],
            from: userAddress,
            functionCall: functionCall
        });

        require(verify(userAddress, metaTx, sigR, sigS, sigV), "Invalid signature");
        
        nonces[userAddress]++;

        // Extract function selector for event
        bytes4 functionSelector;
        assembly {
            functionSelector := mload(add(functionCall, 32))
        }

        emit MetaTransactionExecuted(userAddress, msg.sender, functionSelector);

        // Execute the call with user context
        return executeCall(userAddress, functionCall);
    }

    function verify(
        address user,
        MetaTransaction memory metaTx,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    META_TRANSACTION_TYPEHASH,
                    metaTx.nonce,
                    metaTx.from,
                    keccak256(metaTx.functionCall)
                )
            )
        );
        
        address recoveredAddress = digest.recover(abi.encodePacked(sigR, sigS, sigV));
        return recoveredAddress == user;
    }

    function getNonce(address user) public view returns (uint256) {
        return nonces[user];
    }

    // ========== CALL EXECUTION ==========

    function executeCall(address userAddress, bytes memory functionCall) internal returns (bytes memory) {
        bytes4 selector;
        assembly {
            selector := mload(add(functionCall, 32))
        }

        if (selector == this.registerUserMeta.selector) {
            address user = abi.decode(skipFirst4Bytes(functionCall), (address));
            registerUserInternal(userAddress, user);
            return "";
        } else if (selector == this.blockUserMeta.selector) {
            address user = abi.decode(skipFirst4Bytes(functionCall), (address));
            blockUserInternal(userAddress, user);
            return "";
        } else if (selector == this.unblockUserMeta.selector) {
            address user = abi.decode(skipFirst4Bytes(functionCall), (address));
            unblockUserInternal(userAddress, user);
            return "";
        } else if (selector == this.adjustBalanceMeta.selector) {
            (address user, int256 amount) = abi.decode(skipFirst4Bytes(functionCall), (address, int256));
            adjustBalanceInternal(userAddress, user, amount);
            return "";
        } else if (selector == this.transferMeta.selector) {
            (address to, uint256 amount) = abi.decode(skipFirst4Bytes(functionCall), (address, uint256));
            _transfer(userAddress, to, amount);
            return "";
        }
        revert("Function not supported for meta-transaction");
    }

    function skipFirst4Bytes(bytes memory functionCall) internal pure returns (bytes memory) {
        require(functionCall.length >= 4, "Function call too short");
        bytes memory params = new bytes(functionCall.length - 4);
        for (uint256 i = 0; i < params.length; i++) {
            params[i] = functionCall[i + 4];
        }
        return params;
    }

    // ========== META-TRANSACTION WRAPPER FUNCTIONS ==========

    function registerUserMeta(address user) public pure {
        revert("Use executeMetaTransaction");
    }

   

    function blockUserMeta(address user) public pure {
        revert("Use executeMetaTransaction");
    }

    function unblockUserMeta(address user) public pure {
        revert("Use executeMetaTransaction");
    }

    function adjustBalanceMeta(address user, int256 amount) public pure {
        revert("Use executeMetaTransaction");
    }

    function transferMeta(address to, uint256 amount) public pure {
        revert("Use executeMetaTransaction");
    }

    
    // ========== USER REGISTRATION ==========
    
    function registerUser(address user) public onlyAuthorized {
        registerUserInternal(msg.sender, user);
    }
    
    function registerUserInternal(address sender, address user) internal {
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

    function blockUserInternal(address sender, address user) internal {
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = true;
    }

    function unblockUser(address user) public onlyOperator {
        unblockUserInternal(msg.sender, user);
    }

    function unblockUserInternal(address sender, address user) internal {
        require(authorizedOperators[sender], "Not authorized operator");
        isBlocked[user] = false;
    }

   // ========== BALANCE MANAGEMENT ==========
    
    function adjustBalance(address user, int256 amount) public onlyIssuer {
        adjustBalanceInternal(msg.sender, user, amount);
    }

    function adjustBalanceInternal(address sender, address user, int256 amount) internal{
        require(authorizedIssuers[sender], "Not authorized issuer");
        require(!isBlocked[user], "User is blocked");
        if (amount > 0) {
            _mint(user, uint256(amount));
        } else {
            _burn(user, uint256(-amount));
        }
    }
}