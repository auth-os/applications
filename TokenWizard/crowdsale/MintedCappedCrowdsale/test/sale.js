// Abstract storage contract
let AbstractStorage = artifacts.require('./StorageMock.sol')
// Registry
let RegistryUtil = artifacts.require('./RegistryUtil')
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// MintedCapped
let Token = artifacts.require('./Token')
let Sale = artifacts.require('./SaleMock')
let TokenManager = artifacts.require('./TokenManager')
let SaleManager = artifacts.require('./SaleManager')
let MintedCapped = artifacts.require('./MintedCappedIdxMock')
// Utils
let SaleUtils = artifacts.require('./utils/MintedCappedUtils')

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

contract('#MintedCappedSale', function (accounts) {

  let storage

  let exec = accounts[0]
  let crowdsaleAdmin = accounts[1]
  let teamWallet = accounts[2]

  let appName = 'MintedCappedCrowdsale'

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
  let tokenManager
  let saleManager

  let executionID
  let initCalldata
  let initEvent

  let startTime
  let initialTierName = 'Initial Tier'
  let initialTierPrice = 1 // 1 wei per 1 token
  let initialTierDuration = 3600 // 1 hour
  let initialTierTokenSellCap = 1000000 // 1 million tokens for sale in first tier
  let initialTierMin = 10
  let initialTierIsWhitelisted = false
  let initialTierDurIsModifiable = true

  let tokenName = 'Token'
  let tokenSymbol = 'TOK'
  let tokenDecimals = 0

  let purchaserList = [
    accounts[accounts.length - 1],
    accounts[accounts.length - 2],
    accounts[accounts.length - 3]
  ]

  let tierNames = ['Tier 1', 'Tier 2', 'Tier 3']
  let tierDurations = [10000, 20000, 30000]
  let tierPrices = [10, 100, 1000] // 10, 100, and 1000 wei per 1 token
  let tierCaps = [100000, 10000, 1000] // 100000, 10000, and 1000 tokens for sale
  let tierMins = [10, 5, 1]
  let tierModStats = [true, true, true] // All tier durations are modifiable
  let tierWhitelistStats = [true, false, true] // Only Tier 0 and Tier 2 are not whitelisted

  // Event signatures
  let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
  let finalHash = web3.sha3('ApplicationFinalization(bytes32,address)')
  let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
  let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')
  let exceptHash = web3.sha3('ApplicationException(address,bytes32,bytes)')

  let purchaseHash = web3.sha3('Purchase(address,uint256,uint256)')

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    saleUtils = await SaleUtils.new().should.be.fulfilled

    regUtil = await RegistryUtil.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    saleIdx = await MintedCapped.new().should.be.fulfilled
    token = await Token.new().should.be.fulfilled
    sale = await Sale.new().should.be.fulfilled
    tokenManager = await TokenManager.new().should.be.fulfilled
    saleManager = await SaleManager.new().should.be.fulfilled

    saleSelectors = await saleUtils.getSelectors.call().should.be.fulfilled
    saleSelectors.length.should.be.eq(19)
    saleAddrs = [
      saleManager.address, saleManager.address, saleManager.address,
      saleManager.address, saleManager.address, saleManager.address,

      tokenManager.address, tokenManager.address, tokenManager.address,
      tokenManager.address, tokenManager.address, tokenManager.address,
      tokenManager.address,

      sale.address,

      token.address, token.address, token.address, token.address, token.address
    ]
    saleAddrs.length.should.be.eq(19)
  })

  beforeEach(async () => {
    startTime = getTime() + 3600

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

    initCalldata = await saleUtils.init.call(
      teamWallet, startTime, initialTierName, initialTierPrice,
      initialTierDuration, initialTierTokenSellCap, initialTierMin, initialTierIsWhitelisted,
      initialTierDurIsModifiable, crowdsaleAdmin
    ).should.be.fulfilled
    initCalldata.should.not.eq('0x')

    events = await storage.createInstance(
      exec, appName, exec, regExecID, initCalldata,
      { from: exec }
    ).should.be.fulfilled.then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(1)
    executionID = events[0].args['execution_id']
    web3.toDecimal(executionID).should.not.eq(0)

    await saleIdx.resetTime().should.be.fulfilled
    let storedTime = await saleIdx.set_time.call().should.be.fulfilled
    storedTime.toNumber().should.be.eq(0)

    await storage.resetTime().should.be.fulfilled
    storedTime = await storage.set_time.call().should.be.fulfilled
    storedTime.toNumber().should.be.eq(0)

    let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
      tokenName, tokenSymbol, tokenDecimals
    ).should.be.fulfilled
    initTokenCalldata.should.not.eq('0x')

    events = await storage.exec(
      crowdsaleAdmin, executionID, initTokenCalldata,
      { from: exec }
    ).then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(1)
    events[0].event.should.be.eq('ApplicationExecution')
  })

  describe('pre-test-storage', async() => {

    it('should be an uninitialized crowdsale', async () => {
      let saleInfo = await saleIdx.getCrowdsaleInfo.call(
        storage.address, executionID
      ).should.be.fulfilled
      saleInfo.length.should.be.eq(4)

      saleInfo[0].toNumber().should.be.eq(0)
      saleInfo[1].should.be.eq(teamWallet)
      saleInfo[2].should.be.eq(false)
      saleInfo[3].should.be.eq(false)
    })

    it('should have a correctly initialized token', async () => {
      let tokenInfo = await saleIdx.getTokenInfo.call(
        storage.address, executionID
      ).should.be.fulfilled
      tokenInfo.length.should.be.eq(4)

      hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
      hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
      tokenInfo[2].toNumber().should.be.eq(0)
      tokenInfo[3].toNumber().should.be.eq(0)
    })
  })

  describe('no wei sent', async () => {

    let invalidCalldata

    beforeEach(async () => {
      let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
      initCrowdsaleCalldata.should.not.eq('0x')

      invalidCalldata = await saleUtils.buy().should.be.fulfilled
      invalidCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleAdmin, executionID, initCrowdsaleCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')
    })

    it('should throw', async () => {
      await storage.exec(
        crowdsaleAdmin, executionID, invalidCalldata,
        { from: exec }
      ).should.not.be.fulfilled
    })
  })

  describe('crowdsale is not initialized', async () => {

    let invalidCalldata

    let valueSent = 1000

    beforeEach(async () => {
      // Fast-forward to start time
      await storage.setTime(startTime + 1).should.be.fulfilled
      let storedTime = await storage.set_time.call().should.be.fulfilled
      storedTime.toNumber().should.be.eq(startTime + 1)

      invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
      invalidCalldata.should.not.eq('0x')
    })

    it('should throw', async () => {
      await storage.exec(
        crowdsaleAdmin, executionID, invalidCalldata,
        { from: exec, value: valueSent }
      ).should.not.be.fulfilled
    })
  })

  describe('crowdsale is already finalized', async () => {

    let invalidCalldata

    let valueSent = 1000

    beforeEach(async () => {
      // Fast-forward to start time
      await storage.setTime(startTime + 1).should.be.fulfilled
      let storedTime = await storage.set_time.call().should.be.fulfilled
      storedTime.toNumber().should.be.eq(startTime + 1)

      let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
      initCrowdsaleCalldata.should.not.eq('0x')

      let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
      finalizeCalldata.should.not.eq('0x')

      invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
      invalidCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleAdmin, executionID, initCrowdsaleCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      events = await storage.exec(
        crowdsaleAdmin, executionID, finalizeCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')
    })

    it('should throw', async () => {
      await storage.exec(
        crowdsaleAdmin, executionID, invalidCalldata,
        { from: exec, value: valueSent }
      ).should.not.be.fulfilled
    })
  })

  describe('crowdsale has not started', async () => {

    let invalidCalldata

    let valueSent = 1000

    beforeEach(async () => {
      invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
      invalidCalldata.should.not.eq('0x')
    })

    it('should throw', async () => {
      await storage.exec(
        crowdsaleAdmin, executionID, invalidCalldata,
        { from: exec, value: valueSent }
      ).should.not.be.fulfilled
    })
  })

  describe('crowdsale has already ended', async () => {

    let invalidCalldata

    let valueSent = 1000

    context('current time is beyond end crowdsale time', async () => {

      beforeEach(async () => {
        let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, initCrowdsaleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        await saleIdx.setTime(startTime + initialTierDuration).should.be.fulfilled
        let storedTime = await saleIdx.set_time.call().should.be.fulfilled
        storedTime.toNumber().should.be.eq(startTime + initialTierDuration)

        await storage.setTime(startTime + initialTierDuration).should.be.fulfilled
        storedTime = await storage.set_time.call().should.be.fulfilled
        storedTime.toNumber().should.be.eq(startTime + initialTierDuration)
      })

      it('should throw', async () => {
        await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
          { from: exec, value: valueSent }
        ).should.not.be.fulfilled
      })
    })
  })

  describe('whitelist-enabled-tier', async () => {

    let whitelistTier = 1

    beforeEach(async () => {
      // Create tiers
      let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
        tierNames, tierDurations, tierPrices, tierCaps, tierMins, tierModStats, tierWhitelistStats
      ).should.be.fulfilled
      createTiersCalldata.should.not.eq('0x')

      let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
      initCrowdsaleCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleAdmin, executionID, createTiersCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      let tierListInfo = await saleIdx.getCrowdsaleTierList.call(
        storage.address, executionID
      ).should.be.fulfilled
      tierListInfo.length.should.be.eq(4)

      events = await storage.exec(
        crowdsaleAdmin, executionID, initCrowdsaleCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      // Fast-forward to tier 1 start time (tier 1 is whitelisted)
      await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
      let storedTime = await storage.set_time.call().should.be.fulfilled
      storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

      await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
      storedTime = await saleIdx.set_time.call().should.be.fulfilled
      storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)
    })

    context('sender is not whitelisted', async () => {

      let invalidCalldata

      let valueSent = 1000

      beforeEach(async () => {
        invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
        invalidCalldata.should.not.eq('0x')
      })

      it('should throw', async () => {
        await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
          { from: exec, value: valueSent }
        ).should.not.be.fulfilled
      })
    })

    context('sender is whitelisted', async () => {

      let purchaser = [purchaserList[0]]
      let purchaserMinimum = [100] // Must buy minimum of 100 tokens (tier 1 price is 10 wei/token)
      let purchaserMaximum = [10000] // Can spend maximum of 10000 wei

      beforeEach(async () => {
        let whitelistCalldata = await saleUtils.whitelistMultiForTier.call(
          whitelistTier, purchaser, purchaserMinimum, purchaserMaximum
        ).should.be.fulfilled
        whitelistCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, whitelistCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')
      })

      describe('pre-purchase storage', async () => {

        it('should have correctly whitelisted the purchaser', async () => {
          let whitelistInfo = await saleIdx.getWhitelistStatus.call(
            storage.address, executionID, whitelistTier, purchaser
          ).should.be.fulfilled
          whitelistInfo.length.should.be.eq(2)
          whitelistInfo[0].toNumber().should.be.eq(purchaserMinimum[0])
          whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0])
        })

        it('should have a whitelist of length 1 for the first tier', async () => {
          let tierWhitelistInfo = await saleIdx.getTierWhitelist.call(
            storage.address, executionID, 1
          ).should.be.fulfilled
          tierWhitelistInfo.length.should.be.eq(2)
          tierWhitelistInfo[0].toNumber().should.be.eq(1)
          tierWhitelistInfo[1].length.should.be.eq(1)
          tierWhitelistInfo[1][0].should.be.eq(purchaser[0])
        })

        it('should have 0 unique buyers', async () => {
          let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
            storage.address, executionID
          ).should.be.fulfilled
          uniqueInfo.toNumber().should.be.eq(0)
        })

        it('should correctly store the initial purchaser\'s balance as 0', async () => {
          let balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, purchaser[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(0)
        })

        it('should have the correct amount of wei raised as 0', async () => {
          let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          crowdsaleInfo.length.should.be.eq(4)
          crowdsaleInfo[0].toNumber().should.be.eq(0)
        })
      })

      context('sender has contributed before', async () => {

        let initialSpend = tierPrices[0] * purchaserMinimum[0]

        let paymentEvents
        let paymentReturn

        beforeEach(async () => {
          let spendCalldata = await saleUtils.buy.call().should.be.fulfilled
          spendCalldata.should.not.eq('0x')

          paymentReturn = await storage.exec.call(
            purchaser[0], executionID, spendCalldata,
            { from: exec, value: initialSpend }
          ).should.be.fulfilled

          paymentEvents = await storage.exec(
            purchaser[0], executionID, spendCalldata,
            { from: exec, value: initialSpend }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            paymentReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            paymentReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            paymentReturn[1].toNumber().should.be.eq(1)
          })

          it('should return the correct number of storage slots written to', async () => {
            paymentReturn[2].toNumber().should.be.eq(11)
          })
        })

        describe('events', async () => {

          it('should emit a total of 3 events', async () => {
            paymentEvents.length.should.be.eq(3)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = paymentEvents[2].topics
              eventData = paymentEvents[2].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should list the correct event signature in the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
            })

            it('should have the target app address and execution id as the other 2 topics', async () => {
              let emittedAddr = eventTopics[2]
              let emittedExecId = eventTopics[1]
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })

          describe('the DeliveredPayment event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = paymentEvents[0].topics
              eventData = paymentEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should list the correct event signature in the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
            })

            it('should have the payment destination and execution id as the other 2 topics', async () => {
              let emittedAddr = eventTopics[2]
              let emittedExecId = eventTopics[1]
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have a data field containing the amount sent', async () => {
              web3.toDecimal(eventData).should.be.eq(initialSpend)
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = paymentEvents[1].topics
              eventData = paymentEvents[1].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
            })

            it('should match the current tier index and sender address for the other topics', async () => {
              web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
            })

            it('should contain the number of tokens purchased in the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(purchaserMinimum[0])
            })
          })
        })

        describe('storage', async () => {

          it('should have the correct amount of wei raised', async () => {
            let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            crowdsaleInfo.length.should.be.eq(4)
            crowdsaleInfo[0].toNumber().should.be.eq(initialSpend)
          })

          it('should have 1 unique buyer', async () => {
            let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
              storage.address, executionID
            ).should.be.fulfilled
            uniqueInfo.toNumber().should.be.eq(1)
          })

          it('should correctly store the initial purchaser\'s balance', async () => {
            let balanceInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, purchaser[0]
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(purchaserMinimum[0])
          })

          it('should correctly update the purchaser\'s whitelist information', async () => {
            let whitelistInfo = await saleIdx.getWhitelistStatus.call(
              storage.address, executionID, whitelistTier, purchaser[0]
            ).should.be.fulfilled
            whitelistInfo.length.should.be.eq(2)
            whitelistInfo[0].toNumber().should.be.eq(0)
            whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0] - purchaserMinimum[0])
          })

          it('should correctly update the token total supply', async () => {
            let supplyInfo = await saleIdx.totalSupply.call(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(purchaserMinimum[0])
          })

          it('should correctly update the current tier', async () => {
            let curTierInfo = await saleIdx.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(8)
            hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(1)
            curTierInfo[2].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            curTierInfo[3].toNumber().should.be.eq(tierCaps[0] - purchaserMinimum[0])
            curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
            curTierInfo[5].toNumber().should.be.eq(tierMins[0])
            curTierInfo[6].should.be.eq(tierModStats[0])
            curTierInfo[7].should.be.eq(tierWhitelistStats[0])
          })

          it('should correctly update the total tokens sold', async () => {
            let soldInfo = await saleIdx.getTokensSold.call(
              storage.address, executionID
            ).should.be.fulfilled
            soldInfo.toNumber().should.be.eq(purchaserMinimum[0])
          })
        })

        context('sender is spending over their maximum spend amount', async () => {

          let purchaseCalldata
          let purchaseEvents
          let purchaseReturn

          let sendAmount
          let maxSpendAmount

          beforeEach(async () => {
            sendAmount = (tierPrices[0] * (purchaserMaximum[0] - purchaserMinimum[0])) + tierPrices[0]
            maxSpendAmount = (purchaserMaximum[0] - purchaserMinimum[0]) * tierPrices[0]

            purchaseCalldata = await saleUtils.buy.call().should.be.fulfilled
            purchaseCalldata.should.not.eq('0x')

            // Fast-forward to tier 1 start time (tier 1 is whitelisted)
            await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            let storedTime = await storage.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            storedTime = await saleIdx.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            purchaseReturn = await storage.exec.call(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).should.be.fulfilled

            purchaseEvents = await storage.exec(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              purchaseReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              purchaseReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              purchaseReturn[1].toNumber().should.be.eq(1)
            })

            it('should return the correct number of storage slots written to', async () => {
              purchaseReturn[2].toNumber().should.be.eq(7)
            })
          })

          describe('events', async () => {

            it('should emit a total of 3 events', async () => {
              purchaseEvents.length.should.be.eq(3)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[2].topics
                eventData = purchaseEvents[2].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
              })

              it('should have the target app address and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the DeliveredPayment event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[0].topics
                eventData = purchaseEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
              })

              it('should have the payment destination and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have a data field containing the amount sent', async () => {
                web3.toDecimal(eventData).should.be.eq(maxSpendAmount)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[1].topics
                eventData = purchaseEvents[1].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
              })

              it('should match the exec id, current tier index, and sender address for the other topics', async () => {
                web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
              })

              it('should contain the number of tokens purchased in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(maxSpendAmount / tierPrices[0])
              })
            })
          })

          describe('storage', async () => {

            it('should have the correct amount of wei raised', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)
              crowdsaleInfo[0].toNumber().should.be.eq(initialSpend + maxSpendAmount)
            })

            it('should have 1 unique buyer', async () => {
              let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
                storage.address, executionID
              ).should.be.fulfilled
              uniqueInfo.toNumber().should.be.eq(1)
            })

            it('should correctly store the purchaser\'s balance', async () => {
              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, purchaser[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(
                purchaserMinimum[0] + (maxSpendAmount / tierPrices[0])
              )
            })

            it('should correctly update the purchaser\'s whitelist information', async () => {
              let whitelistInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, whitelistTier, purchaser[0]
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)
              whitelistInfo[0].toNumber().should.be.eq(0)
              whitelistInfo[1].toNumber().should.be.eq(0)
            })

            it('should correctly update the token total supply', async () => {
              let supplyInfo = await saleIdx.totalSupply.call(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(
                purchaserMinimum[0] + (maxSpendAmount / tierPrices[0])
              )
            })

            it('should correctly update the current tier', async () => {
              let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(8)
              hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(1)
              curTierInfo[2].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
              curTierInfo[3].toNumber().should.be.eq(
                tierCaps[0] - (purchaserMinimum[0] + (maxSpendAmount / tierPrices[0]))
              )
              curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
              curTierInfo[5].toNumber().should.be.eq(tierMins[0])
              curTierInfo[6].should.be.eq(tierModStats[0])
              curTierInfo[7].should.be.eq(tierWhitelistStats[0])
            })

            it('should correctly update the total tokens sold', async () => {
              let soldInfo = await saleIdx.getTokensSold.call(
                storage.address, executionID
              ).should.be.fulfilled
              soldInfo.toNumber().should.be.eq(
                purchaserMinimum[0] + (maxSpendAmount / tierPrices[0])
              )
            })
          })

          it('should disallow purchases from the same sender', async () => {
            let invalidAmount = tierPrices[0]

            let invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await storage.exec(
              purchaser[0], executionID, invalidCalldata,
              { from: exec, value: invalidAmount }
            ).should.not.be.fulfilled
          })
        })

        context('sender is not spending over their maximum spend amount', async () => {

          let purchaseCalldata
          let purchaseEvents
          let purchaseReturn

          let sendAmount = tierPrices[0]

          beforeEach(async () => {
            purchaseCalldata = await saleUtils.buy.call().should.be.fulfilled
            purchaseCalldata.should.not.eq('0x')

            // Fast-forward to tier 1 start time (tier 1 is whitelisted)
            await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            let storedTime = await storage.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            storedTime = await saleIdx.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            purchaseReturn = await storage.exec.call(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).should.be.fulfilled

            purchaseEvents = await storage.exec(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              purchaseReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              purchaseReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              purchaseReturn[1].toNumber().should.be.eq(1)
            })

            it('should return the correct number of storage slots written to', async () => {
              purchaseReturn[2].toNumber().should.be.eq(7)
            })
          })

          describe('events', async () => {

            it('should emit a total of 3 events', async () => {
              purchaseEvents.length.should.be.eq(3)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[2].topics
                eventData = purchaseEvents[2].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
              })

              it('should have the target app address and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the DeliveredPayment event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[0].topics
                eventData = purchaseEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
              })

              it('should have the payment destination and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have a data field containing the amount sent', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[1].topics
                eventData = purchaseEvents[1].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
              })

              it('should match the exec id, current tier index, and sender address for the other topics', async () => {
                web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
              })

              it('should contain the number of tokens purchased in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount / tierPrices[0])
              })
            })
          })

          describe('storage', async () => {

            it('should have the correct amount of wei raised', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)
              crowdsaleInfo[0].toNumber().should.be.eq(initialSpend + sendAmount)
            })

            it('should have 1 unique buyer', async () => {
              let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
                storage.address, executionID
              ).should.be.fulfilled
              uniqueInfo.toNumber().should.be.eq(1)
            })

            it('should correctly store the purchaser\'s balance', async () => {
              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, purchaser[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(
                purchaserMinimum[0] + (sendAmount / tierPrices[0])
              )
            })

            it('should correctly update the purchaser\'s whitelist information', async () => {
              let whitelistInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, whitelistTier, purchaser[0]
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)
              whitelistInfo[0].toNumber().should.be.eq(0)
              whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0] - purchaserMinimum[0] - 1)
            })

            it('should correctly update the token total supply', async () => {
              let supplyInfo = await saleIdx.totalSupply.call(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(
                purchaserMinimum[0] + (sendAmount / tierPrices[0])
              )
            })

            it('should correctly update the current tier', async () => {
              let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(8)
              hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(1)
              curTierInfo[2].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
              curTierInfo[3].toNumber().should.be.eq(
                tierCaps[0] - (purchaserMinimum[0] + (sendAmount / tierPrices[0]))
              )
              curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
              curTierInfo[5].toNumber().should.be.eq(tierMins[0])
              curTierInfo[6].should.be.eq(tierModStats[0])
              curTierInfo[7].should.be.eq(tierWhitelistStats[0])
            })

            it('should correctly update the total tokens sold', async () => {
              let soldInfo = await saleIdx.getTokensSold.call(
                storage.address, executionID
              ).should.be.fulfilled
              soldInfo.toNumber().should.be.eq(
                purchaserMinimum[0] + (sendAmount / tierPrices[0])
              )
            })
          })
        })

        context('sender is spending exactly their maximum spend amount', async () => {

          let purchaseCalldata
          let purchaseEvents
          let purchaseReturn

          let sendAmount = tierPrices[0] * (purchaserMaximum[0] - purchaserMinimum[0])

          beforeEach(async () => {
            purchaseCalldata = await saleUtils.buy.call().should.be.fulfilled
            purchaseCalldata.should.not.eq('0x')

            // Fast-forward to tier 1 start time (tier 1 is whitelisted)
            await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            let storedTime = await storage.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            storedTime = await saleIdx.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            purchaseReturn = await storage.exec.call(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).should.be.fulfilled

            purchaseEvents = await storage.exec(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              purchaseReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              purchaseReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              purchaseReturn[1].toNumber().should.be.eq(1)
            })

            it('should return the correct number of storage slots written to', async () => {
              purchaseReturn[2].toNumber().should.be.eq(7)
            })
          })

          describe('events', async () => {

            it('should emit a total of 3 events', async () => {
              purchaseEvents.length.should.be.eq(3)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[2].topics
                eventData = purchaseEvents[2].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
              })

              it('should have the target app address and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the DeliveredPayment event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[0].topics
                eventData = purchaseEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
              })

              it('should have the payment destination and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have a data field containing the amount sent', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[1].topics
                eventData = purchaseEvents[1].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
              })

              it('should match the exec id, current tier index, and sender address for the other topics', async () => {
                web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
              })

              it('should contain the number of tokens purchased in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount / tierPrices[0])
              })
            })
          })

          describe('storage', async () => {

            it('should have the correct amount of wei raised', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)
              crowdsaleInfo[0].toNumber().should.be.eq(purchaserMaximum[0] * tierPrices[0])
            })

            it('should have 1 unique buyer', async () => {
              let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
                storage.address, executionID
              ).should.be.fulfilled
              uniqueInfo.toNumber().should.be.eq(1)
            })

            it('should correctly store the purchaser\'s balance', async () => {
              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, purchaser[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })

            it('should correctly update the purchaser\'s whitelist information', async () => {
              let whitelistInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, whitelistTier, purchaser[0]
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)
              whitelistInfo[0].toNumber().should.be.eq(0)
              whitelistInfo[1].toNumber().should.be.eq(0)
            })

            it('should correctly update the token total supply', async () => {
              let supplyInfo = await saleIdx.totalSupply.call(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })

            it('should correctly update the current tier', async () => {
              let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(8)
              hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(1)
              curTierInfo[2].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
              curTierInfo[3].toNumber().should.be.eq(tierCaps[0] - purchaserMaximum[0])
              curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
              curTierInfo[5].toNumber().should.be.eq(tierMins[0])
              curTierInfo[6].should.be.eq(tierModStats[0])
              curTierInfo[7].should.be.eq(tierWhitelistStats[0])
            })

            it('should correctly update the total tokens sold', async () => {
              let soldInfo = await saleIdx.getTokensSold.call(
                storage.address, executionID
              ).should.be.fulfilled
              soldInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })
          })

          it('should disallow purchases from the same sender', async () => {
            let invalidAmount = tierPrices[0]

            let invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await storage.exec(
              purchaser[0], executionID, invalidCalldata,
              { from: exec, value: invalidAmount }
            ).should.not.be.fulfilled
          })
        })
      })

      context('sender has not contributed before', async () => {

        context('sender is not buying above minimum contribution', async () => {

          let invalidCalldata

          // Sending 1 under the amount required to buy the minimum amount
          let invalidAmount = (purchaserMinimum[0] * tierPrices[0]) - 1

          beforeEach(async () => {
            invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              purchaser[0], executionID, invalidCalldata,
              { from: exec, value: invalidAmount }
            ).should.not.be.fulfilled
          })
        })

        context('sender is buying above minimum contribution', async () => {

          let purchaseCalldata
          let purchaseEvents
          let purchaseReturn

          let sendAmount = purchaserMinimum[0] * tierPrices[0]

          beforeEach(async () => {
            purchaseCalldata = await saleUtils.buy.call().should.be.fulfilled
            purchaseCalldata.should.not.eq('0x')

            // Fast-forward to tier 1 start time (tier 1 is whitelisted)
            await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            let storedTime = await storage.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            storedTime = await saleIdx.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            purchaseReturn = await storage.exec.call(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).should.be.fulfilled

            purchaseEvents = await storage.exec(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              purchaseReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              purchaseReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              purchaseReturn[1].toNumber().should.be.eq(1)
            })

            it('should return the correct number of storage slots written to', async () => {
              purchaseReturn[2].toNumber().should.be.eq(11)
            })
          })

          describe('events', async () => {

            it('should emit a total of 3 events', async () => {
              purchaseEvents.length.should.be.eq(3)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[2].topics
                eventData = purchaseEvents[2].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
              })

              it('should have the target app address and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the DeliveredPayment event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[0].topics
                eventData = purchaseEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
              })

              it('should have the payment destination and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have a data field containing the amount sent', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[1].topics
                eventData = purchaseEvents[1].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
              })

              it('should match the exec id, current tier index, and sender address for the other topics', async () => {
                web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
              })

              it('should contain the number of tokens purchased in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount / tierPrices[0])
              })
            })
          })

          describe('storage', async () => {

            it('should have the correct amount of wei raised', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)
              crowdsaleInfo[0].toNumber().should.be.eq(sendAmount)
            })

            it('should have 1 unique buyer', async () => {
              let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
                storage.address, executionID
              ).should.be.fulfilled
              uniqueInfo.toNumber().should.be.eq(1)
            })

            it('should correctly store the purchaser\'s balance', async () => {
              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, purchaser[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(
                sendAmount / tierPrices[0]
              )
            })

            it('should correctly update the purchaser\'s whitelist information', async () => {
              let whitelistInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, whitelistTier, purchaser[0]
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)
              whitelistInfo[0].toNumber().should.be.eq(0)
              whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0] - purchaserMinimum[0])
            })

            it('should correctly update the token total supply', async () => {
              let supplyInfo = await saleIdx.totalSupply.call(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(purchaserMinimum[0])
            })

            it('should correctly update the current tier', async () => {
              let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(8)
              hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(1)
              curTierInfo[2].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
              curTierInfo[3].toNumber().should.be.eq(tierCaps[0] - purchaserMinimum[0])
              curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
              curTierInfo[5].toNumber().should.be.eq(tierMins[0])
              curTierInfo[6].should.be.eq(tierModStats[0])
              curTierInfo[7].should.be.eq(tierWhitelistStats[0])
            })

            it('should correctly update the total tokens sold', async () => {
              let soldInfo = await saleIdx.getTokensSold.call(
                storage.address, executionID
              ).should.be.fulfilled
              soldInfo.toNumber().should.be.eq(purchaserMinimum[0])
            })
          })
        })

        context('sender is spending over their maximum spend amount', async () => {

          let purchaseCalldata
          let purchaseEvents
          let purchaseReturn

          let sendAmount
          let maxSpendAmount

          beforeEach(async () => {
            sendAmount = (tierPrices[0] * purchaserMaximum[0]) + tierPrices[0]
            maxSpendAmount = tierPrices[0] * purchaserMaximum[0]

            purchaseCalldata = await saleUtils.buy.call().should.be.fulfilled
            purchaseCalldata.should.not.eq('0x')

            // Fast-forward to tier 1 start time (tier 1 is whitelisted)
            await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            let storedTime = await storage.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            storedTime = await saleIdx.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            purchaseReturn = await storage.exec.call(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).should.be.fulfilled

            purchaseEvents = await storage.exec(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              purchaseReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              purchaseReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              purchaseReturn[1].toNumber().should.be.eq(1)
            })

            it('should return the correct number of storage slots written to', async () => {
              purchaseReturn[2].toNumber().should.be.eq(11)
            })
          })

          describe('events', async () => {

            it('should emit a total of 3 events', async () => {
              purchaseEvents.length.should.be.eq(3)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[2].topics
                eventData = purchaseEvents[2].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
              })

              it('should have the target app address and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the DeliveredPayment event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[0].topics
                eventData = purchaseEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
              })

              it('should have the payment destination and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have a data field containing the amount sent', async () => {
                web3.toDecimal(eventData).should.be.eq(maxSpendAmount)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[1].topics
                eventData = purchaseEvents[1].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
              })

              it('should match the exec id, current tier index, and sender address for the other topics', async () => {
                web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
              })

              it('should contain the number of tokens purchased in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(maxSpendAmount / tierPrices[0])
              })
            })
          })

          describe('storage', async () => {

            it('should have the correct amount of wei raised', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)
              crowdsaleInfo[0].toNumber().should.be.eq(maxSpendAmount)
            })

            it('should have 1 unique buyer', async () => {
              let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
                storage.address, executionID
              ).should.be.fulfilled
              uniqueInfo.toNumber().should.be.eq(1)
            })

            it('should correctly store the purchaser\'s balance', async () => {
              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, purchaser[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })

            it('should correctly update the purchaser\'s whitelist information', async () => {
              let whitelistInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, whitelistTier, purchaser[0]
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)
              whitelistInfo[0].toNumber().should.be.eq(0)
              whitelistInfo[1].toNumber().should.be.eq(0)
            })

            it('should correctly update the token total supply', async () => {
              let supplyInfo = await saleIdx.totalSupply.call(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })

            it('should correctly update the current tier', async () => {
              let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(8)
              hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(1)
              curTierInfo[2].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
              curTierInfo[3].toNumber().should.be.eq(
                tierCaps[0] - purchaserMaximum[0]
              )
              curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
              curTierInfo[5].toNumber().should.be.eq(tierMins[0])
              curTierInfo[6].should.be.eq(tierModStats[0])
              curTierInfo[7].should.be.eq(tierWhitelistStats[0])
            })

            it('should correctly update the total tokens sold', async () => {
              let soldInfo = await saleIdx.getTokensSold.call(
                storage.address, executionID
              ).should.be.fulfilled
              soldInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })
          })

          it('should disallow purchases from the same sender', async () => {
            let invalidAmount = tierPrices[0]

            let invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await storage.exec(
              purchaser[0], executionID, invalidCalldata,
              { from: exec, value: invalidAmount }
            ).should.not.be.fulfilled
          })
        })

        context('sender is not spending over their maximum spend amount', async () => {

          let purchaseCalldata
          let purchaseEvents
          let purchaseReturn

          let sendAmount = purchaserMaximum[0] * tierPrices[0]

          beforeEach(async () => {
            purchaseCalldata = await saleUtils.buy.call().should.be.fulfilled
            purchaseCalldata.should.not.eq('0x')

            // Fast-forward to tier 1 start time (tier 1 is whitelisted)
            await storage.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            let storedTime = await storage.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            await saleIdx.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
            storedTime = await saleIdx.set_time.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)

            purchaseReturn = await storage.exec.call(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).should.be.fulfilled

            purchaseEvents = await storage.exec(
              purchaser[0], executionID, purchaseCalldata,
              { from: exec, value: sendAmount }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              purchaseReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              purchaseReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              purchaseReturn[1].toNumber().should.be.eq(1)
            })

            it('should return the correct number of storage slots written to', async () => {
              purchaseReturn[2].toNumber().should.be.eq(11)
            })
          })

          describe('events', async () => {

            it('should emit a total of 3 events', async () => {
              purchaseEvents.length.should.be.eq(3)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[2].topics
                eventData = purchaseEvents[2].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
              })

              it('should have the target app address and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the DeliveredPayment event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[0].topics
                eventData = purchaseEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should list the correct event signature in the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
              })

              it('should have the payment destination and execution id as the other 2 topics', async () => {
                let emittedAddr = eventTopics[2]
                let emittedExecId = eventTopics[1]
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have a data field containing the amount sent', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = purchaseEvents[1].topics
                eventData = purchaseEvents[1].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
              })

              it('should match the exec id, current tier index, and sender address for the other topics', async () => {
                web3.toDecimal(eventTopics[2]).should.be.eq(whitelistTier)
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaser[0]))
              })

              it('should contain the number of tokens purchased in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(sendAmount / tierPrices[0])
              })
            })
          })

          describe('storage', async () => {

            it('should have the correct amount of wei raised', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)
              crowdsaleInfo[0].toNumber().should.be.eq(purchaserMaximum[0] * tierPrices[0])
            })

            it('should have 1 unique buyer', async () => {
              let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
                storage.address, executionID
              ).should.be.fulfilled
              uniqueInfo.toNumber().should.be.eq(1)
            })

            it('should correctly store the purchaser\'s balance', async () => {
              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, purchaser[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })

            it('should correctly update the purchaser\'s whitelist information', async () => {
              let whitelistInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, whitelistTier, purchaser[0]
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)
              whitelistInfo[0].toNumber().should.be.eq(0)
              whitelistInfo[1].toNumber().should.be.eq(0)
            })

            it('should correctly update the token total supply', async () => {
              let supplyInfo = await saleIdx.totalSupply.call(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })

            it('should correctly update the current tier', async () => {
              let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(8)
              hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(1)
              curTierInfo[2].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
              curTierInfo[3].toNumber().should.be.eq(tierCaps[0] - purchaserMaximum[0])
              curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
              curTierInfo[5].toNumber().should.be.eq(tierMins[0])
              curTierInfo[6].should.be.eq(tierModStats[0])
              curTierInfo[7].should.be.eq(tierWhitelistStats[0])
            })

            it('should correctly update the total tokens sold', async () => {
              let soldInfo = await saleIdx.getTokensSold.call(
                storage.address, executionID
              ).should.be.fulfilled
              soldInfo.toNumber().should.be.eq(purchaserMaximum[0])
            })
          })

          it('should disallow purchases from the same sender', async () => {
            let invalidAmount = tierPrices[0]

            let invalidCalldata = await saleUtils.buy.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await storage.exec(
              purchaser[0], executionID, invalidCalldata,
              { from: exec, value: invalidAmount }
            ).should.not.be.fulfilled
          })
        })
      })
    })
  })

  describe('non-whitelist-enabled-tier', async () => {

    let defaultTier = 2

    beforeEach(async () => {
      // Create tiers
      let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
        tierNames, tierDurations, tierPrices, tierCaps, tierMins, tierModStats, tierWhitelistStats
      ).should.be.fulfilled
      createTiersCalldata.should.not.eq('0x')

      let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
      initCrowdsaleCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleAdmin, executionID, createTiersCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      let tierListInfo = await saleIdx.getCrowdsaleTierList.call(
        storage.address, executionID
      ).should.be.fulfilled
      tierListInfo.length.should.be.eq(4)

      events = await storage.exec(
        crowdsaleAdmin, executionID, initCrowdsaleCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      // Fast-forward to tier 2 start time (tier 2 is not whitelisted)
      await storage.setTime(startTime + initialTierDuration + tierDurations[0] + 1).should.be.fulfilled
      let storedTime = await storage.set_time.call().should.be.fulfilled
      storedTime.toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0] + 1)

      await saleIdx.setTime(startTime + initialTierDuration + tierDurations[0] + 1).should.be.fulfilled
      storedTime = await saleIdx.set_time.call().should.be.fulfilled
      storedTime.toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0] + 1)
    })

    context('multiple purchases', async () => {

      let initialSpend = tierPrices[1] * tierMins[1]
      let secondSpend = (tierPrices[1] * tierMins[1]) - 1
      let thirdSpend = tierPrices[1] * tierMins[1] * 1000

      let firstPaymentEvents
      let firstPaymentReturn

      let thirdPaymentEvents
      let thirdPaymentReturn

      beforeEach(async () => {
        let spendCalldata = await saleUtils.buy.call().should.be.fulfilled
        spendCalldata.should.not.eq('0x')

        firstPaymentReturn = await storage.exec.call(
          purchaserList[0], executionID, spendCalldata,
          { from: exec, value: initialSpend }
        ).should.be.fulfilled

        firstPaymentEvents = await storage.exec(
          purchaserList[0], executionID, spendCalldata,
          { from: exec, value: initialSpend }
        ).then((tx) => {
          return tx.receipt.logs
        })

        thirdPaymentReturn = await storage.exec.call(
          purchaserList[1], executionID, spendCalldata,
          { from: exec, value: thirdSpend }
        ).should.be.fulfilled

        thirdPaymentEvents = await storage.exec(
          purchaserList[1], executionID, spendCalldata,
          { from: exec, value: thirdSpend }
        ).then((tx) => {
          return tx.receipt.logs
        })
      })

      it('should throw on the second spend attempt', async () => {
        let spendCalldata = await saleUtils.buy.call().should.be.fulfilled
        spendCalldata.should.not.eq('0x')
        await storage.exec(
          purchaserList[2], executionID, spendCalldata,
          { from: exec, value: secondSpend }
        ).should.not.be.fulfilled
      })

      describe('returned data', async () => {

        describe('first payment', async () => {

          it('should return a tuple with 3 fields', async () => {
            firstPaymentReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            firstPaymentReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            firstPaymentReturn[1].toNumber().should.be.eq(1)
          })

          it('should return the correct number of storage slots written to', async () => {
            firstPaymentReturn[2].toNumber().should.be.eq(9)
          })
        })

        describe('third payment', async () => {

          it('should return a tuple with 3 fields', async () => {
            firstPaymentReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            firstPaymentReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            firstPaymentReturn[1].toNumber().should.be.eq(1)
          })

          it('should return the correct number of storage slots written to', async () => {
            firstPaymentReturn[2].toNumber().should.be.eq(9)
          })
        })
      })

      describe('events', async () => {

        describe('first payment', async () => {

          it('should emit a total of 3 events', async () => {
            firstPaymentEvents.length.should.be.eq(3)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = firstPaymentEvents[2].topics
              eventData = firstPaymentEvents[2].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should list the correct event signature in the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
            })

            it('should have the target app address and execution id as the other 2 topics', async () => {
              let emittedAddr = eventTopics[2]
              let emittedExecId = eventTopics[1]
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })

          describe('the DeliveredPayment event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = firstPaymentEvents[0].topics
              eventData = firstPaymentEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should list the correct event signature in the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
            })

            it('should have the payment destination and execution id as the other 2 topics', async () => {
              let emittedAddr = eventTopics[2]
              let emittedExecId = eventTopics[1]
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have a data field containing the amount sent', async () => {
              web3.toDecimal(eventData).should.be.eq(initialSpend)
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = firstPaymentEvents[1].topics
              eventData = firstPaymentEvents[1].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
            })

            it('should match the exec id, current tier index, and sender address for the other topics', async () => {
              web3.toDecimal(eventTopics[2]).should.be.eq(defaultTier)
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaserList[0]))
            })

            it('should contain the number of tokens purchased in the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(initialSpend / tierPrices[1])
            })
          })
        })

        describe('third payment', async () => {

          it('should emit a total of 3 events', async () => {
            thirdPaymentEvents.length.should.be.eq(3)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = thirdPaymentEvents[2].topics
              eventData = thirdPaymentEvents[2].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should list the correct event signature in the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
            })

            it('should have the target app address and execution id as the other 2 topics', async () => {
              let emittedAddr = eventTopics[2]
              let emittedExecId = eventTopics[1]
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(sale.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })

          describe('the DeliveredPayment event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = thirdPaymentEvents[0].topics
              eventData = thirdPaymentEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should list the correct event signature in the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(payHash))
            })

            it('should have the payment destination and execution id as the other 2 topics', async () => {
              let emittedAddr = eventTopics[2]
              let emittedExecId = eventTopics[1]
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(teamWallet))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have a data field containing the amount sent', async () => {
              web3.toDecimal(eventData).should.be.eq(thirdSpend)
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = thirdPaymentEvents[1].topics
              eventData = thirdPaymentEvents[1].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(purchaseHash))
            })

            it('should match the exec id, current tier index, and sender address for the other topics', async () => {
              web3.toDecimal(eventTopics[2]).should.be.eq(defaultTier)
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(purchaserList[1]))
            })

            it('should contain the number of tokens purchased in the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(thirdSpend / tierPrices[1])
            })
          })
        })
      })

      describe('storage', async () => {

        it('should have the correct amount of wei raised', async () => {
          let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          crowdsaleInfo.length.should.be.eq(4)
          crowdsaleInfo[0].toNumber().should.be.eq(initialSpend + thirdSpend)
        })

        it('should have 2 unique buyers', async () => {
          let uniqueInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(
            storage.address, executionID
          ).should.be.fulfilled
          uniqueInfo.toNumber().should.be.eq(2)
        })

        it('should correctly store the initial purchasers\' balance', async () => {
          let balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, purchaserList[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(initialSpend / tierPrices[1])

          balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, purchaserList[1]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(thirdSpend / tierPrices[1])
        })

        it('should correctly update the token total supply', async () => {
          let supplyInfo = await saleIdx.totalSupply.call(
            storage.address, executionID
          ).should.be.fulfilled
          supplyInfo.toNumber().should.be.eq(
            (initialSpend / tierPrices[1]) + (thirdSpend / tierPrices[1])
          )
        })

        it('should correctly update the current tier', async () => {
          let curTierInfo = await saleIdx.getCurrentTierInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          curTierInfo.length.should.be.eq(8)
          hexStrEquals(curTierInfo[0], tierNames[1]).should.be.eq(true)
          curTierInfo[1].toNumber().should.be.eq(defaultTier)
          curTierInfo[2].toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
          )
          curTierInfo[3].toNumber().should.be.eq(
            tierCaps[1] - (
              (initialSpend / tierPrices[1]) + (thirdSpend / tierPrices[1])
            )
          )
          curTierInfo[4].toNumber().should.be.eq(tierPrices[1])
          curTierInfo[5].toNumber().should.be.eq(tierMins[1])
          curTierInfo[6].should.be.eq(tierModStats[1])
          curTierInfo[7].should.be.eq(tierWhitelistStats[1])
        })

        it('should correctly update the total tokens sold', async () => {
          let soldInfo = await saleIdx.getTokensSold.call(
            storage.address, executionID
          ).should.be.fulfilled
          soldInfo.toNumber().should.be.eq(
            (initialSpend / tierPrices[1]) + (thirdSpend / tierPrices[1])
          )
        })
      })
    })
  })
})
