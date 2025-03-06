const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

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
    const DexFactory = await hre.ethers.getContractFactory("DexFactory");
    const dexFactory = await (await DexFactory.deploy(ETH_ADDRESS)).waitForDeployment();
    const dexFactoryAddress = await dexFactory.getAddress();
    console.log("DexFactory deployed");

    // Deploy test tokens
    const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
    const token1 = await (await TestERC20.deploy("Token1", "TK1")).waitForDeployment();
    const token1Address = await token1.getAddress();
    console.log("Token1 deployed");
    
    const token2 = await (await TestERC20.deploy("Token2", "TK2")).waitForDeployment();
    const token2Address = await token2.getAddress();
    console.log("Token2 deployed");

    // Create a pair using the factory
    const tx = await dexFactory.createPair(token1Address, token2Address);
    await tx.wait();
    console.log("Pair created");

    // Get the pair address
    const pairAddress = await dexFactory.getPair(token1Address, token2Address);
    console.log("Pair deployed");

    // Get the LP token address
    const dexPair = await hre.ethers.getContractAt("SimpleDex", pairAddress);
    const lpTokenAddress = await dexPair.lpToken();
    console.log("LPToken deployed");

    // Log deployed contract addresses
    console.log("\nDeployed Contracts:");
    console.log("DexFactory:", dexFactoryAddress);
    console.log("Token1:", token1Address);
    console.log("Token2:", token2Address);
    console.log("Pair:", pairAddress);
    console.log("LPToken:", lpTokenAddress);

    console.log("\nCopy the above addresses and paste them in the config/deployedAddresses.js file");
    console.log("Use chainId:", chainId);

    return {
        dexFactory,
        token1,
        token2,
        dexPair,
        lpTokenAddress
    };
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

module.exports = main;
