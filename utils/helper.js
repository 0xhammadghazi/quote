const { tokenInfo } = require("../config/tokens_info");

function getTokenSymbol(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.symbol;
  }
  throw new Error("Token symbols not found");
}

function getTokenDecimals(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.decimals;
  }
  throw new Error("Token decimals not found");
}

function getEthereumAddress(tokenAddress) {
  const token = tokenInfo[tokenAddress];
  if (token) {
    return token.ethereumAddress;
  }
  throw new Error("Ethereum token address not found");
}

module.exports = { getTokenSymbol, getTokenDecimals, getEthereumAddress };
