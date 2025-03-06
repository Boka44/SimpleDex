const deployedAddresses = {
    11155111: { // Sepolia
        dexFactory: "0xYourDexFactoryAddress",
        token1: "0xYourToken1Address",
        token2: "0xYourToken2Address",
        lpToken: "0xYourLpTokenAddress",
    },
    1: { // Mainnet
        dexFactory: "0xYourMainnetDexFactoryAddress",
        token1: "0xYourMainnetToken1Address",
        token2: "0xYourMainnetToken2Address",
        lpToken: "0xYourMainnetLpTokenAddress",
    },
    // Add other networks as needed
    31337: { // Localhost
        dexFactory: "0xYourLocalhostDexFactoryAddress",
        token1: "0xYourLocalhostToken1Address",
        token2: "0xYourLocalhostToken2Address",
        lpToken: "0xYourLocalhostLpTokenAddress",
    },
};

module.exports = deployedAddresses;