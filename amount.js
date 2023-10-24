const { ethers } = require("ethers");
const {
  abi: Quoter2Abi,
} = require("@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json");
const {
  abi: FactoryAbi,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const {
  abi: PoolAbi,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");

const { getTokenSymbol, getTokenDecimals } = require("./utils/helper");

const INFURA_URL =
  "https://replicator.phoenix.lightlink.io/rpc/v1/elektrik-1b2218236b172e6b9ead3069735102f3";
const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);

const QUOTER2_ADDRESS = "0x243551e321Dac40508c22de2E00aBECF17F764b5";
const FACTORY_ADDRESS = "0xEE6099234bbdC793a43676D98Eb6B589ca7112D7";

const elektrikFactory = new ethers.Contract(
  FACTORY_ADDRESS,
  FactoryAbi,
  provider
);

// targetPrice = 1925971163800263500000000000000000;
// current price = 1905971163800263500000000000000000
// fee = 3000;

const sqrtPriceLimitX96 = 0;

// check if calculated price is close enough to the target price
function isCloseEnough(calculatedPrice, targetPrice, tolerance = 0.001) {
  // 0.01 represents 1%
  return Math.abs(calculatedPrice - targetPrice) <= tolerance * targetPrice;
}

async function findOptimalAmountIn(
  tokenIn,
  tokenOut,
  targetPrice,
  startAmount,
  endAmount,
  fee,
  tokenInDecimals
) {
  while (startAmount <= endAmount) {
    const midAmount = (startAmount + endAmount) / 2;
    const quoter02 = new ethers.Contract(QUOTER2_ADDRESS, Quoter2Abi, provider);

    const params = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      amountIn: (midAmount * 10 ** tokenInDecimals).toString(),
      sqrtPriceLimitX96: sqrtPriceLimitX96,
    };

    const output = await quoter02.callStatic.quoteExactInputSingle(params);
    const priceAfterSwap = output.sqrtPriceX96After.toString();
    console.log("Sqrt Price after swap", priceAfterSwap);

    if (isCloseEnough(priceAfterSwap, targetPrice)) {
      return midAmount;
    } else if (priceAfterSwap < targetPrice) {
      startAmount = midAmount;
    } else {
      endAmount = midAmount;
    }
  }
  throw new Error("Optimal input amount not found");
}

async function main() {
  // no need to pass token 0 and token 1 address in order
  const tokenAddress1 = process.argv[2];
  const tokenAddress2 = process.argv[3];
  const fee = parseFloat(process.argv[4]);
  const targetPrice = parseFloat(process.argv[5]);

  const startAmount = 0;
  const endAmount = 1000;

  const poolAddress = await elektrikFactory.getPool(
    tokenAddress1,
    tokenAddress2,
    fee
  );
  console.log("Pool address: ", poolAddress);

  const pool = new ethers.Contract(poolAddress, PoolAbi, provider);
  const slot0 = await pool.slot0();
  const currentPrice = ethers.BigNumber.from(slot0.sqrtPriceX96).toString();

  console.log("Current price: ", currentPrice);
  console.log("Target price: ", targetPrice);

  if (tokenAddress1 < tokenAddress2) {
    token0 = tokenAddress1;
    token1 = tokenAddress2;
  } else {
    token0 = tokenAddress2;
    token1 = tokenAddress1;
  }

  if (currentPrice < targetPrice) {
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
    tokenInDecimals
  );

  console.log(
    `OPTIMAL INPUT AMOUNT: ${optimalAmountIn} ${getTokenSymbol(tokenIn)}`
  );
}

main().catch(console.error);
