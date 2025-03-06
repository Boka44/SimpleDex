const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const deployedAddresses = require("./config/deployedAddresses");

const buildInteractWithDexModule = buildModule("InteractWithDexModule", (m) => {
    // Get the network provider
    const network = hre.network;
    console.log(`Connected to network: ${network.name}`);
    console.log(`Chain ID: ${network.config.chainId}`);

    const chainId = network.config.chainId;

    // Get deployed addresses based on the active chain
    const addresses = deployedAddresses[chainId];
    if (!addresses) {
        throw new Error("Deployed addresses not found for this chain.");
    }

    // Deploy the contracts
    const dexFactory = m.contract("DexFactory", [addresses.dexFactory]);
    const token1 = m.contract("TestERC20", [addresses.token1]);
    const token2 = m.contract("TestERC20", [addresses.token2]);
    const lpToken = m.contract("LPToken", [addresses.lpToken]);

    console.log("Contracts deployed successfully.");

    // Approve tokens for adding liquidity
    const approveLiquidity1 = m.call(token1, "approve", [
        addresses.dexFactory,
        m.parseEther("100") // amount1
    ]);

    console.log("Token1 approved for adding liquidity.");

    const approveLiquidity2 = m.call(token2, "approve", [
        addresses.dexFactory,
        m.parseEther("100") // amount2
    ]);

    console.log("Token2 approved for adding liquidity.");

    // Add Liquidity
    const addLiquidity = m.call(dexFactory, "addLiquidity", [
        addresses.token1,
        addresses.token2,
        m.parseEther("100"), // amount1
        m.parseEther("100")  // amount2
    ]);

    console.log("Liquidity added successfully.");

    // Approve tokens for swapping
    const approveSwap = m.call(token1, "approve", [
        addresses.dexFactory,
        m.parseEther("10") // swapAmount
    ]);

    console.log("Token1 approved for swapping.");

    // Swap
    const swap = m.call(dexFactory, "swap", [
        addresses.token1,
        addresses.token2,
        m.parseEther("10") // swapAmount
    ]);

    console.log("Swap executed successfully.");

    // Remove Liquidity
    const removeLiquidity = m.call(lpToken, "removeLiquidity", [
        lpToken.address,
        lpToken.balanceOf(m.getAddress(user1)) // Assuming user1 is defined
    ]);

    console.log("Liquidity removed successfully.");

    return {
        approveLiquidity1,
        approveLiquidity2,
        addLiquidity,
        approveSwap,
        swap,
        removeLiquidity
    };
});

module.exports = buildInteractWithDexModule;