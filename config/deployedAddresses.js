const deployedAddresses = {
    11155111: { // Sepolia
        dexFactory: "0x1F066324465bfd6A94070Db81f39F47Eddd90D32",
        token1: "0x9E1f1eF6F4A3266E73a11801876c2ED542A6378F",
        token2: "0x8803d74eCE4ef5eB00D4020a87cc7197D1aa6B4c",
        pair: "0x217C5b21A5bAbe5FbEEc5921f2410c82b32e993D",
        lpToken: "0x432F7383cBA27a8760c5E215b053f6a9d8fdF5F9",
    },
    1: { // Mainnet
        dexFactory: "0x",
        token1: "0x",
        token2: "0x",
        pair: "0x",
        lpToken: "0x",
    },
    31337: { // Localhost
        dexFactory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        token1: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        token2: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        pair: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
        lpToken: "0x8Ff3801288a85ea261E4277d44E1131Ea736F77B"
    },
};
module.exports = deployedAddresses;
