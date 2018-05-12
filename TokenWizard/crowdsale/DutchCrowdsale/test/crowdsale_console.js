// Abstract storage contract
let AbstractStorage = artifacts.require('./RegistryStorage')
// DutchCrowdsale
let InitDutch = artifacts.require('./InitCrowdsale')
let DutchBuy = artifacts.require('./CrowdsaleBuyTokens')
let DutchCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
let DutchTokenConsole = artifacts.require('./TokenConsole')
let DutchTokenTransfer = artifacts.require('./TokenTransfer')
let DutchTokenTransferFrom = artifacts.require('./TokenTransferFrom')
let DutchTokenApprove = artifacts.require('./TokenApprove')
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

contract('#DutchCrowdsaleConsole', function (accounts) {

  let storage
  let testUtils
  let consoleUtils

  let exec = accounts[0]
  let updater = accounts[1]
  let crowdsaleAdmin = accounts[2]
  let teamWallet = accounts[3]

  let otherAddress = accounts[4]

  let initCrowdsale
  let crowdsaleBuy
  let crowdsaleConsoleMock
  let tokenConsole
  let tokenTransfer
  let tokenTransferFrom
  let tokenApprove

  let executionID
  let adminContext
  let otherContext

  let initCalldata
  let startTime
  let totalSupply = 100000
  let sellCap = 90000
  let startPrice = 1000 // 1000 wei per token (1 token = [10 ** decimals] units)
  let endPrice = 100 // 100 wei per token
  let duration = 3600 // 1 hour
  let isWhitelisted = true

  let tokenName = 'Token'
  let tokenSymbol = 'TOK'
  let tokenDecimals = 0

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled
    consoleUtils = await ConsoleUtils.new().should.be.fulfilled

    initCrowdsale = await InitDutch.new().should.be.fulfilled
    crowdsaleBuy = await DutchBuy.new().should.be.fulfilled
    crowdsaleConsoleMock = await CrowdsaleConsoleMock.new().should.be.fulfilled
    tokenConsole = await DutchTokenConsole.new().should.be.fulfilled
    tokenTransfer = await DutchTokenTransfer.new().should.be.fulfilled
    tokenTransferFrom = await DutchTokenTransferFrom.new().should.be.fulfilled
    tokenApprove = await DutchTokenApprove.new().should.be.fulfilled
  })

  beforeEach(async () => {
    startTime = getTime() + 3600

    initCalldata = await testUtils.init.call(
      teamWallet, totalSupply, sellCap, startPrice, endPrice,
      duration, startTime, isWhitelisted, crowdsaleAdmin
    ).should.be.fulfilled
    initCalldata.should.not.eq('0x')

    let events = await storage.initAndFinalize(
      updater, true, initCrowdsale.address, initCalldata, [
        crowdsaleBuy.address, crowdsaleConsoleMock.address, tokenConsole.address,
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

    await crowdsaleConsoleMock.resetTime().should.be.fulfilled
    let storedTime = await crowdsaleConsoleMock.set_time.call().should.be.fulfilled
    storedTime.toNumber().should.be.eq(0)
  })

  describe('#initCrowdsaleToken', async () => {

    let initTokenCalldata
    let initTokenEvent

    describe('crowdsale storage with no initialized token', async () => {

      it('should not have information about the token, except the totalSupply', async () => {
        let tokenInfo = await initCrowdsale.getTokenInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        tokenInfo.length.should.be.eq(4)

        web3.toDecimal(tokenInfo[0]).should.be.eq(0)
        web3.toDecimal(tokenInfo[1]).should.be.eq(0)
        tokenInfo[2].toNumber().should.be.eq(0)
        tokenInfo[3].toNumber().should.be.eq(totalSupply)
      })

      it('should not have an initialized crowdsale', async () => {
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

      context('such as an invalid name', async () => {

        let invalidName = ''

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken.call(
            invalidName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'ImproperInitialization\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ImproperInitialization').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

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

          it('should have the correct total supply', async () => {
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
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

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'ImproperInitialization\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ImproperInitialization').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

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

          it('should have the correct total supply', async () => {
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
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

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'ImproperInitialization\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'ImproperInitialization').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

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

          it('should have the correct total supply', async () => {
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
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

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          initTokenEvent = events[0]
        })

        it('should emit an ApplicationExecution event', async () => {
          initTokenEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = initTokenEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = initTokenEvent.args['script_target']
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })
        })

        describe('the resulting token storage', async () => {

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

          it('should have the correct total supply', async () => {
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

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

          it('should have the correct total supply', async () => {
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
          })
        })
      })
    })
  })

  describe('#updateGlobalMinContribution', async () => {

    let updateMinCalldata
    let updateMinEvent

    let updateTo = 100
    let updateToZero = 0

    context('when the crowdsale is already initialized', async () => {

      let invalidCalldata
      let invalidEvent

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
          crowdsaleConsoleMock.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, initCrowdsaleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        invalidEvent = events[0]
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
          emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
        })

        it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
        })
      })

      describe('the resulting crowdsale storage', async () => {

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
              crowdsaleConsoleMock.address, executionID, updateMinCalldata,
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

            events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            updateMinEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            updateMinEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = updateMinEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = updateMinEvent.args['script_target']
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })
          })

          describe('the resulting crowdsale storage', async () => {

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

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            updateMinEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            updateMinEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = updateMinEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = updateMinEvent.args['script_target']
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })
          })

          describe('the resulting crowdsale storage', async () => {

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
              crowdsaleInfo[2].toNumber().should.be.eq(updateTo)
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

        beforeEach(async () => {
          let invalidCalldata = await consoleUtils.updateGlobalMinContribution.call(
            updateTo, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('the resulting crowdsale storage', async () => {

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

  describe('#whitelistMulti', async () => {

    let whitelistCalldata
    let whitelistEvent

    let multiWhitelist = [
      accounts[accounts.length - 1],
      accounts[accounts.length - 2],
      accounts[accounts.length - 3]
    ]
    let multiMinimum = [
      100,
      0,
      200
    ]
    let multiMaximum = [
      1000,
      2000,
      0
    ]

    let singleWhitelist = [accounts[accounts.length - 4]]
    let singleMinimumNonZero = [300]
    let singleMinimumZero = [0]
    let singleMaximumNonZero = [3000]
    let singleMaximumZero = [0]

    context('when the admin attempts to whitelist with invalid parameters', async () => {

      let invalidCalldata
      let invalidEvent

      context('such as mismatched input lengths', async () => {

        let invalidMultiMinimum = singleMinimumNonZero

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.whitelistMulti.call(
            multiWhitelist, invalidMultiMinimum, multiMaximum, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'MismatchedInputLengths\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'MismatchedInputLengths').should.be.eq(true)
          })
        })

        describe('the resulting whitelist storage', async () => {

          it('should have a whitelist of length 0', async () => {
            let whitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
              storage.address, executionID
            ).should.be.fulfilled
            whitelistInfo.length.should.be.eq(2)

            whitelistInfo[0].toNumber().should.be.eq(0)
            whitelistInfo[1].length.should.be.eq(0)
          })

          it('should not have whitelist information for the passed in accounts', async () => {
            let whitelistInfoOne = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, multiWhitelist[0]
            ).should.be.fulfilled
            whitelistInfoOne.length.should.be.eq(2)

            let whitelistInfoTwo = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, multiWhitelist[1]
            ).should.be.fulfilled
            whitelistInfoTwo.length.should.be.eq(2)

            let whitelistInfoThree = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, multiWhitelist[2]
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
          invalidCalldata = await consoleUtils.whitelistMulti.call(
            invalidMultiWhitelist, multiMinimum, multiMaximum, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'MismatchedInputLengths\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'MismatchedInputLengths').should.be.eq(true)
          })
        })

        describe('the resulting whitelist storage', async () => {

          it('should have a whitelist of length 0', async () => {
            let whitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
              storage.address, executionID
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

        context('when multiple addresses are being updated', async () => {

          beforeEach(async () => {
            whitelistCalldata = await consoleUtils.whitelistMulti.call(
              multiWhitelist, multiMinimum, multiMaximum, adminContext
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            whitelistEvent = events[0]
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
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })
          })

          describe('the resulting whitelist storage', async () => {

            it('should have a whitelist of length 3', async () => {
              let whitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
                storage.address, executionID
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
                storage.address, executionID, multiWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              let whitelistTwoInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, multiWhitelist[1]
              ).should.be.fulfilled
              whitelistTwoInfo.length.should.be.eq(2)

              let whitelistThreeInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, multiWhitelist[2]
              ).should.be.fulfilled
              whitelistThreeInfo.length.should.be.eq(2)

              whitelistOneInfo[0].toNumber().should.be.eq(multiMinimum[0])
              whitelistOneInfo[1].toNumber().should.be.eq(multiMaximum[0])
              whitelistTwoInfo[0].toNumber().should.be.eq(multiMinimum[1])
              whitelistTwoInfo[1].toNumber().should.be.eq(multiMaximum[1])
              whitelistThreeInfo[0].toNumber().should.be.eq(multiMinimum[2])
              whitelistThreeInfo[1].toNumber().should.be.eq(multiMaximum[2])
            })
          })
        })

        context('when only one address is whitelisted', async () => {

          beforeEach(async () => {
            whitelistCalldata = await consoleUtils.whitelistMulti.call(
              singleWhitelist, singleMinimumNonZero, singleMaximumNonZero, adminContext
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            whitelistEvent = events[0]
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
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })
          })

          describe('the resulting whitelist storage', async () => {

            it('should have a whitelist of length 1', async () => {
              let whitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
                storage.address, executionID
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)

              whitelistInfo[0].toNumber().should.be.eq(1)
              whitelistInfo[1].length.should.be.eq(1)
              whitelistInfo[1][0].should.be.eq(singleWhitelist[0])
            })

            it('should have correct whitelist information for the whitelisted account', async () => {
              let whitelistOneInfo = await initCrowdsale.getWhitelistStatus.call(
                storage.address, executionID, singleWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              whitelistOneInfo[0].toNumber().should.be.eq(singleMinimumNonZero[0])
              whitelistOneInfo[1].toNumber().should.be.eq(singleMaximumNonZero[0])
            })
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.whitelistMulti.call(
            multiWhitelist, multiMinimum, multiMaximum, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'SenderIsNotAdmin\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'SenderIsNotAdmin').should.be.eq(true)
          })
        })

        describe('the resulting whitelist storage', async () => {

          it('should have a whitelist of length 0', async () => {
            let whitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
              storage.address, executionID
            ).should.be.fulfilled
            whitelistInfo.length.should.be.eq(2)

            whitelistInfo[0].toNumber().should.be.eq(0)
            whitelistInfo[1].length.should.be.eq(0)
          })

          it('should not have whitelist information for the passed in accounts', async () => {
            let whitelistInfoOne = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, multiWhitelist[0]
            ).should.be.fulfilled
            whitelistInfoOne.length.should.be.eq(2)

            let whitelistInfoTwo = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, multiWhitelist[1]
            ).should.be.fulfilled
            whitelistInfoTwo.length.should.be.eq(2)

            let whitelistInfoThree = await initCrowdsale.getWhitelistStatus.call(
              storage.address, executionID, multiWhitelist[2]
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

  describe('#setCrowdsaleStartAndDuration', async () => {

    let newDuration = 1000
    let newStartTime

    let updateCalldata
    let updateEvent

    beforeEach(async () => {
      newStartTime = getTime() + 4000

      let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
        tokenName, tokenSymbol, tokenDecimals, adminContext
      ).should.be.fulfilled
      initTokenCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleConsoleMock.address, executionID, initTokenCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')
    })

    context('when the crowdsale is already initialized', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        let initCrowdsaleCalldata = await consoleUtils.initializeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        invalidCalldata = await consoleUtils.setCrowdsaleStartAndDuration.call(
          newStartTime, newDuration, adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, initCrowdsaleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        invalidEvent = events[0]
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
          emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
        })

        it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
        })
      })

      describe('the resulting crowdsale storage', async () => {

        it('should have unchanged start time and duration', async () => {
          let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
            storage.address, executionID
          ).should.be.fulfilled
          timeInfo.length.should.be.eq(2)

          timeInfo[0].toNumber().should.be.eq(startTime)
          timeInfo[1].toNumber().should.be.eq(startTime + duration)
        })
      })
    })

    context('when the crowdsale is initialized', async () => {

      context('but both of the input parameters are invalid', async () => {

        let invalidStartTime = startTime - 1
        let invalidDuration = 0

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {

          invalidCalldata = await consoleUtils.setCrowdsaleStartAndDuration.call(
            invalidStartTime, invalidDuration, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'InvalidStartTimeAndDuration\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidStartTimeAndDuration').should.be.eq(true)
          })
        })

        describe('the resulting crowdsale storage', async () => {

          it('should have unchanged start time and duration', async () => {
            let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
              storage.address, executionID
            ).should.be.fulfilled
            timeInfo.length.should.be.eq(2)

            timeInfo[0].toNumber().should.be.eq(startTime)
            timeInfo[1].toNumber().should.be.eq(startTime + duration)
          })
        })
      })

      context('and all of the parameters are valid', async () => {

        context('but the sender is not the admin', async () => {

          let invalidCalldata
          let invalidEvent

          beforeEach(async () => {

            invalidCalldata = await consoleUtils.setCrowdsaleStartAndDuration.call(
              newStartTime, newDuration, otherContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, invalidCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            invalidEvent = events[0]
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
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })

            it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
            })
          })

          describe('the resulting crowdsale storage', async () => {

            it('should have unchanged start time and duration', async () => {
              let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                storage.address, executionID
              ).should.be.fulfilled
              timeInfo.length.should.be.eq(2)

              timeInfo[0].toNumber().should.be.eq(startTime)
              timeInfo[1].toNumber().should.be.eq(startTime + duration)
            })
          })
        })

        context('and the sender is the admin', async () => {

          beforeEach(async () => {

            updateCalldata = await consoleUtils.setCrowdsaleStartAndDuration.call(
              newStartTime, newDuration, adminContext
            ).should.be.fulfilled
            updateCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, updateCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            updateEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            updateEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = updateEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = updateEvent.args['script_target']
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })
          })

          describe('the resulting crowdsale storage', async () => {

            it('should have correctly updated the start time and duration', async () => {
              let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
                storage.address, executionID
              ).should.be.fulfilled
              timeInfo.length.should.be.eq(2)

              timeInfo[0].toNumber().should.be.eq(newStartTime)
              timeInfo[1].toNumber().should.be.eq(newStartTime + newDuration)
            })
          })
        })
      })
    })
  })

  describe('#initializeCrowdsale', async () => {

    let initCrCalldata
    let initCrEvent

    context('when the crowdsale has already started', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.be.eq('0x')

        invalidCalldata = await consoleUtils.initializeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        await crowdsaleConsoleMock.setTime(startTime + 1).should.be.fulfilled
        let storedTime = await crowdsaleConsoleMock.getTime().should.be.fulfilled
        storedTime.toNumber().should.be.eq(startTime + 1)

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        invalidEvent = events[0]
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
          emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
        })

        it('should contain the error message \'CrowdsaleStartedOrTokenNotInit\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'CrowdsaleStartedOrTokenNotInit').should.be.eq(true)
        })
      })

      describe('the resulting crowdsale storage', async () => {

        it('should have an initialized token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
          hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
          tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
          tokenInfo[3].toNumber().should.be.eq(totalSupply)
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

    context('when the crowdsale has not yet started', async () => {

      context('when the crowdsale token is not initialized', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initializeCrowdsale.call(
            adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'CrowdsaleStartedOrTokenNotInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'CrowdsaleStartedOrTokenNotInit').should.be.eq(true)
          })
        })

        describe('the resulting crowdsale storage', async () => {

          it('should have an uninitialized token', async () => {
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            web3.toDecimal(tokenInfo[0]).should.be.eq(0)
            web3.toDecimal(tokenInfo[1]).should.be.eq(0)
            tokenInfo[2].toNumber().should.be.eq(0)
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
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
          let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, initTokenCalldata,
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

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.initializeCrowdsale.call(
              otherContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, invalidCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            invalidEvent = events[0]
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
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })

            it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
            })
          })

          describe('the resulting crowdsale storage', async () => {

            it('should have an initialized token', async () => {
              let tokenInfo = await initCrowdsale.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.length.should.be.eq(4)

              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
              tokenInfo[3].toNumber().should.be.eq(totalSupply)
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
            initCrCalldata = await consoleUtils.initializeCrowdsale.call(
              adminContext
            ).should.be.fulfilled
            initCrCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsoleMock.address, executionID, initCrCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            initCrEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            initCrEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = initCrEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the CrowdsaleConsole address', async () => {
              let emittedAppAddr = initCrEvent.args['script_target']
              emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
            })
          })

          describe('the resulting crowdsale storage', async () => {

            it('should have an initialized token', async () => {
              let tokenInfo = await initCrowdsale.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.length.should.be.eq(4)

              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
              tokenInfo[3].toNumber().should.be.eq(totalSupply)
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
    let finalizeEvent

    context('when the crowdsale is not yet intialized', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        invalidCalldata = await consoleUtils.finalizeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        invalidEvent = events[0]
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
          emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('the resulting crowdsale storage', async () => {

        it('should have an uninitialized token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          web3.toDecimal(tokenInfo[0]).should.be.eq(0)
          web3.toDecimal(tokenInfo[1]).should.be.eq(0)
          tokenInfo[2].toNumber().should.be.eq(0)
          tokenInfo[3].toNumber().should.be.eq(totalSupply)
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
          crowdsaleConsoleMock.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, initCrCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, invalidCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        invalidEvent = events[0]
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
          emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('the resulting crowdsale storage', async () => {

        it('should have an initialized token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo.call(
            storage.address, executionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
          hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
          tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
          tokenInfo[3].toNumber().should.be.eq(totalSupply)
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

        let initTokenCalldata = await consoleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await consoleUtils.initializeCrowdsale.call(
          adminContext
        ).should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

        let events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsoleMock.address, executionID, initCrCalldata,
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

        beforeEach(async () => {

          invalidCalldata = await consoleUtils.finalizeCrowdsale.call(
            otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, invalidCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          invalidEvent = events[0]
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
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })

          it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
          })
        })

        describe('the resulting crowdsale storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
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

          events = await storage.exec(
            crowdsaleConsoleMock.address, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)

          finalizeEvent = events[0]
        })

        it('should emit an ApplicationExecution event', async () => {
          finalizeEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = finalizeEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the CrowdsaleConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(crowdsaleConsoleMock.address)
          })
        })

        describe('the resulting crowdsale storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await initCrowdsale.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
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
