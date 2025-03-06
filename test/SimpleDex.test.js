const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
    let dexFactory;
    let token0;
    let token1;
    let dexPair;
    let lpToken;
    let owner;
    let user1;
    let user2;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy test tokens
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const tokenA = await (await TestERC20.deploy("TokenA", "TKA")).waitForDeployment();
        const tokenB = await (await TestERC20.deploy("TokenB", "TKB")).waitForDeployment();

        // Sort tokens
        [token0, token1] = (await tokenA.getAddress()).toLowerCase() < (await tokenB.getAddress()).toLowerCase()
            ? [tokenA, tokenB] 
            : [tokenB, tokenA];

        // Deploy factory
        const DexFactory = await ethers.getContractFactory("DexFactory");
        dexFactory = await (await DexFactory.deploy(ethers.ZeroAddress)).waitForDeployment();

        // Create pair
        await dexFactory.createPair(await token0.getAddress(), await token1.getAddress());
        const pairAddress = await dexFactory.getPair(await token0.getAddress(), await token1.getAddress());
        dexPair = await ethers.getContractAt("SimpleDex", pairAddress);
        lpToken = await ethers.getContractAt("LPToken", await dexPair.lpToken());

        // Transfer some tokens to users
        await token0.transfer(user1.address, ethers.parseEther("10000"));
        await token1.transfer(user1.address, ethers.parseEther("10000"));
        await token0.transfer(user2.address, ethers.parseEther("10000"));
        await token1.transfer(user2.address, ethers.parseEther("10000"));
    });

    describe("DexFactory", function () {
        it("Should create a pair correctly", async function () {
            expect(await dexFactory.allPairsLength()).to.equal(1n);
            
            const pair = await dexFactory.getPair(await token0.getAddress(), await token1.getAddress());
            expect(pair).to.equal(await dexPair.getAddress());
        });

        it("Should revert when creating pair with identical tokens", async function () {
            await expect(
                dexFactory.createPair(await token0.getAddress(), await token0.getAddress())
            ).to.be.revertedWithCustomError(dexFactory, "IdenticalAddresses");
        });

        it("Should revert when creating pair with zero address", async function () {
            await expect(
                dexFactory.createPair(await token0.getAddress(), ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(dexFactory, "ZeroAddress");
        });

        it("Should revert when pair already exists", async function () {
            await expect(
                dexFactory.createPair(await token0.getAddress(), await token1.getAddress())
            ).to.be.revertedWithCustomError(dexFactory, "PairExists");
        });
    });

    describe("SimpleDex", function () {
        beforeEach(async function () {
            // Approve tokens for dex
            await token0.connect(user1).approve(await dexPair.getAddress(), ethers.MaxUint256);
            await token1.connect(user1).approve(await dexPair.getAddress(), ethers.MaxUint256);
            await token0.connect(user2).approve(await dexPair.getAddress(), ethers.MaxUint256);
            await token1.connect(user2).approve(await dexPair.getAddress(), ethers.MaxUint256);
        });

        describe("Liquidity", function () {
            it("Should mint LP tokens on first liquidity addition", async function () {
                const amount0 = ethers.parseEther("100");
                const amount1 = ethers.parseEther("100");
                
                const tx = await dexPair.connect(user1).addLiquidity(amount0, amount1);
                const receipt = await tx.wait();
                const event = receipt.logs.find(log => log.eventName === "LiquidityAdded");
                const lpAmount = event.args.lpTokens;
                
                expect(await lpToken.balanceOf(user1.address)).to.equal(lpAmount);
                expect(lpAmount).to.equal(ethers.parseEther("100")); // sqrt(100 * 100)
            });

            it("Should mint LP tokens for even deposits", async function () {
                // First deposit
                await dexPair.connect(user1).addLiquidity(
                    ethers.parseEther("100"),
                    ethers.parseEther("100")
                );

                // Second deposit
                await dexPair.connect(user2).addLiquidity(
                    ethers.parseEther("50"),
                    ethers.parseEther("50")
                );

                expect(await lpToken.balanceOf(user2.address))
                    .to.equal(ethers.parseEther("50"));
            });

            it("Should revert when adding liquidity with invalid ratio", async function () {
                // First deposit
                await dexPair.connect(user1).addLiquidity(
                    ethers.parseEther("100"),
                    ethers.parseEther("100")
                );

                await expect(
                    dexPair.connect(user2).addLiquidity(
                        ethers.parseEther("50"),
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWithCustomError(dexPair, "InvalidRatio");
            });

            it("Should burn LP tokens and return tokens on liquidity removal", async function () {
                // Add liquidity
                await dexPair.connect(user1).addLiquidity(
                    ethers.parseEther("100"),
                    ethers.parseEther("100")
                );

                const lpBalance = await lpToken.balanceOf(user1.address);
                const token0BalanceBefore = await token0.balanceOf(user1.address);
                const token1BalanceBefore = await token1.balanceOf(user1.address);

                // Remove half the liquidity
                await dexPair.connect(user1).removeLiquidity(lpBalance / 2n);

                expect(await lpToken.balanceOf(user1.address)).to.equal(lpBalance / 2n);
                expect(await token0.balanceOf(user1.address))
                    .to.equal(token0BalanceBefore + ethers.parseEther("50"));
                expect(await token1.balanceOf(user1.address))
                    .to.equal(token1BalanceBefore + ethers.parseEther("50"));
            });

            it("Should update reserves to match balances after adding liquidity", async function () {
                const amount0 = ethers.parseEther("100");
                const amount1 = ethers.parseEther("100");
                
                await dexPair.connect(user1).addLiquidity(amount0, amount1);
                
                const [reserve0, reserve1] = await dexPair.getReserves();
                const balance0 = await token0.balanceOf(await dexPair.getAddress());
                const balance1 = await token1.balanceOf(await dexPair.getAddress());
                
                expect(reserve0).to.equal(balance0);
                expect(reserve1).to.equal(balance1);
            });

            it("Should revert if actual transfer amount is less than expected", async function () {
                // First approve less than we'll try to transfer
                await token0.connect(user1).approve(await dexPair.getAddress(), ethers.parseEther("50"));
                await token1.connect(user1).approve(await dexPair.getAddress(), ethers.parseEther("100"));
                
                await expect(
                    dexPair.connect(user1).addLiquidity(
                        ethers.parseEther("100"),
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWithCustomError(token0, "ERC20InsufficientAllowance");
            });

            it("Should update reserves correctly after removing liquidity", async function () {
                // Add liquidity first
                await dexPair.connect(user1).addLiquidity(
                    ethers.parseEther("100"),
                    ethers.parseEther("100")
                );
                
                const lpBalance = await lpToken.balanceOf(user1.address);
                await dexPair.connect(user1).removeLiquidity(lpBalance);
                
                const [reserve0, reserve1] = await dexPair.getReserves();
                expect(reserve0).to.equal(0);
                expect(reserve1).to.equal(0);
            });
        });

        describe("Swaps", function () {
            beforeEach(async function () {
                // Add initial liquidity
                await dexPair.connect(user1).addLiquidity(
                    ethers.parseEther("1000"),
                    ethers.parseEther("1000")
                );
            });

            it("Should swap tokens correctly", async function () {
                const amountIn = ethers.parseEther("10");
                await dexPair.connect(user1).swap(
                    await token0.getAddress(), 
                    await token1.getAddress(), 
                    amountIn
                );
                
                const [reserve0, reserve1] = await dexPair.getReserves();
                expect(reserve0).to.be.gt(ethers.parseEther("1000"));
            });

            it("Should revert when swapping with insufficient liquidity", async function () {
                // Now remove all liquidity
                const lpBalance = await lpToken.balanceOf(user1.address);
                await dexPair.connect(user1).removeLiquidity(lpBalance);

                // Now both reserves should be zero
                const [reserve0, reserve1] = await dexPair.getReserves();
                expect(reserve0).to.equal(0);
                expect(reserve1).to.equal(0);

                // Attempt to swap when reserves are zero
                await expect(
                    dexPair.connect(user1).swap(
                        await token0.getAddress(),
                        await token1.getAddress(),
                        ethers.parseEther("1") // Any amount should trigger the error
                    )
                ).to.be.revertedWithCustomError(dexPair, "InsufficientLiquidityForSwap");
            });

            it("Should revert when swapping same token", async function () {
                await expect(
                    dexPair.connect(user1).swap(
                        await token0.getAddress(),
                        await token0.getAddress(),
                        ethers.parseEther("10")
                    )
                ).to.be.revertedWithCustomError(dexPair, "InvalidToken");
            });

            it("Should update reserves to match balances after swap", async function () {
                const amountIn = ethers.parseEther("10");
                await dexPair.connect(user1).swap(
                    await token0.getAddress(),
                    await token1.getAddress(),
                    amountIn
                );
                
                const [reserve0, reserve1] = await dexPair.getReserves();
                const balance0 = await token0.balanceOf(await dexPair.getAddress());
                const balance1 = await token1.balanceOf(await dexPair.getAddress());
                
                expect(reserve0).to.equal(balance0);
                expect(reserve1).to.equal(balance1);
            });

            it("Should use current balances for swap calculations", async function () {
                // First do a normal swap
                const amountIn = ethers.parseEther("10");
                await dexPair.connect(user1).swap(
                    await token0.getAddress(),
                    await token1.getAddress(),
                    amountIn
                );
                
                // Someone transfers extra tokens directly to the contract
                await token0.connect(user1).transfer(
                    await dexPair.getAddress(),
                    ethers.parseEther("5")
                );
                
                // Next swap should use actual balances, not reserves
                const balanceBefore = await token1.balanceOf(user1.address);
                await dexPair.connect(user1).swap(
                    await token0.getAddress(),
                    await token1.getAddress(),
                    amountIn
                );
                const balanceAfter = await token1.balanceOf(user1.address);
                
                expect(balanceAfter).to.be.gt(balanceBefore);
            });

            it("Should revert if actual transfer amounts don't match expected", async function () {
                // First approve less than we'll try to transfer
                await token0.connect(user1).approve(
                    await dexPair.getAddress(),
                    ethers.parseEther("5")
                );
                
                await expect(
                    dexPair.connect(user1).swap(
                        await token0.getAddress(),
                        await token1.getAddress(),
                        ethers.parseEther("10")
                    )
                ).to.be.revertedWithCustomError(token0, "ERC20InsufficientAllowance");
            });
        });
    });

    describe("LPToken", function () {
        it("Should only allow DEX to mint", async function () {
            await expect(
                lpToken.connect(user1).mint(user1.address, 100)
            ).to.be.revertedWithCustomError(lpToken, "OnlyDex");
        });

        it("Should only allow DEX to burn", async function () {
            await expect(
                lpToken.connect(user1).burn(user1.address, 100)
            ).to.be.revertedWithCustomError(lpToken, "OnlyDex");
        });

        it("Should have correct name and symbol", async function () {
            expect(await lpToken.name()).to.equal("LP Token");
            expect(await lpToken.symbol()).to.equal("LP");
        });
    });
}); 