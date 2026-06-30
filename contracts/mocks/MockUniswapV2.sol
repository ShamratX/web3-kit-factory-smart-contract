// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) private _pairs;

    function getPair(address tokenA, address tokenB) external view returns (address pair) {
        pair = _pairs[tokenA][tokenB];
        if (pair == address(0)) {
            pair = _pairs[tokenB][tokenA];
        }
    }

    function setPair(address tokenA, address tokenB, address pair) external {
        _pairs[tokenA][tokenB] = pair;
        _pairs[tokenB][tokenA] = pair;
    }
}

contract MockUniswapV2Router {
    address public immutable factory;
    address public immutable WETH;

    constructor(address factory_, address weth_) {
        factory = factory_;
        WETH = weth_;
    }
}
