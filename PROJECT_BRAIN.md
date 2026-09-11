# PROJECT_BRAIN — web3-kit-factory-smart-contract

## Purpose

Hardhat package (`nexus-token-factory`) that deploys `W3KitTokenFactory` / `W3KitToken` for the Web3 Kit Create Token UI.

## Architecture

- Solidity 0.8.30 + OpenZeppelin v5
- Factory pattern: one factory per chain; each `createToken` deploys a new token contract
- Deploy script selects V2 router by network (Uniswap mainnet, Pancake BSC, Sepolia community router)
- Tests in `test/W3KitTokenFactory.test.js`

## Workflow

1. Fill `.env` with `PRIVATE_KEY` + RPC + scanner keys.
2. `npx hardhat compile && npx hardhat test`
3. `npm run deploy:factory -- --network <net>`
4. Paste address into web3-kit `.env` as `TOKEN_FACTORY_CONTRACT_ADDRESS_*`
5. Verify on explorer as needed

## Env names

`PRIVATE_KEY`, RPC URLs for sepolia/eth/bscTestnet/bsc, `ETHERSCAN_API_KEY`, `BSCSCAN_API_KEY`, optional address slots for bookkeeping.

## Gotchas

- Gas reporter often enabled in Hardhat config.
- Tax wallet / bps validation lives in factory; inconsistent “tax off” configs revert.
- Package name in package.json may still say `nexus-token-factory`.

## Related

Consumers: `web3-kit`. Sibling: `web3-kit-batch-executor-smart-contract`.
