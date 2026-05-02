// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IDisciplineProtocol {
    function disciplineScores(address user) external view returns (uint256);
}

contract RewardPool is Ownable {
    IERC20 public immutable usdc;
    IDisciplineProtocol public protocol;

    // Minimum score required to claim rewards
    uint256 public constant MIN_SCORE_TO_CLAIM = 100;
    
    // Track last claim month per user (1 claim per month)
    mapping(address => uint256) public lastClaimMonth;

    event RewardClaimed(address user, uint256 amount, uint256 score);
    event Deposited(address from, uint256 amount);

    constructor(address _usdc, address _protocol) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_protocol != address(0), "Invalid Protocol");
        usdc = IERC20(_usdc);
        protocol = IDisciplineProtocol(_protocol);
    }

    // Allow receiving USDC directly
    function deposit(uint256 _amount) external {
        require(usdc.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        emit Deposited(msg.sender, _amount);
    }

    // Users claim rewards based on their score
    // Formula: Reward is proportional to score, capped by pool balance
    // Simple logic: (PoolBalance * UserScore) / 1000
    // This ensures high scores get more, but pool doesn't drain instantly if many claim.
    // Limit: 1 claim per calendar month.
    function claim() external {
        uint256 score = protocol.disciplineScores(msg.sender);
        require(score >= MIN_SCORE_TO_CLAIM, "Score too low");

        // Check monthly limit (1 claim per 30-day period)
        uint256 currentMonth = block.timestamp / 30 days;
        require(currentMonth > lastClaimMonth[msg.sender], "Already claimed this month");

        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "Pool empty");

        // Calculate reward: Proportional to score (Max score 1000)
        // If score is 1000 (Legend), they can claim up to 100% of pool (first come first served logic)
        // If score is 100, they claim 10% of pool.
        uint256 reward = (balance * score) / 1000;
        
        // Cap reward at remaining balance
        if (reward > balance) reward = balance;
        require(reward > 0, "Reward too small");

        // Update last claim month
        lastClaimMonth[msg.sender] = currentMonth;

        require(usdc.transfer(msg.sender, reward), "Transfer failed");
        emit RewardClaimed(msg.sender, reward, score);
    }

    // Owner can withdraw funds in emergency
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(usdc.transfer(owner(), _amount), "Transfer failed");
    }
}
