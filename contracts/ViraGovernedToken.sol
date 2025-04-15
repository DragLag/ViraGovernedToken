// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ViraGovernedToken is ERC20, Ownable {
    mapping(address => bool) public authorizedOperators;
    mapping(address => bool) public isBlocked;
    address[] public holders;
    mapping(address => bool) internal isHolder;

    struct Vote {
        address target;
        uint256 count;
        bool executed;
        uint256 timestamp;
        uint256 duration;
    }

    mapping(address => Vote) public redistributionVotes;
    mapping(address => mapping(address => bool)) public hasVoted;

    constructor() ERC20("ViraGovernedToken", "VGT") {
        authorizedOperators[msg.sender] = true;
    }

    modifier onlyOperator() {
        require(authorizedOperators[msg.sender], "Not authorized");
        _;
    }

    function addOperator(address operator) public onlyOwner {
        authorizedOperators[operator] = true;
    }

    function removeOperator(address operator) public onlyOwner {
        authorizedOperators[operator] = false;
    }

    function registerUser(address user) public onlyOperator {
        require(balanceOf(user) == 0, "User already registered");
        _mint(user, 100);
        if (!isHolder[user]) {
            holders.push(user);
            isHolder[user] = true;
        }
    }

    function adjustBalance(address user, int256 amount) public onlyOperator {
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

    function getPoorUsers() public view returns (address[] memory) {
        uint256 totalTokens = 0;
        uint256 numUsers = 0;

        for (uint256 i = 0; i < holders.length; i++) {
            if (!isBlocked[holders[i]]) {
                totalTokens += balanceOf(holders[i]);
                numUsers++;
            }
        }

        uint256 averageBalance = numUsers > 0 ? totalTokens / numUsers : 0;
        uint256 count = 0;

        for (uint256 i = 0; i < holders.length; i++) {
            if (!isBlocked[holders[i]] && balanceOf(holders[i]) < averageBalance) {
                count++;
            }
        }

        address[] memory poorUsers = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < holders.length; i++) {
            if (!isBlocked[holders[i]] && balanceOf(holders[i]) < averageBalance) {
                poorUsers[index++] = holders[i];
            }
        }

        return poorUsers;
    }

    function proposeRedistribution(address richUser, uint256 duration) public onlyOperator {
        require(balanceOf(richUser) > 0, "User has no tokens");

        Vote storage vote = redistributionVotes[richUser];

        if (vote.target != richUser || block.timestamp > vote.timestamp + vote.duration) {
            redistributionVotes[richUser] = Vote({
                target: richUser,
                count: 1,
                executed: false,
                timestamp: block.timestamp,
                duration: duration
            });
            hasVoted[richUser][msg.sender] = true;
        } else {
            require(!vote.executed, "Redistribution already executed");
            require(!hasVoted[richUser][msg.sender], "Already voted");

            vote.count++;
            hasVoted[richUser][msg.sender] = true;
        }

        uint256 totalOperators = 0;
        for (uint256 i = 0; i < holders.length; i++) {
            if (authorizedOperators[holders[i]]) totalOperators++;
        }
        if (authorizedOperators[owner()]) totalOperators++;

        if (vote.count > totalOperators / 2) {
            _executeRedistribution(richUser);
            redistributionVotes[richUser].executed = true;
        }
    }

    function cancelRedistributionVote(address richUser) public onlyOperator {
        Vote storage vote = redistributionVotes[richUser];
        require(block.timestamp > vote.timestamp + vote.duration, "Vote still active");
        delete redistributionVotes[richUser];
    }

    function getActiveVotes() public view returns (address[] memory activeRichUsers) {
        uint256 count = 0;
        for (uint256 i = 0; i < holders.length; i++) {
            address user = holders[i];
            Vote storage vote = redistributionVotes[user];
            if (
                vote.target == user &&
                !vote.executed &&
                block.timestamp <= vote.timestamp + vote.duration
            ) {
                count++;
            }
        }

        activeRichUsers = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < holders.length; i++) {
            address user = holders[i];
            Vote storage vote = redistributionVotes[user];
            if (
                vote.target == user &&
                !vote.executed &&
                block.timestamp <= vote.timestamp + vote.duration
            ) {
                activeRichUsers[idx++] = user;
            }
        }
    }

    function _executeRedistribution(address richUser) internal {
        uint256 totalTokens = 0;
        uint256 numUsers = 0;

        for (uint256 i = 0; i < holders.length; i++) {
            if (!isBlocked[holders[i]]) {
                totalTokens += balanceOf(holders[i]);
                numUsers++;
            }
        }

        require(numUsers > 0, "No users available for redistribution");

        uint256 averageBalance = totalTokens / numUsers;
        uint256 richBalance = balanceOf(richUser);

        require(richBalance > averageBalance, "User is not richer than average");

        uint256 excess = richBalance - averageBalance;
        address[] memory poorUsers = getPoorUsers();
        uint256 numPoorUsers = poorUsers.length;

        require(numPoorUsers > 0, "No poor users to redistribute to");

        uint256 amountPerUser = excess / numPoorUsers;

        for (uint256 i = 0; i < numPoorUsers; i++) {
            _transfer(richUser, poorUsers[i], amountPerUser);
        }

        uint256 newBalance = balanceOf(richUser);
        if (newBalance > averageBalance) {
            _burn(richUser, newBalance - averageBalance);
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        require(!isBlocked[from], "Sender is blocked");
        require(!isBlocked[to], "Recipient is blocked");
        super._beforeTokenTransfer(from, to, amount);

        if (!isHolder[to]) {
            holders.push(to);
            isHolder[to] = true;
        }
    }
}
