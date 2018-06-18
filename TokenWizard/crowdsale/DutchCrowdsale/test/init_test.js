// Abstract storage contract
let AbstractStorage = artifacts.require('./AbstractStorage')
// Registry
let RegistryUtil = artifacts.require('./RegistryUtil')
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// DutchAuction
let Token = artifacts.require('./Token')
let Sale = artifacts.require('./Sale')
let Admin = artifacts.require('./Admin')
let DutchSale = artifacts.require('./DutchCrowdsaleIdx')
// Utils
let DutchUtils = artifacts.require('./utils/DutchUtils')

function getTime() {
  let block = web3.eth.getBlock('latest')
  return block.timestamp;
}

function zeroAddress() {
  return web3.toHex(0)
}

function hexStrEquals(hex, expected) {
  return web3.toAscii(hex).substring(0, expected.length) == expected;
}

contract('#DutchCrowdsaleInit', function (accounts) {

  let storage

  let exec = accounts[0]
  let crowdsaleAdmin = accounts[1]
  let teamWallet = accounts[2]

  let regExecID
  let regUtil
  let regProvider
  let regIdx

  let saleUtils
  let saleAddrs
  let saleSelectors

  let saleIdx
  let token
  let sale
  let admin

  let executionID
  let initCalldata
  let initEvent

  let appName = 'DutchCrowdsale'

  let startTime
  let totalSupply = 100000
  let sellCap = 90000
  let startPrice = 1000 // 1000 wei per token (1 token = [10 ** decimals] units)
  let endPrice = 100 // 100 wei per token
  let duration = 3600 // 1 hour
  let isWhitelisted = true

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled

    regUtil = await RegistryUtil.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    saleIdx = await DutchSale.new().should.be.fulfilled
    token = await Token.new().should.be.fulfilled
    sale = await Sale.new().should.be.fulfilled
    admin = await Admin.new().should.be.fulfilled

    saleUtils = await DutchUtils.new().should.be.fulfilled

    saleSelectors = await saleUtils.getSelectors.call().should.be.fulfilled
    saleSelectors.length.should.be.eq(13)

    saleAddrs = [
      // admin
      admin.address, admin.address, admin.address, admin.address,
      admin.address, admin.address, admin.address,

      // sale
      sale.address,

      // token
      token.address, token.address, token.address, token.address, token.address
    ]
    saleAddrs.length.should.be.eq(saleSelectors.length)
  })

  beforeEach(async () => {
    let events = await storage.createRegistry(
      regIdx.address, regProvider.address, { from: exec }
    ).should.be.fulfilled.then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(1)
    events[0].event.should.be.eq('ApplicationInitialized')
    regExecID = events[0].args['execution_id']
    web3.toDecimal(regExecID).should.not.eq(0)

    let registerCalldata = await regUtil.registerApp.call(
      appName, saleIdx.address, saleSelectors, saleAddrs
    ).should.be.fulfilled
    registerCalldata.should.not.eq('0x0')

    events = await storage.exec(
      exec, regExecID, registerCalldata,
      { from: exec }
    ).should.be.fulfilled.then((tx) => {
      return tx.logs;
    })
    events.should.not.eq(null)
    events.length.should.be.eq(1)
    events[0].event.should.be.eq('ApplicationExecution')
    events[0].args['script_target'].should.be.eq(regProvider.address)
  })

  describe('valid initialization', async () => {

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get valid init calldata
      initCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, startPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      initCalldata.should.not.be.eq('0x')

      events = await storage.createInstance(
        exec, appName, exec, regExecID, initCalldata,
        { from: exec }
      ).should.be.fulfilled.then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      initEvent = events[0]
      executionID = events[0].args['execution_id']
      web3.toDecimal(executionID).should.not.eq(0)
    })

    it('should emit an ApplicationInitialized event', async () => {
      initEvent.event.should.be.eq('ApplicationInitialized')
    })

    describe('the ApplicationInitialized event', async () => {

      it('should contain the indexed initialization address for the crowdsale', async () => {
        let initAddress = initEvent.args['index']
        initAddress.should.be.eq(saleIdx.address)
      })

      it('should contain an indexed execution id', async () => {
        let execID = initEvent.args['execution_id']
        web3.toDecimal(execID).should.not.eq(0)
      })
    })

    describe('#getAdmin', async () => {

      let adminAddr

      beforeEach(async () => {
        adminAddr = await saleIdx.getAdmin.call(storage.address, executionID).should.be.fulfilled
      })

      it('should store the correct admin address', async () => {
        adminAddr.should.be.eq(crowdsaleAdmin)
      })
    })

    describe('#getCrowdsaleInfo', async () => {

      let crowdsaleInfo

      beforeEach(async () => {
        crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(storage.address, executionID).should.be.fulfilled
        crowdsaleInfo.length.should.be.eq(5)
      })

      it('should not have any wei raised', async () => {
        crowdsaleInfo[0].toNumber().should.be.eq(0)
      })

      it('should store the valid team wallet', async () => {
        crowdsaleInfo[1].should.be.eq(teamWallet)
      })

      it('should not have a minimum contribution', async () => {
        crowdsaleInfo[2].toNumber().should.be.eq(0)
      })

      it('should not be initialized or finalized', async () => {
        crowdsaleInfo[3].should.be.eq(false)
        crowdsaleInfo[4].should.be.eq(false)
      })
    })

    describe('#isCrowdsaleFull', async () => {

      let crowdsaleFullInfo

      beforeEach(async () => {
        crowdsaleFullInfo = await saleIdx.isCrowdsaleFull.call(storage.address, executionID).should.be.fulfilled
        crowdsaleFullInfo.length.should.be.eq(2)
      })

      it('should not be a full crowdsale', async () => {
        crowdsaleFullInfo[0].should.be.eq(false)
      })

      it('should get the correct maximum tokens sellable', async () => {
        crowdsaleFullInfo[1].toNumber().should.be.eq(sellCap)
      })
    })

    describe('#getCrowdsaleUniqueBuyers', async () => {

      let buyerInfo

      beforeEach(async () => {
        buyerInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(storage.address, executionID).should.be.fulfilled
      })

      it('should not have any unique buyers', async () => {
        buyerInfo.toNumber().should.be.eq(0)
      })
    })

    describe('#getCrowdsaleStartAndEndTimes', async () => {

      let crowdsaleTimeInfo

      beforeEach(async () => {
        crowdsaleTimeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(storage.address, executionID).should.be.fulfilled
        crowdsaleTimeInfo.length.should.be.eq(2)
      })

      it('should match the set start time', async () => {
        crowdsaleTimeInfo[0].toNumber().should.be.eq(startTime)
      })

      it('should store an end time equal to the start time plus the set duration', async () => {
        crowdsaleTimeInfo[1].toNumber().should.be.eq(startTime + duration)
      })
    })

    describe('#getCrowdsaleStatus', async () => {

      let crowdsaleStatusInfo

      beforeEach(async () => {
        crowdsaleStatusInfo = await saleIdx.getCrowdsaleStatus.call(storage.address, executionID).should.be.fulfilled
        crowdsaleStatusInfo.length.should.be.eq(7)
      })

      it('should store the correct start price', async () => {
        crowdsaleStatusInfo[0].toNumber().should.be.eq(startPrice)
      })

      it('should store the correct end price', async () => {
        crowdsaleStatusInfo[1].toNumber().should.be.eq(endPrice)
      })

      it('should calculate a valid current price', async () => {
        crowdsaleStatusInfo[2].toNumber().should.be.eq(startPrice)
      })

      it('should store the correct sale duration', async () => {
        crowdsaleStatusInfo[3].toNumber().should.be.eq(duration)
      })

      it('should calculate a valid time remaining', async() => {
        crowdsaleStatusInfo[4].toNumber().should.be.above(duration)
        crowdsaleStatusInfo[4].toNumber().should.be.within(3600, duration + 3600)
      })

      it('should have all sellable tokens remaining', async () => {
        crowdsaleStatusInfo[5].toNumber().should.be.eq(sellCap)
      })

      it('should not be whitelisted', async () => {
        crowdsaleStatusInfo[6].should.be.eq(true)
      })
    })

    describe('#getCrowdsaleWhitelist', async () => {

      let saleWhitelist

      beforeEach(async () => {
        saleWhitelist = await saleIdx.getCrowdsaleWhitelist.call(storage.address, executionID).should.be.fulfilled
        saleWhitelist.length.should.be.eq(2)
      })

      it('should have 0 addresses whitelisted', async () => {
        saleWhitelist[0].toNumber().should.be.eq(0)
      })

      it('should have a whitelist length of 0', async () => {
        saleWhitelist[1].length.should.be.eq(0)
      })
    })

    describe('#balanceOf', async () => {

      let adminBalance

      beforeEach(async () => {
        adminBalance = await saleIdx.balanceOf.call(
          storage.address, executionID, crowdsaleAdmin
        ).should.be.fulfilled
      })

      it('should award the admin with the difference between the total supply and the sale cap', async () => {
        adminBalance.toNumber().should.be.eq(totalSupply - sellCap)
      })
    })

    describe('#totalSupply', async () => {

      let supplyInfo

      beforeEach(async () => {
        supplyInfo = await saleIdx.totalSupply.call(storage.address, executionID).should.be.fulfilled
      })

      it('should correctly store the total supply of the token', async () => {
        supplyInfo.toNumber().should.be.eq(totalSupply)
      })
    })

    describe('#getTokenInfo', async () => {

      let tokenInfo

      beforeEach(async () => {
        tokenInfo = await saleIdx.getTokenInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        tokenInfo.length.should.be.eq(4)
      })

      it('should not have set a token name', async () => {
        web3.toDecimal(tokenInfo[0]).should.be.eq(0)
      })

      it('should not have set a token symbol', async () => {
        web3.toDecimal(tokenInfo[1]).should.be.eq(0)
      })

      it('should not have set token decimals', async () => {
        tokenInfo[2].toNumber().should.be.eq(0)
      })

      it('should have set a total supply', async () => {
        tokenInfo[3].toNumber().should.be.eq(totalSupply)
      })
    })
  })

  describe('invalid team wallet', async () => {

    let invalidWallet = zeroAddress()
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        invalidWallet, totalSupply, sellCap, startPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid start time', async () => {

    let invalidStartTime = 0
    let invalidInitCalldata

    beforeEach(async () => {
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, startPrice, endPrice,
        duration, invalidStartTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid duration', async () => {

    let invalidDuration = 0
    let invalidInitCalldata

    beforeEach(async () => {
      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, startPrice, endPrice,
        invalidDuration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid token sell cap - 0', async () => {

    let invalidSellCap = 0
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, invalidSellCap, startPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid token sell cap - greater than totalSupply', async () => {

    let invalidSellCap = totalSupply + 1
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, invalidSellCap, startPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid start price - 0', async () => {

    let invalidPrice = 0
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, invalidPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid start price - less than end price', async () => {

    let invalidPrice = endPrice - 1
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, invalidPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid start price - equal to end price', async () => {

    let invalidPrice = endPrice
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, invalidPrice, endPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid end price - 0', async () => {

    let invalidPrice = 0
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, startPrice, invalidPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid end price - greater than start price', async () => {

    let invalidPrice = startPrice + 1
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, startPrice, invalidPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid end price - equal to start price', async () => {

    let invalidPrice = startPrice
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init.call(
        teamWallet, totalSupply, sellCap, startPrice, invalidPrice,
        duration, startTime, isWhitelisted, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('invalid admin address', async () => {

    let invalidAdmin = zeroAddress()
    let invalidInitCalldata

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await saleUtils.init(
        teamWallet, totalSupply, sellCap, startPrice, endPrice,
        duration, startTime, isWhitelisted, invalidAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')
    })

    it('should throw', async () => {
      await storage.createInstance(
        exec, appName, exec, regExecID, invalidInitCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })
})
