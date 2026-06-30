const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("W3KitTokenFactory", function () {
  let factory;
  let mockFactory;
  let mockRouter;
  let owner;
  let taxWallet;
  let buyer;
  let pair;
  let weth;

  beforeEach(async function () {
    [owner, taxWallet, buyer, pair, weth] = await ethers.getSigners();

    const MockDex = await ethers.getContractFactory("MockUniswapV2Factory");
    mockFactory = await MockDex.deploy();
    await mockFactory.waitForDeployment();

    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    mockRouter = await MockRouter.deploy(await mockFactory.getAddress(), weth.address);
    await mockRouter.waitForDeployment();

    const Factory = await ethers.getContractFactory("W3KitTokenFactory");
    factory = await Factory.deploy(await mockRouter.getAddress());
    await factory.waitForDeployment();
  });

  async function registerPair(tokenAddress) {
    await mockFactory.setPair(tokenAddress, weth.address, pair.address);
  }

  async function createToken(overrides = {}) {
    const params = {
      name: "Web3 Kit Token",
      symbol: "W3K",
      decimals: 18,
      totalSupply: ethers.parseUnits("1000000", 18),
      buyTaxBps: 0,
      sellTaxBps: 0,
      taxWallet: ethers.ZeroAddress,
      ...overrides,
    };

    const tokenAddress = await factory.createToken.staticCall(
      params.name,
      params.symbol,
      params.decimals,
      params.totalSupply,
      params.buyTaxBps,
      params.sellTaxBps,
      params.taxWallet
    );

    await expect(
      factory.createToken(
        params.name,
        params.symbol,
        params.decimals,
        params.totalSupply,
        params.buyTaxBps,
        params.sellTaxBps,
        params.taxWallet
      )
    )
      .to.emit(factory, "TokenCreated")
      .withArgs(
        owner.address,
        tokenAddress,
        params.name,
        params.symbol,
        params.decimals,
        params.totalSupply,
        params.buyTaxBps,
        params.sellTaxBps,
        params.taxWallet
      );

    return ethers.getContractAt("W3KitToken", tokenAddress);
  }

  describe("deployment", function () {
    it("stores the DEX router", async function () {
      expect(await factory.router()).to.equal(await mockRouter.getAddress());
    });

    it("reverts when router is zero address", async function () {
      const Factory = await ethers.getContractFactory("W3KitTokenFactory");
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        factory,
        "ZeroRouter"
      );
    });
  });

  describe("createToken without tax", function () {
    it("deploys a new token and mints full supply to creator", async function () {
      const totalSupply = ethers.parseUnits("1000000", 18);
      const token = await createToken({ totalSupply });

      expect(await token.name()).to.equal("Web3 Kit Token");
      expect(await token.symbol()).to.equal("W3K");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(totalSupply);
      expect(await token.balanceOf(owner.address)).to.equal(totalSupply);
      expect(await token.buyTaxBps()).to.equal(0);
      expect(await token.sellTaxBps()).to.equal(0);
      expect(await token.taxWallet()).to.equal(ethers.ZeroAddress);
    });

    it("allows wallet-to-wallet transfers without tax", async function () {
      const amount = ethers.parseUnits("100", 18);
      const token = await createToken();

      await token.transfer(buyer.address, amount);

      expect(await token.balanceOf(buyer.address)).to.equal(amount);
      expect(await token.balanceOf(taxWallet.address)).to.equal(0);
    });
  });

  describe("createToken with tax", function () {
    it("stores immutable tax settings on the token", async function () {
      const token = await createToken({
        buyTaxBps: 500,
        sellTaxBps: 1000,
        taxWallet: taxWallet.address,
      });

      expect(await token.buyTaxBps()).to.equal(500);
      expect(await token.sellTaxBps()).to.equal(1000);
      expect(await token.taxWallet()).to.equal(taxWallet.address);
    });

    it("applies sell tax when transferring to the DEX pair", async function () {
      const amount = ethers.parseUnits("1000", 18);
      const token = await createToken({
        buyTaxBps: 0,
        sellTaxBps: 1000,
        taxWallet: taxWallet.address,
      });

      await registerPair(await token.getAddress());
      await token.transfer(pair.address, amount);

      const expectedTax = (amount * 1000n) / 10000n;
      expect(await token.balanceOf(taxWallet.address)).to.equal(expectedTax);
      expect(await token.balanceOf(pair.address)).to.equal(amount - expectedTax);
    });

    it("applies buy tax when transferring from the DEX pair", async function () {
      const amount = ethers.parseUnits("1000", 18);
      const token = await createToken({
        buyTaxBps: 500,
        sellTaxBps: 0,
        taxWallet: taxWallet.address,
      });

      await registerPair(await token.getAddress());
      await token.transfer(pair.address, amount);

      await token.connect(pair).transfer(buyer.address, amount);

      const expectedTax = (amount * 500n) / 10000n;
      expect(await token.balanceOf(taxWallet.address)).to.equal(expectedTax);
      expect(await token.balanceOf(buyer.address)).to.equal(amount - expectedTax);
    });

    it("does not tax transfers before the DEX pair exists", async function () {
      const amount = ethers.parseUnits("100", 18);
      const token = await createToken({
        buyTaxBps: 500,
        sellTaxBps: 1000,
        taxWallet: taxWallet.address,
      });

      await token.transfer(buyer.address, amount);

      expect(await token.balanceOf(buyer.address)).to.equal(amount);
      expect(await token.balanceOf(taxWallet.address)).to.equal(0);
    });
  });

  describe("validation", function () {
    const validSupply = ethers.parseUnits("1", 18);

    it("reverts on empty name", async function () {
      await expect(
        factory.createToken("", "W3K", 18, validSupply, 0, 0, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "EmptyName");
    });

    it("reverts on empty symbol", async function () {
      await expect(
        factory.createToken("Token", "", 18, validSupply, 0, 0, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "EmptySymbol");
    });

    it("allows long name and symbol", async function () {
      const longName = "a".repeat(33);
      const longSymbol = "A".repeat(12);
      const token = await createToken({
        name: longName,
        symbol: longSymbol,
        totalSupply: validSupply,
      });

      expect(await token.name()).to.equal(longName);
      expect(await token.symbol()).to.equal(longSymbol);
    });

    it("reverts when decimals exceed 18", async function () {
      await expect(
        factory.createToken("Token", "W3K", 19, validSupply, 0, 0, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "DecimalsTooHigh");
    });

    it("reverts when total supply is zero", async function () {
      await expect(
        factory.createToken("Token", "W3K", 18, 0, 0, 0, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroSupply");
    });

    it("reverts when tax is on but tax wallet is zero", async function () {
      await expect(
        factory.createToken("Token", "W3K", 18, validSupply, 100, 100, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "TaxWalletRequired");
    });

    it("reverts when tax is off but tax wallet is set", async function () {
      await expect(
        factory.createToken("Token", "W3K", 18, validSupply, 0, 0, taxWallet.address)
      ).to.be.revertedWithCustomError(factory, "TaxWalletMustBeZero");
    });
  });
});
