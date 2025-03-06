// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

/// @title Simple DEX Pair Contract
/// @notice Implements a simplified AMM DEX pair with support for ETH and ERC20 tokens
/// @dev Based on Uniswap V2 core mechanics with simplified functionality
contract SimpleDex is ReentrancyGuard {
    // Custom errors
    error ZeroAmount();
    error TransferFailed();
    error InsufficientLiquidity();
    error InvalidToken();
    error AlreadyInitialized();
    error InsufficientLiquidityForSwap();
    error NotSorted();
    error InvalidRatio();
    error InvalidEthValue();

    // State variables
    address public immutable ethAddress;
    address public token0;
    address public token1;
    uint256 public reserve0;
    uint256 public reserve1;
    bool private initialized;
    LPToken public lpToken;
    
    constructor(address _ethAddress) {
        ethAddress = _ethAddress;
    }

    // Events
    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Swap(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
    event Initialized(address indexed token0, address indexed token1);

    /// @notice Initializes the pair with two tokens
    /// @dev Tokens must be provided in ascending order by address
    /// @param _token0 Address of token0
    /// @param _token1 Address of token1
    function initialize(address _token0, address _token1) external {
        if (initialized) revert AlreadyInitialized();
        if (_token0 >= _token1) revert NotSorted();
        
        token0 = _token0;
        token1 = _token1;
        lpToken = new LPToken(address(this));
        initialized = true;

        emit Initialized(_token0, _token1);
    }

    /// @notice Updates internal reserve values to match current balances
    function _updateReserves() private {
        reserve0 = _getBalance(token0);
        reserve1 = _getBalance(token1);
    }

    /// @notice Transfers tokens from user to contract
    /// @dev Handles both ETH and ERC20 transfers
    /// @param token Token address (ethAddress for ETH)
    /// @param from Address sending the tokens
    /// @param amount Amount of tokens to transfer
    function _transferTokenIn(address token, address from, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();

        if (token == ethAddress) {
            // For ETH transfers
            if (msg.value != amount) revert InvalidEthValue();
        } else {
            // For ERC20 transfers
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            bool success = IERC20(token).transferFrom(from, address(this), amount);
            if (!success || IERC20(token).balanceOf(address(this)) != balanceBefore + amount) {
                revert TransferFailed();
            }
        }
    }

    /// @notice Transfers tokens from contract to user
    /// @dev Handles both ETH and ERC20 transfers
    /// @param token Token address (ethAddress for ETH)
    /// @param to Address receiving the tokens
    /// @param amount Amount of tokens to transfer
    function _transferTokenOut(address token, address to, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();

        if (token == ethAddress) {
            // For ETH transfers
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // For ERC20 transfers
            uint256 balanceBefore = IERC20(token).balanceOf(to);
            bool success = IERC20(token).transfer(to, amount);
            if (!success || IERC20(token).balanceOf(to) != balanceBefore + amount) {
                revert TransferFailed();
            }
        }
    }

    /// @notice Gets the current balance of a token
    /// @dev Handles both ETH and ERC20 balances
    /// @param token Token address (ethAddress for ETH)
    /// @return Current balance of the token
    function _getBalance(address token) private view returns (uint256) {
        if (token == ethAddress) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /// @notice Adds liquidity to the pool
    /// @dev Requires tokens to be added in the correct ratio for non-initial deposits
    /// @param amount0 Amount of token0 to add
    /// @param amount1 Amount of token1 to add
    /// @return lpAmount Amount of LP tokens minted
    function addLiquidity(uint256 amount0, uint256 amount1) external payable nonReentrant returns (uint256 lpAmount) {
        if (amount0 == 0 || amount1 == 0) revert ZeroAmount();
        
        uint256 balance0Before = _getBalance(token0);
        uint256 balance1Before = _getBalance(token1);
        
        // Check ratio for subsequent deposits
        if (reserve0 > 0 || reserve1 > 0) {
            if (reserve0 * amount1 != reserve1 * amount0) revert InvalidRatio();
        }
        
        _transferTokenIn(token0, msg.sender, amount0);
        _transferTokenIn(token1, msg.sender, amount1);
        
        // Verify transfers succeeded
        uint256 balance0After = _getBalance(token0);
        uint256 balance1After = _getBalance(token1);
        if (balance0After != balance0Before + amount0) revert TransferFailed();
        if (balance1After != balance1Before + amount1) revert TransferFailed();
        
        // Calculate LP tokens to mint
        if (reserve0 == 0 && reserve1 == 0) {
            lpAmount = _sqrt(amount0 * amount1);
        } else {
            lpAmount = _min(
                (amount0 * lpToken.totalSupply()) / reserve0,
                (amount1 * lpToken.totalSupply()) / reserve1
            );
        }
        
        if (lpAmount == 0) revert InsufficientLiquidity();
        
        lpToken.mint(msg.sender, lpAmount);
        _updateReserves();
        
        emit LiquidityAdded(msg.sender, amount0, amount1, lpAmount);
    }

    /// @notice Removes liquidity from the pool
    /// @dev Burns LP tokens and returns both tokens to the user
    /// @param lpAmount Amount of LP tokens to burn
    /// @return amount0 Amount of token0 returned
    /// @return amount1 Amount of token1 returned
    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (lpAmount == 0) revert ZeroAmount();
        
        uint256 balance0 = _getBalance(token0);
        uint256 balance1 = _getBalance(token1);
        
        uint256 totalSupply = lpToken.totalSupply();
        amount0 = (lpAmount * balance0) / totalSupply;
        amount1 = (lpAmount * balance1) / totalSupply;
        
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();
        
        lpToken.burn(msg.sender, lpAmount);
        
        _transferTokenOut(token0, msg.sender, amount0);
        _transferTokenOut(token1, msg.sender, amount1);
        
        uint256 balance0After = _getBalance(token0);
        uint256 balance1After = _getBalance(token1);
        if (balance0After != balance0 - amount0) revert TransferFailed();
        if (balance1After != balance1 - amount1) revert TransferFailed();
        
        _updateReserves();
        
        emit LiquidityRemoved(msg.sender, amount0, amount1, lpAmount);
    }

    /// @notice Swaps one token for another using constant product formula
    /// @dev x * y = k formula determines the swap amount
    /// @param fromToken Address of token to swap from
    /// @param toToken Address of token to swap to
    /// @param amountIn Amount of fromToken to swap
    /// @return amountOut Amount of toToken received
    function swap(
        address fromToken,
        address toToken,
        uint256 amountIn
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if ((fromToken != token0 && fromToken != token1) || 
            (toToken != token0 && toToken != token1)) revert InvalidToken();
        if (fromToken == toToken) revert InvalidToken();
        
        uint256 balance0 = _getBalance(token0);
        uint256 balance1 = _getBalance(token1);
        
        bool isToken0 = fromToken == token0;
        uint256 reserveIn = isToken0 ? balance0 : balance1;
        uint256 reserveOut = isToken0 ? balance1 : balance0;
        
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidityForSwap();
        
        uint256 numerator = amountIn * reserveOut * 1000;
        uint256 denominator = reserveIn * 1000 + (amountIn * 1000);
        amountOut = numerator / denominator;
        
        if (amountOut == 0) revert InsufficientLiquidity();
        
        _transferTokenIn(fromToken, msg.sender, amountIn);
        _transferTokenOut(toToken, msg.sender, amountOut);
        
        uint256 balance0After = _getBalance(token0);
        uint256 balance1After = _getBalance(token1);
        
        if (isToken0) {
            if (balance0After != balance0 + amountIn) revert TransferFailed();
            if (balance1After != balance1 - amountOut) revert TransferFailed();
        } else {
            if (balance1After != balance1 + amountIn) revert TransferFailed();
            if (balance0After != balance0 - amountOut) revert TransferFailed();
        }
        
        _updateReserves();
        
        emit Swap(fromToken, toToken, amountIn, amountOut);
    }

    /// @notice Returns the current reserves of both tokens
    /// @return Current reserve of token0
    /// @return Current reserve of token1
    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    /// @notice Calculates the square root of a number
    /// @dev Taken from Uniswap V2 library
    /// @param y The number to calculate the square root of
    /// @return z The square root of y
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /// @notice Returns the minimum of two numbers
    /// @param x First number
    /// @param y Second number
    /// @return The smaller of x and y
    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }

    /// @notice Allows the contract to receive ETH
    receive() external payable {}
}
