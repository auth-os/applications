// Abstract storage contract
let AbstractStorage = artifacts.require('./AbstractStorage')
// MintedCappedCrowdsale
let InitMintedCapped = artifacts.require('./InitCrowdsale')
let MintedCappedBuy = artifacts.require('./CrowdsaleBuyTokens')
let MintedCappedCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
let MintedCappedTokenConsole = artifacts.require('./TokenConsole')
let MintedCappedTokenTransfer = artifacts.require('./TokenTransfer')
let MintedCappedTokenTransferFrom = artifacts.require('./TokenTransferFrom')
let MintedCappedTokenApprove = artifacts.require('./TokenApprove')
// Utils
let TestUtils = artifacts.require('./TestUtils')
let ConsoleUtils = artifacts.require('./CrowdsaleConsoleUtils')
// Mock
let CrowdsaleConsoleMock = artifacts.require('./CrowdsaleConsoleMock')

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

contract('#MintedCappedCrowdsaleConsole', function (accounts) {

  let storage
  let testUtils
  let consoleUtils

  let crowdsaleConsoleMock
  let mockExecutionID
  let mockAdminContext

  let exec = accounts[0]
  let updater = accounts[1]
  let crowdsaleAdmin = accounts[2]
  let teamWallet = accounts[3]

  let otherAddress = accounts[4]

  let initCrowdsale
  let crowdsaleBuy
  let crowdsaleConsole
  let tokenConsole
  let tokenTransfer
  let tokenTransferFrom
  let tokenApprove

  let executionID
  let adminContext
  let otherContext

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

  let initTokenHash = web3.sha3('CrowdsaleTokenInit(bytes32,bytes32,bytes32,uint256)')
  let updateMinHash = web3.sha3('GlobalMinUpdate(bytes32,uint256)')
  let timeUpdateHash = web3.sha3('CrowdsaleTimeUpdated(bytes32)')
  let initSaleHash = web3.sha3('CrowdsaleInitialized(bytes32,bytes32,uint256)')
  let finalSaleHash = web3.sha3('CrowdsaleFinalized(bytes32)')
  let tiersAddedHash = web3.sha3('CrowdsaleTiersAdded(bytes32,uint256)')

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled
    consoleUtils = await ConsoleUtils.new().should.be.fulfilled

    crowdsaleConsoleMock = await CrowdsaleConsoleMock.new().should.be.fulfilled

    initCrowdsale = await InitMintedCapped.new().should.be.fulfilled
    crowdsaleBuy = await MintedCappedBuy.new().should.be.fulfilled
    crowdsaleConsole = await MintedCappedCrowdsaleConsole.new().should.be.fulfilled
    tokenConsole = await MintedCappedTokenConsole.new().should.be.fulfilled
    tokenTransfer = await MintedCappedTokenTransfer.new().should.be.fulfilled
    tokenTransferFrom = await MintedCappedTokenTransferFrom.new().should.be.fulfilled
    tokenApprove = await MintedCappedTokenApprove.new().should.be.fulfilled
  })

  beforeEach(async () => {
    startTime = getTime() + 3600

    initCalldata = await testUtils.init.call(
      teamWallet, startTime, initialTierName, initialTierPrice,
      initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
      initialTierDurIsModifiable, crowdsaleAdmin
    ).should.be.fulfilled
    initCalldata.should.not.eq('0x')

    let events = await storage.initAndFinalize(
      updater, true, initCrowdsale.address, initCalldata, [
        crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
        tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
      ],
      { from: exec, gasPrice: 0 }
    ).then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(2)

    events[0].event.should.be.eq('ApplicationInitialized')
    events[1].event.should.be.eq('ApplicationFinalization')
    executionID = events[0].args['execution_id']
    web3.toDecimal(executionID).should.not.eq(0)

    adminContext = await testUtils.getContext.call(
      executionID, crowdsaleAdmin, 0
    ).should.be.fulfilled
    adminContext.should.not.eq('0x')

    otherContext = await testUtils.getContext.call(
      executionID, otherAddress, 0
    ).should.be.fulfilled
    otherContext.should.not.eq('0x')

    initCalldata = await testUtils.init.call(
      teamWallet, startTime, initialTierName, initialTierPrice,
      initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
      initialTierDurIsModifiable, crowdsaleAdmin
    ).should.be.fulfilled
    initCalldata.should.not.eq('0x')

    await crowdsaleConsoleMock.resetTime({ gasPrice: 0 }).should.be.fulfilled
    let storedTime = await crowdsaleConsoleMock.set_time.call().should.be.fulfilled
    storedTime.toNumber().should.be.eq(0)

    events = await storage.initAndFinalize(
      updater, true, initCrowdsale.address, initCalldata, [
        crowdsaleBuy.address, crowdsaleConsoleMock.address, tokenConsole.address,
        tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
      ],
      { from: exec, gasPrice: 0 }
    ).then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(2)

    events[0].event.should.be.eq('ApplicationInitialized')
    events[1].event.should.be.eq('ApplicationFinalization')
    mockExecutionID = events[0].args['execution_id']
    web3.toDecimal(mockExecutionID).should.not.eq(0)

    mockAdminContext = await testUtils.getContext.call(
      mockExecutionID, crowdsaleAdmin, 0
    ).should.be.fulfilled
    mockAdminContext.should.not.eq('0x')
  })

  describe('#initCrowdsaleToken', async () => {

    let initTokenCalldata
    let initTokenEvents
    let initTokenReturn

    describe('crowdsale storage with no initialized token', async () => {

      it('should not have information about the token', async () => {
        let tokenInfo = await initCrowdsale.getTokenInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        tokenInfo.length.should.be.eq(4)

        web3.toDecimal(tokenInfo[0]).should.be.eq(0)
        web3.toDecimal(tokenInfo[1]).should.be.eq(0)
        tokenInfo[2].toNumber().should.be.eq(0)
        tokenInfo[3].toNumber().should.be.eq(0)
      })

      it('should not have values for maximum raise amount', async () => {
        let raiseInfo = await initCrowdsale.getCrowdsaleMaxRaise.call(
          storage.address, executionID
        ).should.be.fulfilled
        raiseInfo.length.should.be.eq(2)

        raiseInfo[0].toNumber().should.be.eq(0)
        raiseInfo[1].toNumber().should.be.eq(0)
      })

      it('should not allow an initialized crowdsale', async () => {
        let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        saleInfo.length.should.be.eq(5)

        saleInfo[0].toNumber().should.be.eq(0)
        saleInfo[1].should.be.eq(teamWallet)
        saleInfo[2].toNumber().should.be.eq(0)
        saleInfo[3].should.be.eq(false)
        saleInfo[4].should.be.eq(false)
      })
    })

    context('when the token is initialized with an invalid parameter', async () => {

      let invalidCalldata
      let invalidEvent
      let invalidReturn

      context('such as an invalid name', async () => {

        let invalidName = ''

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken.call(
            invalidName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'ImproperInitialization\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ImproperInitialization').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.should.not.eq(null)
            tokenInfo.length.should.be.eq(4)
          })

          it('should not have an initialized name', async () => {
            web3.toDecimal(tokenInfo[0]).should.be.eq(0)
          })

          it('should not have an initialized symbol', async () => {
            web3.toDecimal(tokenInfo[1]).should.be.eq(0)
          })

          it('should not have an initialized number of decimals', async () => {
            tokenInfo[2].toNumber().should.be.eq(0)
          })

          it('should have a total supply of 0', async () => {
            tokenInfo[3].toNumber().should.be.eq(0)
          })
        })
      })

      context('such as an invalid symbol', async () => {

        let invalidSymbol = ''

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, invalidSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'ImproperInitialization\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ImproperInitialization').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.should.not.eq(null)
            tokenInfo.length.should.be.eq(4)
          })

          it('should not have an initialized name', async () => {
            web3.toDecimal(tokenInfo[0]).should.be.eq(0)
          })

          it('should not have an initialized symbol', async () => {
            web3.toDecimal(tokenInfo[1]).should.be.eq(0)
          })

          it('should not have an initialized number of decimals', async () => {
            tokenInfo[2].toNumber().should.be.eq(0)
          })

          it('should have a total supply of 0', async () => {
            tokenInfo[3].toNumber().should.be.eq(0)
          })
        })

      })

      context('such as an invalid decimal count', async () => {

        let invalidDecimals = 19

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, invalidDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'ImproperInitialization\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ImproperInitialization').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.should.not.eq(null)
            tokenInfo.length.should.be.eq(4)
          })

          it('should not have an initialized name', async () => {
            web3.toDecimal(tokenInfo[0]).should.be.eq(0)
          })

          it('should not have an initialized symbol', async () => {
            web3.toDecimal(tokenInfo[1]).should.be.eq(0)
          })

          it('should not have an initialized number of decimals', async () => {
            tokenInfo[2].toNumber().should.be.eq(0)
          })

          it('should have a total supply of 0', async () => {
            tokenInfo[3].toNumber().should.be.eq(0)
          })
        })

      })
    })

    context('when the token is initialized with valid parameters', async () => {

      context('when the sender is the admin', async () => {

        beforeEach(async () => {
          initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          initTokenReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).should.be.fulfilled

          initTokenEvents = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
              tokenInfo = await initCrowdsale.getTokenInfo.call(
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
              let raiseInfo = await initCrowdsale.getCrowdsaleMaxRaise.call(
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
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.should.not.eq(null)
            tokenInfo.length.should.be.eq(4)
          })

          it('should not have an initialized name', async () => {
            web3.toDecimal(tokenInfo[0]).should.be.eq(0)
          })

          it('should not have an initialized symbol', async () => {
            web3.toDecimal(tokenInfo[1]).should.be.eq(0)
          })

          it('should not have an initialized number of decimals', async () => {
            tokenInfo[2].toNumber().should.be.eq(0)
          })

          it('should have a total supply of 0', async () => {
            tokenInfo[3].toNumber().should.be.eq(0)
          })
        })
      })
    })
  })

  describe('#updateGlobalMinContribution', async () => {

    let updateMinCalldata
    let updateMinEvents
    let updateMinReturn

    let updateTo = web3.toWei('1', 'ether')
    let updateToZero = 0

    context('when the crowdsale is already initialized', async () => {

      let invalidCalldata
      let invalidEvent
      let invalidReturn

      beforeEach(async () => {
        let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await consoleUtils.initializeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        let invalidCalldata = await consoleUtils.updateGlobalMinContribution.call(
          updateTo, adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsole.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        invalidReturn = await storage.exec.call(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).should.be.fulfilled

        events = await storage.exec(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        invalidEvent = events[0]
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          invalidReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          invalidReturn[0].toNumber().should.be.eq(0)
        })

        it('should return the correct number of addresses paid', async () => {
          invalidReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          invalidReturn[2].toNumber().should.be.eq(0)
        })
      })

      it('should emit an ApplicationException event', async () => {
        invalidEvent.event.should.be.eq('ApplicationException')
      })

      describe('the ApplicationException event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = invalidEvent.args['execution_id']
          emittedExecID.should.be.eq(executionID)
        })

        it('should match the CrowdsaleConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(crowdsaleConsole.address)
        })

        it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
        })
      })

      describe('storage', async () => {

        let crowdsaleInfo

        beforeEach(async () => {
          crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          crowdsaleInfo.should.not.eq(null)
          crowdsaleInfo.length.should.be.eq(5)
        })

        it('should not have any wei raised', async () => {
          crowdsaleInfo[0].toNumber().should.be.eq(0)
        })

        it('should match the team wallet set previously', async () => {
          crowdsaleInfo[1].should.be.eq(teamWallet)
        })

        it('should not have an initialized minimum contribution amount', async () => {
          crowdsaleInfo[2].toNumber().should.be.eq(0)
        })

        it('should be initialized, but not finalized', async () => {
          crowdsaleInfo[3].should.be.eq(true)
          crowdsaleInfo[4].should.be.eq(false)
        })
      })
    })

    context('when the crowdsale is not yet initialized', async () => {

      context('when the sender is the admin', async () => {

        context('when the new amount is 0', async () => {

          beforeEach(async () => {
            updateMinCalldata = await consoleUtils.updateGlobalMinContribution.call(
              updateTo, adminContext
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            updateMinCalldata = await consoleUtils.updateGlobalMinContribution.call(
              updateToZero, adminContext
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            updateMinReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, updateMinCalldata,
              { from: exec }
            ).should.be.fulfilled

            updateMinEvents = await storage.exec(
              crowdsaleConsole.address, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              updateMinReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              updateMinReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              updateMinReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              updateMinReturn[2].toNumber().should.be.eq(1)
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
                eventTopics = updateMinEvents[0].topics
                eventData = updateMinEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(2)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(updateMinHash))
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

            let crowdsaleInfo

            beforeEach(async () => {
              crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.should.not.eq(null)
              crowdsaleInfo.length.should.be.eq(5)
            })

            it('should not have any wei raised', async () => {
              crowdsaleInfo[0].toNumber().should.be.eq(0)
            })

            it('should match the team wallet set previously', async () => {
              crowdsaleInfo[1].should.be.eq(teamWallet)
            })

            it('should have the correct minimum contribution amount', async () => {
              crowdsaleInfo[2].toNumber().should.be.eq(0)
            })

            it('should not be initialized or finalized', async () => {
              crowdsaleInfo[3].should.be.eq(false)
              crowdsaleInfo[4].should.be.eq(false)
            })
          })
        })

        context('when the old amount was 0', async () => {

          beforeEach(async () => {
            updateMinCalldata = await consoleUtils.updateGlobalMinContribution.call(
              updateTo, adminContext
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            updateMinReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, updateMinCalldata,
              { from: exec }
            ).should.be.fulfilled

            updateMinEvents = await storage.exec(
              crowdsaleConsole.address, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              updateMinReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              updateMinReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              updateMinReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              updateMinReturn[2].toNumber().should.be.eq(1)
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
                eventTopics = updateMinEvents[0].topics
                eventData = updateMinEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(2)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(updateMinHash))
              })

              it('should match the exec id for the other topic', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
              })

              it('should match the updated amount in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(
                  web3.toDecimal(web3.toHex(updateTo))
                )
              })
            })
          })

          describe('storage', async () => {

            let crowdsaleInfo

            beforeEach(async () => {
              crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.should.not.eq(null)
              crowdsaleInfo.length.should.be.eq(5)
            })

            it('should not have any wei raised', async () => {
              crowdsaleInfo[0].toNumber().should.be.eq(0)
            })

            it('should match the team wallet set previously', async () => {
              crowdsaleInfo[1].should.be.eq(teamWallet)
            })

            it('should have the correct minimum contribution amount', async () => {
              web3.fromWei(crowdsaleInfo[2].toNumber(), 'wei').should.be.eq(updateTo)
            })

            it('should not be initialized or finalized', async () => {
              crowdsaleInfo[3].should.be.eq(false)
              crowdsaleInfo[4].should.be.eq(false)
            })
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          let invalidCalldata = await consoleUtils.updateGlobalMinContribution.call(
            updateTo, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          let crowdsaleInfo

          beforeEach(async () => {
            crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            crowdsaleInfo.should.not.eq(null)
            crowdsaleInfo.length.should.be.eq(5)
          })

          it('should not have any wei raised', async () => {
            crowdsaleInfo[0].toNumber().should.be.eq(0)
          })

          it('should match the team wallet set previously', async () => {
            crowdsaleInfo[1].should.be.eq(teamWallet)
          })

          it('should not have an initialized minimum contribution amount', async () => {
            crowdsaleInfo[2].toNumber().should.be.eq(0)
          })

          it('should not be initialized or finalized', async () => {
            crowdsaleInfo[3].should.be.eq(false)
            crowdsaleInfo[4].should.be.eq(false)
          })
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
      let invalidEvent
      let invalidReturn

      context('such as mismatched input lengths', async () => {

        let invalidTierPrices = [web3.toWei('0.001', 'ether'), web3.toWei('0.005', 'ether')]

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, invalidTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'ArrayLenMismatch\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ArrayLenMismatch').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should currently be tier 0', async () => {
            let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(7)

            hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(0)
            curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
            web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
            curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
            curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
          })

          it('should not return information about tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
            tierOneInfo[1].toNumber().should.be.eq(0)
            tierOneInfo[2].toNumber().should.be.eq(0)
            tierOneInfo[3].toNumber().should.be.eq(0)
            tierOneInfo[4].should.be.eq(false)
            tierOneInfo[5].should.be.eq(false)
          })

          it('should have a tier list of length 1', async () => {
            let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierListInfo.length.should.be.eq(1)
            hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
          })
        })
      })

      context('such as inputs of length 0', async () => {

        let invalidNames = []

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
            invalidNames, multiTierDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'ArrayLenMismatch\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ArrayLenMismatch').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should currently be tier 0', async () => {
            let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(7)

            hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(0)
            curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
            web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
            curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
            curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
          })

          it('should not return information about tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
            tierOneInfo[1].toNumber().should.be.eq(0)
            tierOneInfo[2].toNumber().should.be.eq(0)
            tierOneInfo[3].toNumber().should.be.eq(0)
            tierOneInfo[4].should.be.eq(false)
            tierOneInfo[5].should.be.eq(false)
          })

          it('should have a tier list of length 1', async () => {
            let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierListInfo.length.should.be.eq(1)
            hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
          })
        })
      })

      context('such as an input tier sell cap of 0', async () => {

        let invalidTierCaps = [
          web3.toWei('10', 'ether'),
          0,
          web3.toWei('30', 'ether')
        ]

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, multiTierPrices,
            invalidTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'InvalidTierVals\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidTierVals').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should currently be tier 0', async () => {
            let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(7)

            hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(0)
            curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
            web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
            curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
            curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
          })

          it('should not return information about tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
            tierOneInfo[1].toNumber().should.be.eq(0)
            tierOneInfo[2].toNumber().should.be.eq(0)
            tierOneInfo[3].toNumber().should.be.eq(0)
            tierOneInfo[4].should.be.eq(false)
            tierOneInfo[5].should.be.eq(false)
          })

          it('should have a tier list of length 1', async () => {
            let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierListInfo.length.should.be.eq(1)
            hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
          })
        })
      })

      context('such as an input tier duration of 0', async () => {

        let invalidDurations = [0, 2000, 3000]

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
            multiTierNames, invalidDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'InvalidTierVals\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidTierVals').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should currently be tier 0', async () => {
            let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(7)

            hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(0)
            curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
            web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
            curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
            curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
          })

          it('should not return information about tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
            tierOneInfo[1].toNumber().should.be.eq(0)
            tierOneInfo[2].toNumber().should.be.eq(0)
            tierOneInfo[3].toNumber().should.be.eq(0)
            tierOneInfo[4].should.be.eq(false)
            tierOneInfo[5].should.be.eq(false)
          })

          it('should have a tier list of length 1', async () => {
            let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierListInfo.length.should.be.eq(1)
            hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
          })
        })
      })

      context('such as an input tier price of 0', async () => {

        let invalidPrices = [
          web3.toWei('0.1', 'ether'),
          web3.toWei('0.2', 'ether'),
          0
        ]

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, invalidPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'InvalidTierVals\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidTierVals').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should currently be tier 0', async () => {
            let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(7)

            hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(0)
            curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
            web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
            curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
            curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
          })

          it('should not return information about tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
            tierOneInfo[1].toNumber().should.be.eq(0)
            tierOneInfo[2].toNumber().should.be.eq(0)
            tierOneInfo[3].toNumber().should.be.eq(0)
            tierOneInfo[4].should.be.eq(false)
            tierOneInfo[5].should.be.eq(false)
          })

          it('should have a tier list of length 1', async () => {
            let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierListInfo.length.should.be.eq(1)
            hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
          })
        })
      })
    })

    context('when the input parameters are valid', async () => {

      context('when the crowdsale is already initialized', async () => {

        let invalidCalldata
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await consoleUtils.initializeCrowdsale.call(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should currently be tier 0', async () => {
            let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            curTierInfo.length.should.be.eq(7)

            hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
            curTierInfo[1].toNumber().should.be.eq(0)
            curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
            web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
            curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
            curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
          })

          it('should not return information about tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
            tierOneInfo[1].toNumber().should.be.eq(0)
            tierOneInfo[2].toNumber().should.be.eq(0)
            tierOneInfo[3].toNumber().should.be.eq(0)
            tierOneInfo[4].should.be.eq(false)
            tierOneInfo[5].should.be.eq(false)
          })

          it('should have a tier list of length 1', async () => {
            let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierListInfo.length.should.be.eq(1)
            hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
          })
        })
      })

      context('when the crowdsale is not yet initialized', async () => {

        context('when the sender is the admin', async () => {

          context('and wants to add a single tier', async () => {

            beforeEach(async () => {
              updateTierCalldata = await consoleUtils.createCrowdsaleTiers.call(
                singleTierNames, singleTierDuration, singleTierPrice,
                singleTierCap, singleTierModStatus, singleTierWhitelistStat, adminContext
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              updateTierReturn = await storage.exec.call(
                crowdsaleConsole.address, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateTierEvents = await storage.exec(
                crowdsaleConsole.address, executionID, updateTierCalldata,
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
                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
                let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                  storage.address, executionID
                ).should.be.fulfilled
                timeInfo.length.should.be.eq(2)

                timeInfo[0].toNumber().should.be.eq(startTime)
                timeInfo[1].toNumber().should.be.eq(
                  startTime + initialTierDuration + singleTierDuration[0]
                )
              })

              it('should currently be tier 0', async () => {
                let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
                  storage.address, executionID
                ).should.be.fulfilled
                curTierInfo.length.should.be.eq(7)

                hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
                curTierInfo[1].toNumber().should.be.eq(0)
                curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
                web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
                curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
                curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
              })

              it('should return valid information about tier 1', async () => {
                let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
                  storage.address, executionID, 1
                ).should.be.fulfilled
                tierOneInfo.length.should.be.eq(6)

                hexStrEquals(tierOneInfo[0], singleTierNames[0]).should.be.eq(true)
                web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(singleTierCap[0])
                web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(singleTierPrice[0])
                tierOneInfo[3].toNumber().should.be.eq(singleTierDuration[0])
                tierOneInfo[4].should.be.eq(singleTierModStatus[0])
                tierOneInfo[5].should.be.eq(singleTierWhitelistStat[0])
              })

              it('should have a tier list of length 2', async () => {
                let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
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
              updateTierCalldata = await consoleUtils.createCrowdsaleTiers.call(
                multiTierNames, multiTierDurations, multiTierPrices,
                multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              updateTierReturn = await storage.exec.call(
                crowdsaleConsole.address, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateTierEvents = await storage.exec(
                crowdsaleConsole.address, executionID, updateTierCalldata,
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
                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
                let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
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
                let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
                  storage.address, executionID
                ).should.be.fulfilled
                curTierInfo.length.should.be.eq(7)

                hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
                curTierInfo[1].toNumber().should.be.eq(0)
                curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
                web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
                curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
                curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
              })

              describe('Tier A (First added tier)', async () => {

                it('should return valid information about tier 1', async () => {
                  let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneInfo.length.should.be.eq(6)

                  hexStrEquals(tierOneInfo[0], multiTierNames[0]).should.be.eq(true)
                  web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[0])
                  web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[0])
                  tierOneInfo[3].toNumber().should.be.eq(multiTierDurations[0])
                  tierOneInfo[4].should.be.eq(multiTierModStatus[0])
                  tierOneInfo[5].should.be.eq(multiTierWhitelistStat[0])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierOneTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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

                  let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoInfo.length.should.be.eq(6)

                  hexStrEquals(tierTwoInfo[0], multiTierNames[1]).should.be.eq(true)
                  web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[1])
                  web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[1])
                  tierTwoInfo[3].toNumber().should.be.eq(multiTierDurations[1])
                  tierTwoInfo[4].should.be.eq(multiTierModStatus[1])
                  tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierTwoTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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

                  let tierThreeInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 3
                  ).should.be.fulfilled
                  tierThreeInfo.length.should.be.eq(6)

                  hexStrEquals(tierThreeInfo[0], multiTierNames[2]).should.be.eq(true)
                  web3.fromWei(tierThreeInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[2])
                  web3.fromWei(tierThreeInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[2])
                  tierThreeInfo[3].toNumber().should.be.eq(multiTierDurations[2])
                  tierThreeInfo[4].should.be.eq(multiTierModStatus[2])
                  tierThreeInfo[5].should.be.eq(multiTierWhitelistStat[2])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierThreeTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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
                let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
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
              updateTierCalldata = await consoleUtils.createCrowdsaleTiers.call(
                multiTierNames, multiTierDurations, multiTierPrices,
                multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              updateTierReturn = await storage.exec.call(
                crowdsaleConsole.address, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              updateTierEvents = await storage.exec(
                crowdsaleConsole.address, executionID, updateTierCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })

              updateTierCalldata = await consoleUtils.createCrowdsaleTiers.call(
                singleTierNames, singleTierDuration, singleTierPrice,
                singleTierCap, singleTierModStatus, singleTierWhitelistStat, adminContext
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              secondTierUpdateReturn = await storage.exec.call(
                crowdsaleConsole.address, executionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              secondTierUpdateEvents = await storage.exec(
                crowdsaleConsole.address, executionID, updateTierCalldata,
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
                    web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
                    web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
                let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
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
                let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
                  storage.address, executionID
                ).should.be.fulfilled
                curTierInfo.length.should.be.eq(7)

                hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
                curTierInfo[1].toNumber().should.be.eq(0)
                curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
                web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
                curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
                curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
              })

              describe('Tier A (First added tier)', async () => {

                it('should return valid information about tier 1', async () => {
                  let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 1
                  ).should.be.fulfilled
                  tierOneInfo.length.should.be.eq(6)

                  hexStrEquals(tierOneInfo[0], multiTierNames[0]).should.be.eq(true)
                  web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[0])
                  web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[0])
                  tierOneInfo[3].toNumber().should.be.eq(multiTierDurations[0])
                  tierOneInfo[4].should.be.eq(multiTierModStatus[0])
                  tierOneInfo[5].should.be.eq(multiTierWhitelistStat[0])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierOneTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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

                  let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 2
                  ).should.be.fulfilled
                  tierTwoInfo.length.should.be.eq(6)

                  hexStrEquals(tierTwoInfo[0], multiTierNames[1]).should.be.eq(true)
                  web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[1])
                  web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[1])
                  tierTwoInfo[3].toNumber().should.be.eq(multiTierDurations[1])
                  tierTwoInfo[4].should.be.eq(multiTierModStatus[1])
                  tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierTwoTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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

                  let tierThreeInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 3
                  ).should.be.fulfilled
                  tierThreeInfo.length.should.be.eq(6)

                  hexStrEquals(tierThreeInfo[0], multiTierNames[2]).should.be.eq(true)
                  web3.fromWei(tierThreeInfo[1].toNumber(), 'wei').should.be.eq(multiTierCaps[2])
                  web3.fromWei(tierThreeInfo[2].toNumber(), 'wei').should.be.eq(multiTierPrices[2])
                  tierThreeInfo[3].toNumber().should.be.eq(multiTierDurations[2])
                  tierThreeInfo[4].should.be.eq(multiTierModStatus[2])
                  tierThreeInfo[5].should.be.eq(multiTierWhitelistStat[2])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierThreeTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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

                  let tierFourInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, executionID, 4
                  ).should.be.fulfilled
                  tierFourInfo.length.should.be.eq(6)

                  hexStrEquals(tierFourInfo[0], singleTierNames[0]).should.be.eq(true)
                  web3.fromWei(tierFourInfo[1].toNumber(), 'wei').should.be.eq(singleTierCap[0])
                  web3.fromWei(tierFourInfo[2].toNumber(), 'wei').should.be.eq(singleTierPrice[0])
                  tierFourInfo[3].toNumber().should.be.eq(singleTierDuration[0])
                  tierFourInfo[4].should.be.eq(singleTierModStatus[0])
                  tierFourInfo[5].should.be.eq(singleTierWhitelistStat[0])
                })

                it('should have correct start and end times for the tier', async () => {

                  let tierFourTimeInfo = await initCrowdsale.getTierStartAndEndDates.call(
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
                let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
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
          let invalidEvent
          let invalidReturn

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.createCrowdsaleTiers.call(
              multiTierNames, multiTierDurations, multiTierPrices,
              multiTierCaps, multiTierModStatus, multiTierWhitelistStat, otherContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            invalidReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, invalidCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, invalidCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            invalidEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              invalidReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              invalidReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              invalidReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              invalidReturn[2].toNumber().should.be.eq(0)
            })
          })

          it('should emit an ApplicationException event', async () => {
            invalidEvent.event.should.be.eq('ApplicationException')
          })

          describe('the ApplicationException event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = invalidEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })

            it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
            })
          })

          describe('storage', async () => {

            it('should have unchanged start and end times', async () => {
              let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                storage.address, executionID
              ).should.be.fulfilled
              timeInfo.length.should.be.eq(2)

              timeInfo[0].toNumber().should.be.eq(startTime)
              timeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
            })

            it('should currently be tier 0', async () => {
              let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              curTierInfo.length.should.be.eq(7)

              hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
              curTierInfo[1].toNumber().should.be.eq(0)
              curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
              web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
              web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
              curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
              curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
            })

            it('should not return information about tier 1', async () => {
              let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
                storage.address, executionID, 1
              ).should.be.fulfilled
              tierOneInfo.length.should.be.eq(6)

              web3.toDecimal(tierOneInfo[0]).should.be.eq(0)
              tierOneInfo[1].toNumber().should.be.eq(0)
              tierOneInfo[2].toNumber().should.be.eq(0)
              tierOneInfo[3].toNumber().should.be.eq(0)
              tierOneInfo[4].should.be.eq(false)
              tierOneInfo[5].should.be.eq(false)
            })

            it('should have a tier list of length 1', async () => {
              let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
                storage.address, executionID
              ).should.be.fulfilled
              tierListInfo.length.should.be.eq(1)
              hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
            })
          })
        })
      })
    })

    describe('contract storage once token is initialized', async () => {

      context('where only one tier was added', async () => {

        beforeEach(async () => {
          updateTierCalldata = await consoleUtils.createCrowdsaleTiers.call(
            singleTierNames, singleTierDuration, singleTierPrice,
            singleTierCap, singleTierModStatus, singleTierWhitelistStat, adminContext
          ).should.be.fulfilled
          updateTierCalldata.should.not.eq('0x')

          let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleConsole.address, executionID, updateTierCalldata,
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
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(18)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have a tier list length of 2', async () => {
            let tierInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierInfo.length.should.be.eq(2)

            hexStrEquals(tierInfo[0], initialTierName).should.be.eq(true)
            hexStrEquals(tierInfo[1], singleTierNames[0]).should.be.eq(true)
          })

          it('should correctly calculate the maximum raise amount', async () => {
            let raiseInfo = await initCrowdsale.getCrowdsaleMaxRaise.call(
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
            let sellableInfo = await initCrowdsale.isCrowdsaleFull.call(
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
          updateTierCalldata = await consoleUtils.createCrowdsaleTiers.call(
            multiTierNames, multiTierDurations, multiTierPrices,
            multiTierCaps, multiTierModStatus, multiTierWhitelistStat, adminContext
          ).should.be.fulfilled
          updateTierCalldata.should.not.eq('0x')

          let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleConsole.address, executionID, updateTierCalldata,
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
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(18)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have a tier list length of 4', async () => {
            let tierInfo = await initCrowdsale.getCrowdsaleTierList.call(
              storage.address, executionID
            ).should.be.fulfilled
            tierInfo.length.should.be.eq(4)

            hexStrEquals(tierInfo[0], initialTierName).should.be.eq(true)
            hexStrEquals(tierInfo[1], multiTierNames[0]).should.be.eq(true)
            hexStrEquals(tierInfo[2], multiTierNames[1]).should.be.eq(true)
            hexStrEquals(tierInfo[3], multiTierNames[2]).should.be.eq(true)
          })

          it('should correctly calculate the maximum raise amount', async () => {
            let raiseInfo = await initCrowdsale.getCrowdsaleMaxRaise.call(
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
            let sellableInfo = await initCrowdsale.isCrowdsaleFull.call(
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

    let initMockCalldata

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
      let invalidEvent
      let invalidReturn

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await consoleUtils.createCrowdsaleTiers.call(
          tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
          multiTierWhitelistStat, mockAdminContext
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, mockExecutionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
          storage.address, mockExecutionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      context('such as tier 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            0, newDuration, mockAdminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await crowdsaleConsoleMock.setTime(startTime + initialTierDuration).should.be.fulfilled
          let storedTime = await crowdsaleConsoleMock.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(startTime + initialTierDuration)

          invalidReturn = await storage.exec.call(
            crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(mockExecutionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'CannotModifyCurrentTier\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'CannotModifyCurrentTier').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, mockExecutionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })

          it('should have unchanged duration for tier 0', async () => {
            let tierZeroInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, mockExecutionID, 0
            ).should.be.fulfilled
            tierZeroInfo.length.should.be.eq(6)

            hexStrEquals(tierZeroInfo[0], initialTierName).should.be.eq(true)
            web3.fromWei(tierZeroInfo[1].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
            web3.fromWei(tierZeroInfo[2].toNumber(), 'wei').should.be.eq(initialTierPrice)
            tierZeroInfo[3].toNumber().should.be.eq(initialTierDuration)
            tierZeroInfo[4].should.be.eq(true)
            tierZeroInfo[5].should.be.eq(true)
          })

          it('should have unchanged start and end dates for tier 0', async () => {
            let tierZeroDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, mockExecutionID, 0
            ).should.be.fulfilled
            tierZeroDates.length.should.be.eq(2)

            tierZeroDates[0].toNumber().should.be.eq(startTime)
            tierZeroDates[1].toNumber().should.be.eq(startTime + initialTierDuration)
          })

          it('should have unchanged start and end dates for tier 1', async () => {
            let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, mockExecutionID, 1
            ).should.be.fulfilled
            tierOneDates.length.should.be.eq(2)

            tierOneDates[0].toNumber().should.be.eq(startTime + initialTierDuration)
            tierOneDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
          })
        })
      })

      context('such as a tier which isn\'t tier 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            1, newDuration, mockAdminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await crowdsaleConsoleMock.setTime(startTime + initialTierDuration + tierDurations[0]).should.be.fulfilled
          let storedTime = await crowdsaleConsoleMock.getTime.call().should.be.fulfilled
          storedTime.toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0])

          invalidReturn = await storage.exec.call(
            crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(mockExecutionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'CannotModifyCurrentTier\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'CannotModifyCurrentTier').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, mockExecutionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })

          it('should have unchanged duration for tier 1', async () => {
            let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, mockExecutionID, 1
            ).should.be.fulfilled
            tierOneInfo.length.should.be.eq(6)

            hexStrEquals(tierOneInfo[0], tierNames[0]).should.be.eq(true)
            web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[0])
            web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[0])
            tierOneInfo[3].toNumber().should.be.eq(tierDurations[0])
            tierOneInfo[4].should.be.eq(tierAllModifiable[0])
            tierOneInfo[5].should.be.eq(multiTierWhitelistStat[0])
          })

          it('should have unchanged start and end dates for tier 1', async () => {
            let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, mockExecutionID, 1
            ).should.be.fulfilled
            tierOneDates.length.should.be.eq(2)

            tierOneDates[0].toNumber().should.be.eq(startTime + initialTierDuration)
            tierOneDates[1].toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0])
          })

          it('should have unchanged start and end dates for tier 2', async () => {
            let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, mockExecutionID, 2
            ).should.be.fulfilled
            tierTwoDates.length.should.be.eq(2)

            tierTwoDates[0].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            tierTwoDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
              + tierDurations[1]
            )
          })
        })
      })
    })

    context('when the tier to update is the current tier', async () => {

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await consoleUtils.createCrowdsaleTiers(
          tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
          multiTierWhitelistStat, mockAdminContext
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, mockExecutionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes(
          storage.address, mockExecutionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      describe('crowdsale storage - pre tier updates', async () => {

        it('should match the set admin address', async () => {
          let adminInfo = await initCrowdsale.getAdmin.call(
            storage.address, mockExecutionID
          ).should.be.fulfilled
          adminInfo.should.be.eq(crowdsaleAdmin)
        })

        it('should have correctly set start and end times for the crowdsale', async () => {
          let saleDates = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
            storage.address, mockExecutionID
          ).should.be.fulfilled
          saleDates.length.should.be.eq(2)

          saleDates[0].toNumber().should.be.eq(startTime)
          saleDates[1].toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
          )
        })

        it('should currently be tier 0', async () => {
          let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
            storage.address, mockExecutionID
          ).should.be.fulfilled
          curTierInfo.length.should.be.eq(7)

          hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
          curTierInfo[1].toNumber().should.be.eq(0)
          curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
          web3.fromWei(curTierInfo[3].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
          web3.fromWei(curTierInfo[4].toNumber(), 'wei').should.be.eq(initialTierPrice)
          curTierInfo[5].should.be.eq(true)
          curTierInfo[6].should.be.eq(true)
        })

        it('should currently have 3 tiers', async () => {
          let tiersInfo = await initCrowdsale.getCrowdsaleTierList.call(
            storage.address, mockExecutionID
          ).should.be.fulfilled
          tiersInfo.length.should.be.eq(3)

          hexStrEquals(tiersInfo[0], initialTierName).should.be.eq(true)
          hexStrEquals(tiersInfo[1], tierNames[0]).should.be.eq(true)
          hexStrEquals(tiersInfo[2], tierNames[1]).should.be.eq(true)
        })

        it('should have the correct start and end dates for each tier', async () => {
          let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
            storage.address, mockExecutionID, 0
          ).should.be.fulfilled
          tierOneDates.length.should.be.eq(2)

          let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
            storage.address, mockExecutionID, 1
          ).should.be.fulfilled
          tierTwoDates.length.should.be.eq(2)

          let tierThreeDates = await initCrowdsale.getTierStartAndEndDates.call(
            storage.address, mockExecutionID, 2
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
          let invalidEvent
          let invalidReturn

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.updateTierDuration.call(
              0, newDuration, mockAdminContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            await crowdsaleConsoleMock.setTime(startTime).should.be.fulfilled
            let storedTime = await crowdsaleConsoleMock.getTime.call().should.be.fulfilled
            storedTime.toNumber().should.be.eq(startTime)

            invalidReturn = await storage.exec.call(
              crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            invalidEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              invalidReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              invalidReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              invalidReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              invalidReturn[2].toNumber().should.be.eq(0)
            })
          })

          it('should emit an ApplicationException event', async () => {
            invalidEvent.event.should.be.eq('ApplicationException')
          })

          describe('the ApplicationException event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = invalidEvent.args['execution_id']
              emittedExecID.should.be.eq(mockExecutionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })

            it('should contain the error message \'CannotModifyCurrentTier\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'CannotModifyCurrentTier').should.be.eq(true)
            })
          })

          describe('storage', async () => {

            it('should have unchanged start and end times', async () => {
              let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                storage.address, mockExecutionID
              ).should.be.fulfilled
              newTimeInfo.length.should.be.eq(2)

              newTimeInfo[0].toNumber().should.be.eq(startTime)
              newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
            })

            it('should have unchanged duration for tier 0', async () => {
              let tierZeroInfo = await initCrowdsale.getCrowdsaleTier.call(
                storage.address, mockExecutionID, 0
              ).should.be.fulfilled
              tierZeroInfo.length.should.be.eq(6)

              hexStrEquals(tierZeroInfo[0], initialTierName).should.be.eq(true)
              web3.fromWei(tierZeroInfo[1].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
              web3.fromWei(tierZeroInfo[2].toNumber(), 'wei').should.be.eq(initialTierPrice)
              tierZeroInfo[3].toNumber().should.be.eq(initialTierDuration)
              tierZeroInfo[4].should.be.eq(initialTierDurIsModifiable)
              tierZeroInfo[5].should.be.eq(initialTierIsWhitelisted)
            })

            it('should have unchanged start and end dates for tier 0', async () => {
              let tierZeroDates = await initCrowdsale.getTierStartAndEndDates.call(
                storage.address, mockExecutionID, 0
              ).should.be.fulfilled
              tierZeroDates.length.should.be.eq(2)

              tierZeroDates[0].toNumber().should.be.eq(startTime)
              tierZeroDates[1].toNumber().should.be.eq(startTime + initialTierDuration)
            })

            it('should have unchanged start and end dates for tier 1', async () => {
              let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
                storage.address, mockExecutionID, 1
              ).should.be.fulfilled
              tierOneDates.length.should.be.eq(2)

              tierOneDates[0].toNumber().should.be.eq(
                startTime + initialTierDuration
              )
              tierOneDates[1].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
            })
          })
        })

        context('and the crowdsale has not started', async () => {

          context('and tier 0 was set to not-modifiable', async () => {

            let invalidCalldata
            let invalidEvent
            let invalidReturn

            let initTierDurMod = false
            let noModStartTime
            let noModExecID

            let noModAdminContext

            beforeEach(async () => {
              // Initialize a new crowdsale application through storage with a non-modifiable first tier
              noModStartTime = getTime() + 3600

              let noModInitCalldata = await testUtils.init.call(
                teamWallet, noModStartTime, initialTierName, initialTierPrice,
                initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
                initTierDurMod, crowdsaleAdmin
              ).should.be.fulfilled
              noModInitCalldata.should.not.eq('0x')

              let events = await storage.initAndFinalize(
                updater, true, initCrowdsale.address, noModInitCalldata, [
                  crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
                  tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
                ],
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(2)

              events[0].event.should.be.eq('ApplicationInitialized')
              events[1].event.should.be.eq('ApplicationFinalization')
              noModExecID = events[0].args['execution_id']
              web3.toDecimal(noModExecID).should.not.eq(0)

              noModAdminContext = await testUtils.getContext.call(
                noModExecID, crowdsaleAdmin, 0
              ).should.be.fulfilled
              noModAdminContext.should.not.eq('0x')

              initialEndTime = noModStartTime + initialTierDuration + tierDurations[0] + tierDurations[1]

              // Create tiers for the initialized crowdsale
              let createTiersCalldata = await consoleUtils.createCrowdsaleTiers.call(
                tierNames, tierDurations, tierPrices, tierCaps, tierAllModifiable,
                multiTierWhitelistStat, noModAdminContext
              ).should.be.fulfilled
              createTiersCalldata.should.not.eq('0x')

              events = await storage.exec(
                crowdsaleConsole.address, noModExecID, createTiersCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              // Check start and end time
              let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                storage.address, noModExecID
              ).should.be.fulfilled
              timeInfo.length.should.be.eq(2)
              timeInfo[0].toNumber().should.be.eq(noModStartTime)
              timeInfo[1].toNumber().should.be.eq(initialEndTime)

              // Attempt to update tier 0's duration
              invalidCalldata = await consoleUtils.updateTierDuration.call(
                0, newDuration, noModAdminContext
              ).should.be.fulfilled
              invalidCalldata.should.not.eq('0x')

              invalidReturn = await storage.exec.call(
                crowdsaleConsole.address, noModExecID, invalidCalldata,
                { from: exec }
              ).should.be.fulfilled

              events = await storage.exec(
                crowdsaleConsole.address, noModExecID, invalidCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)

              invalidEvent = events[0]
            })

            describe('returned data', async () => {

              it('should return a tuple with 3 fields', async () => {
                invalidReturn.length.should.be.eq(3)
              })

              it('should return the correct number of events emitted', async () => {
                invalidReturn[0].toNumber().should.be.eq(0)
              })

              it('should return the correct number of addresses paid', async () => {
                invalidReturn[1].toNumber().should.be.eq(0)
              })

              it('should return the correct number of storage slots written to', async () => {
                invalidReturn[2].toNumber().should.be.eq(0)
              })
            })

            it('should emit an ApplicationException event', async () => {
              invalidEvent.event.should.be.eq('ApplicationException')
            })

            describe('the ApplicationException event', async () => {

              it('should match the used execution id', async () => {
                let emittedExecID = invalidEvent.args['execution_id']
                emittedExecID.should.be.eq(noModExecID)
              })

              it('should match the CrowdsaleConsole address', async () => {
                let emittedAppAddr = invalidEvent.args['application_address']
                emittedAppAddr.should.be.eq(crowdsaleConsole.address)
              })

              it('should contain the error message \'InvalidCrowdsaleStatus\'', async () => {
                let emittedMessage = invalidEvent.args['message']
                hexStrEquals(emittedMessage, 'InvalidCrowdsaleStatus').should.be.eq(true)
              })
            })

            describe('storage', async () => {

              it('should have unchanged start and end times', async () => {
                let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                  storage.address, noModExecID
                ).should.be.fulfilled
                newTimeInfo.length.should.be.eq(2)

                newTimeInfo[0].toNumber().should.be.eq(noModStartTime)
                newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
              })

              it('should have unchanged duration for tier 0', async () => {
                let tierZeroInfo = await initCrowdsale.getCrowdsaleTier.call(
                  storage.address, noModExecID, 0
                ).should.be.fulfilled
                tierZeroInfo.length.should.be.eq(6)

                hexStrEquals(tierZeroInfo[0], initialTierName).should.be.eq(true)
                web3.fromWei(tierZeroInfo[1].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(tierZeroInfo[2].toNumber(), 'wei').should.be.eq(initialTierPrice)
                tierZeroInfo[3].toNumber().should.be.eq(initialTierDuration)
                tierZeroInfo[4].should.be.eq(initTierDurMod)
                tierZeroInfo[5].should.be.eq(initialTierIsWhitelisted)
              })

              it('should have unchanged start and end dates for tier 0', async () => {
                let tierZeroDates = await initCrowdsale.getTierStartAndEndDates.call(
                  storage.address, noModExecID, 0
                ).should.be.fulfilled
                tierZeroDates.length.should.be.eq(2)

                tierZeroDates[0].toNumber().should.be.eq(noModStartTime)
                tierZeroDates[1].toNumber().should.be.eq(noModStartTime + initialTierDuration)
              })

              it('should have unchanged start and end dates for tier 1', async () => {
                let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
                  storage.address, noModExecID, 1
                ).should.be.fulfilled
                tierOneDates.length.should.be.eq(2)

                tierOneDates[0].toNumber().should.be.eq(
                  noModStartTime + initialTierDuration
                )
                tierOneDates[1].toNumber().should.be.eq(
                  noModStartTime + initialTierDuration + tierDurations[0]
                )
              })
            })
          })

          context('and tier 0 was set to is-modifiable', async () => {

            beforeEach(async () => {
              updateTierCalldata = await consoleUtils.updateTierDuration.call(
                0, newDuration, mockAdminContext
              ).should.be.fulfilled
              updateTierCalldata.should.not.eq('0x')

              await crowdsaleConsoleMock.resetTime().should.be.fulfilled
              let storedTime = await crowdsaleConsoleMock.set_time.call().should.be.fulfilled
              storedTime.toNumber().should.be.eq(0)

              updateTierReturn = await storage.exec.call(
                crowdsaleConsoleMock.address, mockExecutionID, updateTierCalldata,
                { from: exec }
              ).should.be.fulfilled

              let events = await storage.exec(
                crowdsaleConsoleMock.address, mockExecutionID, updateTierCalldata,
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
                emittedExecID.should.be.eq(mockExecutionID)
              })

              it('should match the CrowdsaleConsole address', async () => {
                let emittedAppAddr = updateTierEvent.args['script_target']
                emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
              })
            })

            describe('storage', async () => {

              it('should have a new crowdsale end time', async () => {
                let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                  storage.address, mockExecutionID
                ).should.be.fulfilled
                newTimeInfo.length.should.be.eq(2)

                newTimeInfo[0].toNumber().should.be.eq(startTime)
                newTimeInfo[1].toNumber().should.be.eq(
                  initialEndTime - (initialTierDuration - newDuration)
                )
              })

              it('should have correctly updated tier 0 duration', async () => {
                let tierZeroInfo = await initCrowdsale.getCrowdsaleTier.call(
                  storage.address, mockExecutionID, 0
                ).should.be.fulfilled
                tierZeroInfo.length.should.be.eq(6)

                hexStrEquals(tierZeroInfo[0], initialTierName).should.be.eq(true)
                web3.fromWei(tierZeroInfo[1].toNumber(), 'wei').should.be.eq(initialTierTokenSellCap)
                web3.fromWei(tierZeroInfo[2].toNumber(), 'wei').should.be.eq(initialTierPrice)
                tierZeroInfo[3].toNumber().should.be.eq(newDuration)
                tierZeroInfo[4].should.be.eq(initialTierDurIsModifiable)
                tierZeroInfo[5].should.be.eq(initialTierIsWhitelisted)
              })

              it('should have correctly updated the end date for tier 0', async () => {
                let tierZeroDates = await initCrowdsale.getTierStartAndEndDates.call(
                  storage.address, mockExecutionID, 0
                ).should.be.fulfilled
                tierZeroDates.length.should.be.eq(2)

                tierZeroDates[0].toNumber().should.be.eq(startTime)
                tierZeroDates[1].toNumber().should.be.eq(startTime + newDuration)
              })

              describe('Tier 1', async () => {

                it('should have correctly changed start and end dates for tier 1', async () => {
                  let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
                    storage.address, mockExecutionID, 1
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
                  let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, mockExecutionID, 1
                  ).should.be.fulfilled
                  tierOneInfo.length.should.be.eq(6)

                  hexStrEquals(tierOneInfo[0], tierNames[0]).should.be.eq(true)
                  web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[0])
                  web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[0])
                  tierOneInfo[3].toNumber().should.be.eq(tierDurations[0])
                  tierOneInfo[4].should.be.eq(tierAllModifiable[0])
                  tierOneInfo[5].should.be.eq(multiTierWhitelistStat[0])
                })
              })

              describe('Tier 2', async () => {

                it('should have correctly changed start and end dates for tier 2', async () => {
                  let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
                    storage.address, mockExecutionID, 2
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
                  let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
                    storage.address, mockExecutionID, 2
                  ).should.be.fulfilled
                  tierTwoInfo.length.should.be.eq(6)

                  hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
                  web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
                  web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
                  tierTwoInfo[3].toNumber().should.be.eq(tierDurations[1])
                  tierTwoInfo[4].should.be.eq(tierAllModifiable[1])
                  tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
                })
              })
            })
          })
        })
      })

      context('and the current tier is not tier 0', async () => {

        let invalidCalldata
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            2, newDuration, mockAdminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          await crowdsaleConsoleMock.setTime(
            startTime + initialTierDuration + tierDurations[0] + (tierDurations[1] / 2)
          ).should.be.fulfilled
          let storedTime = await crowdsaleConsoleMock.getTime().should.be.fulfilled
          storedTime.toNumber().should.be.eq(
            startTime + initialTierDuration + tierDurations[0] + (tierDurations[1] / 2)
          )

          invalidReturn = await storage.exec.call(
            crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(mockExecutionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'CannotModifyCurrentTier\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'CannotModifyCurrentTier').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, mockExecutionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })

          it('should have unchanged duration for tier 2', async () => {
            let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, mockExecutionID, 2
            ).should.be.fulfilled
            tierTwoInfo.length.should.be.eq(6)

            hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
            web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
            web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
            tierTwoInfo[3].toNumber().should.be.eq(tierDurations[1])
            tierTwoInfo[4].should.be.eq(tierAllModifiable[1])
            tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
          })

          it('should have unchanged start and end dates for tier 2', async () => {
            let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, mockExecutionID, 2
            ).should.be.fulfilled
            tierTwoDates.length.should.be.eq(2)

            tierTwoDates[0].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            tierTwoDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
              + tierDurations[1]
            )
          })
        })
      })
    })

    context('when the input parameters are invalid', async () => {

      let invalidCalldata
      let invalidEvent
      let invalidReturn

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await consoleUtils.createCrowdsaleTiers.call(
          tierNames, tierDurations, tierPrices, tierCaps, tierMixedModifiable,
          multiTierWhitelistStat, adminContext
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsole.address, executionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
          storage.address, executionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      context('such as the new duration being 0', async () => {

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            2, zeroDuration, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'InvalidDuration\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidDuration').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })

          it('should have unchanged duration for tier 2', async () => {
            let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoInfo.length.should.be.eq(6)

            hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
            web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
            web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
            tierTwoInfo[3].toNumber().should.be.eq(tierDurations[1])
            tierTwoInfo[4].should.be.eq(tierMixedModifiable[1])
            tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
          })

          it('should have unchanged start and end dates for tier 2', async () => {
            let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoDates.length.should.be.eq(2)

            tierTwoDates[0].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            tierTwoDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
            )
          })
        })
      })

      context('such as the new duration being the same as the old duration', async () => {

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            2, tierDurations[1], adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'DurationUnchanged\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'DurationUnchanged').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })

          it('should have unchanged duration for tier 2', async () => {
            let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoInfo.length.should.be.eq(6)

            hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
            web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
            web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
            tierTwoInfo[3].toNumber().should.be.eq(tierDurations[1])
            tierTwoInfo[4].should.be.eq(tierMixedModifiable[1])
            tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
          })

          it('should have unchanged start and end dates for tier 2', async () => {
            let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoDates.length.should.be.eq(2)

            tierTwoDates[0].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            tierTwoDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
            )
          })
        })
      })

      context('such as the tier to update being out-of-range of the tier list', async () => {

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            3, newDuration, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'InvalidCrowdsaleStatus\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidCrowdsaleStatus').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })
        })
      })

      context('such as the tier to update having been set as \'not modifiable\'', async () => {

        context('when the tier to update is not tier 0', async () => {

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.updateTierDuration.call(
              1, newDuration, adminContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            invalidReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, invalidCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, invalidCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            invalidEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              invalidReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              invalidReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              invalidReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              invalidReturn[2].toNumber().should.be.eq(0)
            })
          })

          it('should emit an ApplicationException event', async () => {
            invalidEvent.event.should.be.eq('ApplicationException')
          })

          describe('the ApplicationException event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = invalidEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })

            it('should contain the error message \'InvalidCrowdsaleStatus\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'InvalidCrowdsaleStatus').should.be.eq(true)
            })
          })

          describe('storage', async () => {

            it('should have unchanged start and end times', async () => {
              let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                storage.address, executionID
              ).should.be.fulfilled
              newTimeInfo.length.should.be.eq(2)

              newTimeInfo[0].toNumber().should.be.eq(startTime)
              newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
            })

            it('should have unchanged duration for tier 1', async () => {
              let tierOneInfo = await initCrowdsale.getCrowdsaleTier.call(
                storage.address, executionID, 1
              ).should.be.fulfilled
              tierOneInfo.length.should.be.eq(6)

              hexStrEquals(tierOneInfo[0], tierNames[0]).should.be.eq(true)
              web3.fromWei(tierOneInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[0])
              web3.fromWei(tierOneInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[0])
              tierOneInfo[3].toNumber().should.be.eq(tierDurations[0])
              tierOneInfo[4].should.be.eq(tierMixedModifiable[0])
              tierOneInfo[5].should.be.eq(multiTierWhitelistStat[0])
            })

            it('should have unchanged start and end dates for tier 1', async () => {
              let tierOneDates = await initCrowdsale.getTierStartAndEndDates.call(
                storage.address, executionID, 1
              ).should.be.fulfilled
              tierOneDates.length.should.be.eq(2)

              tierOneDates[0].toNumber().should.be.eq(startTime + initialTierDuration)
              tierOneDates[1].toNumber().should.be.eq(
                startTime + initialTierDuration + tierDurations[0]
              )
            })
          })
        })
      })
    })

    context('when the input parameters are valid', async () => {

      beforeEach(async () => {
        initialEndTime = startTime + initialTierDuration + tierDurations[0] + tierDurations[1]

        let createTiersCalldata = await consoleUtils.createCrowdsaleTiers(
          tierNames, tierDurations, tierPrices, tierCaps, tierMixedModifiable,
          multiTierWhitelistStat, adminContext
        ).should.be.fulfilled
        createTiersCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsole.address, executionID, createTiersCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        // Check start and end time
        let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes(
          storage.address, executionID
        ).should.be.fulfilled
        timeInfo.length.should.be.eq(2)
        timeInfo[0].toNumber().should.be.eq(startTime)
        timeInfo[1].toNumber().should.be.eq(initialEndTime)
      })

      context('but the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateTierDuration.call(
            2, newDuration, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'InvalidCrowdsaleStatus\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidCrowdsaleStatus').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have unchanged start and end times', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(initialEndTime)
          })

          it('should have unchanged duration for tier 2', async () => {
            let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoInfo.length.should.be.eq(6)

            hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
            web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
            web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
            tierTwoInfo[3].toNumber().should.be.eq(tierDurations[1])
            tierTwoInfo[4].should.be.eq(tierMixedModifiable[1])
            tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
          })

          it('should have unchanged start and end dates for tier 2', async () => {
            let tierTwoDates = await initCrowdsale.getTierStartAndEndDates.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoDates.length.should.be.eq(2)

            tierTwoDates[0].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0]
            )
            tierTwoDates[1].toNumber().should.be.eq(
              startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
            )
          })
        })
      })

      context('and the sender is the admin', async () => {

        beforeEach(async () => {
          updateTierCalldata = await consoleUtils.updateTierDuration.call(
            2, newDuration, adminContext
          ).should.be.fulfilled
          updateTierCalldata.should.not.eq('0x')

          updateTierReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, updateTierCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, updateTierCalldata,
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
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })
        })

        describe('storage', async () => {

          it('should have a new crowdsale end time', async () => {
            let newTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            newTimeInfo.length.should.be.eq(2)

            newTimeInfo[0].toNumber().should.be.eq(startTime)
            newTimeInfo[1].toNumber().should.be.eq(
              initialEndTime - (tierDurations[1] - newDuration)
            )
          })

          it('should have correctly updated tier 2 duration', async () => {
            let tierTwoInfo = await initCrowdsale.getCrowdsaleTier.call(
              storage.address, executionID, 2
            ).should.be.fulfilled
            tierTwoInfo.length.should.be.eq(6)

            hexStrEquals(tierTwoInfo[0], tierNames[1]).should.be.eq(true)
            web3.fromWei(tierTwoInfo[1].toNumber(), 'wei').should.be.eq(tierCaps[1])
            web3.fromWei(tierTwoInfo[2].toNumber(), 'wei').should.be.eq(tierPrices[1])
            tierTwoInfo[3].toNumber().should.be.eq(newDuration)
            tierTwoInfo[4].should.be.eq(tierMixedModifiable[1])
            tierTwoInfo[5].should.be.eq(multiTierWhitelistStat[1])
          })

          it('should have correctly updated the end date for tier 2', async () => {
            let tierZeroDates = await initCrowdsale.getTierStartAndEndDates.call(
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
      let invalidEvent
      let invalidReturn

      context('such as mismatched input lengths', async () => {

        let invalidMultiMinimum = singleMinimumNonZero

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.whitelistMultiForTier.call(
            1, multiWhitelist, invalidMultiMinimum, multiMaximum, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'MismatchedInputLengths\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'MismatchedInputLengths').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have a whitelist of length 0 for tier 1', async () => {
            let whitelistInfo = await initCrowdsale.getTierWhitelist.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            whitelistInfo.length.should.be.eq(2)

            whitelistInfo[0].toNumber().should.be.eq(0)
            whitelistInfo[1].length.should.be.eq(0)
          })

          it('should not have whitelist information for the passed in accounts', async () => {
            let whitelistInfoOne = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, 1, multiWhitelist[0]
            ).should.be.fulfilled
            whitelistInfoOne.length.should.be.eq(2)

            let whitelistInfoTwo = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, 1, multiWhitelist[1]
            ).should.be.fulfilled
            whitelistInfoTwo.length.should.be.eq(2)

            let whitelistInfoThree = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, 1, multiWhitelist[2]
            ).should.be.fulfilled
            whitelistInfoThree.length.should.be.eq(2)

            whitelistInfoOne[0].toNumber().should.be.eq(0)
            whitelistInfoOne[1].toNumber().should.be.eq(0)
            whitelistInfoTwo[0].toNumber().should.be.eq(0)
            whitelistInfoTwo[1].toNumber().should.be.eq(0)
            whitelistInfoThree[0].toNumber().should.be.eq(0)
            whitelistInfoThree[1].toNumber().should.be.eq(0)
          })
        })
      })

      context('such as input lengths of 0', async () => {

        let invalidMultiWhitelist = []

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.whitelistMultiForTier.call(
            1, invalidMultiWhitelist, multiMinimum, multiMaximum, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'MismatchedInputLengths\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'MismatchedInputLengths').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have a whitelist of length 0 for tier 1', async () => {
            let whitelistInfo = await initCrowdsale.getTierWhitelist.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            whitelistInfo.length.should.be.eq(2)

            whitelistInfo[0].toNumber().should.be.eq(0)
            whitelistInfo[1].length.should.be.eq(0)
          })
        })
      })
    })

    context('when the input parameters are valid', async () => {

      context('when the sender is the admin', async () => {

        context('when the tier being updated is tier 0', async () => {

          beforeEach(async () => {
            whitelistCalldata = await consoleUtils.whitelistMultiForTier.call(
              0, multiWhitelist, multiMinimum, multiMaximum, adminContext
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, whitelistCalldata,
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
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 3 for tier 0', async () => {
              let whitelistInfo = await initCrowdsale.getTierWhitelist.call(
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
              let whitelistOneInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, 0, multiWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              let whitelistTwoInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, 0, multiWhitelist[1]
              ).should.be.fulfilled
              whitelistTwoInfo.length.should.be.eq(2)

              let whitelistThreeInfo = await initCrowdsale.getWhitelistStatus.call(
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
            whitelistCalldata = await consoleUtils.whitelistMultiForTier.call(
              1, multiWhitelist, multiMinimum, multiMaximum, adminContext
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, whitelistCalldata,
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
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 3 for tier 1', async () => {
              let whitelistInfo = await initCrowdsale.getTierWhitelist.call(
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
              let whitelistOneInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, 1, multiWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              let whitelistTwoInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, 1, multiWhitelist[1]
              ).should.be.fulfilled
              whitelistTwoInfo.length.should.be.eq(2)

              let whitelistThreeInfo = await initCrowdsale.getWhitelistStatus.call(
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
            whitelistCalldata = await consoleUtils.whitelistMultiForTier.call(
              1, singleWhitelist, singleMinimumNonZero, singleMaximumNonZero, adminContext
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, whitelistCalldata,
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
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 1 for tier 1', async () => {
              let whitelistInfo = await initCrowdsale.getTierWhitelist.call(
                storage.address, executionID, 1
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)

              whitelistInfo[0].toNumber().should.be.eq(1)
              whitelistInfo[1].length.should.be.eq(1)
              whitelistInfo[1][0].should.be.eq(singleWhitelist[0])
            })

            it('should have correct whitelist information for the whitelisted account', async () => {
              let whitelistOneInfo = await initCrowdsale.getWhitelistStatus.call(
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
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.whitelistMultiForTier.call(
            1, multiWhitelist, multiMinimum, multiMaximum, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'SenderIsNotAdmin\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'SenderIsNotAdmin').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have a whitelist of length 0 for tier 1', async () => {
            let whitelistInfo = await initCrowdsale.getTierWhitelist.call(
              storage.address, executionID, 1
            ).should.be.fulfilled
            whitelistInfo.length.should.be.eq(2)

            whitelistInfo[0].toNumber().should.be.eq(0)
            whitelistInfo[1].length.should.be.eq(0)
          })

          it('should not have whitelist information for the passed in accounts', async () => {
            let whitelistInfoOne = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, 1, multiWhitelist[0]
            ).should.be.fulfilled
            whitelistInfoOne.length.should.be.eq(2)

            let whitelistInfoTwo = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, 1, multiWhitelist[1]
            ).should.be.fulfilled
            whitelistInfoTwo.length.should.be.eq(2)

            let whitelistInfoThree = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, 1, multiWhitelist[2]
            ).should.be.fulfilled
            whitelistInfoThree.length.should.be.eq(2)

            whitelistInfoOne[0].toNumber().should.be.eq(0)
            whitelistInfoOne[1].toNumber().should.be.eq(0)
            whitelistInfoTwo[0].toNumber().should.be.eq(0)
            whitelistInfoTwo[1].toNumber().should.be.eq(0)
            whitelistInfoThree[0].toNumber().should.be.eq(0)
            whitelistInfoThree[1].toNumber().should.be.eq(0)
          })
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
      let invalidEvent
      let invalidReturn

      beforeEach(async () => {
        let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals, mockAdminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.be.eq('0x')

        invalidCalldata = await consoleUtils.initializeCrowdsale.call(
          mockAdminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, mockExecutionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        await crowdsaleConsoleMock.setTime(startTime + 1).should.be.fulfilled
        let storedTime = await crowdsaleConsoleMock.getTime.call().should.be.fulfilled
        storedTime.toNumber().should.be.eq(startTime + 1)

        invalidReturn = await storage.exec.call(
          crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
          { from: exec }
        ).should.be.fulfilled

        events = await storage.exec(
          crowdsaleConsoleMock.address, mockExecutionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        invalidEvent = events[0]
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          invalidReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          invalidReturn[0].toNumber().should.be.eq(0)
        })

        it('should return the correct number of addresses paid', async () => {
          invalidReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          invalidReturn[2].toNumber().should.be.eq(0)
        })
      })

      it('should emit an ApplicationException event', async () => {
        invalidEvent.event.should.be.eq('ApplicationException')
      })

      describe('the ApplicationException event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = invalidEvent.args['execution_id']
          emittedExecID.should.be.eq(mockExecutionID)
        })

        it('should match the CrowdsaleConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
        })

        it('should contain the error message \'CrowdsaleStartedOrTokenNotInit\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'CrowdsaleStartedOrTokenNotInit').should.be.eq(true)
        })
      })

      describe('storage', async () => {

        it('should have an initialized token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo.call(
            storage.address, mockExecutionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
          hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
          tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
          tokenInfo[3].toNumber().should.be.eq(0)
        })

        it('should have an uninitialized crowdsale', async () => {
          let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
            storage.address, mockExecutionID
          ).should.be.fulfilled
          crowdsaleInfo.length.should.be.eq(5)

          crowdsaleInfo[0].toNumber().should.be.eq(0)
          crowdsaleInfo[1].should.be.eq(teamWallet)
          crowdsaleInfo[2].toNumber().should.be.eq(0)
          crowdsaleInfo[3].should.be.eq(false)
          crowdsaleInfo[4].should.be.eq(false)
        })
      })
    })

    context('when the crowdsale has not yet started', async () => {

      context('when the crowdsale token is not initialized', async () => {

        let invalidCalldata
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initializeCrowdsale.call(
            adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'CrowdsaleStartedOrTokenNotInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'CrowdsaleStartedOrTokenNotInit').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have an uninitialized token', async () => {
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            web3.toDecimal(tokenInfo[0]).should.be.eq(0)
            web3.toDecimal(tokenInfo[1]).should.be.eq(0)
            tokenInfo[2].toNumber().should.be.eq(0)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have an uninitialized crowdsale', async () => {
            let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            crowdsaleInfo.length.should.be.eq(5)

            crowdsaleInfo[0].toNumber().should.be.eq(0)
            crowdsaleInfo[1].should.be.eq(teamWallet)
            crowdsaleInfo[2].toNumber().should.be.eq(0)
            crowdsaleInfo[3].should.be.eq(false)
            crowdsaleInfo[4].should.be.eq(false)
          })
        })
      })

      context('when the crowdsale token is initialized', async () => {

        beforeEach(async () => {
          let initTokenCalldata = await consoleUtils.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
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
          let invalidEvent
          let invalidReturn

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.initializeCrowdsale.call(
              otherContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            invalidReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, invalidCalldata,
              { from: exec }
            ).should.be.fulfilled

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, invalidCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            invalidEvent = events[0]
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              invalidReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              invalidReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              invalidReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              invalidReturn[2].toNumber().should.be.eq(0)
            })
          })

          it('should emit an ApplicationException event', async () => {
            invalidEvent.event.should.be.eq('ApplicationException')
          })

          describe('the ApplicationException event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = invalidEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })

            it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
            })
          })

          describe('storage', async () => {

            it('should have an initialized token', async () => {
              let tokenInfo = await initCrowdsale.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.length.should.be.eq(4)

              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
              tokenInfo[3].toNumber().should.be.eq(0)
            })

            it('should have an uninitialized crowdsale', async () => {
              let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(5)

              crowdsaleInfo[0].toNumber().should.be.eq(0)
              crowdsaleInfo[1].should.be.eq(teamWallet)
              crowdsaleInfo[2].toNumber().should.be.eq(0)
              crowdsaleInfo[3].should.be.eq(false)
              crowdsaleInfo[4].should.be.eq(false)
            })
          })
        })

        context('and the sender is the admin', async () => {

          beforeEach(async () => {
            initSaleCalldata = await consoleUtils.initializeCrowdsale.call(
              adminContext
            ).should.be.fulfilled
            initSaleCalldata.should.not.eq('0x')

            initSaleReturn = await storage.exec.call(
              crowdsaleConsole.address, executionID, initSaleCalldata,
              { from: exec }
            ).should.be.fulfilled

            initSaleEvents = await storage.exec(
              crowdsaleConsole.address, executionID, initSaleCalldata,
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
              let tokenInfo = await initCrowdsale.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.length.should.be.eq(4)

              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
              tokenInfo[3].toNumber().should.be.eq(0)
            })

            it('should have an initialized crowdsale', async () => {
              let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              crowdsaleInfo.length.should.be.eq(5)

              crowdsaleInfo[0].toNumber().should.be.eq(0)
              crowdsaleInfo[1].should.be.eq(teamWallet)
              crowdsaleInfo[2].toNumber().should.be.eq(0)
              crowdsaleInfo[3].should.be.eq(true)
              crowdsaleInfo[4].should.be.eq(false)
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
      let invalidEvent
      let invalidReturn

      beforeEach(async () => {
        invalidCalldata = await consoleUtils.finalizeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        invalidReturn = await storage.exec.call(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).should.be.fulfilled

        let events = await storage.exec(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        invalidEvent = events[0]
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          invalidReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          invalidReturn[0].toNumber().should.be.eq(0)
        })

        it('should return the correct number of addresses paid', async () => {
          invalidReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          invalidReturn[2].toNumber().should.be.eq(0)
        })
      })

      it('should emit an ApplicationException event', async () => {
        invalidEvent.event.should.be.eq('ApplicationException')
      })

      describe('the ApplicationException event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = invalidEvent.args['execution_id']
          emittedExecID.should.be.eq(executionID)
        })

        it('should match the CrowdsaleConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(crowdsaleConsole.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('storage', async () => {

        it('should have an uninitialized token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          web3.toDecimal(tokenInfo[0]).should.be.eq(0)
          web3.toDecimal(tokenInfo[1]).should.be.eq(0)
          tokenInfo[2].toNumber().should.be.eq(0)
          tokenInfo[3].toNumber().should.be.eq(0)
        })

        it('should have an uninitialized and unfinalized crowdsale', async () => {
          let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          crowdsaleInfo.length.should.be.eq(5)

          crowdsaleInfo[0].toNumber().should.be.eq(0)
          crowdsaleInfo[1].should.be.eq(teamWallet)
          crowdsaleInfo[2].toNumber().should.be.eq(0)
          crowdsaleInfo[3].should.be.eq(false)
          crowdsaleInfo[4].should.be.eq(false)
        })
      })
    })

    context('when the crowdsale is already finalized', async () => {

      let invalidCalldata
      let invalidEvent
      let invalidReturn

      beforeEach(async () => {
        let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await consoleUtils.initializeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

        invalidCalldata = await consoleUtils.finalizeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsole.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsole.address, executionID, initCrCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        invalidReturn = await storage.exec.call(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).should.be.fulfilled

        events = await storage.exec(
          crowdsaleConsole.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        invalidEvent = events[0]
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          invalidReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          invalidReturn[0].toNumber().should.be.eq(0)
        })

        it('should return the correct number of addresses paid', async () => {
          invalidReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          invalidReturn[2].toNumber().should.be.eq(0)
        })
      })

      it('should emit an ApplicationException event', async () => {
        invalidEvent.event.should.be.eq('ApplicationException')
      })

      describe('the ApplicationException event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = invalidEvent.args['execution_id']
          emittedExecID.should.be.eq(executionID)
        })

        it('should match the CrowdsaleConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(crowdsaleConsole.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('storage', async () => {

        it('should have an initialized token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
          hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
          tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
          tokenInfo[3].toNumber().should.be.eq(0)
        })

        it('should have an initialized and finalized crowdsale', async () => {
          let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          crowdsaleInfo.length.should.be.eq(5)

          crowdsaleInfo[0].toNumber().should.be.eq(0)
          crowdsaleInfo[1].should.be.eq(teamWallet)
          crowdsaleInfo[2].toNumber().should.be.eq(0)
          crowdsaleInfo[3].should.be.eq(true)
          crowdsaleInfo[4].should.be.eq(true)
        })

      })
    })

    context('when the crowdsale is in a valid state to be finalized', async () => {

      beforeEach(async () => {

        let initTokenCalldata = await consoleUtils.initCrowdsaleToken(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await consoleUtils.initializeCrowdsale(
          adminContext
        ).should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsole.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsole.address, executionID, initCrCalldata,
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
        let invalidEvent
        let invalidReturn

        beforeEach(async () => {

          invalidCalldata = await consoleUtils.finalizeCrowdsale.call(
            otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          invalidReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).should.be.fulfilled

          events = await storage.exec(
            crowdsaleConsole.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            invalidReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            invalidReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            invalidReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            invalidReturn[2].toNumber().should.be.eq(0)
          })
        })

        it('should emit an ApplicationException event', async () => {
          invalidEvent.event.should.be.eq('ApplicationException')
        })

        describe('the ApplicationException event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = invalidEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })

          it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
          })
        })

        describe('storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have an initialized and unfinalized crowdsale', async () => {
            let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            crowdsaleInfo.length.should.be.eq(5)

            crowdsaleInfo[0].toNumber().should.be.eq(0)
            crowdsaleInfo[1].should.be.eq(teamWallet)
            crowdsaleInfo[2].toNumber().should.be.eq(0)
            crowdsaleInfo[3].should.be.eq(true)
            crowdsaleInfo[4].should.be.eq(false)
          })

        })
      })

      context('and the sender is the admin', async () => {

        beforeEach(async () => {

          finalizeCalldata = await consoleUtils.finalizeCrowdsale.call(
            adminContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          finalizeReturn = await storage.exec.call(
            crowdsaleConsole.address, executionID, finalizeCalldata,
            { from: exec }
          ).should.be.fulfilled

          finalizeEvents = await storage.exec(
            crowdsaleConsole.address, executionID, finalizeCalldata,
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(crowdsaleConsole.address))
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
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            tokenInfo[3].toNumber().should.be.eq(0)
          })

          it('should have an initialized and finalized crowdsale', async () => {
            let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            crowdsaleInfo.length.should.be.eq(5)

            crowdsaleInfo[0].toNumber().should.be.eq(0)
            crowdsaleInfo[1].should.be.eq(teamWallet)
            crowdsaleInfo[2].toNumber().should.be.eq(0)
            crowdsaleInfo[3].should.be.eq(true)
            crowdsaleInfo[4].should.be.eq(true)
          })
        })
      })
    })
  })
})
