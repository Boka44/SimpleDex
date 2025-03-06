const hre = require("hardhat");
const deployedAddresses = require("../config/deployedAddresses");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);

    // Get network info
    const network = hre.network;
    console.log(`Connected to network: ${network.name}`);
    console.log(`Chain ID: ${network.config.chainId}`);

    // Get starting nonce
    let nonce = await signer.getNonce();
    console.log("Starting nonce:", nonce);

    // Get deployed addresses for current network
    const addresses = deployedAddresses[network.config.chainId];
    if (!addresses) {
        throw new Error(`No deployed addresses found for network ${network.config.chainId}`);
    }

    // Get contract instances
    const token1 = await hre.ethers.getContractAt("TestERC20", addresses.token1);
    const token2 = await hre.ethers.getContractAt("TestERC20", addresses.token2);
    const dexPair = await hre.ethers.getContractAt("SimpleDex", addresses.pair);
    const lpToken = await hre.ethers.getContractAt("LPToken", addresses.lpToken);

    console.log("\nContract Addresses:");
    console.log("Token1:", await token1.getAddress());
    console.log("Token2:", await token2.getAddress());
    console.log("Pair:", await dexPair.getAddress());
    console.log("LPToken:", await lpToken.getAddress());

    // get the initial reserves
    const [reserve0, reserve1] = await dexPair.getReserves();
    console.log("\nInitial Pool Reserves:");
    console.log("Initial Reserve0:", hre.ethers.formatEther(reserve0));
    console.log("Initial Reserve1:", hre.ethers.formatEther(reserve1));

    // Use 1:1 ratio for simplicity
    const amount = hre.ethers.parseEther("1000");
    
    console.log("\nAdding liquidity amounts:");
    console.log("Amount0:", hre.ethers.formatEther(amount));
    console.log("Amount1:", hre.ethers.formatEther(amount));
    
    // Add liquidity
    console.log("\nApproving tokens...");
    const tx1 = await token1.approve(addresses.pair, amount, { nonce: nonce++ });
    const tx2 = await token2.approve(addresses.pair, amount, { nonce: nonce++ });
    
    // Wait for approvals to be mined
    await tx1.wait();
    await tx2.wait();
    console.log("Approvals confirmed");

    console.log("Adding liquidity...");
    const addLiqTx = await dexPair.addLiquidity(amount, amount, { nonce: nonce++ });
    await addLiqTx.wait();
    console.log("Liquidity added");
    
    // Add small delay before reading state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get and log reserves
    let [newReserve0, newReserve1] = await dexPair.getReserves();
    console.log("\nPool Reserves:");
    console.log("Reserve0:", hre.ethers.formatEther(newReserve0));
    console.log("Reserve1:", hre.ethers.formatEther(newReserve1));

    // Get and log LP tokens
    const lpBalance = await lpToken.balanceOf(signer.address);
    console.log("\nLP Token Balance:", hre.ethers.formatEther(lpBalance));

    // Check token balances before swap
    const balance1 = await token1.balanceOf(signer.address);
    const balance2 = await token2.balanceOf(signer.address);
    console.log("\nToken Balances before swap:");
    console.log("Token1 Balance:", hre.ethers.formatEther(balance1));
    console.log("Token2 Balance:", hre.ethers.formatEther(balance2));

    // Run the swap function
    const swapAmount = hre.ethers.parseEther("1");
    
    // Verify we have enough balance to swap
    if (balance1 < swapAmount) {
        console.log("Not enough Token1 balance for swap");
        return;
    }

    console.log("\nApproving swap...");
    const approveTx = await token1.approve(addresses.pair, swapAmount, { nonce: nonce++ });
    await approveTx.wait();
    console.log("Swap approval confirmed");
    
    console.log("Swapping tokens...");
    console.log("Swap amount:", hre.ethers.formatEther(swapAmount));
    const swapTx = await dexPair.swap(
        await token1.getAddress(), 
        await token2.getAddress(), 
        swapAmount, 
        { nonce: nonce++ }
    );
    await swapTx.wait();
    console.log("Swap confirmed");

    // Add small delay before reading state
    await new Promise(resolve => setTimeout(resolve, 1000));

    // get the new reserves and balances
    [newReserve0, newReserve1] = await dexPair.getReserves();
    const newBalance1 = await token1.balanceOf(signer.address);
    const newBalance2 = await token2.balanceOf(signer.address);

    console.log("\nAfter swap:");
    console.log("New Pool Reserves:");
    console.log("New Reserve0:", hre.ethers.formatEther(newReserve0));
    console.log("New Reserve1:", hre.ethers.formatEther(newReserve1));
    console.log("\nNew Token Balances:");
    console.log("Token1 Balance:", hre.ethers.formatEther(newBalance1));
    console.log("Token2 Balance:", hre.ethers.formatEther(newBalance2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

module.exports = main;