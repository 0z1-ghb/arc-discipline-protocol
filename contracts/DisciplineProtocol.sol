// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DisciplineProtocol is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    address public validator;
    address public rewardPool;

    uint256 public constant MAX_SCORE = 1000;
    
    // Task-Specific Points
    uint256 public constant DAILY_POINTS = 10;
    uint256 public constant WEEKLY_POINTS = 50;
    uint256 public constant MONTHLY_POINTS = 200;
    
    uint256 public constant FAILURE_PENALTY = 20;

    // Task Types
    enum TaskType { Daily, Weekly, Monthly }

    // User Limits & Quotas
    struct UserLimits {
        uint256 dailyCount;
        uint256 lastDailyReset;
        uint256 weeklyCount;
        uint256 lastWeeklyReset;
        uint256 monthlyCount;
        uint256 lastMonthlyReset;
    }

    mapping(address => UserLimits) public userLimits;
    mapping(address => uint256) public disciplineScores;
    
    // Leaderboard Data
    mapping(address => uint256) public totalDeposited;
    address[] public allUsers;
    mapping(address => bool) public isUserRegistered;

    struct Commitment {
        address user;
        uint256 amount;
        TaskType taskType;
        string githubUsername;
        uint256 createdAt;
        uint256 deadline;
        bool completed;
        bool failed;
    }

    mapping(uint256 => Commitment) public commitments;
    uint256 public commitmentCount;

    event Deposited(uint256 commitmentId, address user, uint256 amount, TaskType taskType, string githubUsername);
    event TaskCompleted(uint256 commitmentId, address user, uint256 newScore);
    event TaskFailed(uint256 commitmentId, address user, uint256 penaltyAmount, uint256 newScore);
    event ValidatorUpdated(address oldValidator, address newValidator);
    event RewardPoolUpdated(address oldPool, address newPool);

    constructor(address _usdc, address _validator, address _rewardPool) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_validator != address(0), "Invalid validator address");
        require(_rewardPool != address(0), "Invalid reward pool address");
        usdc = IERC20(_usdc);
        validator = _validator;
        rewardPool = _rewardPool;
    }

    modifier onlyValidator() {
        require(msg.sender == validator, "Only validator can call this");
        _;
    }

    function _resetLimits(address user) internal {
        UserLimits storage limits = userLimits[user];
        uint256 now = block.timestamp;

        // Daily Reset (24 hours)
        if (now >= limits.lastDailyReset + 24 hours) {
            limits.dailyCount = 0;
            limits.lastDailyReset = now;
        }

        // Weekly Reset (7 days)
        if (now >= limits.lastWeeklyReset + 7 days) {
            limits.weeklyCount = 0;
            limits.lastWeeklyReset = now;
        }

        // Monthly Reset (30 days)
        if (now >= limits.lastMonthlyReset + 30 days) {
            limits.monthlyCount = 0;
            limits.lastMonthlyReset = now;
        }
    }

    function deposit(uint256 _amount, TaskType _taskType, string calldata _githubUsername) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_githubUsername).length > 0, "GitHub username cannot be empty");

        _resetLimits(msg.sender);
        UserLimits storage limits = userLimits[msg.sender];

        // Check Quotas
        if (_taskType == TaskType.Daily) {
            require(limits.dailyCount < 2, "Daily limit reached (2/2)");
            limits.dailyCount++;
        } else if (_taskType == TaskType.Weekly) {
            require(limits.weeklyCount < 1, "Weekly limit reached (1/1)");
            limits.weeklyCount++;
        } else if (_taskType == TaskType.Monthly) {
            require(limits.monthlyCount < 1, "Monthly limit reached (1/1)");
            limits.monthlyCount++;
        }

        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        // Update Leaderboard Data
        totalDeposited[msg.sender] += _amount;
        if (!isUserRegistered[msg.sender]) {
            allUsers.push(msg.sender);
            isUserRegistered[msg.sender] = true;
        }

        commitmentCount++;
        commitments[commitmentCount] = Commitment({
            user: msg.sender,
            amount: _amount,
            taskType: _taskType,
            githubUsername: _githubUsername,
            createdAt: block.timestamp,
            deadline: block.timestamp + 24 hours,
            completed: false,
            failed: false
        });

        emit Deposited(commitmentCount, msg.sender, _amount, _taskType, _githubUsername);
    }

    function completeTask(uint256 _commitmentId) external onlyValidator {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "Commitment does not exist");
        require(!c.completed && !c.failed, "Already resolved");

        c.completed = true;
        require(usdc.transfer(c.user, c.amount), "Refund failed");

        uint256 currentScore = disciplineScores[c.user];
        uint256 points = 0;
        
        if (c.taskType == TaskType.Daily) points = DAILY_POINTS;
        else if (c.taskType == TaskType.Weekly) points = WEEKLY_POINTS;
        else if (c.taskType == TaskType.Monthly) points = MONTHLY_POINTS;
        
        uint256 newScore = currentScore + points;
        if (newScore > MAX_SCORE) newScore = MAX_SCORE;
        disciplineScores[c.user] = newScore;

        emit TaskCompleted(_commitmentId, c.user, newScore);
    }

    function failTask(uint256 _commitmentId) external onlyValidator {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "Commitment does not exist");
        require(!c.completed && !c.failed, "Already resolved");

        c.failed = true;
        require(usdc.transfer(rewardPool, c.amount), "Penalty transfer failed");

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

    function getUserLimits(address _user) external view returns (
        uint256 dailyCount,
        uint256 weeklyCount,
        uint256 monthlyCount
    ) {
        UserLimits storage limits = userLimits[_user];
        uint256 now = block.timestamp;

        uint256 dCount = limits.dailyCount;
        if (now >= limits.lastDailyReset + 24 hours) dCount = 0;

        uint256 wCount = limits.weeklyCount;
        if (now >= limits.lastWeeklyReset + 7 days) wCount = 0;

        uint256 mCount = limits.monthlyCount;
        if (now >= limits.lastMonthlyReset + 30 days) mCount = 0;

        return (dCount, wCount, mCount);
    }

    function setValidator(address _newValidator) external onlyOwner {
        require(_newValidator != address(0), "Invalid validator address");
        emit ValidatorUpdated(validator, _newValidator);
        validator = _newValidator;
    }

    function setRewardPool(address _newRewardPool) external onlyOwner {
        require(_newRewardPool != address(0), "Invalid reward pool address");
        emit RewardPoolUpdated(rewardPool, _newRewardPool);
        rewardPool = _newRewardPool;
    }

    function getUserCount() external view returns (uint256) {
        return allUsers.length;
    }

    function getCommitment(uint256 _commitmentId) external view returns (
        address user,
        uint256 amount,
        TaskType taskType,
        string memory githubUsername,
        uint256 createdAt,
        uint256 deadline,
        bool completed,
        bool failed
    ) {
        Commitment storage c = commitments[_commitmentId];
        return (c.user, c.amount, c.taskType, c.githubUsername, c.createdAt, c.deadline, c.completed, c.failed);
    }
}
