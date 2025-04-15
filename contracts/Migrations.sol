// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Migrations {
    address public owner = msg.sender;

    modifier restricted() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function setCompleted(uint completed) public restricted {}

    function migrate(address newOwner) public restricted {
        owner = newOwner;
    }
}
