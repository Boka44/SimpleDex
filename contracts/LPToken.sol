// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LPToken is ERC20 {
    // Custom errors
    error OnlyDex();

    address public immutable dex;

    constructor(address _dex) ERC20("LP Token", "LP") {
        dex = _dex;
    }

    function mint(address account, uint256 amount) external {
        if (msg.sender != dex) revert OnlyDex();
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        if (msg.sender != dex) revert OnlyDex();
        _burn(account, amount);
    }
} 