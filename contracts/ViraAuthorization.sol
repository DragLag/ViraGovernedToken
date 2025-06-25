// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ViraStorage.sol";

/**
 * @title ViraAuthorization
 * @dev Handles authorization management for operators, issuers, and relayers
 */
abstract contract ViraAuthorization is ViraStorage {
    
    // ========== OPERATOR MANAGEMENT ==========
    
    function addOperator(address operator) public onlyOwner {
        require(!authorizedOperators[operator], "Already an operator");
        authorizedOperators[operator] = true;
        operatorList.push(operator);
        emit OperatorAdded(operator);
    }

    function removeOperator(address operator) public onlyOwner {
        authorizedOperators[operator] = false;
        _removeFromList(operatorList, operator);
    }

    // ========== ISSUER MANAGEMENT ==========
    
    function addIssuer(address issuer) public onlyOwner {
        require(!authorizedIssuers[issuer], "Already an issuer");
        authorizedIssuers[issuer] = true;
        issuerList.push(issuer);
        emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = false;
        _removeFromList(issuerList, issuer);
    }

    // ========== RELAYER MANAGEMENT ==========
    
    function addRelayer(address relayer) public onlyOwner {
        require(!authorizedRelayers[relayer], "Already a relayer");
        authorizedRelayers[relayer] = true;
        relayerList.push(relayer);
        emit RelayerAdded(relayer);
    }

    function removeRelayer(address relayer) public onlyOwner {
        authorizedRelayers[relayer] = false;
        _removeFromList(relayerList, relayer);
    }

    function getRelayers() public view returns (address[] memory) {
        return relayerList;
    }

    // ========== INTERNAL HELPER ==========
    
    function _removeFromList(address[] storage list, address item) internal {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }
}