# Simple DEX Project

This project is a simplified implementation of Uniswap V2's core mechanics. I stripped away the periphery contract features and focused on the core mechanics of the DEX. This decision was made to show an understanding of how it works without just copying Uniswap V2 line for line.

I included:
- The core math behind AMMs (x * y = k) (Not gonna re-invent the wheel)
- Basic liquidity pool mechanics
    - Adding liquidity
    - Removing liquidity
    - Swapping tokens
- Factory pattern for managing multiple pairs
- A separate contract for managing the LP tokens

Not included:
- Slippage protection
- Price Cumulative Calculations
- Most of the periphery contracts functionality
- Refunding extra tokens when adding liquidity with a different ratio
- Extra safety checks

The test coverage is 100% of the core functionality. As for the deployment scripts, I focused on adding liquidity and swapping tokens.

## Project Structure

- `contracts/`

  - `DexFactory.sol` - Factory contract that creates and tracks DEX pairs
  - `SimpleDex.sol` - The DEX pair contract with swap and liquidity functions
  - `LPToken.sol` - LP token contract for liquidity providers
  - `TestERC20.sol` - Test ERC20 tokens for development

## Architecture

The system consists of three key components:

1. **DexFactory**: Creates and tracks all pairs
   - Maintains registry of all pairs
   - Creates new DEX contracts for token pairs
   - Provides lookup functionality for existing pairs

2. **SimpleDex**: Individual pair contracts that:
   - Handle swaps between two tokens
   - Handle liquidity operations
   - Use the constant product formula (x * y = k)

3. **LPToken**: Represents liquidity provider shares
   - ERC20-compliant token
   - Minted/burned based on liquidity provided

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```javascript
SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
PRIVATE_KEY=your_private_key
```

The above example uses a public RPC URL for the Sepolia testnet. Feel free to use any other RPC URL.

Note: Public RPC nodes can cause issues with script execution. These are temporary issues that likely do not repeat themselves.


## Deployment

The project uses Hardhat Ignition for deployments. The deployment script will:
1. Deploy the DexFactory contract
2. Deploy two test ERC20 tokens
3. Create a trading pair using the factory
4. Deploy the LP token contract

To deploy locally:
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

You can check the local deployment by using the following command:
```bash
npx hardhat console --network localhost
```

To run the scipt for adding liquidity and swapping tokens:
(Do this after the initial deployment and copying the addresses to the config file)
```bash
npx hardhat run scripts/liquiditySwaps.js --network localhost
```


To deploy to Sepolia:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

To run the scipt for adding liquidity and swapping tokens:
(Do this after the initial deployment and copying the addresses to the config file)
```bash
npx hardhat run scripts/liquiditySwaps.js --network sepolia
```

Note: For testing, it is recommended to use create and use two different tokens for testing, rather than wETH and a custom token.
This extra logic is not included or implemented due to time constraints, although it is tested in the test file.

**Important:**
The initial liquidity is added with a 1:1 ratio. This is not the case for subsequent liquidity additions after swapping. Due to time constraints, I did not implement the extra logic to handle this. Normally, the ratio would be calculated based on the current reserves of the pool, and the periphery contracts would handle the refund of extra tokens.


## Deployment Addresses

The deployment addresses are stored in the `config/deployedAddresses.js` file. This will be updated by the user after the deployment.
Below I have included the addresses for my Sepolia deployment.

- DexFactory: 0x1F066324465bfd6A94070Db81f39F47Eddd90D32
- Token1: 0x9E1f1eF6F4A3266E73a11801876c2ED542A6378F
- Token2: 0x8803d74eCE4ef5eB00D4020a87cc7197D1aa6B4c
- Pair: 0x217C5b21A5bAbe5FbEEc5921f2410c82b32e993D
- LPToken: 0x432F7383cBA27a8760c5E215b053f6a9d8fdF5F9


## Testing

Run the test:
```bash
npx hardhat test
```

## License

UNLICENSED