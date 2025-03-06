const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const hre = require("hardhat");

const buildSimpleDexModule = buildModule("SimpleDexModule", (m) => {

    // Get the network provider
    const network = hre.network;
    console.log(`Connected to network: ${network.name}`);
    console.log(`Chain ID: ${network.config.chainId}`);

    const chainId = network.config.chainId;

    // ETH address
    let ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

    // add sepolia and mainnet ETH addresses
    if (chainId === 11155111) {
        // Sepolia wrapped ETH address
        ETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    } else if (chainId === 1) {
        ETH_ADDRESS = "0xC02aaa39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    } else if (chainId === 31337) {
        ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    }

    // Deploy the factory first
    const dexFactory = m.contract("DexFactory", [ETH_ADDRESS]);
    console.log("DexFactory deployed successfully");

    // Deploy test tokens
    const token1 = m.contract("TestERC20", ["Token1", "TK1"]);
    console.log("Token1 deployed successfully");
    
    const token2 = m.contract("TestERC20", ["Token2", "TK2"]);
    console.log("Token2 deployed successfully");

    // Create a pair using the factory
    const createPair = m.call(dexFactory, "createPair", [
        m.getAddress(token1),
        m.getAddress(token2)
    ]);
    console.log("Pair created successfully");

    // Get the pair address (this will be used in subsequent deployments/calls)
    const getPair = m.staticCall(dexFactory, "getPair", [
        m.getAddress(token1),
        m.getAddress(token2)
    ]);

    // Deploy LP token with the pair address
    const lpToken = m.contract("LPToken", [getPair]);
    console.log("LPToken deployed successfully");

    // Log deployed contract addresses at the end
    console.log("\nDeployed Contracts:");
    console.log("DexFactory:", m.getAddress(dexFactory));
    console.log("Token1:", m.getAddress(token1));
    console.log("Token2:", m.getAddress(token2));
    console.log("Pair:", getPair);
    console.log("LPToken:", m.getAddress(lpToken));

    console.log("\n Copy the above addresses and paste them in the config/deployedAddresses.js file");
    console.log("Use chainId:", network.config.chainId);

    return {
        dexFactory,
        token1,
        token2,
        lpToken,
        createPair,
        getPair
    };
});

module.exports = buildSimpleDexModule; 