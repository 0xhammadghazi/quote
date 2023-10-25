// Library import
const { ethers } = require("ethers");

// Contract ABIs import
const {
  abi: Quoter2Abi,
} = require("@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json");
const {
  abi: FactoryAbi,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const {
  abi: PoolAbi,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");

// Addresses import
const {
  QUOTER2_ADDRESS,
  FACTORY_ADDRESS,
  UNISWAP_FACTORY_ADDRESS,
} = require("./config/addresses");

// Helper functions import
const {
  getTokenSymbol,
  getTokenDecimals,
  getEthereumAddress,
} = require("./utils/helper");

// Phoenix RPC URL
const rpcURL =
  "https://replicator.phoenix.lightlink.io/rpc/v1/elektrik-1b2218236b172e6b9ead3069735102f3";

// Phoenix provider setup
const provider = new ethers.providers.JsonRpcProvider(rpcURL);

// Ethereum RPC URL
const ETHEREUM_RPC_URL =
  "https://mainnet.infura.io/v3/976d84ecbdec4447b6736a02e0623f01";

// Ethereum provider setup
const ethereumProvider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);

// Uniswap v3 factory instance
const uniswapFactory = new ethers.Contract(
  UNISWAP_FACTORY_ADDRESS,
  FactoryAbi,
  ethereumProvider
);

// Param of quoter fn call
const sqrtPriceLimitX96 = 0;

// To check if calculated price is close enough to the target price
// Note: Tolerance is represented in decimal, if your price tolerance is 1% then set tolerance to 0.01
function isCloseEnough(calculatedPrice, targetPrice, tolerance = 0.0001) {
  return Math.abs(calculatedPrice - targetPrice) <= tolerance * targetPrice;
}

// Returns amount of tokens that needs to be swapped to reach the target price
async function findOptimalAmountIn(
  tokenIn,
  tokenOut,
  targetPrice,
  startAmount,
  endAmount,
  fee,
  tokenInDecimals,
  token0
) {
  while (startAmount <= endAmount) {
    const midAmount = (startAmount + endAmount) / 2;

    // Quoter2 instance created
    const quoter02 = new ethers.Contract(QUOTER2_ADDRESS, Quoter2Abi, provider);

    // Quoter2 params config
    const params = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      amountIn: (midAmount * 10 ** tokenInDecimals).toString(),
      sqrtPriceLimitX96: sqrtPriceLimitX96,
    };

    // Quoter static call
    const output = await quoter02.callStatic.quoteExactInputSingle(params);
    const priceAfterSwap = output.sqrtPriceX96After.toString();
    console.log("Sqrt Price after swap", priceAfterSwap);

    if (isCloseEnough(priceAfterSwap, targetPrice)) {
      // If price after swap is within tolerance
      return midAmount;
    } else if (targetPrice > priceAfterSwap) {
      if (tokenIn == token0) {
        // If price after swap is less than target price and token in is token 0 then we need to sell less token in
        endAmount = midAmount;
      } else {
        startAmount = midAmount;
      }
    } else {
      if (tokenIn == token0) {
        // If price after swap is more than target price and token in is token 0 then we need to sell more token in
        startAmount = midAmount;
      } else {
        endAmount = midAmount;
      }
    }
  }
  throw new Error("Optimal input amount not found");
}

async function main() {
  const startAmount = 0;
  const endAmount = 1000;

  const poolAddress = process.argv[2];
  console.log("Elektrik pool address: ", poolAddress);

  // Elektrik pool instance
  const pool = new ethers.Contract(poolAddress, PoolAbi, provider);

  // Fetch some details from elektrik pool
  const token0 = await pool.token0();
  const token1 = await pool.token1();
  const fee = await pool.fee();
  const slot0 = await pool.slot0();
  const currentPrice = ethers.BigNumber.from(slot0.sqrtPriceX96).toString();

  // Get uniswap v3 pool address with same tokens and fee tier
  const uniswapPoolAddress = await uniswapFactory.getPool(
    getEthereumAddress(token0),
    getEthereumAddress(token1),
    fee
  );
  console.log("Uniswap pool address: ", uniswapPoolAddress);

  // Uniswap v3 pool instance
  const uniswapPool = new ethers.Contract(
    uniswapPoolAddress,
    PoolAbi,
    ethereumProvider
  );

  // Get target price from uniswap v3 pool
  const uniswapSlot0 = await uniswapPool.slot0();
  const targetPrice = 1998058847195277790985671257956330;

  console.log("Current price: ", currentPrice);
  console.log("Target price: ", targetPrice);

  // If target is more than current price than token in would be token 1
  if (targetPrice > currentPrice) {
    tokenIn = token1;
    tokenOut = token0;
  } else {
    tokenIn = token0;
    tokenOut = token1;
  }

  const tokenInDecimals = getTokenDecimals(tokenIn);

  console.log("Token In: ", getTokenSymbol(tokenIn));
  console.log("Token Out: ", getTokenSymbol(tokenOut));

  const optimalAmountIn = await findOptimalAmountIn(
    tokenIn,
    tokenOut,
    targetPrice,
    startAmount,
    endAmount,
    fee,
    tokenInDecimals,
    token0
  );

  console.log(
    `OPTIMAL INPUT AMOUNT: ${optimalAmountIn} ${getTokenSymbol(tokenIn)}`
  );
}

main().catch(console.error);
