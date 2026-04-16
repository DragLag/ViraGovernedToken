// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";


import "./ViraAuthorization.sol";
import "./ViraMetaTransactions.sol";


contract ViraGovernedToken is ERC20Upgradeable,OwnableUpgradeable, ViraAuthorization, ViraMetaTransactions {
   
    uint256 public relayerFeePercentage;
    uint256 public feeCoefficient;
    address public relayerWallet;
    uint256 public transactionCount;
    uint256 public lastResetTime;

    function initialize() public initializer {
        __ERC20_init("ViraGovernedToken", "VGT");
        __Ownable_init(msg.sender);
        __EIP712_init("ViraGovernedToken", "1");
        authorizedOperators[msg.sender] = true;
        operatorList.push(msg.sender);
        relayerFeePercentage = 100; // 1%
        feeCoefficient = 1e18; // 1x multiplier
        lastResetTime = block.timestamp;
    }

    function setRelayerWallet(address _wallet) external onlyOwner {
        relayerWallet = _wallet;
    }

    function setFeeCoefficient(uint256 _coefficient) external onlyOwner {
        feeCoefficient = _coefficient;
    }

    function adjustFeeCoefficient() private {
        if (block.timestamp >= lastResetTime + 1 days) {
            // Apply low-volume decrease based on previous period's count
            if (transactionCount < 10 && feeCoefficient > 0.5e18) {
                feeCoefficient = (feeCoefficient * 9) / 10;
            }
            lastResetTime = block.timestamp;
            transactionCount = 0;
        }

        // Apply high-volume increase immediately when threshold is reached
        if (transactionCount >= 100) {
            feeCoefficient = (feeCoefficient * 11) / 10;
        }
    }

    function _update(address from, address to, uint256 amount) internal override(ERC20Upgradeable) {
        require(!isBlocked[from], "Sender is blocked");
        require(!isBlocked[to], "Recipient is blocked");

        // Apply fee only for actual transfers (not mint/burn)
        if (from != address(0) && to != address(0)) {
            uint256 fee = (amount * relayerFeePercentage * feeCoefficient) / (10000 * 1e18);
            uint256 amountToSend = amount - fee;

            adjustFeeCoefficient();
            transactionCount += 1;

            super._update(from, to, amountToSend);
            super._update(from, relayerWallet, fee);

            if (!isHolder[to]) {
                holders.push(to);
                isHolder[to] = true;
            }
            if (relayerWallet != address(0) && !isHolder[relayerWallet]) {
                holders.push(relayerWallet);
                isHolder[relayerWallet] = true;
            }
        } else {
            super._update(from, to, amount);

            if (to != address(0) && !isHolder[to]) {
                holders.push(to);
                isHolder[to] = true;
            }
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
     * @dev get contract address for EIP-712 verification
     */
    function getVerifyingContract() external view returns (address) {
        return address(this);
    }

    /**
     * @dev get the EIP-712 domain separator
     */
    function domainSeparator() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

}
