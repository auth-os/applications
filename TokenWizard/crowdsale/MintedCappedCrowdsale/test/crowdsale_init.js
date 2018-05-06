// Abstract storage contract
let AbstractStorage = artifacts.require('./RegistryStorage')
// MintedCappedCrowdsale
let InitMintedCapped = artifacts.require('./InitCrowdsale')
let MintedCappedBuy = artifacts.require('./CrowdsaleBuyTokens')
let MintedCappedCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
let MintedCappedTokenConsole = artifacts.require('./TokenConsole')
let MintedCappedTokenTransfer = artifacts.require('./TokenTransfer')
let MintedCappedTokenTransferFrom = artifacts.require('./TokenTransferFrom')
let MintedCappedTokenApprove = artifacts.require('./TokenApprove')
// Utils
let TestUtils = artifacts.require('./RegistryUtils')

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

contract('#MintedCappedInit', function (accounts) {

  let storage
  let testUtils

  let exec = accounts[0]
  let execTwo = accounts[accounts.length - 1]
  let updater = accounts[1]
  let crowdsaleAdmin = accounts[2]
  let teamWallet = accounts[3]

  let initCrowdsale
  let crowdsaleBuy
  let crowdsaleConsole
  let tokenConsole
  let tokenTransfer
  let tokenTransferFrom
  let tokenApprove

  let executionID
  let initCalldata
  let initEvent
  let finalizeEvent

  let startTime
  let initialTierName = 'Initial Tier'
  let initialTierPrice = web3.toWei('0.001', 'ether') // 1e15 wei per 1e18 tokens
  let initialTierDuration = 3600 // 1 hour
  let initialTierTokenSellCap = web3.toWei('1000', 'ether') // 1000 (e18) tokens for sale
  let initialTierIsWhitelisted = true
  let initialTierDurIsModifiable = true

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled

    initCrowdsale = await InitMintedCapped.new().should.be.fulfilled
    crowdsaleBuy = await MintedCappedBuy.new().should.be.fulfilled
    crowdsaleConsole = await MintedCappedCrowdsaleConsole.new().should.be.fulfilled
    tokenConsole = await MintedCappedTokenConsole.new().should.be.fulfilled
    tokenTransfer = await MintedCappedTokenTransfer.new().should.be.fulfilled
    tokenTransferFrom = await MintedCappedTokenTransferFrom.new().should.be.fulfilled
    tokenApprove = await MintedCappedTokenApprove.new().should.be.fulfilled
  })

  describe('valid initialization', async () => {

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get valid init calldata
      initCalldata = await testUtils.init(
        teamWallet, startTime, initialTierName,
        initialTierPrice, initialTierDuration, initialTierTokenSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
      ).should.be.fulfilled
      initCalldata.should.not.be.eq('0x')

      // Initialize a valid sale
      let events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, initCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(2)
      initEvent = events[0]
      finalizeEvent = events[1]

      executionID = initEvent.args['execution_id']
      executionID.should.not.eq(0)
    })

    it('should emit an ApplicationInitialized event', async () => {
      initEvent.event.should.be.eq('ApplicationInitialized')
    })

    it('should emit an ApplicationFinalization event', async () => {
      finalizeEvent.event.should.be.eq('ApplicationFinalization')
    })

    describe('the ApplicationInitialized event', async () => {

      it('should contain the indexed initialization address for the crowdsale', async () => {
        let initAddress = initEvent.args['init_address']
        initAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id', async () => {
        let execID = initEvent.args['execution_id']
        web3.toDecimal(execID).should.not.eq(0)
      })
    })

    describe('the ApplicationFinalization event', async () => {

      it('should contain the indexed initialization address for the crowdsale', async () => {
        let initAddress = finalizeEvent.args['init_address']
        initAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id', async () => {
        let execID = finalizeEvent.args['execution_id']
        web3.toDecimal(execID).should.not.eq(0)
      })
    })

    describe('#getAdmin', async () => {

      let adminAddr

      beforeEach(async () => {
        adminAddr = await initCrowdsale.getAdmin(storage.address, executionID).should.be.fulfilled
      })

      it('should store the correct admin address', async () => {
        adminAddr.should.be.eq(crowdsaleAdmin)
      })
    })

    describe('#getCrowdsaleInfo', async () => {

      let crowdsaleInfo

      beforeEach(async () => {
        crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo(storage.address, executionID).should.be.fulfilled
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
        crowdsaleFullInfo = await initCrowdsale.isCrowdsaleFull(storage.address, executionID).should.be.fulfilled
        crowdsaleFullInfo.length.should.be.eq(2)
      })

      it('should not be a full crowdsale', async () => {
        crowdsaleFullInfo[0].should.be.eq(false)
      })

      it('should get the correct maximum tokens sellable', async () => {
        crowdsaleFullInfo[1].equals(web3.toBigNumber(initialTierTokenSellCap)).should.be.eq(true)
      })
    })

    describe('#getCrowdsaleUniqueBuyers', async () => {

      let buyerInfo

      beforeEach(async () => {
        buyerInfo = await initCrowdsale.getCrowdsaleUniqueBuyers(storage.address, executionID).should.be.fulfilled
      })

      it('should not have any unique buyers', async () => {
        buyerInfo.toNumber().should.be.eq(0)
      })
    })

    describe('#getCrowdsaleStartAndEndTimes', async () => {

      let crowdsaleTimeInfo

      beforeEach(async () => {
        crowdsaleTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes(storage.address, executionID).should.be.fulfilled
        crowdsaleTimeInfo.length.should.be.eq(2)
      })

      it('should match the set start time', async () => {
        crowdsaleTimeInfo[0].toNumber().should.be.eq(startTime)
      })

      it('should store an end time equal to the start time plus the set duration', async () => {
        crowdsaleTimeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
      })
    })

    describe('#getCurrentTierInfo', async () => {

      let curTierInfo

      beforeEach(async () => {
        curTierInfo = await initCrowdsale.getCurrentTierInfo(storage.address, executionID).should.be.fulfilled
        curTierInfo.length.should.be.eq(7)
      })

      it('should set the current tier name to the initial tier', async () => {
        hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
      })

      it('should set the tier index to 0', async () => {
        curTierInfo[1].toNumber().should.be.eq(0)
      })

      it('should match the crowdsale end time to the tier end time', async () => {
        curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
      })

      it('should match the number of tokens remaining to the total supply', async () => {
        web3.fromWei(curTierInfo[3].toNumber(), 'ether').should.be.eq(
          web3.fromWei(initialTierTokenSellCap, 'ether')
        )
      })

      it('should store the same price that was passed in', async () => {
        web3.fromWei(curTierInfo[4].toNumber(), 'ether').should.be.eq(
          web3.fromWei(initialTierPrice, 'ether')
        )
      })

      it('should be modifiable and whitelist-enabled', async () => {
        curTierInfo[5].should.be.eq(true)
        curTierInfo[6].should.be.eq(true)
      })
    })

    describe('#getCrowdsaleTier', async () => {

      let crowdsaleTier

      beforeEach(async () => {
        crowdsaleTier = await initCrowdsale.getCrowdsaleTier(
          storage.address, executionID, 0
        ).should.be.fulfilled
        crowdsaleTier.length.should.be.eq(6)
      })

      it('should set the current tier name to the initial tier', async () => {
        hexStrEquals(crowdsaleTier[0], initialTierName).should.be.eq(true)
      })

      it('match the tier token sell cap to the amount passed in', async () => {
        web3.fromWei(crowdsaleTier[1].toNumber(), 'ether').should.be.eq(
          web3.fromWei(initialTierTokenSellCap, 'ether')
        )
      })

      it('should store the same price that was passed in', async () => {
        web3.fromWei(crowdsaleTier[2].toNumber(), 'ether').should.be.eq(
          web3.fromWei(initialTierPrice, 'ether')
        )
      })

      it('should match the duration that was passed in', async () => {
        crowdsaleTier[3].toNumber().should.be.eq(initialTierDuration)
      })

      it('should be modifiable and whitelist-enabled', async () => {
        crowdsaleTier[4].should.be.eq(true)
        crowdsaleTier[5].should.be.eq(true)
      })
    })

    describe('#getCrowedsaleMaxRaise', async () => {

      let maxRaiseInfo

      beforeEach(async () => {
        maxRaiseInfo = await initCrowdsale.getCrowdsaleMaxRaise(storage.address, executionID).should.be.fulfilled
        maxRaiseInfo.length.should.be.eq(2)
      })

      it('should not set a max raise amount, because token decimals have not been set', async () => {
        maxRaiseInfo[0].toNumber().should.be.eq(0)
      })

      it('should not set a max sellable amount, because token decimals have not been set', async () => {
        maxRaiseInfo[1].toNumber().should.be.eq(0)
      })
    })

    describe('#getCrowdsaleTierList', async () => {

      let tierListInfo

      beforeEach(async () => {
        tierListInfo = await initCrowdsale.getCrowdsaleTierList(storage.address, executionID).should.be.fulfilled
      })

      it('should return a list with one tier in it', async () => {
        tierListInfo.length.should.be.eq(1)
        hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
      })
    })

    describe('#getTierStartAndEndDates', async () => {

      let tierTimeInfo

      beforeEach(async () => {
        tierTimeInfo = await initCrowdsale.getTierStartAndEndDates(
          storage.address, executionID, 0
        ).should.be.fulfilled
        tierTimeInfo.length.should.be.eq(2)
      })

      it('should match the crowdsale\'s start date', async () => {
        tierTimeInfo[0].toNumber().should.be.eq(startTime)
      })

      it('should match the crowdsale\'s end date', async () => {
        tierTimeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
      })
    })

    describe('#getTokensSold', async () => {

      let soldInfo

      beforeEach(async () => {
        soldInfo = await initCrowdsale.getTokensSold(storage.address, executionID).should.be.fulfilled
      })

      it('should not have any tokens sold', async () => {
        soldInfo.toNumber().should.be.eq(0)
      })
    })

    describe('#getTierWhitelist', async () => {

      let whitelistInfo

      beforeEach(async () => {
        whitelistInfo = await initCrowdsale.getTierWhitelist(
          storage.address, executionID, 0
        ).should.be.fulfilled
        whitelistInfo.length.should.be.eq(2)
      })

      it('should not have a whitelist for tier 0', async () => {
        whitelistInfo[0].toNumber().should.be.eq(0)
        whitelistInfo[1].length.should.be.eq(0)
      })
    })

    describe('#getTokenInfo', async () => {

      let tokenInfo

      beforeEach(async () => {
        tokenInfo = await initCrowdsale.getTokenInfo(
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

      it('should not have set a total supply', async () => {
        tokenInfo[3].toNumber().should.be.eq(0)
      })
    })

    describe('#getReservedTokenDestinationList', async () => {

      let resInfo

      beforeEach(async () => {
        resInfo = await initCrowdsale.getReservedTokenDestinationList(storage.address, executionID).should.be.fulfilled
        resInfo.length.should.be.eq(2)
      })

      it('should not have any reserved tokens', async () => {
        resInfo[0].toNumber().should.be.eq(0)
        resInfo[1].length.should.be.eq(0)
      })
    })
  })

  describe('invalid team wallet', async () => {

    let invalidWallet = zeroAddress()
    let invalidInitCalldata
    let invalidInitEvent

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await testUtils.init(
        invalidWallet, startTime, initialTierName,
        initialTierPrice, initialTierDuration, initialTierTokenSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')

      // Initialize an invalid sale
      events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, invalidInitCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      invalidInitEvent = events[0]
    })

    context('when the team wallet address is 0', async () => {

      it('should emit an ApplicationException event', async () => {
        invalidInitEvent.event.should.be.eq('ApplicationException')
      })

      describe('the ApplicationException event', async () => {

        it('should contain an indexed application address', async () => {
          let appAddress = invalidInitEvent.args['application_address']
          appAddress.should.be.eq(initCrowdsale.address)
        })

        it('should contain an indexed execution id of value 0', async () => {
          let execID = invalidInitEvent.args['execution_id']
          web3.toDecimal(execID).should.be.eq(0)
        })

        it('should contain an indexed error message', async () => {
          let message = invalidInitEvent.args['message']
          hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
        })
      })
    })
  })

  describe('invalid start time', async () => {

    let invalidStartTime = 0
    let invalidInitCalldata
    let invalidInitEvent

    beforeEach(async () => {

      // Get invalid init calldata
      invalidInitCalldata = await testUtils.init(
        teamWallet, invalidStartTime, initialTierName,
        initialTierPrice, initialTierDuration, initialTierTokenSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')

      // Initialize an invalid sale
      events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, invalidInitCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      invalidInitEvent = events[0]
    })

    it('should emit an ApplicationException event', async () => {
      invalidInitEvent.event.should.be.eq('ApplicationException')
    })

    describe('the ApplicationException event', async () => {

      it('should contain an indexed application address', async () => {
        let appAddress = invalidInitEvent.args['application_address']
        appAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id of value 0', async () => {
        let execID = invalidInitEvent.args['execution_id']
        web3.toDecimal(execID).should.be.eq(0)
      })

      it('should contain an indexed error message', async () => {
        let message = invalidInitEvent.args['message']
        hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
      })
    })
  })

  describe('invalid initial tier price', async () => {

    let invalidTierPrice = 0
    let invalidInitCalldata
    let invalidInitEvent

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await testUtils.init(
        teamWallet, startTime, initialTierName,
        invalidTierPrice, initialTierDuration, initialTierTokenSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')

      // Initialize an invalid sale
      events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, invalidInitCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: execTwo }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      invalidInitEvent = events[0]
    })

    it('should emit an ApplicationException event', async () => {
      invalidInitEvent.event.should.be.eq('ApplicationException')
    })

    describe('the ApplicationException event', async () => {

      it('should contain an indexed application address', async () => {
        let appAddress = invalidInitEvent.args['application_address']
        appAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id of value 0', async () => {
        let execID = invalidInitEvent.args['execution_id']
        web3.toDecimal(execID).should.be.eq(0)
      })

      it('should contain an indexed error message', async () => {
        let message = invalidInitEvent.args['message']
        hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
      })
    })
  })

  describe('invalid initial tier duration', async () => {

    let invalidDuration = 0
    let invalidInitCalldata
    let invalidInitEvent

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await testUtils.init(
        teamWallet, startTime, initialTierName,
        initialTierPrice, invalidDuration, initialTierTokenSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')

      // Initialize an invalid sale
      events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, invalidInitCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: execTwo }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      invalidInitEvent = events[0]
    })

    it('should emit an ApplicationException event', async () => {
      invalidInitEvent.event.should.be.eq('ApplicationException')
    })

    describe('the ApplicationException event', async () => {

      it('should contain an indexed application address', async () => {
        let appAddress = invalidInitEvent.args['application_address']
        appAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id of value 0', async () => {
        let execID = invalidInitEvent.args['execution_id']
        web3.toDecimal(execID).should.be.eq(0)
      })

      it('should contain an indexed error message', async () => {
        let message = invalidInitEvent.args['message']
        hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
      })
    })
  })

  describe('invalid initial tier token sell cap', async () => {

    let invalidSellCap = 0
    let invalidInitCalldata
    let invalidInitEvent

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await testUtils.init(
        teamWallet, startTime, initialTierName,
        initialTierPrice, initialTierDuration, invalidSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')

      // Initialize an invalid sale
      events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, invalidInitCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: execTwo }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      invalidInitEvent = events[0]
    })

    it('should emit an ApplicationException event', async () => {
      invalidInitEvent.event.should.be.eq('ApplicationException')
    })

    describe('the ApplicationException event', async () => {

      it('should contain an indexed application address', async () => {
        let appAddress = invalidInitEvent.args['application_address']
        appAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id of value 0', async () => {
        let execID = invalidInitEvent.args['execution_id']
        web3.toDecimal(execID).should.be.eq(0)
      })

      it('should contain an indexed error message', async () => {
        let message = invalidInitEvent.args['message']
        hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
      })
    })
  })

  describe('invalid admin address', async () => {

    let invalidAdmin = zeroAddress()
    let invalidInitCalldata
    let invalidInitEvent

    beforeEach(async () => {
      startTime = getTime() + 3600 // Starts in 1 hour

      // Get invalid init calldata
      invalidInitCalldata = await testUtils.init(
        teamWallet, startTime, initialTierName,
        initialTierPrice, initialTierDuration, initialTierTokenSellCap,
        initialTierIsWhitelisted, initialTierDurIsModifiable, invalidAdmin
      ).should.be.fulfilled
      invalidInitCalldata.should.not.be.eq('0x')

      // Initialize an invalid sale
      events = await storage.initAndFinalize(
        updater, true, initCrowdsale.address, invalidInitCalldata, [
          crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
          tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
        ], { from: execTwo }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      invalidInitEvent = events[0]
    })

    it('should emit an ApplicationException event', async () => {
      invalidInitEvent.event.should.be.eq('ApplicationException')
    })

    describe('the ApplicationException event', async () => {

      it('should contain an indexed application address', async () => {
        let appAddress = invalidInitEvent.args['application_address']
        appAddress.should.be.eq(initCrowdsale.address)
      })

      it('should contain an indexed execution id of value 0', async () => {
        let execID = invalidInitEvent.args['execution_id']
        web3.toDecimal(execID).should.be.eq(0)
      })

      it('should contain an indexed error message', async () => {
        let message = invalidInitEvent.args['message']
        hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
      })
    })
  })
})
