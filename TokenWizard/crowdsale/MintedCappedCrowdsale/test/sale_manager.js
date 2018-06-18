// Abstract storage contract
let AbstractStorage = artifacts.require('./StorageMock')
// MintedCappedCrowdsale
let Token = artifacts.require('./Token')
let Sale = artifacts.require('./Sale')
let TokenManager = artifacts.require('./TokenManager')
let SaleManager = artifacts.require('./SaleManagerMock')
let MintedCapped = artifacts.require('./MintedCappedIdxMock')
// Registry
let RegistryUtil = artifacts.require('./RegistryUtil')
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// Util
let MintedCappedUtils = artifacts.require('./MintedCappedUtils')

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

contract('#MintedCappedSaleManager', function (accounts) {

  let storage

  let exec = accounts[0]
  let crowdsaleAdmin = accounts[1]
  let teamWallet = accounts[2]
  let otherAddress = accounts[accounts.length - 1]

  let regExecID
  let regUtil
  let regProvider
  let regIdx

  let saleIdx
  let token
  let sale
  let tokenManager
  let saleManager

  let saleUtils
  let saleAddrs
  let saleSelectors

  let executionID

  let appName = 'MintedCappedCrowdsale'

  let initCalldata
  let startTime
  let initialTierName = 'Initial Tier'
  let initialTierPrice = web3.toWei('0.001', 'ether') // 1e15 wei per 1e18 tokens
  let initialTierDuration = 3600 // 1 hour
  let initialTierTokenSellCap = web3.toWei('1000', 'ether') // 1000 (e18) tokens for sale
  let initialTierIsWhitelisted = true
  let initialTierDurIsModifiable = true

  let tokenName = 'Token'
  let tokenSymbol = 'TOK'
  let tokenDecimals = 18

  // Event signatures
  let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
  let finalHash = web3.sha3('ApplicationFinalization(bytes32,address)')
  let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
  let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')

  let initTokenHash = web3.sha3('TokenConfigured(bytes32,bytes32,bytes32,uint256)')
  let updateMinHash = web3.sha3('TierMinUpdate(bytes32,uint256,uint256)')
  let timeUpdateHash = web3.sha3('CrowdsaleTimeUpdated(bytes32)')
  let initSaleHash = web3.sha3('CrowdsaleConfigured(bytes32,bytes32,uint256)')
  let finalSaleHash = web3.sha3('CrowdsaleFinalized(bytes32)')
  let tiersAddedHash = web3.sha3('CrowdsaleTiersAdded(bytes32,uint256)')

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    saleUtils = await MintedCappedUtils.new().should.be.fulfilled

    regUtil = await RegistryUtil.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    saleIdx = await MintedCapped.new().should.be.fulfilled
    token = await Token.new().should.be.fulfilled
    sale = await Sale.new().should.be.fulfilled
    tokenManager = await TokenManager.new().should.be.fulfilled
    saleManager = await SaleManager.new().should.be.fulfilled

    saleUtils = await MintedCappedUtils.new().should.be.fulfilled
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
      initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
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
  })

  describe('#initCrowdsaleToken', async () => {

    let initTokenCalldata
    let initTokenEvents
    let initTokenReturn

    describe('crowdsale storage with no initialized token', async () => {

      it('should not have information about the token', async () => {
        let tokenInfo = await saleIdx.getTokenInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        tokenInfo.length.should.be.eq(4)

        web3.toDecimal(tokenInfo[0]).should.be.eq(0)
        web3.toDecimal(tokenInfo[1]).should.be.eq(0)
        tokenInfo[2].toNumber().should.be.eq(0)
        tokenInfo[3].toNumber().should.be.eq(0)
      })

      it('should not have values for maximum raise amount', async () => {
        let raiseInfo = await saleIdx.getCrowdsaleMaxRaise.call(
          storage.address, executionID
        ).should.be.fulfilled
        raiseInfo.length.should.be.eq(2)

        raiseInfo[0].toNumber().should.be.eq(0)
        raiseInfo[1].toNumber().should.be.eq(0)
      })

      it('should not have an initialized crowdsale', async () => {
        let saleInfo = await saleIdx.getCrowdsaleInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        saleInfo.length.should.be.eq(4)

        saleInfo[0].toNumber().should.be.eq(0)
        saleInfo[1].should.be.eq(teamWallet)
        saleInfo[2].should.be.eq(false)
        saleInfo[3].should.be.eq(false)
      })
    })

    context('when the token is initialized with an invalid parameter', async () => {

      let invalidCalldata

      context('such as an invalid name', async () => {

        let invalidName = ''

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            invalidName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as an invalid symbol', async () => {

        let invalidSymbol = ''

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, invalidSymbol, tokenDecimals
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as an invalid decimal count', async () => {

        let invalidDecimals = 19

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, invalidDecimals
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the token is initialized with valid parameters', async () => {

      context('when the sender is the admin', async () => {

        beforeEach(async () => {
          initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          initTokenReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).should.be.fulfilled

          initTokenEvents = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            initTokenReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            initTokenReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            initTokenReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            initTokenReturn[2].toNumber().should.be.eq(3)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            initTokenEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = initTokenEvents[1].topics
              eventData = initTokenEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenManager.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              eventData.should.be.eq('0x0')
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = initTokenEvents[0].topics
              eventData = initTokenEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(4)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(initTokenHash))
            })

            it('should match the exec id, token name, and token symbol for the other topics', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
              hexStrEquals(eventTopics[2], tokenName).should.be.eq(true)
              hexStrEquals(eventTopics[3], tokenSymbol).should.be.eq(true)
            })

            it('should contain the number of decimals as the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(tokenDecimals)
            })
          })
        })

        describe('storage', async () => {

          describe('token', async () => {

            let tokenInfo

            beforeEach(async () => {
              tokenInfo = await saleIdx.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.should.not.eq(null)
              tokenInfo.length.should.be.eq(4)
            })

            it('should match the set name', async () => {
              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            })

            it('should match the set symbol', async () => {
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            })

            it('should match the set decimal count', async () => {
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            })

            it('should have a total supply of 0', async () => {
              tokenInfo[3].toNumber().should.be.eq(0)
            })
          })

          describe('crowdsale', async () => {

            it('should have valid raise information', async () => {
              let raiseInfo = await saleIdx.getCrowdsaleMaxRaise.call(
                storage.address, executionID
              ).should.be.fulfilled
              raiseInfo.length.should.be.eq(2)

              let price = web3.toBigNumber(initialTierPrice).toNumber()
              let supply = web3.toBigNumber(initialTierTokenSellCap).toNumber()
              raiseInfo[0].toNumber().should.be.eq(
                 (price * supply) / (10 ** tokenDecimals)
              )
              web3.fromWei(raiseInfo[1].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            })
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            exec, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })
  })

  describe('#updateTierMinimum', async () => {

    let updateTo = web3.toWei('1', 'ether')
    let updateToZero = 0

    let updateTierCalldata
    let updateTierEvent
    let updateTierReturn

    // Tiers are created with the following information:
    let tierNames = ['Tier 1', 'Tier 2']
    let tierDurations = [1000, 2000]
    let tierPrices = [
      web3.toWei('0.1', 'ether'),
      web3.toWei('0.2', 'ether')
    ]
    let tierCaps = [
      web3.toWei('10', 'ether'),
      web3.toWei('20', 'ether')
    ]
    let tierAllModifiable = [true, true]
    let tierMixedModifiable = [false, true]
    let multiTierWhitelistStat = [true, false]

    // After creation of tiers, crowdsale should end at this time:
    let initialEndTime

    beforeEach(async () => {
      initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

      let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
        tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
        multiTierWhitelistStat
      ).should.be.fulfilled
      createTiersCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleAdmin, executionID, createTiersCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      // Check start and end time
      let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
        storage.address, executionID
      ).should.be.fulfilled
      timeInfo.length.should.be.eq(2)
      timeInfo[0].toNumber().should.be.eq(startTime)
      timeInfo[1].toNumber().should.be.eq(initialEndTime)
    })

    describe('crowdsale storage - pre tier updates', async () => {

      it('should match the set admin address', async () => {
        let adminInfo = await saleIdx.getAdmin.call(
          storage.address, executionID
        ).should.be.fulfilled
        adminInfo.should.be.eq(crowdsaleAdmin)
      })

      it('should have correctly set start and end times for the crowdsale', async () => {
        let saleDates = await saleIdx.getCrowdsaleStartAndEndTimes.call(
          storage.address, executionID
        ).should.be.fulfilled
        saleDates.length.should.be.eq(2)

        saleDates[0].toNumber().should.be.eq(startTime)
        saleDates[1].toNumber().should.be.eq(
          startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
        )
      })

      it('should currently be tier 0', async () => {
        let curTierInfo = await saleIdx.getCurrentTierInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        curTierInfo.length.should.be.eq(8)

        hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
        curTierInfo[1].toNumber().should.be.eq(0)
        curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
        web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
        web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
        curTierInfo[5].toNumber().should.be.eq(0)
        curTierInfo[6].should.be.eq(true)
        curTierInfo[7].should.be.eq(true)
      })

      it('should currently have 3 tiers', async () => {
        let tiersInfo = await saleIdx.getCrowdsaleTierList.call(
          storage.address, executionID
        ).should.be.fulfilled
        tiersInfo.length.should.be.eq(3)

        hexStrEquals(tiersInfo[0], initialTierName).should.be.eq(true)
        hexStrEquals(tiersInfo[1], tierNames[0]).should.be.eq(true)
        hexStrEquals(tiersInfo[2], tierNames[1]).should.be.eq(true)
      })

      it('should have the correct start and end dates for each tier', async () => {
        let tierOneDates = await saleIdx.getTierStartAndEndDates.call(
          storage.address, executionID, 0
        ).should.be.fulfilled
        tierOneDates.length.should.be.eq(2)

        let tierTwoDates = await saleIdx.getTierStartAndEndDates.call(
          storage.address, executionID, 1
        ).should.be.fulfilled
        tierTwoDates.length.should.be.eq(2)

        let tierThreeDates = await saleIdx.getTierStartAndEndDates.call(
          storage.address, executionID, 2
        ).should.be.fulfilled
        tierThreeDates.length.should.be.eq(2)

        tierOneDates[0].toNumber().should.be.eq(startTime)
        tierOneDates[1].toNumber().should.be.eq(startTime + initialTierDuration)
        tierOneDates[1].toNumber().should.be.eq(tierTwoDates[0].toNumber())
        tierTwoDates[1].toNumber().should.be.eq(
          startTime + initialTierDuration + tierDurations[0]
        )
        tierTwoDates[1].toNumber().should.be.eq(tierThreeDates[0].toNumber())
        tierThreeDates[1].toNumber().should.be.eq(
          startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
        )
      })
    })

    context('when the tier to update is a previous tier', async () => {

      let invalidCalldata

      context('such as tier 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierMinimum.call(
            0, updateTo
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await storage.setTime(startTime + initialTierDuration).should.be.fulfilled
          let storedTime = await storage.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(startTime + initialTierDuration)
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as not tier 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierMinimum.call(
            1, updateTo
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await storage.setTime(startTime + initialTierDuration + tierDurations[0]).should.be.fulfilled
          let storedTime = await storage.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0])
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the tier to update is the current tier', async () => {

      context('and the current tier is tier 0', async () => {

        context('and the sale has started', async () => {

          let invalidCalldata

          beforeEach(async () => {
            invalidCalldata = await saleUtils.updateTierMinimum.call(
              0, updateTo
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await storage.setTime(startTime + 1).should.be.fulfilled
            let storedTime = await storage.getTime.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime + 1)
          })

          it('should throw', async () => {
            await storage.exec(
              crowdsaleAdmin, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })

        context('and the sale has not started', async () => {

          context('and tier 0 is not modifiable', async () => {

            let invalidCalldata

            let initTierDurMod = false
            let noModStartTime
            let noModExecID

            beforeEach(async () => {
              // Initialize a new crowdsale application through storage with a non-modifiable first tier
              noModStartTime = getTime() + 3600

              let noModInitCalldata = await saleUtils.init.call(
                teamWallet, noModStartTime, initialTierName, initialTierPrice,
                initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
                initTierDurMod, crowdsaleAdmin
              ).should.be.fulfilled
              noModInitCalldata.should.not.eq('0x')

              let events = await storage.createInstance(
                exec, appName, exec, regExecID, noModInitCalldata,
                { from: exec }
              ).should.be.fulfilled.then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              noModExecID = events[0].args['execution_id']
              web3.toDecimal(noModExecID).should.not.eq(0)

              initialEndTime = noModStartTime + initialTierDuration + tierDurations[0] + tierDurations[1]

              // Create tiers for the initialized crowdsale
              let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
                tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
                multiTierWhitelistStat
              ).should.be.fulfilled
              createTiersCalldata.should.not.eq('0x')

              events = await storage.exec(
                crowdsaleAdmin, noModExecID, createTiersCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              // Check start and end time
              let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
                storage.address, noModExecID
              ).should.be.fulfilled
              timeInfo.length.should.be.eq(2)
              timeInfo[0].toNumber().should.be.eq(noModStartTime)
              timeInfo[1].toNumber().should.be.eq(initialEndTime)

              // Attempt to update tier 0's duration
              invalidCalldata = await saleUtils.updateTierMinimum.call(
                0, updateTo
              ).should.be.fulfilled
              invalidCalldata.should.not.eq('0x')
            })

            it('should throw', async () => {
              await storage.exec(
                crowdsaleAdmin, noModExecID, invalidCalldata,
                { from: exec }
              ).should.not.be.fulfilled
            })
          })

          context('and tier 0 is modifiable', async () => {

            let updateMinEvents

            beforeEach(async () => {
              updateTierCalldata = await saleUtils.updateTierMinimum.call(
                0, updateTo
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              await storage.resetTime().should.be.fulfilled
              let storedTime = await storage.set_time.call().should.be.fulfilled
              storedTime.toNumber().should.be.eq(0)

              updateTierReturn = await storage.exec.call(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateMinEvents = await storage.exec(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })
            })

            describe('returned data', async () => {

              it('should return a tuple with 3 fields', async () => {
                updateTierReturn.length.should.be.eq(3)
              })

              it('should return the correct number of events emitted', async () => {
                updateTierReturn[0].toNumber().should.be.eq(1)
              })

              it('should return the correct number of addresses paid', async () => {
                updateTierReturn[1].toNumber().should.be.eq(0)
              })

              it('should return the correct number of storage slots written to', async () => {
                updateTierReturn[2].toNumber().should.be.eq(1)
              })
            })

            describe('events', async () => {

              it('should have emitted 2 events total', async () => {
                updateMinEvents.length.should.be.eq(2)
              })

              describe('the ApplicationExecution event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = updateMinEvents[1].topics
                  eventData = updateMinEvents[1].data
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
                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
                  web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
                })

                it('should have an empty data field', async () => {
                  web3.toDecimal(eventData).should.be.eq(0)
                })
              })

              describe('the other event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = updateMinEvents[0].topics
                  eventData = updateMinEvents[0].data
                })

                it('should have the correct number of topics', async () => {
                  eventTopics.length.should.be.eq(3)
                })

                it('should match the event signature for the first topic', async () => {
                  let sig = eventTopics[0]
                  web3.toDecimal(sig).should.be.eq(web3.toDecimal(updateMinHash))
                })

                it('should match the exec id and tier index for the other topics', async () => {
                  web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                  web3.toDecimal(eventTopics[2]).should.be.eq(0)
                })

                it('should match the updated tier minimum in the data field', async () => {
                  eventData.should.be.bignumber.eq(updateTo)
                })
              })
            })

            describe('storage', async () => {

              it('should have correctly update the tier min cap', async () => {
                let tierInfo = await saleIdx.getCrowdsaleTier.call(
                  storage.address, executionID, 0
                ).should.be.fulfilled
                tierInfo.length.should.be.eq(7)

                hexStrEquals(tierInfo[0], "Initial Tier").should.be.eq(true, web3.toAscii(tierInfo[0]))
                tierInfo[1].should.be.bignumber.eq(initialTierTokenSellCap)
                tierInfo[2].should.be.bignumber.eq(initialTierPrice)
                tierInfo[3].should.be.bignumber.eq(updateTo)
                tierInfo[4].toNumber().should.be.eq(initialTierDuration)
                tierInfo[5].should.be.eq(true)
                tierInfo[5].should.be.eq(true)
              })
            })
          })
        })
      })

      context('and the current tier is not tier 0', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierMinimum.call(
            2, updateTo
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await storage.setTime(
            startTime + initialTierDuration + tierDurations[0] + (tierDurations[1] / 2)
          ).should.be.fulfilled
          let storedTime = await storage.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + (tierDurations[1] / 2)
          )
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the sender is not the admin', async () => {

      let invalidCalldata

      beforeEach(async () => {
        invalidCalldata = await saleUtils.updateTierMinimum.call(
          2, updateTo
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')
      })

      it('should throw', async () => {
        await storage.exec(
          exec, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })
    })

    context('when the sender is the admin', async () => {

      let updateMinEvents

      beforeEach(async () => {
        updateTierCalldata = await saleUtils.updateTierMinimum.call(
          2, updateTo
        ).should.be.fulfilled
        updateTierCalldata.should.not.eq('0x')

        updateTierReturn = await storage.exec.call(
          crowdsaleAdmin, executionID, updateTierCalldata,
          { from: exec }
        ).should.be.fulfilled

        updateMinEvents = await storage.exec(
          crowdsaleAdmin, executionID, updateTierCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.receipt.logs
        })
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          updateTierReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          updateTierReturn[0].toNumber().should.be.eq(1)
        })

        it('should return the correct number of addresses paid', async () => {
          updateTierReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          updateTierReturn[2].toNumber().should.be.eq(1)
        })
      })

      describe('events', async () => {

        it('should have emitted 2 events total', async () => {
          updateMinEvents.length.should.be.eq(2)
        })

        describe('the ApplicationExecution event', async () => {

          let eventTopics
          let eventData

          beforeEach(async () => {
            eventTopics = updateMinEvents[1].topics
            eventData = updateMinEvents[1].data
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
            web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
            web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
          })

          it('should have an empty data field', async () => {
            web3.toDecimal(eventData).should.be.eq(0)
          })
        })

        describe('the other event', async () => {

          let eventTopics
          let eventData

          beforeEach(async () => {
            eventTopics = updateMinEvents[0].topics
            eventData = updateMinEvents[0].data
          })

          it('should have the correct number of topics', async () => {
            eventTopics.length.should.be.eq(3)
          })

          it('should match the event signature for the first topic', async () => {
            let sig = eventTopics[0]
            web3.toDecimal(sig).should.be.eq(web3.toDecimal(updateMinHash))
          })

          it('should match the exec id and tier index for the other topics', async () => {
            web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
            web3.toDecimal(eventTopics[2]).should.be.eq(2)
          })

          it('should match the updated tier minimum in the data field', async () => {
            eventData.should.be.bignumber.eq(updateTo)
          })
        })
      })

      describe('storage', async () => {

        it('should have correctly update the tier min cap', async () => {
          let tierInfo = await saleIdx.getCrowdsaleTier.call(
            storage.address, executionID, 2
          ).should.be.fulfilled
          tierInfo.length.should.be.eq(7)

          hexStrEquals(tierInfo[0], "Tier 2").should.be.eq(true, web3.toAscii(tierInfo[0]))
          tierInfo[1].should.be.bignumber.eq(tierCaps[1])
          tierInfo[2].should.be.bignumber.eq(tierPrices[1])
          tierInfo[3].should.be.bignumber.eq(updateTo)
          tierInfo[4].toNumber().should.be.eq(tierDurations[1])
          tierInfo[5].should.be.eq(true)
          tierInfo[5].should.be.eq(true)
        })
      })
    })
  })

  describe('#createCrowdsaleTiers', async () => {

    let updateTierCalldata
    let updateTierEvent
    let updateTierReturn

    let singleTierNames = ['Tier 1']
    let singleTierDuration = [3600]
    let singleTierPrice = [web3.toWei('0.001', 'ether')]
    let singleTierCap = [web3.toWei('100', 'ether')]
    let singleTierModStatus = [true]
    let singleTierWhitelistStat = [true]

    let multiTierNames = ['Tier A', 'Tier B', 'Tier C']
    let multiTierDurations = [1000, 2000, 3000]
    let multiTierPrices = [
      web3.toWei('0.1', 'ether'),
      web3.toWei('0.2', 'ether'),
      web3.toWei('0.3', 'ether')
    ]
    let multiTierCaps = [
      web3.toWei('10', 'ether'),
      web3.toWei('20', 'ether'),
      web3.toWei('30', 'ether')
    ]
    let multiTierModStatus = [false, false, true]
    let multiTierWhitelistStat = [true, true, false]

    context('when the admin attempts to create tiers with invalid input parameters', async () => {

      let invalidCalldata

      context('such as mismatched input lengths', async () => {

        let invalidTierPrices = [web3.toWei('0.001', 'ether'), web3.toWei('0.005', 'ether')]

        beforeEach(async () => {
          invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, invalidTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as inputs of length 0', async () => {

        let invalidNames = []

        beforeEach(async () => {
          invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
            invalidNames, multiTierDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as an input tier sell cap of 0', async () => {

        let invalidTierCaps = [
          web3.toWei('10', 'ether'),
          0,
          web3.toWei('30', 'ether')
        ]

        beforeEach(async () => {
          invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, multiTierPrices,
            invalidTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as an input tier duration of 0', async () => {

        let invalidDurations = [0, 2000, 3000]

        beforeEach(async () => {
          invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
            multiTierNames, invalidDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as an input tier price of 0', async () => {

        let invalidPrices = [
          web3.toWei('0.1', 'ether'),
          web3.toWei('0.2', 'ether'),
          0
        ]

        beforeEach(async () => {
          invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, invalidPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the input parameters are valid', async () => {

      context('when the crowdsale is already initialized', async () => {

        let invalidCalldata

        beforeEach(async () => {
          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
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

      context('when the crowdsale is not yet initialized', async () => {

        context('when the sender is the admin', async () => {

          context('and wants to add a single tier', async () => {

            beforeEach(async () => {
              updateTierCalldata = await saleUtils.createCrowdsaleTiers.call(
                singleTierNames, singleTierDuration, singleTierPrice,
                singleTierCap, singleTierModStatus, singleTierWhitelistStat
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              updateTierReturn = await storage.exec.call(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateTierEvents = await storage.exec(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })
            })

            describe('returned data', async () => {

              it('should return a tuple with 3 fields', async () => {
                updateTierReturn.length.should.be.eq(3)
              })

              it('should return the correct number of events emitted', async () => {
                updateTierReturn[0].toNumber().should.be.eq(1)
              })

              it('should return the correct number of addresses paid', async () => {
                updateTierReturn[1].toNumber().should.be.eq(0)
              })

              it('should return the correct number of storage slots written to', async () => {
                updateTierReturn[2].toNumber().should.be.eq(8)
              })
            })

            describe('events', async () => {

              it('should have emitted 2 events total', async () => {
                updateTierEvents.length.should.be.eq(2)
              })

              describe('the ApplicationExecution event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = updateTierEvents[1].topics
                  eventData = updateTierEvents[1].data
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
                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
                  web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
                })

                it('should have an empty data field', async () => {
                  eventData.should.be.eq('0x0')
                })
              })

              describe('the other event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = updateTierEvents[0].topics
                  eventData = updateTierEvents[0].data
                })

                it('should have the correct number of topics', async () => {
                  eventTopics.length.should.be.eq(2)
                })

                it('should match the event signature for the first topic', async () => {
                  let sig = eventTopics[0]
                  web3.toDecimal(sig).should.be.eq(web3.toDecimal(tiersAddedHash))
                })

                it('should match the exec id for the other topic', async () => {
                  web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                })

                it('should match the new total number of tiers for the data field', async () => {
                  web3.toDecimal(eventData).should.be.eq(2)
                })
              })
            })

            describe('storage', async () => {

              it('should have an updated end time', async () => {
                let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
                  storage.address, executionID
                ).should.be.fulfilled
                timeInfo.length.should.be.eq(2)

                timeInfo[0].toNumber().should.be.eq(startTime)
                timeInfo[1].toNumber().should.be.eq(
                  startTime + initialTierDuration + singleTierDuration[0]
                )
              })

              it('should currently be tier 0', async () => {
                let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                  storage.address, executionID
                ).should.be.fulfilled
                curTierInfo.length.should.be.eq(8)

                hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
                curTierInfo[1].toNumber().should.be.eq(0)
                curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
                web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
                curTierInfo[5].toNumber().should.be.eq(0)
                curTierInfo[6].should.be.eq(initialTierDurIsModifiable)
                curTierInfo[7].should.be.eq(initialTierIsWhitelisted)
              })

              it('should return valid information about tier 1', async () => {
                let tierOneInfo = await saleIdx.getCrowdsaleTier.call(
                  storage.address, executionID, 1
                ).should.be.fulfilled
                tierOneInfo.length.should.be.eq(7)

                hexStrEquals(tierOneInfo[0], singleTierNames[0]).should.be.eq(true)
                web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(singleTierCap[0])
                web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(singleTierPrice[0])
                tierOneInfo[3].toNumber().should.be.eq(0)
                tierOneInfo[4].toNumber().should.be.eq(singleTierDuration[0])
                tierOneInfo[5].should.be.eq(singleTierModStatus[0])
                tierOneInfo[6].should.be.eq(singleTierWhitelistStat[0])
              })

              it('should have a tier list of length 2', async () => {
                let tierListInfo = await saleIdx.getCrowdsaleTierList.call(
                  storage.address, executionID
                ).should.be.fulfilled
                tierListInfo.length.should.be.eq(2)
                hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
                hexStrEquals(tierListInfo[1], singleTierNames[0]).should.be.eq(true)
              })
            })
          })

          context('and wants to add multiple tiers', async () => {

            beforeEach(async () => {
              updateTierCalldata = await saleUtils.createCrowdsaleTiers.call(
                multiTierNames, multiTierDurations, multiTierPrices,
                multiTierCaps, multiTierModStatus, multiTierWhitelistStat
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              updateTierReturn = await storage.exec.call(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateTierEvents = await storage.exec(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })
            })

            describe('returned data', async () => {

              it('should return a tuple with 3 fields', async () => {
                updateTierReturn.length.should.be.eq(3)
              })

              it('should return the correct number of events emitted', async () => {
                updateTierReturn[0].toNumber().should.be.eq(1)
              })

              it('should return the correct number of addresses paid', async () => {
                updateTierReturn[1].toNumber().should.be.eq(0)
              })

              it('should return the correct number of storage slots written to', async () => {
                updateTierReturn[2].toNumber().should.be.eq(20)
              })
            })

            describe('events', async () => {

              it('should have emitted 2 events total', async () => {
                updateTierEvents.length.should.be.eq(2)
              })

              describe('the ApplicationExecution event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = updateTierEvents[1].topics
                  eventData = updateTierEvents[1].data
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
                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
                  web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
                })

                it('should have an empty data field', async () => {
                  eventData.should.be.eq('0x0')
                })
              })

              describe('the other event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = updateTierEvents[0].topics
                  eventData = updateTierEvents[0].data
                })

                it('should have the correct number of topics', async () => {
                  eventTopics.length.should.be.eq(2)
                })

                it('should match the event signature for the first topic', async () => {
                  let sig = eventTopics[0]
                  web3.toDecimal(sig).should.be.eq(web3.toDecimal(tiersAddedHash))
                })

                it('should match the exec id for the other topic', async () => {
                  web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                })

                it('should match the new total number of tiers for the data field', async () => {
                  web3.toDecimal(eventData).should.be.eq(4)
                })
              })
            })

            describe('storage', async () => {

              it('should have an updated end time', async () => {
                let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
                  storage.address, executionID
                ).should.be.fulfilled
                timeInfo.length.should.be.eq(2)

                timeInfo[0].toNumber().should.be.eq(startTime)
                timeInfo[1].toNumber().should.be.eq(
                  startTime + initialTierDuration + multiTierDurations[0]
                  + multiTierDurations[1] + multiTierDurations[2]
                )
              })

              it('should currently be tier 0', async () => {
                let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                  storage.address, executionID
                ).should.be.fulfilled
                curTierInfo.length.should.be.eq(8)

                hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
                curTierInfo[1].toNumber().should.be.eq(0)
                curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
                web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
                curTierInfo[5].toNumber().should.be.eq(0)
                curTierInfo[6].should.be.eq(initialTierDurIsModifiable)
                curTierInfo[7].should.be.eq(initialTierIsWhitelisted)
              })

              describe('Tier A (First added tier)', async () => {

                it('should return valid information about tier 1', async () => {
                  let tierOneInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneInfo.length.should.be.eq(7)

                  hexStrEquals(tierOneInfo[0], multiTierNames[0]).should.be.eq(true)
                  web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[0])
                  web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[0])
                  tierOneInfo[3].toNumber().should.be.eq(0)
                  tierOneInfo[4].toNumber().should.be.eq(multiTierDurations[0])
                  tierOneInfo[5].should.be.eq(multiTierModStatus[0])
                  tierOneInfo[6].should.be.eq(multiTierWhitelistStat[0])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierOneTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneTimeInfo.should.not.eq('0x')
                  tierOneTimeInfo.length.should.be.eq(2)

                  tierOneTimeInfo[0].toNumber().should.be.eq(startTime + initialTierDuration)
                  tierOneTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                  )
                })
              })

              describe('Tier B (Second added tier)', async () => {

                it('should return valid information about tier 2', async () => {

                  let tierTwoInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoInfo.length.should.be.eq(7)

                  hexStrEquals(tierTwoInfo[0], multiTierNames[1]).should.be.eq(true)
                  web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[1])
                  web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[1])
                  tierTwoInfo[3].toNumber().should.be.eq(0)
                  tierTwoInfo[4].toNumber().should.be.eq(multiTierDurations[1])
                  tierTwoInfo[5].should.be.eq(multiTierModStatus[1])
                  tierTwoInfo[6].should.be.eq(multiTierWhitelistStat[1])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierTwoTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoTimeInfo.should.not.eq('0x')
                  tierTwoTimeInfo.length.should.be.eq(2)

                  tierTwoTimeInfo[0].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                  )
                  tierTwoTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1]
                  )
                })
              })

              describe('Tier C (Third added tier)', async () => {

                it('should return valid information about tier 3', async () => {

                  let tierThreeInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 3
                  ).should.be.fulfilled
                  tierThreeInfo.length.should.be.eq(7)

                  hexStrEquals(tierThreeInfo[0], multiTierNames[2]).should.be.eq(true)
                  web3.fromWei(tierThreeInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[2])
                  web3.fromWei(tierThreeInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[2])
                  tierThreeInfo[3].toNumber().should.be.eq(0)
                  tierThreeInfo[4].toNumber().should.be.eq(multiTierDurations[2])
                  tierThreeInfo[5].should.be.eq(multiTierModStatus[2])
                  tierThreeInfo[6].should.be.eq(multiTierWhitelistStat[2])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierThreeTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 3
                  ).should.be.fulfilled
                  tierThreeTimeInfo.should.not.eq('0x')
                  tierThreeTimeInfo.length.should.be.eq(2)

                  tierThreeTimeInfo[0].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1]
                  )
                  tierThreeTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1] + multiTierDurations[2]
                  )
                })
              })

              it('should have a tier list of length 4', async () => {
                let tierListInfo = await saleIdx.getCrowdsaleTierList.call(
                  storage.address, executionID
                ).should.be.fulfilled
                tierListInfo.length.should.be.eq(4)
                hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
                hexStrEquals(tierListInfo[1], multiTierNames[0]).should.be.eq(true)
                hexStrEquals(tierListInfo[2], multiTierNames[1]).should.be.eq(true)
                hexStrEquals(tierListInfo[3], multiTierNames[2]).should.be.eq(true)
              })
            })
          })

          context('and wants to add multiple tiers, consecutively', async () => {

            let secondTierUpdateEvents
            let secondTierUpdateReturn

            beforeEach(async () => {
              updateTierCalldata = await saleUtils.createCrowdsaleTiers.call(
                multiTierNames, multiTierDurations, multiTierPrices,
                multiTierCaps, multiTierModStatus, multiTierWhitelistStat
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              updateTierReturn = await storage.exec.call(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateTierEvents = await storage.exec(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })

              updateTierCalldata = await saleUtils.createCrowdsaleTiers.call(
                singleTierNames, singleTierDuration, singleTierPrice,
                singleTierCap, singleTierModStatus, singleTierWhitelistStat
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              secondTierUpdateReturn = await storage.exec.call(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              secondTierUpdateEvents = await storage.exec(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })
            })

            describe('returned data', async () => {

              describe('first update', async () => {

                it('should return a tuple with 3 fields', async () => {
                  updateTierReturn.length.should.be.eq(3)
                })

                it('should return the correct number of events emitted', async () => {
                  updateTierReturn[0].toNumber().should.be.eq(1)
                })

                it('should return the correct number of addresses paid', async () => {
                  updateTierReturn[1].toNumber().should.be.eq(0)
                })

                it('should return the correct number of storage slots written to', async () => {
                  updateTierReturn[2].toNumber().should.be.eq(20)
                })
              })

              describe('second update', async () => {

                it('should return a tuple with 3 fields', async () => {
                  secondTierUpdateReturn.length.should.be.eq(3)
                })

                it('should return the correct number of events emitted', async () => {
                  secondTierUpdateReturn[0].toNumber().should.be.eq(1)
                })

                it('should return the correct number of addresses paid', async () => {
                  secondTierUpdateReturn[1].toNumber().should.be.eq(0)
                })

                it('should return the correct number of storage slots written to', async () => {
                  secondTierUpdateReturn[2].toNumber().should.be.eq(8)
                })
              })
            })

            describe('events', async () => {

              describe('first update', async () => {

                it('should have emitted 2 events total', async () => {
                  updateTierEvents.length.should.be.eq(2)
                })

                describe('the ApplicationExecution event', async () => {

                  let eventTopics
                  let eventData

                  beforeEach(async () => {
                    eventTopics = updateTierEvents[1].topics
                    eventData = updateTierEvents[1].data
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
                    web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
                    web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
                  })

                  it('should have an empty data field', async () => {
                    eventData.should.be.eq('0x0')
                  })
                })

                describe('the other event', async () => {

                  let eventTopics
                  let eventData

                  beforeEach(async () => {
                    eventTopics = updateTierEvents[0].topics
                    eventData = updateTierEvents[0].data
                  })

                  it('should have the correct number of topics', async () => {
                    eventTopics.length.should.be.eq(2)
                  })

                  it('should match the event signature for the first topic', async () => {
                    let sig = eventTopics[0]
                    web3.toDecimal(sig).should.be.eq(web3.toDecimal(tiersAddedHash))
                  })

                  it('should match the exec id for the other topic', async () => {
                    web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                  })

                  it('should match the new total number of tiers for the data field', async () => {
                    web3.toDecimal(eventData).should.be.eq(4)
                  })
                })
              })

              describe('second update', async () => {

                it('should have emitted 2 events total', async () => {
                  secondTierUpdateEvents.length.should.be.eq(2)
                })

                describe('the ApplicationExecution event', async () => {

                  let eventTopics
                  let eventData

                  beforeEach(async () => {
                    eventTopics = secondTierUpdateEvents[1].topics
                    eventData = secondTierUpdateEvents[1].data
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
                    web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
                    web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
                  })

                  it('should have an empty data field', async () => {
                    eventData.should.be.eq('0x0')
                  })
                })

                describe('the other event', async () => {

                  let eventTopics
                  let eventData

                  beforeEach(async () => {
                    eventTopics = secondTierUpdateEvents[0].topics
                    eventData = secondTierUpdateEvents[0].data
                  })

                  it('should have the correct number of topics', async () => {
                    eventTopics.length.should.be.eq(2)
                  })

                  it('should match the event signature for the first topic', async () => {
                    let sig = eventTopics[0]
                    web3.toDecimal(sig).should.be.eq(web3.toDecimal(tiersAddedHash))
                  })

                  it('should match the exec id for the other topic', async () => {
                    web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                  })

                  it('should match the new total number of tiers for the data field', async () => {
                    web3.toDecimal(eventData).should.be.eq(5)
                  })
                })
              })
            })

            describe('storage', async () => {

              it('should have an updated end time', async () => {
                let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
                  storage.address, executionID
                ).should.be.fulfilled
                timeInfo.length.should.be.eq(2)

                timeInfo[0].toNumber().should.be.eq(startTime)
                timeInfo[1].toNumber().should.be.eq(
                  startTime + initialTierDuration + multiTierDurations[0]
                  + multiTierDurations[1] + multiTierDurations[2] + singleTierDuration[0]
                )
              })

              it('should currently be tier 0', async () => {
                let curTierInfo = await saleIdx.getCurrentTierInfo.call(
                  storage.address, executionID
                ).should.be.fulfilled
                curTierInfo.length.should.be.eq(8)

                hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
                curTierInfo[1].toNumber().should.be.eq(0)
                curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
                web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
                curTierInfo[5].toNumber().should.be.eq(0)
                curTierInfo[6].should.be.eq(initialTierDurIsModifiable)
                curTierInfo[7].should.be.eq(initialTierIsWhitelisted)
              })

              describe('Tier A (First added tier)', async () => {

                it('should return valid information about tier 1', async () => {
                  let tierOneInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneInfo.length.should.be.eq(7)

                  hexStrEquals(tierOneInfo[0], multiTierNames[0]).should.be.eq(true)
                  web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[0])
                  web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[0])
                  tierOneInfo[3].toNumber().should.be.eq(0)
                  tierOneInfo[4].toNumber().should.be.eq(multiTierDurations[0])
                  tierOneInfo[5].should.be.eq(multiTierModStatus[0])
                  tierOneInfo[6].should.be.eq(multiTierWhitelistStat[0])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierOneTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneTimeInfo.should.not.eq('0x')
                  tierOneTimeInfo.length.should.be.eq(2)

                  tierOneTimeInfo[0].toNumber().should.be.eq(startTime + initialTierDuration)
                  tierOneTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                  )
                })
              })

              describe('Tier B (Second added tier)', async () => {

                it('should return valid information about tier 2', async () => {

                  let tierTwoInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoInfo.length.should.be.eq(7)

                  hexStrEquals(tierTwoInfo[0], multiTierNames[1]).should.be.eq(true)
                  web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[1])
                  web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[1])
                  tierTwoInfo[3].toNumber().should.be.eq(0)
                  tierTwoInfo[4].toNumber().should.be.eq(multiTierDurations[1])
                  tierTwoInfo[5].should.be.eq(multiTierModStatus[1])
                  tierTwoInfo[6].should.be.eq(multiTierWhitelistStat[1])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierTwoTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoTimeInfo.should.not.eq('0x')
                  tierTwoTimeInfo.length.should.be.eq(2)

                  tierTwoTimeInfo[0].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                  )
                  tierTwoTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1]
                  )
                })
              })

              describe('Tier C (Third added tier)', async () => {

                it('should return valid information about tier 3', async () => {

                  let tierThreeInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 3
                  ).should.be.fulfilled
                  tierThreeInfo.length.should.be.eq(7)

                  hexStrEquals(tierThreeInfo[0], multiTierNames[2]).should.be.eq(true)
                  web3.fromWei(tierThreeInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[2])
                  web3.fromWei(tierThreeInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[2])
                  tierThreeInfo[3].toNumber().should.be.eq(0)
                  tierThreeInfo[4].toNumber().should.be.eq(multiTierDurations[2])
                  tierThreeInfo[5].should.be.eq(multiTierModStatus[2])
                  tierThreeInfo[6].should.be.eq(multiTierWhitelistStat[2])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierThreeTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 3
                  ).should.be.fulfilled
                  tierThreeTimeInfo.should.not.eq('0x')
                  tierThreeTimeInfo.length.should.be.eq(2)

                  tierThreeTimeInfo[0].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1]
                  )
                  tierThreeTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1] + multiTierDurations[2]
                  )
                })
              })

              describe('Tier D (Fourth added tier)', async () => {

                it('should return valid information about tier 4', async () => {

                  let tierFourInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 4
                  ).should.be.fulfilled
                  tierFourInfo.length.should.be.eq(7)

                  hexStrEquals(tierFourInfo[0], singleTierNames[0]).should.be.eq(true)
                  web3.fromWei(tierFourInfo[1].toNumber(), 'wei').should.be.eq(singleTierCap[0])
                  web3.fromWei(tierFourInfo[2].toNumber(), 'wei').should.be.eq(singleTierPrice[0])
                  tierFourInfo[3].toNumber().should.be.eq(0)
                  tierFourInfo[4].toNumber().should.be.eq(singleTierDuration[0])
                  tierFourInfo[5].should.be.eq(singleTierModStatus[0])
                  tierFourInfo[6].should.be.eq(singleTierWhitelistStat[0])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierFourTimeInfo = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 4
                  ).should.be.fulfilled
                  tierFourTimeInfo.should.not.eq('0x')
                  tierFourTimeInfo.length.should.be.eq(2)

                  tierFourTimeInfo[0].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1] + multiTierDurations[2]
                  )
                  tierFourTimeInfo[1].toNumber().should.be.eq(
                    startTime + initialTierDuration + multiTierDurations[0]
                    + multiTierDurations[1] + multiTierDurations[2] + singleTierDuration[0]
                  )
                })
              })

              it('should have a tier list of length 5', async () => {
                let tierListInfo = await saleIdx.getCrowdsaleTierList.call(
                  storage.address, executionID
                ).should.be.fulfilled
                tierListInfo.length.should.be.eq(5)
                hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
                hexStrEquals(tierListInfo[1], multiTierNames[0]).should.be.eq(true)
                hexStrEquals(tierListInfo[2], multiTierNames[1]).should.be.eq(true)
                hexStrEquals(tierListInfo[3], multiTierNames[2]).should.be.eq(true)
                hexStrEquals(tierListInfo[4], singleTierNames[0]).should.be.eq(true)
              })
            })
          })
        })

        context('when the sender is not the admin', async () => {

          let invalidCalldata

          beforeEach(async () => {
            invalidCalldata = await saleUtils.createCrowdsaleTiers.call(
              multiTierNames, multiTierDurations, multiTierPrices,
              multiTierCaps, multiTierModStatus, multiTierWhitelistStat
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              exec, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })
      })
    })

    describe('contract storage once token is initialized', async () => {

      context('where only one tier was added', async () => {

        beforeEach(async () => {
          updateTierCalldata = await saleUtils.createCrowdsaleTiers.call(
            singleTierNames, singleTierDuration, singleTierPrice,
            singleTierCap, singleTierModStatus, singleTierWhitelistStat
          ).should.be.fulfilled
          updateTierCalldata.should.not.eq('0x')

          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, updateTierCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')
        })

        describe('storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await saleIdx.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(18)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have a tier list length of 2', async () => {
            let tierInfo = await saleIdx.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierInfo.length.should.be.eq(2)

            hexStrEquals(tierInfo[0], initialTierName).should.be.eq(true)
            hexStrEquals(tierInfo[1], singleTierNames[0]).should.be.eq(true)
          })

          it('should correctly calculate the maximum raise amount', async () => {
            let raiseInfo = await saleIdx.getCrowdsaleMaxRaise.call(
              storage.address, executionID
            ).should.be.fulfilled
            raiseInfo.length.should.be.eq(2)

            let priceOne =
                web3.toBigNumber(initialTierPrice).toNumber()
            let capOne =
                web3.toBigNumber(initialTierTokenSellCap).toNumber()

            let raiseOne =
              (priceOne * capOne) / (10 ** tokenDecimals)

            let priceTwo =
                web3.toBigNumber(singleTierPrice[0]).toNumber()
            let capTwo =
                web3.toBigNumber(singleTierCap[0]).toNumber()

            let raiseTwo =
              (priceTwo * capTwo) / (10 ** tokenDecimals)

            let totalSupply = capOne + capTwo

            raiseInfo[0].toNumber().should.be.eq(
              raiseOne + raiseTwo
            )
            raiseInfo[1].toNumber().should.be.eq(totalSupply)
          })

          it('should correctly calculate maximum sellable number of tokens', async () => {
            let sellableInfo = await saleIdx.isCrowdsaleFull.call(
              storage.address, executionID
            ).should.be.fulfilled
            sellableInfo.length.should.be.eq(2)
            sellableInfo[0].should.be.eq(false)
            sellableInfo[1].should.be.bignumber.eq(web3.toBigNumber(initialTierTokenSellCap).plus(singleTierCap[0]))
          })
        })
      })

      context('where multiple tiers were added', async () => {

        beforeEach(async () => {
          updateTierCalldata = await saleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat
          ).should.be.fulfilled
          updateTierCalldata.should.not.eq('0x')

          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, updateTierCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')
        })

        describe('storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await saleIdx.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(18)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have a tier list length of 4', async () => {
            let tierInfo = await saleIdx.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierInfo.length.should.be.eq(4)

            hexStrEquals(tierInfo[0], initialTierName).should.be.eq(true)
            hexStrEquals(tierInfo[1], multiTierNames[0]).should.be.eq(true)
            hexStrEquals(tierInfo[2], multiTierNames[1]).should.be.eq(true)
            hexStrEquals(tierInfo[3], multiTierNames[2]).should.be.eq(true)
          })

          it('should correctly calculate the maximum raise amount', async () => {
            let raiseInfo = await saleIdx.getCrowdsaleMaxRaise.call(
              storage.address, executionID
            ).should.be.fulfilled
            raiseInfo.length.should.be.eq(2)

            let priceOne =
              web3.toBigNumber(initialTierPrice)
            let capOne =
              web3.toBigNumber(initialTierTokenSellCap)
            let raiseOne =
              priceOne.times(capOne).div(10 ** tokenDecimals)

            let priceTwo =
              web3.toBigNumber(multiTierPrices[0])
            let capTwo =
              web3.toBigNumber(multiTierCaps[0])
            let raiseTwo =
              priceTwo.times(capTwo).div(10 ** tokenDecimals)

            let priceThree =
              web3.toBigNumber(multiTierPrices[1])
            let capThree =
              web3.toBigNumber(multiTierCaps[1])
            let raiseThree =
              priceThree.times(capThree).div(10 ** tokenDecimals)

            let priceFour =
              web3.toBigNumber(multiTierPrices[2])
            let capFour =
              web3.toBigNumber(multiTierCaps[2])
            let raiseFour =
              priceFour.times(capFour).div(10 ** tokenDecimals)

            let totalSupply = capOne.plus(capTwo).plus(capThree).plus(capFour)

            raiseInfo[0].should.be.bignumber.eq(
              raiseOne.plus(raiseTwo).plus(raiseThree).plus(raiseFour)
            )
            raiseInfo[1].should.be.bignumber.eq(totalSupply)
          })

          it('should correctly calculate maximum sellable number of tokens', async () => {
            let sellableInfo = await saleIdx.isCrowdsaleFull.call(
              storage.address, executionID
            ).should.be.fulfilled
            sellableInfo.length.should.be.eq(2)
            sellableInfo[0].should.be.eq(false)
            sellableInfo[1].should.be.bignumber.eq(
              web3.toBigNumber(initialTierTokenSellCap)
                  .plus(multiTierCaps[0])
                  .plus(multiTierCaps[1])
                  .plus(multiTierCaps[2])
            )
          })
        })
      })
    })
  })

  describe('#updateTierDuration', async () => {

    let updateTierCalldata
    let updateTierEvent
    let updateTierReturn

    // Tiers are created with the following information:
    let tierNames = ['Tier 1', 'Tier 2']
    let tierDurations = [1000, 2000]
    let tierPrices = [
      web3.toWei('0.1', 'ether'),
      web3.toWei('0.2', 'ether')
    ]
    let tierCaps = [
      web3.toWei('10', 'ether'),
      web3.toWei('20', 'ether')
    ]
    let tierAllModifiable = [true, true]
    let tierMixedModifiable = [false, true]
    let multiTierWhitelistStat = [true, false]

    // After creation of tiers, crowdsale should end at this time:
    let initialEndTime

    // Tiers will be updated with the following durations
    let newDuration = 2500
    let zeroDuration = 0

    context('when the tier to update is a previous tier', async () => {

      let invalidCalldata

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
          tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
          multiTierWhitelistStat
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
          storage.address, executionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      context('such as tier 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            0, newDuration
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await storage.setTime(startTime + initialTierDuration).should.be.fulfilled
          let storedTime = await storage.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(startTime + initialTierDuration)
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as a tier which isn\'t tier 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            1, newDuration
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await storage.setTime(startTime + initialTierDuration + tierDurations[0]).should.be.fulfilled
          let storedTime = await storage.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0])
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the tier to update is the current tier', async () => {

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
          tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
          multiTierWhitelistStat
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
          storage.address, executionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      describe('crowdsale storage - pre tier updates', async () => {

        it('should match the set admin address', async () => {
          let adminInfo = await saleIdx.getAdmin.call(
            storage.address, executionID
          ).should.be.fulfilled
          adminInfo.should.be.eq(crowdsaleAdmin)
        })

        it('should have correctly set start and end times for the crowdsale', async () => {
          let saleDates = await saleIdx.getCrowdsaleStartAndEndTimes.call(
            storage.address, executionID
          ).should.be.fulfilled
          saleDates.length.should.be.eq(2)

          saleDates[0].toNumber().should.be.eq(startTime)
          saleDates[1].toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
          )
        })

        it('should currently be tier 0', async () => {
          let curTierInfo = await saleIdx.getCurrentTierInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          curTierInfo.length.should.be.eq(8)

          hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
          curTierInfo[1].toNumber().should.be.eq(0)
          curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
          web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
          web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
          curTierInfo[5].toNumber().should.be.eq(0)
          curTierInfo[6].should.be.eq(true)
          curTierInfo[7].should.be.eq(true)
        })

        it('should currently have 3 tiers', async () => {
          let tiersInfo = await saleIdx.getCrowdsaleTierList.call(
            storage.address, executionID
          ).should.be.fulfilled
          tiersInfo.length.should.be.eq(3)

          hexStrEquals(tiersInfo[0], initialTierName).should.be.eq(true)
          hexStrEquals(tiersInfo[1], tierNames[0]).should.be.eq(true)
          hexStrEquals(tiersInfo[2], tierNames[1]).should.be.eq(true)
        })

        it('should have the correct start and end dates for each tier', async () => {
          let tierOneDates = await saleIdx.getTierStartAndEndDates.call(
            storage.address, executionID, 0
          ).should.be.fulfilled
          tierOneDates.length.should.be.eq(2)

          let tierTwoDates = await saleIdx.getTierStartAndEndDates.call(
            storage.address, executionID, 1
          ).should.be.fulfilled
          tierTwoDates.length.should.be.eq(2)

          let tierThreeDates = await saleIdx.getTierStartAndEndDates.call(
            storage.address, executionID, 2
          ).should.be.fulfilled
          tierThreeDates.length.should.be.eq(2)

          tierOneDates[0].toNumber().should.be.eq(startTime)
          tierOneDates[1].toNumber().should.be.eq(startTime + initialTierDuration)
          tierOneDates[1].toNumber().should.be.eq(tierTwoDates[0].toNumber())
          tierTwoDates[1].toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0]
          )
          tierTwoDates[1].toNumber().should.be.eq(tierThreeDates[0].toNumber())
          tierThreeDates[1].toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
          )
        })
      })

      context('and the current tier is tier 0', async () => {

        context('and the crowdsale has started', async () => {

          let invalidCalldata

          beforeEach(async () => {
            invalidCalldata = await saleUtils.updateTierDuration.call(
              0, newDuration
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await storage.setTime(startTime).should.be.fulfilled
            let storedTime = await storage.getTime.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime)
          })

          it('should throw', async () => {
            await storage.exec(
              crowdsaleAdmin, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })

        context('and the crowdsale has not started', async () => {

          context('and tier 0 was set to not-modifiable', async () => {

            let invalidCalldata

            let initTierDurMod = false
            let noModStartTime
            let noModExecID

            beforeEach(async () => {
              // Initialize a new crowdsale application through storage with a non-modifiable first tier
              noModStartTime = getTime() + 3600

              let noModInitCalldata = await saleUtils.init.call(
                teamWallet, noModStartTime, initialTierName, initialTierPrice,
                initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
                initTierDurMod, crowdsaleAdmin
              ).should.be.fulfilled
              noModInitCalldata.should.not.eq('0x')

              let events = await storage.createInstance(
                exec, appName, exec, regExecID, noModInitCalldata,
                { from: exec }
              ).should.be.fulfilled.then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              noModExecID = events[0].args['execution_id']
              web3.toDecimal(noModExecID).should.not.eq(0)

              initialEndTime = noModStartTime + initialTierDuration + tierDurations[0] + tierDurations[1]

              // Create tiers for the initialized crowdsale
              let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
                tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
                multiTierWhitelistStat
              ).should.be.fulfilled
              createTiersCalldata.should.not.eq('0x')

              events = await storage.exec(
                crowdsaleAdmin, noModExecID, createTiersCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              // Check start and end time
              let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
                storage.address, noModExecID
              ).should.be.fulfilled
              timeInfo.length.should.be.eq(2)
              timeInfo[0].toNumber().should.be.eq(noModStartTime)
              timeInfo[1].toNumber().should.be.eq(initialEndTime)

              // Attempt to update tier 0's duration
              invalidCalldata = await saleUtils.updateTierDuration.call(
                0, newDuration
              ).should.be.fulfilled
              invalidCalldata.should.not.eq('0x')
            })

            it('should throw', async () => {
              await storage.exec(
                crowdsaleAdmin, noModExecID, invalidCalldata,
                { from: exec }
              ).should.not.be.fulfilled
            })
          })

          context('and tier 0 was set to is-modifiable', async () => {

            beforeEach(async () => {
              updateTierCalldata = await saleUtils.updateTierDuration.call(
                0, newDuration
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              await storage.resetTime().should.be.fulfilled
              let storedTime = await storage.set_time.call().should.be.fulfilled
              storedTime.toNumber().should.be.eq(0)

              updateTierReturn = await storage.exec.call(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              let events = await storage.exec(
                crowdsaleAdmin, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)

              updateTierEvent = events[0]
            })

            describe('returned data', async () => {

              it('should return a tuple with 3 fields', async () => {
                updateTierReturn.length.should.be.eq(3)
              })

              it('should return the correct number of events emitted', async () => {
                updateTierReturn[0].toNumber().should.be.eq(0)
              })

              it('should return the correct number of addresses paid', async () => {
                updateTierReturn[1].toNumber().should.be.eq(0)
              })

              it('should return the correct number of storage slots written to', async () => {
                updateTierReturn[2].toNumber().should.be.eq(3)
              })
            })

            it('should emit an ApplicationExecution event', async () => {
              updateTierEvent.event.should.be.eq('ApplicationExecution')
            })

            describe('the ApplicationExecution event', async () => {

              it('should match the used execution id', async () => {
                let emittedExecID = updateTierEvent.args['execution_id']
                emittedExecID.should.be.eq(executionID)
              })

              it('should match the SaleManager address', async () => {
                let emittedAppAddr = updateTierEvent.args['script_target']
                emittedAppAddr.should.be.eq(saleManager.address)
              })
            })

            describe('storage', async () => {

              it('should have a new crowdsale end time', async () => {
                let newTimeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
                  storage.address, executionID
                ).should.be.fulfilled
                newTimeInfo.length.should.be.eq(2)

                newTimeInfo[0].toNumber().should.be.eq(startTime)
                newTimeInfo[1].toNumber().should.be.eq(
                  initialEndTime - (initialTierDuration - newDuration)
                )
              })

              it('should have correctly updated tier 0 duration', async () => {
                let tierZeroInfo = await saleIdx.getCrowdsaleTier.call(
                  storage.address, executionID, 0
                ).should.be.fulfilled
                tierZeroInfo.length.should.be.eq(7)

                hexStrEquals(tierZeroInfo[0], initialTierName).should.be.eq(true)
                web3.fromWei(tierZeroInfo[1].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(tierZeroInfo[2].toNumber(), 'wei').should.be.eq(initialTierPrice)
                tierZeroInfo[3].toNumber().should.be.eq(0)
                tierZeroInfo[4].toNumber().should.be.eq(newDuration)
                tierZeroInfo[5].should.be.eq(initialTierDurIsModifiable)
                tierZeroInfo[6].should.be.eq(initialTierIsWhitelisted)
              })

              it('should have correctly updated the end date for tier 0', async () => {
                let tierZeroDates = await saleIdx.getTierStartAndEndDates.call(
                  storage.address, executionID, 0
                ).should.be.fulfilled
                tierZeroDates.length.should.be.eq(2)

                tierZeroDates[0].toNumber().should.be.eq(startTime)
                tierZeroDates[1].toNumber().should.be.eq(startTime + newDuration)
              })

              describe('Tier 1', async () => {

                it('should have correctly changed start and end dates for tier 1', async () => {
                  let tierOneDates = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneDates.length.should.be.eq(2)

                  tierOneDates[0].toNumber().should.be.eq(
                    startTime + newDuration
                  )
                  tierOneDates[1].toNumber().should.be.eq(
                    startTime + newDuration + tierDurations[0]
                  )
                })

                it('should not have changed the duration of tier 1', async () => {
                  let tierOneInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneInfo.length.should.be.eq(7)

                  hexStrEquals(tierOneInfo[0], tierNames[0]).should.be.eq(true)
                  web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[0])
                  web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[0])
                  tierOneInfo[3].toNumber().should.be.eq(0)
                  tierOneInfo[4].toNumber().should.be.eq(tierDurations[0])
                  tierOneInfo[5].should.be.eq(tierAllModifiable[0])
                  tierOneInfo[6].should.be.eq(multiTierWhitelistStat[0])
                })
              })

              describe('Tier 2', async () => {

                it('should have correctly changed start and end dates for tier 2', async () => {
                  let tierTwoDates = await saleIdx.getTierStartAndEndDates.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoDates.length.should.be.eq(2)

                  tierTwoDates[0].toNumber().should.be.eq(
                    startTime + newDuration + tierDurations[0]
                  )
                  tierTwoDates[1].toNumber().should.be.eq(
                    startTime + newDuration + tierDurations[0] + tierDurations[1]
                  )
                })

                it('should not have changed the duration of tier 2', async () => {
                  let tierTwoInfo = await saleIdx.getCrowdsaleTier.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoInfo.length.should.be.eq(7)

                  hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
                  web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
                  web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
                  tierTwoInfo[3].toNumber().should.be.eq(0)
                  tierTwoInfo[4].toNumber().should.be.eq(tierDurations[1])
                  tierTwoInfo[5].should.be.eq(tierAllModifiable[1])
                  tierTwoInfo[6].should.be.eq(multiTierWhitelistStat[1])
                })
              })
            })
          })
        })
      })

      context('and the current tier is not tier 0', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            2, newDuration
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await storage.setTime(
            startTime + initialTierDuration + tierDurations[0] + (tierDurations[1] / 2)
          ).should.be.fulfilled
          let storedTime = await storage.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + (tierDurations[1] / 2)
          )
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the input parameters are invalid', async () => {

      let invalidCalldata

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
          tierNames, tierDurations, tierPrices, tierCaps, tierMixedModifiable,
          multiTierWhitelistStat
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
          storage.address, executionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      context('such as the new duration being 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            2, zeroDuration
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as the new duration being the same as the old duration', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            2, tierDurations[1]
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as the tier to update being out-of-range of the tier list', async () => {

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            3, newDuration
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as the tier to update having been set as \'not modifiable\'', async () => {

        context('when the tier to update is not tier 0', async () => {

          beforeEach(async () => {
            invalidCalldata = await saleUtils.updateTierDuration.call(
              1, newDuration
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              crowdsaleAdmin, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })
      })
    })

    context('when the input parameters are valid', async () => {

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await saleUtils.createCrowdsaleTiers.call(
          tierNames, tierDurations, tierPrices, tierCaps, tierMixedModifiable,
          multiTierWhitelistStat
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
          storage.address, executionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      context('but the sender is not the admin', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.updateTierDuration.call(
            2, newDuration
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            exec, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('and the sender is the admin', async () => {

        beforeEach(async () => {
          updateTierCalldata = await saleUtils.updateTierDuration.call(
            2, newDuration
          ).should.be.fulfilled
          updateTierCalldata.should.not.eq('0x')

          updateTierReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, updateTierCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleAdmin, executionID, updateTierCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          updateTierEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            updateTierReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            updateTierReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            updateTierReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            updateTierReturn[2].toNumber().should.be.eq(2)
          })
        })

        it('should emit an ApplicationExecution event', async () => {
          updateTierEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = updateTierEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = updateTierEvent.args['script_target']
            emittedAppAddr.should.be.eq(saleManager.address)
          })
        })

        describe('storage', async () => {

          it('should have a new crowdsale end time', async () => {
            let newTimeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(
              initialEndTime - (tierDurations[1] - newDuration)
            )
          })

          it('should have correctly updated tier 2 duration', async () => {
            let tierTwoInfo = await saleIdx.getCrowdsaleTier.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoInfo.length.should.be.eq(7)

            hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
            web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
            web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
            tierTwoInfo[3].toNumber().should.be.eq(0)
            tierTwoInfo[4].toNumber().should.be.eq(newDuration)
            tierTwoInfo[5].should.be.eq(tierMixedModifiable[1])
            tierTwoInfo[6].should.be.eq(multiTierWhitelistStat[1])
          })

          it('should have correctly updated the end date for tier 2', async () => {
            let tierZeroDates = await saleIdx.getTierStartAndEndDates.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierZeroDates.length.should.be.eq(2)

            tierZeroDates[0].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            tierZeroDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0] + newDuration
            )
          })
        })
      })
    })
  })

  describe('#whitelistMultiForTier', async () => {

    let whitelistCalldata
    let whitelistEvent
    let whitelistReturn

    let multiWhitelist = [
      accounts[accounts.length - 1],
      accounts[accounts.length - 2],
      accounts[accounts.length - 3]
    ]
    let multiMinimum = [
      web3.toWei('1', 'ether'),
      0,
      web3.toWei('2', 'ether')
    ]
    let multiMaximum = [
      web3.toWei('0.001', 'ether'),
      web3.toWei('0.002', 'ether'),
      0
    ]

    let singleWhitelist = [accounts[accounts.length - 4]]
    let singleMinimumNonZero = [web3.toWei('3', 'ether')]
    let singleMinimumZero = [0]
    let singleMaximumNonZero = [web3.toWei('0.003', 'ether')]
    let singleMaximumZero = [0]

    context('when the admin attempts to whitelist with invalid parameters', async () => {

      let invalidCalldata

      context('such as mismatched input lengths', async () => {

        let invalidMultiMinimum = singleMinimumNonZero

        beforeEach(async () => {
          invalidCalldata = await saleUtils.whitelistMultiForTier.call(
            1, multiWhitelist, invalidMultiMinimum, multiMaximum
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('such as input lengths of 0', async () => {

        let invalidMultiWhitelist = []

        beforeEach(async () => {
          invalidCalldata = await saleUtils.whitelistMultiForTier.call(
            1, invalidMultiWhitelist, multiMinimum, multiMaximum
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })

    context('when the input parameters are valid', async () => {

      context('when the sender is the admin', async () => {

        context('when the tier being updated is tier 0', async () => {

          beforeEach(async () => {
            whitelistCalldata = await saleUtils.whitelistMultiForTier.call(
              0, multiWhitelist, multiMinimum, multiMaximum
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            whitelistEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              whitelistReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              whitelistReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              whitelistReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              whitelistReturn[2].toNumber().should.be.eq(10)
            })
          })

          it('should emit an ApplicationExecution event', async () => {
            whitelistEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = whitelistEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = whitelistEvent.args['script_target']
              emittedAppAddr.should.be.eq(saleManager.address)
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 3 for tier 0', async () => {
              let whitelistInfo = await saleIdx.getTierWhitelist.call(
                storage.address, executionID, 0
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)

              whitelistInfo[0].toNumber().should.be.eq(3)
              whitelistInfo[1].length.should.be.eq(3)
              whitelistInfo[1][0].should.be.eq(multiWhitelist[0])
              whitelistInfo[1][1].should.be.eq(multiWhitelist[1])
              whitelistInfo[1][2].should.be.eq(multiWhitelist[2])
            })

            it('should have correct whitelist information for each account', async () => {
              let whitelistOneInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 0, multiWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              let whitelistTwoInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 0, multiWhitelist[1]
              ).should.be.fulfilled
              whitelistTwoInfo.length.should.be.eq(2)

              let whitelistThreeInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 0, multiWhitelist[2]
              ).should.be.fulfilled
              whitelistThreeInfo.length.should.be.eq(2)

              whitelistOneInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(multiMinimum[0]).toNumber()
              )
              whitelistOneInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(multiMaximum[0]).toNumber()
              )
              whitelistTwoInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(multiMinimum[1]).toNumber()
              )
              whitelistTwoInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(multiMaximum[1]).toNumber()
              )
              whitelistThreeInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(multiMinimum[2]).toNumber()
              )
              whitelistThreeInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(multiMaximum[2]).toNumber()
              )
            })
          })
        })

        context('when the tier being updated is not tier 0', async () => {

          beforeEach(async () => {
            whitelistCalldata = await saleUtils.whitelistMultiForTier.call(
              1, multiWhitelist, multiMinimum, multiMaximum
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            whitelistEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              whitelistReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              whitelistReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              whitelistReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              whitelistReturn[2].toNumber().should.be.eq(10)
            })
          })

          it('should emit an ApplicationExecution event', async () => {
            whitelistEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = whitelistEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = whitelistEvent.args['script_target']
              emittedAppAddr.should.be.eq(saleManager.address)
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 3 for tier 1', async () => {
              let whitelistInfo = await saleIdx.getTierWhitelist.call(
                storage.address, executionID, 1
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)

              whitelistInfo[0].toNumber().should.be.eq(3)
              whitelistInfo[1].length.should.be.eq(3)
              whitelistInfo[1][0].should.be.eq(multiWhitelist[0])
              whitelistInfo[1][1].should.be.eq(multiWhitelist[1])
              whitelistInfo[1][2].should.be.eq(multiWhitelist[2])
            })

            it('should have correct whitelist information for each account', async () => {
              let whitelistOneInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 1, multiWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              let whitelistTwoInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 1, multiWhitelist[1]
              ).should.be.fulfilled
              whitelistTwoInfo.length.should.be.eq(2)

              let whitelistThreeInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 1, multiWhitelist[2]
              ).should.be.fulfilled
              whitelistThreeInfo.length.should.be.eq(2)

              whitelistOneInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(multiMinimum[0]).toNumber()
              )
              whitelistOneInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(multiMaximum[0]).toNumber()
              )
              whitelistTwoInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(multiMinimum[1]).toNumber()
              )
              whitelistTwoInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(multiMaximum[1]).toNumber()
              )
              whitelistThreeInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(multiMinimum[2]).toNumber()
              )
              whitelistThreeInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(multiMaximum[2]).toNumber()
              )
            })
          })
        })

        context('when only one address is whitelisted', async () => {

          beforeEach(async () => {
            whitelistCalldata = await saleUtils.whitelistMultiForTier.call(
              1, singleWhitelist, singleMinimumNonZero, singleMaximumNonZero
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            whitelistEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              whitelistReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              whitelistReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              whitelistReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              whitelistReturn[2].toNumber().should.be.eq(4)
            })
          })

          it('should emit an ApplicationExecution event', async () => {
            whitelistEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = whitelistEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = whitelistEvent.args['script_target']
              emittedAppAddr.should.be.eq(saleManager.address)
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 1 for tier 1', async () => {
              let whitelistInfo = await saleIdx.getTierWhitelist.call(
                storage.address, executionID, 1
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)

              whitelistInfo[0].toNumber().should.be.eq(1)
              whitelistInfo[1].length.should.be.eq(1)
              whitelistInfo[1][0].should.be.eq(singleWhitelist[0])
            })

            it('should have correct whitelist information for the whitelisted account', async () => {
              let whitelistOneInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, 1, singleWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              whitelistOneInfo[0].toNumber().should.be.eq(
                web3.toBigNumber(singleMinimumNonZero[0]).toNumber()
              )
              whitelistOneInfo[1].toNumber().should.be.eq(
                web3.toBigNumber(singleMaximumNonZero[0]).toNumber()
              )
            })
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.whitelistMultiForTier.call(
            1, multiWhitelist, multiMinimum, multiMaximum
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            exec, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })
  })

  describe('#initializeCrowdsale', async () => {

    let initSaleCalldata
    let initSaleEvents
    let initSaleReturn

    context('when the crowdsale has already started', async () => {

      let invalidCalldata

      beforeEach(async () => {
        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.be.eq('0x')

        invalidCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        await storage.setTime(startTime + 1).should.be.fulfilled
        let storedTime = await storage.getTime.call().should.be.fulfilled
        storedTime.toNumber().should.be.eq(startTime + 1)
      })

      it('should throw', async () => {
        await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })
    })

    context('when the crowdsale has not yet started', async () => {

      context('when the crowdsale token is not initialized', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the crowdsale token is initialized', async () => {

        beforeEach(async () => {
          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')
        })

        context('but the sender is not the admin', async () => {

          let invalidCalldata

          beforeEach(async () => {
            invalidCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              exec, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })

        context('and the sender is the admin', async () => {

          beforeEach(async () => {
            initSaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
            initSaleCalldata.should.not.eq('0x')

            initSaleReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, initSaleCalldata,
              { from: exec }
            ).should.be.fulfilled

            initSaleEvents = await storage.exec(
              crowdsaleAdmin, executionID, initSaleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              initSaleReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              initSaleReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              initSaleReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              initSaleReturn[2].toNumber().should.be.eq(1)
            })
          })

          describe('events', async () => {

            it('should have emitted 2 events total', async () => {
              initSaleEvents.length.should.be.eq(2)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = initSaleEvents[1].topics
                eventData = initSaleEvents[1].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = initSaleEvents[0].topics
                eventData = initSaleEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(initSaleHash))
              })

              it('should match the exec id and token name for the other topics', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                hexStrEquals(eventTopics[2], tokenName).should.be.eq(true)
              })

              it('should match the start time in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(startTime)
              })
            })
          })

          describe('storage', async () => {

            it('should have an initialized token', async () => {
              let tokenInfo = await saleIdx.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.length.should.be.eq(4)

              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
              tokenInfo[3].toNumber().should.be.eq(0)
            })

            it('should have an initialized crowdsale', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(4)

              crowdsaleInfo[0].toNumber().should.be.eq(0)
              crowdsaleInfo[1].should.be.eq(teamWallet)
              crowdsaleInfo[2].should.be.eq(true)
              crowdsaleInfo[3].should.be.eq(false)
            })
          })
        })
      })
    })
  })

  describe('#finalizeCrowdsale', async () => {

    let finalizeCalldata
    let finalizeEvents
    let finalizeReturn

    context('when the crowdsale is not yet intialized', async () => {

      let invalidCalldata

      beforeEach(async () => {
        invalidCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
        invalidCalldata.should.not.eq('0x')
      })

      it('should throw', async () => {
        await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })
    })

    context('when the crowdsale is already finalized', async () => {

      let invalidCalldata

      beforeEach(async () => {
        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

        invalidCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleAdmin, executionID, initCrCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
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

    context('when the crowdsale is in a valid state to be finalized', async () => {

      beforeEach(async () => {

        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleAdmin, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleAdmin, executionID, initCrCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')
      })

      context('but the sender is not the admin', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            exec, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('and the sender is the admin', async () => {

        beforeEach(async () => {
          finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          finalizeReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).should.be.fulfilled

          finalizeEvents = await storage.exec(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            finalizeReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            finalizeReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            finalizeReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            finalizeReturn[2].toNumber().should.be.eq(1)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            finalizeEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = finalizeEvents[1].topics
              eventData = finalizeEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(saleManager.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = finalizeEvents[0].topics
              eventData = finalizeEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(2)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(finalSaleHash))
            })

            it('should match the exec id for the other topic', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })
        })

        describe('storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await saleIdx.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have an initialized and finalized crowdsale', async () => {
            let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            crowdsaleInfo.length.should.be.eq(4)

            crowdsaleInfo[0].toNumber().should.be.eq(0)
            crowdsaleInfo[1].should.be.eq(teamWallet)
            crowdsaleInfo[2].should.be.eq(true)
            crowdsaleInfo[3].should.be.eq(true)
          })
        })
      })
    })
  })
})
