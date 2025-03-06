// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./SimpleDex.sol";

/// @title DEX Factory Contract
/// @notice Factory contract for creating and managing DEX trading pairs
/// @dev Implements simplified Uniswap V2-style pair creation and management
contract DexFactory {
    // Custom errors
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();

    address public immutable ethAddress;
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    /// @notice Initializes the factory with ETH address
    /// @param _ethAddress Address to be used for representing ETH
    constructor(address _ethAddress) {
        ethAddress = _ethAddress;
    }

    /// @notice Creates a new trading pair for two tokens
    /// @dev Tokens are sorted by address to ensure consistent pair addresses
    /// @param tokenA First token of the pair
    /// @param tokenB Second token of the pair
    /// @return pair Address of the created pair contract
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
        if (getPair[token0][token1] != address(0)) revert PairExists();

        SimpleDex newPair = new SimpleDex(ethAddress);
        pair = address(newPair);
        
        newPair.initialize(token0, token1);
        
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in both directions
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /// @notice Returns the total number of pairs created by this factory
    /// @return Number of pairs created
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
} 