// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IViraGovernedToken {
    function isHolderAddress(address user) external view returns (bool);
    function getHoldersLength() external view returns (uint256);
    function getHolder(uint256 index) external view returns (address);
    function addOperator(address operator) external;
}

contract OperatorVotingManager {
    IViraGovernedToken public viraToken;
    uint256 public voteDuration = 3 days;

    struct VoteProposal {
        address nominee;
        uint256 voteCount;
        uint256 startTime;
        bool executed;
    }

    mapping(address => VoteProposal) public proposals;
    mapping(address => mapping(address => bool)) public hasVoted;

    constructor(address _viraToken) {
        viraToken = IViraGovernedToken(_viraToken);
    }

    function proposeOperator(address nominee) external {
        require(viraToken.isHolderAddress(msg.sender), "Only holders can propose");
        require(nominee != address(0), "Invalid nominee");

        VoteProposal storage proposal = proposals[nominee];

        if (
            proposal.startTime == 0 ||
            block.timestamp > proposal.startTime + voteDuration
        ) {
            // new or expired -> reset
            proposals[nominee] = VoteProposal({
                nominee: nominee,
                voteCount: 1,
                startTime: block.timestamp,
                executed: false
            });
            hasVoted[nominee][msg.sender] = true;
        } else {
            require(!proposal.executed, "Already executed");
            require(!hasVoted[nominee][msg.sender], "Already voted");

            proposal.voteCount++;
            hasVoted[nominee][msg.sender] = true;
        }

        _checkAndExecute(nominee);
    }

    function _checkAndExecute(address nominee) internal {
        VoteProposal storage proposal = proposals[nominee];

        uint256 holdersCount = viraToken.getHoldersLength();
        if (proposal.voteCount > holdersCount / 2 && !proposal.executed) {
            viraToken.addOperator(nominee);
            proposal.executed = true;
        }
    }
}
