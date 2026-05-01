// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DisciplineProtocol is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    address public validator;
    address public penaltyAddress;

    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant SUCCESS_POINTS = 10;
    uint256 public constant FAILURE_PENALTY = 20;

    mapping(address => uint256) public disciplineScores;

    struct Commitment {
        address user;
        uint256 amount;
        string goal;
        string githubUsername;
        uint256 createdAt;
        uint256 deadline; // 24 hours from creation
        bool completed;
        bool failed;
        bool refunded;
    }

    mapping(uint256 => Commitment) public commitments;
    uint256 public commitmentCount;

    event Deposited(uint256 commitmentId, address user, uint256 amount, string goal, string githubUsername);
    event TaskCompleted(uint256 commitmentId, address user, uint256 newScore);
    event TaskFailed(uint256 commitmentId, address user, uint256 penaltyAmount, uint256 newScore);
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

    function deposit(uint256 _amount, string calldata _goal, string calldata _githubUsername) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_goal).length > 0, "Goal cannot be empty");
        require(bytes(_githubUsername).length > 0, "GitHub username cannot be empty");

        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        commitmentCount++;
        commitments[commitmentCount] = Commitment({
            user: msg.sender,
            amount: _amount,
            goal: _goal,
            githubUsername: _githubUsername,
            createdAt: block.timestamp,
            deadline: block.timestamp + 24 hours, // 24 saat süre
            completed: false,
            failed: false,
            refunded: false
        });

        emit Deposited(commitmentCount, msg.sender, _amount, _goal, _githubUsername);
    }

    function completeTask(uint256 _commitmentId) external onlyValidator {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "Commitment does not exist");
        require(!c.completed && !c.failed, "Already resolved");

        c.completed = true;
        require(usdc.transfer(c.user, c.amount), "Refund failed");

        uint256 currentScore = disciplineScores[c.user];
        uint256 newScore = currentScore + SUCCESS_POINTS;
        if (newScore > MAX_SCORE) newScore = MAX_SCORE;
        disciplineScores[c.user] = newScore;

        emit TaskCompleted(_commitmentId, c.user, newScore);
    }

    function failTask(uint256 _commitmentId) external onlyValidator {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "Commitment does not exist");
        require(!c.completed && !c.failed, "Already resolved");

        c.failed = true;
        require(usdc.transfer(penaltyAddress, c.amount), "Penalty transfer failed");

        uint256 currentScore = disciplineScores[c.user];
        uint256 newScore = 0;
        if (currentScore >= FAILURE_PENALTY) newScore = currentScore - FAILURE_PENALTY;
        disciplineScores[c.user] = newScore;

        emit TaskFailed(_commitmentId, c.user, c.amount, newScore);
    }

    function getScore(address _user) external view returns (uint256 score, string memory level) {
        score = disciplineScores[_user];
        if (score >= 1000) level = "Legend";
        else if (score >= 500) level = "Elite";
        else if (score >= 100) level = "Disciplined";
        else level = "Novice";
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
        string memory githubUsername,
        uint256 createdAt,
        uint256 deadline,
        bool completed,
        bool failed,
        bool refunded
    ) {
        Commitment storage c = commitments[_commitmentId];
        return (c.user, c.amount, c.goal, c.githubUsername, c.createdAt, c.deadline, c.completed, c.failed, c.refunded);
    }
}
