# Web3 Kit Token Factory

On-chain ERC-20 factory for **BNB Smart Chain** and **Ethereum**. One `createToken()` call deploys a new token and mints the full supply to the caller. Optional immutable buy/sell tax on Uniswap V2 / PancakeSwap V2 pairs.

## Features

- Deploy ERC-20 with custom name, symbol, decimals, supply
- Optional buy/sell tax (basis points) + tax wallet
- Multi-network Hardhat deploy: BSC mainnet/testnet, Ethereum mainnet, Sepolia
- No owner / pause / blacklist / post-deploy mint on created tokens
- OpenZeppelin-based token implementation

## How it works

`W3KitTokenFactory.createToken(...)` deploys `W3KitToken`, mints supply to `msg.sender`, emits `TokenCreated`. Tax (if configured) applies on V2 pair buys/sells after a pair exists — not on ordinary wallet transfers when tax is unused.

Constructor takes a V2 **router** address (Uniswap / Pancake / Sepolia community router per network).

## Requirements

- Node.js 18+
- npm
- Funded deployer key + RPC URLs

## Quick start

```bash
git clone https://github.com/ShamratX/web3-kit-factory-smart-contract.git
cd web3-kit-factory-smart-contract
npm install
cp .env.example .env
npx hardhat compile
npx hardhat test
npm run deploy:factory -- --network bscTestnet
```

Networks in config: `hardhat`, `sepolia`, `eth`, `bscTestnet`, `bsc`.

After deploy, copy printed `TOKEN_FACTORY_CONTRACT_ADDRESS_*` into the **web3-kit** frontend `.env`.

## Config (env names)

`PRIVATE_KEY`, `ETH_SEPOLIA_RPC_URL`, `ETH_MAINNET_RPC_URL`, `BSC_TESTNET_RPC_URL`, `BSC_MAINNET_RPC_URL`, `ETHERSCAN_API_KEY`, `BSCSCAN_API_KEY`, `TOKEN_FACTORY_CONTRACT_ADDRESS_*`

## Project structure

```text
contracts/
  W3KitTokenFactory.sol
  W3KitToken.sol
  mocks/
scripts/deploy-factory.js
test/W3KitTokenFactory.test.js
hardhat.config.js
```

## Limitations

- Verify on BSC may require pointing Hardhat etherscan config at `BSCSCAN_API_KEY` (see config comments).
- Tax parameters are fixed at create time for each token.
- Frontend network support depends on which factories you deploy and wire.

## Related

[web3-kit](https://github.com/ShamratX/web3-kit) · [batch-executor](https://github.com/ShamratX/web3-kit-batch-executor-smart-contract)
