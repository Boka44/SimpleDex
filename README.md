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


## Project Structure

- `contracts/`

  - `DexFactory.sol` - Factory contract that creates and tracks DEX pairs
  - `SimpleDex.sol` - The DEX pair contract with swap and liquidity functions
  - `LPToken.sol` - LP token contract for liquidity providers
  - `TestERC20.sol` - Test ERC20 tokens for development

## Architecture

The system consists of three key components:

1. **DexFactory**: Creates and tracks all trading pairs
   - Maintains registry of all trading pairs
   - Creates new DEX contracts for token pairs
   - Provides lookup functionality for existing pairs

2. **SimpleDex**: Individual pair contracts that:
   - Handle swaps between two tokens
   - Handle liquidity operations
   - Use the constant product formula (x * y = k)

3. **LPToken**: Represents liquidity provider shares
   - ERC20-compliant token
   - Minted/burned based on liquidity provided
   - Tracks proportional share of pool

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```javascript
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key
```

The above example uses a public RPC URL for the Sepolia testnet. Feel free to use any other RPC URL.


## Deployment

The project uses Hardhat Ignition for deployments. The deployment script will:
1. Deploy the DexFactory contract
2. Deploy two test ERC20 tokens
3. Create a trading pair using the factory
4. Deploy the LP token contract

To deploy locally:
```bash
npx hardhat node
npx hardhat ignition deploy ignition/modules/SimpleDexModule.js --network localhost
```

You can check the local deployment by using the following command:
```bash
npx hardhat console --network localhost
```

To deploy to Sepolia:
```bash
npx hardhat ignition deploy ignition/modules/SimpleDexModule.js --network sepolia
```

Note: For testing, it is recommended to use create and use two different tokens for testing, rather than wETH and a custom token.
This extra logic is not included or implemented due to time constraints, although it is tested in the test file.

## Testing

Run the test suite:
```bash
npx hardhat test
```

## License

UNLICENSED