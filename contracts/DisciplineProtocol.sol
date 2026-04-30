// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DisciplineProtocol is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    address public validator;
    address public penaltyAddress;

    struct Commitment {
        address user;
        uint256 amount;
        string goal;
        bool completed;
        bool failed;
        bool refunded;
    }

    mapping(uint256 => Commitment) public commitments;
    uint256 public commitmentCount;

    event Deposited(uint256 commitmentId, address user, uint256 amount, string goal);
    event TaskCompleted(uint256 commitmentId, address user);
    event TaskFailed(uint256 commitmentId, address user, uint256 penaltyAmount);
    event ValidatorUpdated(address oldValidator, address newValidator);
    event PenaltyAddressUpdated(address oldPenalty, address newPenalty);

    constructor(address _usdc, address _validator, address _penaltyAddress) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_validator != address(0), "Invalid validator address");
        require(_penaltyAddress != address(0), "Invalid penalty address");
        usdc = IERC20(_usdc);
        validator = _validator;
        penaltyAddress = _penaltyAddress;
    }

    modifier onlyValidator() {
        require(msg.sender == validator, "Only validator can call this");
        _;
    }

    function deposit(uint256 _amount, string calldata _goal) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_goal).length > 0, "Goal cannot be empty");

        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        commitmentCount++;
        commitments[commitmentCount] = Commitment({
            user: msg.sender,
            amount: _amount,
            goal: _goal,
            completed: false,
            failed: false,
            refunded: false
        });

        emit Deposited(commitmentCount, msg.sender, _amount, _goal);
    }

    function completeTask(uint256 _commitmentId) external onlyValidator {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "Commitment does not exist");
        require(!c.completed && !c.failed, "Already resolved");

        c.completed = true;
        require(usdc.transfer(c.user, c.amount), "Refund failed");

        emit TaskCompleted(_commitmentId, c.user);
    }

    function failTask(uint256 _commitmentId) external onlyValidator {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "Commitment does not exist");
        require(!c.completed && !c.failed, "Already resolved");

        c.failed = true;
        require(usdc.transfer(penaltyAddress, c.amount), "Penalty transfer failed");

        emit TaskFailed(_commitmentId, c.user, c.amount);
    }

    function setValidator(address _newValidator) external onlyOwner {
        require(_newValidator != address(0), "Invalid validator address");
        emit ValidatorUpdated(validator, _newValidator);
        validator = _newValidator;
    }

    function setPenaltyAddress(address _newPenaltyAddress) external onlyOwner {
        require(_newPenaltyAddress != address(0), "Invalid penalty address");
        emit PenaltyAddressUpdated(penaltyAddress, _newPenaltyAddress);
        penaltyAddress = _newPenaltyAddress;
    }

    function getCommitment(uint256 _commitmentId) external view returns (
        address user,
        uint256 amount,
        string memory goal,
        bool completed,
        bool failed,
        bool refunded
    ) {
        Commitment storage c = commitments[_commitmentId];
        return (c.user, c.amount, c.goal, c.completed, c.failed, c.refunded);
    }
}
