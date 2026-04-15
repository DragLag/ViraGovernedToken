// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";


import "./ViraAuthorization.sol";
import "./ViraMetaTransactions.sol";


contract ViraGovernedToken is ERC20Upgradeable,OwnableUpgradeable, ViraAuthorization, ViraMetaTransactions {
   
    uint256 public relayerFeePercentage = 100; // 1%
    uint256 public feeCoefficient = 1e18; // 1x multiplier
    address public relayerWallet;
    uint256 public transactionCount;
    uint256 public lastResetTime;

    function initialize() public initializer {
        __ERC20_init("ViraGovernedToken", "VGT");
        __Ownable_init(msg.sender);
        __EIP712_init("ViraGovernedToken", "1");
        authorizedOperators[msg.sender] = true;
        operatorList.push(msg.sender);
        lastResetTime = block.timestamp;
    }

    function setRelayerWallet(address _wallet) external onlyOwner {
        relayerWallet = _wallet;
    }

    function setFeeCoefficient(uint256 _coefficient) external onlyOwner {
        feeCoefficient = _coefficient;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        uint256 fee = (amount * relayerFeePercentage * feeCoefficient) / (10000 * 1e18);
        uint256 amountToSend = amount - fee;

        transactionCount += 1;
        adjustFeeCoefficient();

        super._transfer(sender, recipient, amountToSend);
        super._transfer(sender, relayerWallet, fee);
    }

    function adjustFeeCoefficient() private {
        if (block.timestamp >= lastResetTime + 1 days) {
            lastResetTime = block.timestamp;
            transactionCount = 0;
        }

        if (transactionCount > 100) {
            // Increase coefficient by 10% if high volume
            feeCoefficient = (feeCoefficient * 11) / 10;
        } else if (transactionCount < 10 && feeCoefficient > 0.5e18) {
            // Decrease by 10% if low volume, with floor
            feeCoefficient = (feeCoefficient * 9) / 10;
        }
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
