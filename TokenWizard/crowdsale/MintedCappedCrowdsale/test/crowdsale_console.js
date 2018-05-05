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
let ConsoleUtils = artifacts.require('./CrowdsaleConsoleUtils')

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

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled
    consoleUtils = await ConsoleUtils.new().should.be.fulfilled

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

    initCalldata = await testUtils.init(
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

    adminContext = await testUtils.getContext(
      executionID, crowdsaleAdmin, 0
    ).should.be.fulfilled
    adminContext.should.not.eq('0x')

    otherContext = await testUtils.getContext(
      executionID, otherAddress, 0
    ).should.be.fulfilled
    otherContext.should.not.eq('0x')
  })

  describe('#initCrowdsaleToken', async () => {

    let initTokenCalldata
    let initTokenEvent

    context('when the token is initialized with an invalid parameter', async () => {

      let invalidCalldata
      let invalidEvent

      context('such as an invalid name', async () => {

        let invalidName = ''

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken(
            invalidName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

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

        describe('the resulting token storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo(
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
          invalidCalldata = await consoleUtils.initCrowdsaleToken(
            tokenName, invalidSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

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

        describe('the resulting token storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo(
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
          invalidCalldata = await consoleUtils.initCrowdsaleToken(
            tokenName, tokenSymbol, invalidDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

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

        describe('the resulting token storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo(
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
          initTokenCalldata = await consoleUtils.initCrowdsaleToken(
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
            emittedAppAddr.should.be.eq(crowdsaleConsole.address)
          })
        })

        describe('the resulting token storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo(
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
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

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

        describe('the resulting token storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await initCrowdsale.getTokenInfo(
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
    let updateMinEvent

    let updateTo = web3.toWei('1', 'ether')
    let updateToZero = 0

    context('when the crowdsale is already initialized', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        let initTokenCalldata = await consoleUtils.initCrowdsaleToken(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await consoleUtils.initializeCrowdsale(
          adminContext
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        let invalidCalldata = await consoleUtils.updateGlobalMinContribution(
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

      describe('the resulting crowdsale storage', async () => {

        let crowdsaleInfo

        beforeEach(async () => {
          crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo(
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
            updateMinCalldata = await consoleUtils.updateGlobalMinContribution(
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

            updateMinCalldata = await consoleUtils.updateGlobalMinContribution(
              updateToZero, adminContext
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            events = await storage.exec(
              crowdsaleConsole.address, executionID, updateMinCalldata,
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
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })
          })

          describe('the resulting crowdsale storage', async () => {

            let crowdsaleInfo

            beforeEach(async () => {
              crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo(
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
            updateMinCalldata = await consoleUtils.updateGlobalMinContribution(
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
              emittedAppAddr.should.be.eq(crowdsaleConsole.address)
            })
          })

          describe('the resulting crowdsale storage', async () => {

            let crowdsaleInfo

            beforeEach(async () => {
              crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo(
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

        beforeEach(async () => {
          let invalidCalldata = await consoleUtils.updateGlobalMinContribution(
            updateTo, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

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

        describe('the resulting crowdsale storage', async () => {

          let crowdsaleInfo

          beforeEach(async () => {
            crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo(
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

    context('when the admin attempts to create tiers with invalid input parameters', async () => {

      context('such as mismatched input lengths', async () => {

      })

      context('such as inputs of length 0', async () => {

      })

      context('such as an input tier sell cap of 0', async () => {

      })

      context('such as an input tier duration of 0', async () => {

      })

      context('such as an input tier price of 0', async () => {

      })
    })

    context('when the input parameters are valid', async () => {

      context('when the crowdsale is already initialized', async () => {

      })

      context('when the crowdsale is not yet initialized', async () => {

        context('when the sender is the admin', async () => {

        })

        context('when the sender is not the admin', async () => {

        })
      })
    })
  })

  describe('#updateTierDuration', async () => {

    context('when the tier to update is a previous tier', async () => {

    })

    context('when the tier to update is the current tier', async () => {

      context('and the current tier is tier 0', async () => {

        context('and the crowdsale has started', async () => {

        })

        context('and the crowdsale has not started', async () => {

        })
      })

      context('and the current tier is not tier 0', async () => {

      })
    })

    context('when the input parameters are invalid', async () => {

      context('such as the new duration being 0', async () => {

      })

      context('such as the new duration being the same as the old duration', async () => {

      })

      context('such as the tier to update being out-of-range of the tier list', async () => {

      })

      context('such as the tier to update having been set as \'not modifiable\'', async () => {

      })
    })

    context('when the input parameters are valid', async () => {

      context('but the sender is not the admin', async () => {

      })

      context('and the sender is the admin', async () => {

      })
    })
  })

  // describe('#whitelistMultiForTier', async () => {
  //
  //   let whitelistSingle =
  //
  //   context('when the admin attempts to whitelist with invalid parameters', async () => {
  //
  //     context('such as mismatched input lengths', async () => {
  //
  //     })
  //
  //     context('such as input lengths of 0', async () => {
  //
  //     })
  //   })
  //
  //   context('when the input parameters are valid', async () => {
  //
  //     context('when the sender is the admin', async () => {
  //
  //       context('when the tier being updater is tier 0', async () => {
  //
  //       })
  //
  //       context('when the tier being updated is not tier 0', async () => {
  //
  //       })
  //     })
  //
  //     context('when the sender is not the admin', async () => {
  //
  //     })
  //   })
  // })
  //
  //
  // describe('#initializeCrowdsale', async () => {
  //
  //   context('when the crowdsale has already started', async () => {
  //
  //   })
  //
  //   context('when the crowdsale has not yet started', async () => {
  //
  //     context('when the crowdsale token is not initialized', async () => {
  //
  //     })
  //
  //     context('when the crowdsale token is initialized', async () => {
  //
  //       context('but the sender is not the admin', async () => {
  //
  //       })
  //
  //       context('and the sender is the admin', async () => {
  //
  //       })
  //     })
  //   })
  // })
  //
  // describe('#finalizeCrowdsale', async () => {
  //
  //   context('when the crowdsale is not yet intialized', async () => {
  //
  //   })
  //
  //   context('when the crowdsale is already finalized', async () => {
  //
  //   })
  //
  //   context('when the crowdsale is in a valid state to be finalized', async () => {
  //
  //     context('but the sender is not the admin', async () => {
  //
  //     })
  //
  //     context('and the sender is the admin', async () => {
  //
  //     })
  //   })
  // })
})
