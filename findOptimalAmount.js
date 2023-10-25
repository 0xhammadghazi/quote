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
  UNISWAP_FACTORY_ADDRESS,
} = require("./config/addresses");

const { rpcURL, ETHEREUM_RPC_URL } = require("./config/rpc");

const {
  sqrtPriceLimitX96,
  tolerance,
  startAmount,
  endAmount,
} = require("./config/constant");

// Helper functions import
const {
  getTokenSymbol,
  getTokenDecimals,
  getEthereumAddress,
  isCloseEnough,
  getPoolDetails,
  getTargetPrice,
  getTokenInAndOut,
} = require("./utils/helper");

// Phoenix provider setup
const provider = new ethers.providers.JsonRpcProvider(rpcURL);

// Ethereum provider setup
const ethereumProvider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);

// Uniswap v3 factory instance
const uniswapFactory = new ethers.Contract(
  UNISWAP_FACTORY_ADDRESS,
  FactoryAbi,
  ethereumProvider
);

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

    if (isCloseEnough(priceAfterSwap, targetPrice, tolerance)) {
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
  const poolAddress = process.argv[2];
  console.log("Elektrik pool address: ", poolAddress);

  // Elektrik pool instance
  const pool = new ethers.Contract(poolAddress, PoolAbi, provider);

  // Fetch some details from elektrik pool
  const { token0, token1, fee, currentPrice } = await getPoolDetails(
    pool,
    ethers
  );

  const targetPrice = await getTargetPrice(
    uniswapFactory,
    PoolAbi,
    ethereumProvider,
    getEthereumAddress,
    token0,
    token1,
    fee,
    ethers
  );

  console.log("Current price: ", currentPrice);
  console.log("Target price: ", targetPrice);

  const { tokenIn, tokenOut } = getTokenInAndOut(
    targetPrice,
    currentPrice,
    token0,
    token1
  );

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
