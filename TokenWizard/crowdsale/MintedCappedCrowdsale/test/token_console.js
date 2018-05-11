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
let TokenConsoleUtils = artifacts.require('./TokenConsoleUtils')
let TokenFunctionUtils = artifacts.require('./TokenFunctionsUtil')
let CrowdsaleConsoleUtils = artifacts.require('./CrowdsaleConsoleUtils')
// Mock
let TokenFunctionsMock = artifacts.require('./TokenFunctionsMock')

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

contract('#TokenConsole', function (accounts) {

  let storage
  let testUtils
  let consoleUtils

  let tokenMock
  let tokenUtil
  let crowdsaleConsoleUtil

  let exec = accounts[0]
  let updater = accounts[1]
  let crowdsaleAdmin = accounts[2]
  let teamWallet = accounts[3]

  let otherAddress = accounts[4]
  let otherContext

  let initCrowdsale
  let crowdsaleBuy
  let crowdsaleConsole
  let tokenConsole
  let tokenTransfer
  let tokenTransferFrom
  let tokenApprove

  let executionID
  let adminContext

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

  let multiCalldata
  let multiEvent
  let multiDestination = [
    accounts[accounts.length - 1],
    accounts[accounts.length - 2],
    accounts[accounts.length - 3]
  ]
  let multiTokens = [100, 0, 200]
  let multiPercents = [0, 10, 20]
  let multiDecimals = [1, 2, 0]

  let singleCalldata
  let singleEvent
  let singleContext
  let singleDestination = [accounts[accounts.length - 4]]
  let singleToken = [300]
  let singlePercent = [30]
  let singleDecimal = [3]

  let totalSold = 1000000

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled
    consoleUtils = await TokenConsoleUtils.new().should.be.fulfilled

    tokenUtil = await TokenFunctionUtils.new().should.be.fulfilled
    tokenMock = await TokenFunctionsMock.new().should.be.fulfilled
    crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled

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
        tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address,
        tokenMock.address
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

    singleContext = await testUtils.getContext(
      executionID, singleDestination[0], 0
    ).should.be.fulfilled
    singleContext.should.not.eq('0x')
  })

  context('setTransferAgentStatus', async () => {

    let agentCalldata
    let agentEvent

    context('when the input agent is address 0', async () => {

      let invalidCalldata
      let invalidEvent

      let invalidAddress = zeroAddress()

      beforeEach(async () => {
        invalidCalldata = await consoleUtils.setTransferAgentStatus(
          invalidAddress, true, adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenConsole.address, executionID, invalidCalldata,
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

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })

        it('should contain the error message \'InvalidTransferAgent\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'InvalidTransferAgent').should.be.eq(true)
        })
      })

      it('should not record the zero address as a transfer agent', async () => {
        let agentInfo = await initCrowdsale.getTransferAgentStatus(
          storage.address, executionID, invalidAddress
        ).should.be.fulfilled
        agentInfo.should.not.eq(true)
      })
    })

    context('when the sender is the admin', async () => {

      beforeEach(async () => {
        let setBalanceCalldata = await tokenUtil.setBalance(
          otherAddress, 100
        ).should.be.fulfilled
        setBalanceCalldata.should.not.eq('0x')

        agentCalldata = await consoleUtils.setTransferAgentStatus(
          otherAddress, true, adminContext
        ).should.be.fulfilled
        agentCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenMock.address, executionID, setBalanceCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          tokenConsole.address, executionID, agentCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)

        agentEvent = events[0]
      })

      it('should emit an ApplicationExecution event', async () => {
        agentEvent.event.should.be.eq('ApplicationExecution')
      })

      describe('the ApplicationExecution event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = agentEvent.args['execution_id']
          emittedExecID.should.be.eq(executionID)
        })

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = agentEvent.args['script_target']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })
      })

      it('should accurately record the transfer agent\'s status', async () => {
        let agentInfo = await initCrowdsale.getTransferAgentStatus(
          storage.address, executionID, otherAddress
        ).should.be.fulfilled
        agentInfo.should.be.eq(true)
      })

      it('should allow the transfer agent to transfer tokens', async () => {
        let transferCalldata = await tokenUtil.transfer(
          crowdsaleAdmin, 50, otherContext
        ).should.be.fulfilled
        transferCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenTransfer.address, executionID, transferCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        let balanceInfo = await initCrowdsale.balanceOf(
          storage.address, executionID, crowdsaleAdmin
        ).should.be.fulfilled
        balanceInfo.toNumber().should.be.eq(50)

        balanceInfo = await initCrowdsale.balanceOf(
          storage.address, executionID, otherAddress
        ).should.be.fulfilled
        balanceInfo.toNumber().should.be.eq(50)
      })
    })

    context('when the sender is not the admin', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        invalidCalldata = await consoleUtils.setTransferAgentStatus(
          otherAddress, true, otherContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenConsole.address, executionID, invalidCalldata,
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

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })

        it('should contain the error message \'SenderIsNotAdmin\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'SenderIsNotAdmin').should.be.eq(true)
        })
      })

      it('should not record the passed in address as a transfer agent', async () => {
        let agentInfo = await initCrowdsale.getTransferAgentStatus(
          storage.address, executionID, otherAddress
        ).should.be.fulfilled
        agentInfo.should.not.eq(true)
      })
    })
  })

  describe('Reserved Tokens', async () => {

    let removeCalldata
    let removeEvent

    let distCalldata
    let distEvent

    context('updateMultipleReservedTokens', async () => {

      context('when the admin attempts to reserve tokens with invalid parameters', async () => {

        let invalidCalldata
        let invalidEvent

        context('such as input lengths of 0', async () => {

          let invalidInput = []

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.updateMultipleReservedTokens(
              invalidInput, invalidInput, invalidInput, invalidInput, adminContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, invalidCalldata,
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

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })

            it('should contain the error message \'InvalidInputArray\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'InvalidInputArray').should.be.eq(true)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })
          })
        })

        context('such as mismatched input lengths', async () => {

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.updateMultipleReservedTokens(
              singleDestination, multiTokens, multiPercents, multiDecimals, adminContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, invalidCalldata,
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

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })

            it('should contain the error message \'InvalidInputArray\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'InvalidInputArray').should.be.eq(true)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })

            it('should not have reserved token information about the passed in address', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(0)
              destInfo[1].toNumber().should.be.eq(0)
              destInfo[2].toNumber().should.be.eq(0)
              destInfo[3].toNumber().should.be.eq(0)
            })
          })
        })

        context('such as an input address of 0x0 for the destination', async () => {

          let invalidAddress = zeroAddress()
          let invalidDestination = [invalidAddress]

          beforeEach(async () => {
            invalidCalldata = await consoleUtils.updateMultipleReservedTokens(
              invalidDestination, singleToken, singlePercent, singleDecimal, adminContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, invalidCalldata,
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

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })

            it('should contain the error message \'InvalidDestination\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'InvalidDestination').should.be.eq(true)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })

            it('should not have reserved token information about the zero address', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, invalidDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(0)
              destInfo[1].toNumber().should.be.eq(0)
              destInfo[2].toNumber().should.be.eq(0)
              destInfo[3].toNumber().should.be.eq(0)
            })
          })
        })
      })

      context('when the amount of reserved addresses exceeds 20', async () => {

        let invalidCalldata
        let invalidEvent

        let largeDestinations = []
        let largeTokens = []
        let largePercents = []
        let largeDecimals = []
        // Push 20 unique addresses to the array
        while (largeDestinations.length <= 20) {
          largeDestinations.push(
            web3.toHex(100 + largeDestinations.length)
          )
          largeTokens.push(1)
          largePercents.push(1)
          largeDecimals.push(1)
        }

        beforeEach(async () => {

          largeDestinations.length.should.be.eq(21)
          invalidCalldata = await consoleUtils.updateMultipleReservedTokens(
            largeDestinations, largeTokens, largePercents, largeDecimals, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'DefaultException\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await consoleUtils.updateMultipleReservedTokens(
            singleDestination, singleToken, singlePercent, singleDecimal, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should not have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(0)
            destInfo[2].toNumber().should.be.eq(0)
            destInfo[3].toNumber().should.be.eq(0)
          })
        })
      })

      context('when the crowdsale is already initialized', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          invalidCalldata = await consoleUtils.updateMultipleReservedTokens(
            singleDestination, singleToken, singlePercent, singleDecimal, otherContext
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
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have an initialized crowdsale', async () => {

            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(false)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should not have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(0)
            destInfo[2].toNumber().should.be.eq(0)
            destInfo[3].toNumber().should.be.eq(0)
          })
        })
      })

      context('when the sender is the admin, and the input parameters are valid', async () => {

        context('when the admin reserves a single destination', async () => {

          beforeEach(async () => {

            singleCalldata = await consoleUtils.updateMultipleReservedTokens(
              singleDestination, singleToken, singlePercent, singleDecimal, adminContext
            ).should.be.fulfilled
            singleCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, singleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            singleEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            singleEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = singleEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = singleEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 1', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(1)
              resInfo[1].length.should.be.eq(1)
              resInfo[1][0].should.be.eq(singleDestination[0])
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(singleToken[0])
                destInfo[2].toNumber().should.be.eq(singlePercent[0])
                destInfo[3].toNumber().should.be.eq(singleDecimal[0])
              })
            })
          })
        })

        context('when the admin reserves multiple destinations', async () => {

          beforeEach(async () => {

            multiCalldata = await consoleUtils.updateMultipleReservedTokens(
              multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
            ).should.be.fulfilled
            multiCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, multiCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            multiEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            multiEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = multiEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = multiEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 3', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(3)
              resInfo[1].length.should.be.eq(3)
              resInfo[1][0].should.be.eq(multiDestination[0])
              resInfo[1][1].should.be.eq(multiDestination[1])
              resInfo[1][2].should.be.eq(multiDestination[2])
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(multiTokens[0])
                destInfo[2].toNumber().should.be.eq(multiPercents[0])
                destInfo[3].toNumber().should.be.eq(multiDecimals[0])
              })
            })

            describe('Destination 2', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[1]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(1)
                destInfo[1].toNumber().should.be.eq(multiTokens[1])
                destInfo[2].toNumber().should.be.eq(multiPercents[1])
                destInfo[3].toNumber().should.be.eq(multiDecimals[1])
              })
            })

            describe('Destination 3', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[2]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(2)
                destInfo[1].toNumber().should.be.eq(multiTokens[2])
                destInfo[2].toNumber().should.be.eq(multiPercents[2])
                destInfo[3].toNumber().should.be.eq(multiDecimals[2])
              })
            })
          })

        })

        context('when the admin reserves multiple destinations over multiple transactions', async () => {

          beforeEach(async () => {

            singleCalldata = await consoleUtils.updateMultipleReservedTokens(
              singleDestination, singleToken, singlePercent, singleDecimal, adminContext
            ).should.be.fulfilled
            singleCalldata.should.not.eq('0x')

            multiCalldata = await consoleUtils.updateMultipleReservedTokens(
              multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
            ).should.be.fulfilled
            multiCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, multiCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            multiEvent = events[0]

            events = await storage.exec(
              tokenConsole.address, executionID, singleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            singleEvent = events[0]
          })

          it('should emit 2 ApplicationExecution events', async () => {
            multiEvent.event.should.be.eq('ApplicationExecution')
            singleEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution events', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = multiEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
              emittedExecID = singleEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = multiEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
              emittedAppAddr = singleEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 4', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(4)
              resInfo[1].length.should.be.eq(4)
              resInfo[1][0].should.be.eq(multiDestination[0])
              resInfo[1][1].should.be.eq(multiDestination[1])
              resInfo[1][2].should.be.eq(multiDestination[2])
              resInfo[1][3].should.be.eq(singleDestination[0])
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(multiTokens[0])
                destInfo[2].toNumber().should.be.eq(multiPercents[0])
                destInfo[3].toNumber().should.be.eq(multiDecimals[0])
              })
            })

            describe('Destination 2', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[1]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(1)
                destInfo[1].toNumber().should.be.eq(multiTokens[1])
                destInfo[2].toNumber().should.be.eq(multiPercents[1])
                destInfo[3].toNumber().should.be.eq(multiDecimals[1])
              })
            })

            describe('Destination 3', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[2]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(2)
                destInfo[1].toNumber().should.be.eq(multiTokens[2])
                destInfo[2].toNumber().should.be.eq(multiPercents[2])
                destInfo[3].toNumber().should.be.eq(multiDecimals[2])
              })
            })

            describe('Destination 4', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(3)
                destInfo[1].toNumber().should.be.eq(singleToken[0])
                destInfo[2].toNumber().should.be.eq(singlePercent[0])
                destInfo[3].toNumber().should.be.eq(singleDecimal[0])
              })
            })
          })
        })
      })
    })

    context('removeReservedTokens', async () => {

      // Reserve a single destination
      beforeEach(async () => {
        singleCalldata = await consoleUtils.updateMultipleReservedTokens(
          singleDestination, singleToken, singlePercent, singleDecimal, adminContext
        ).should.be.fulfilled
        singleCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenConsole.address, executionID, singleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        let destInfo = await initCrowdsale.getReservedTokenDestinationList(
          storage.address, executionID
        ).should.be.fulfilled
        destInfo.length.should.be.eq(2)
        destInfo[0].toNumber().should.be.eq(1)
        destInfo[1].length.should.be.eq(1)
        destInfo[1][0].should.be.eq(singleDestination[0])
      })

      context('when the input address is invalid', async () => {

        let invalidCalldata
        let invalidEvent

        let invalidAddress = zeroAddress()

        beforeEach(async () => {

          invalidCalldata = await consoleUtils.removeReservedTokens(
            invalidAddress, adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'InvalidDestination\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidDestination').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a reserved destination list length of 1', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(1)
            resInfo[1].length.should.be.eq(1)
            resInfo[1][0].should.be.eq(singleDestination[0])
          })

          it('should still have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(singleToken[0])
            destInfo[2].toNumber().should.be.eq(singlePercent[0])
            destInfo[3].toNumber().should.be.eq(singleDecimal[0])
          })
        })
      })

      context('when the crowdsale is already initialized', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          invalidCalldata = await consoleUtils.removeReservedTokens(
            singleDestination[0], adminContext
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
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have an initialized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(false)
          })

          it('should have a reserved destination list length of 1', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(1)
            resInfo[1].length.should.be.eq(1)
            resInfo[1][0].should.be.eq(singleDestination[0])
          })

          it('should still have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(singleToken[0])
            destInfo[2].toNumber().should.be.eq(singlePercent[0])
            destInfo[3].toNumber().should.be.eq(singleDecimal[0])
          })
        })
      })

      context('when the sender is not the admin', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {

          invalidCalldata = await consoleUtils.removeReservedTokens(
            singleDestination, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'NotAdminOrSaleIsInit\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'NotAdminOrSaleIsInit').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a reserved destination list length of 1', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(1)
            resInfo[1].length.should.be.eq(1)
            resInfo[1][0].should.be.eq(singleDestination[0])
          })

          it('should still have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(singleToken[0])
            destInfo[2].toNumber().should.be.eq(singlePercent[0])
            destInfo[3].toNumber().should.be.eq(singleDecimal[0])
          })
        })
      })

      context('when the destination to remove is not in the list of reserved destinations', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {

          invalidCalldata = await consoleUtils.removeReservedTokens(
            multiDestination[0], adminContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'DefaultException\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a reserved destination list length of 1', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(1)
            resInfo[1].length.should.be.eq(1)
            resInfo[1][0].should.be.eq(singleDestination[0])
          })

          it('should still have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(singleToken[0])
            destInfo[2].toNumber().should.be.eq(singlePercent[0])
            destInfo[3].toNumber().should.be.eq(singleDecimal[0])
          })
        })
      })

      context('when the input and state are valid', async () => {

        context('when the destination to remove is the final destination in the reserved list', async () => {

          beforeEach(async () => {
            multiCalldata = await consoleUtils.updateMultipleReservedTokens(
              multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
            ).should.be.fulfilled
            multiCalldata.should.not.eq('0x')

            removeCalldata = await consoleUtils.removeReservedTokens(
              multiDestination[2], adminContext
            ).should.be.fulfilled
            removeCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, multiCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let destInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            destInfo.length.should.be.eq(2)

            destInfo[0].toNumber().should.be.eq(4)
            destInfo[1].length.should.be.eq(4)
            destInfo[1][0].should.be.eq(singleDestination[0])
            destInfo[1][1].should.be.eq(multiDestination[0])
            destInfo[1][2].should.be.eq(multiDestination[1])
            destInfo[1][3].should.be.eq(multiDestination[2])

            events = await storage.exec(
              tokenConsole.address, executionID, removeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            removeEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            removeEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = removeEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = removeEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 3', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(3)
              resInfo[1].length.should.be.eq(3)
              resInfo[1][0].should.be.eq(singleDestination[0])
              resInfo[1][1].should.be.eq(multiDestination[0])
              resInfo[1][2].should.be.eq(multiDestination[1])
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(singleToken[0])
                destInfo[2].toNumber().should.be.eq(singlePercent[0])
                destInfo[3].toNumber().should.be.eq(singleDecimal[0])
              })
            })

            describe('Destination 2', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(1)
                destInfo[1].toNumber().should.be.eq(multiTokens[0])
                destInfo[2].toNumber().should.be.eq(multiPercents[0])
                destInfo[3].toNumber().should.be.eq(multiDecimals[0])
              })
            })

            describe('Destination 3', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[1]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(2)
                destInfo[1].toNumber().should.be.eq(multiTokens[1])
                destInfo[2].toNumber().should.be.eq(multiPercents[1])
                destInfo[3].toNumber().should.be.eq(multiDecimals[1])
              })
            })

            describe('Destination 4', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[2]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(0)
                destInfo[2].toNumber().should.be.eq(0)
                destInfo[3].toNumber().should.be.eq(0)
              })
            })
          })
        })

        context('when the destination to remove is not the final destination in the list', async () => {

          beforeEach(async () => {
            multiCalldata = await consoleUtils.updateMultipleReservedTokens(
              multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
            ).should.be.fulfilled
            multiCalldata.should.not.eq('0x')

            removeCalldata = await consoleUtils.removeReservedTokens(
              singleDestination[0], adminContext
            ).should.be.fulfilled
            removeCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, multiCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let destInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            destInfo.length.should.be.eq(2)

            destInfo[0].toNumber().should.be.eq(4)
            destInfo[1].length.should.be.eq(4)
            destInfo[1][0].should.be.eq(singleDestination[0])
            destInfo[1][1].should.be.eq(multiDestination[0])
            destInfo[1][2].should.be.eq(multiDestination[1])
            destInfo[1][3].should.be.eq(multiDestination[2])

            events = await storage.exec(
              tokenConsole.address, executionID, removeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)

            removeEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            removeEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = removeEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = removeEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 3', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(3)
              resInfo[1].length.should.be.eq(3)
              resInfo[1][0].should.be.eq(multiDestination[2])
              resInfo[1][1].should.be.eq(multiDestination[0])
              resInfo[1][2].should.be.eq(multiDestination[1])
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(0)
                destInfo[2].toNumber().should.be.eq(0)
                destInfo[3].toNumber().should.be.eq(0)
              })
            })

            describe('Destination 2', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(1)
                destInfo[1].toNumber().should.be.eq(multiTokens[0])
                destInfo[2].toNumber().should.be.eq(multiPercents[0])
                destInfo[3].toNumber().should.be.eq(multiDecimals[0])
              })
            })

            describe('Destination 3', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[1]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(2)
                destInfo[1].toNumber().should.be.eq(multiTokens[1])
                destInfo[2].toNumber().should.be.eq(multiPercents[1])
                destInfo[3].toNumber().should.be.eq(multiDecimals[1])
              })
            })

            describe('Destination 4', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[2]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(multiTokens[2])
                destInfo[2].toNumber().should.be.eq(multiPercents[2])
                destInfo[3].toNumber().should.be.eq(multiDecimals[2])
              })
            })
          })
        })

        context('when there is only one destination', async () => {

          beforeEach(async () => {
            removeCalldata = await consoleUtils.removeReservedTokens(
              singleDestination[0], adminContext
            ).should.be.fulfilled
            removeCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenConsole.address, executionID, removeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            removeEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            removeEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = removeEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = removeEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(0)
                destInfo[2].toNumber().should.be.eq(0)
                destInfo[3].toNumber().should.be.eq(0)
              })
            })
          })
        })
      })
    })

    context('distributeReservedTokens', async () => {

      beforeEach(async () => {
        singleCalldata = await consoleUtils.updateMultipleReservedTokens(
          singleDestination, singleToken, singlePercent, singleDecimal, adminContext
        ).should.be.fulfilled
        singleCalldata.should.not.eq('0x')

        let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let setTotalSoldCalldata = await consoleUtils.setTotalSold(
          totalSold
        ).should.be.fulfilled
        setTotalSoldCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenConsole.address, executionID, singleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsole.address, executionID, initTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          tokenMock.address, executionID, setTotalSoldCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')
      })

      describe('pre-test storage', async () => {

        it('should have properly initialized the token', async () => {
          let tokenInfo = await initCrowdsale.getTokenInfo(
            storage.address, executionID
          ).should.be.fulfilled
          tokenInfo.length.should.be.eq(4)

          hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
          hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
          tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
          tokenInfo[3].toNumber().should.be.eq(totalSold)
        })

        it('should not have initialized the crowdsale', async () => {
          let saleInfo = await initCrowdsale.getCrowdsaleInfo(
            storage.address, executionID
          ).should.be.fulfilled
          saleInfo.length.should.be.eq(5)

          saleInfo[0].toNumber().should.be.eq(0)
          saleInfo[1].should.be.eq(teamWallet)
          saleInfo[2].toNumber().should.be.eq(0)
          saleInfo[3].should.be.eq(false)
          saleInfo[4].should.be.eq(false)
        })

        it('should have a reserved destination list length of 1', async () => {
          let destInfo = await initCrowdsale.getReservedTokenDestinationList(
            storage.address, executionID
          ).should.be.fulfilled
          destInfo.length.should.be.eq(2)

          destInfo[0].toNumber().should.be.eq(1)
          destInfo[1].length.should.be.eq(1)
          destInfo[1][0].should.be.eq(singleDestination[0])
        })

        it('should have properly stored reserved token information', async () => {
          let resInfo = await initCrowdsale.getReservedDestinationInfo(
            storage.address, executionID, singleDestination[0]
          ).should.be.fulfilled
          resInfo.length.should.be.eq(4)

          resInfo[0].toNumber().should.be.eq(0)
          resInfo[1].toNumber().should.be.eq(singleToken[0])
          resInfo[2].toNumber().should.be.eq(singlePercent[0])
          resInfo[3].toNumber().should.be.eq(singleDecimal[0])
        })

        it('should have the correct amount of tokens sold total', async () => {
          let soldInfo = await initCrowdsale.getTokensSold(
            storage.address, executionID
          ).should.be.fulfilled
          soldInfo.toNumber().should.be.eq(totalSold)
        })
      })

      context('when the input amount is 0', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
            adminContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          invalidCalldata = await consoleUtils.distributeReservedTokens(
            0, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleConsole.address, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'InvalidAmt\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidAmt').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 1', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(1)
            resInfo[1].length.should.be.eq(1)
            resInfo[1][0].should.be.eq(singleDestination[0])
          })

          it('should still have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(singleToken[0])
            destInfo[2].toNumber().should.be.eq(singlePercent[0])
            destInfo[3].toNumber().should.be.eq(singleDecimal[0])
          })
        })
      })

      context('when the crowdsale is not finalized', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          invalidCalldata = await consoleUtils.distributeReservedTokens(
            1, otherContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, invalidCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })

          it('should contain the error message \'CrowdsaleNotFinalized\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'CrowdsaleNotFinalized').should.be.eq(true)
          })
        })

        describe('the resulting storage', async () => {

          it('should not have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(false)
          })

          it('should have a reserved destination list length of 1', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(1)
            resInfo[1].length.should.be.eq(1)
            resInfo[1][0].should.be.eq(singleDestination[0])
          })

          it('should still have reserved token information for the passed in address', async () => {
            let destInfo = await initCrowdsale.getReservedDestinationInfo(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            destInfo.length.should.be.eq(4)

            destInfo[0].toNumber().should.be.eq(0)
            destInfo[1].toNumber().should.be.eq(singleToken[0])
            destInfo[2].toNumber().should.be.eq(singlePercent[0])
            destInfo[3].toNumber().should.be.eq(singleDecimal[0])
          })
        })
      })

      context('when the input and crowdsale state are valid for token distribution', async () => {

        context('when the amount input is greater than the number of destinations to distribute to', async () => {

          beforeEach(async () => {
            let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
              adminContext
            ).should.be.fulfilled
            initCrowdsaleCalldata.should.not.eq('0x')

            let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
              adminContext
            ).should.be.fulfilled
            finalizeCalldata.should.not.eq('0x')

            distCalldata = await consoleUtils.distributeReservedTokens(
              2, otherContext
            ).should.be.fulfilled
            distCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              crowdsaleConsole.address, executionID, finalizeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              tokenConsole.address, executionID, distCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            distEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            distEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = distEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = distEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })

            it('should have correctly calculated the new total supply', async () => {
              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled

              let supplyInfo = await initCrowdsale.totalSupply(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(singleToken[0])
                destInfo[2].toNumber().should.be.eq(singlePercent[0])
                destInfo[3].toNumber().should.be.eq(singleDecimal[0])
              })

              it('should have correctly calculated the new token balance', async () => {
                let tokens = singleToken[0]
                let percent = singlePercent[0]
                let precision = singleDecimal[0]
                precision = (10 ** (2 + precision))

                let expectedBalance =
                    ((totalSold * percent) / precision) + tokens

                let balanceInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                balanceInfo.toNumber().should.be.eq(expectedBalance)
              })
            })
          })
        })

        context('when there is only one address to distribute to', async () => {

          beforeEach(async () => {
            let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
              adminContext
            ).should.be.fulfilled
            initCrowdsaleCalldata.should.not.eq('0x')

            let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
              adminContext
            ).should.be.fulfilled
            finalizeCalldata.should.not.eq('0x')

            distCalldata = await consoleUtils.distributeReservedTokens(
              1, otherContext
            ).should.be.fulfilled
            distCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              crowdsaleConsole.address, executionID, finalizeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              tokenConsole.address, executionID, distCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            distEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            distEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = distEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = distEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })

            it('should have correctly calculated the new total supply', async () => {
              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled

              let supplyInfo = await initCrowdsale.totalSupply(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(singleToken[0])
                destInfo[2].toNumber().should.be.eq(singlePercent[0])
                destInfo[3].toNumber().should.be.eq(singleDecimal[0])
              })

              it('should have correctly calculated the new token balance', async () => {
                let tokens = singleToken[0]
                let percent = singlePercent[0]
                let precision = singleDecimal[0]
                precision = (10 ** (2 + precision))

                let expectedBalance =
                    ((totalSold * percent) / precision) + tokens

                let balanceInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                balanceInfo.toNumber().should.be.eq(expectedBalance)
              })
            })
          })
        })

        context('when there are no addresses to distribute to', async () => {

          beforeEach(async () => {
            let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
              adminContext
            ).should.be.fulfilled
            initCrowdsaleCalldata.should.not.eq('0x')

            let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
              adminContext
            ).should.be.fulfilled
            finalizeCalldata.should.not.eq('0x')

            distCalldata = await consoleUtils.distributeReservedTokens(
              1, otherContext
            ).should.be.fulfilled
            distCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              crowdsaleConsole.address, executionID, finalizeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              tokenConsole.address, executionID, distCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              tokenConsole.address, executionID, distCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            distEvent = events[0]
          })

          it('should emit an ApplicationException event', async () => {
            distEvent.event.should.be.eq('ApplicationException')
          })

          describe('the ApplicationException event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = distEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = distEvent.args['application_address']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })

            it('should contain the error message \'NoRemainingDestinations\'', async () => {
              let emittedMessage = distEvent.args['message']
              hexStrEquals(emittedMessage, 'NoRemainingDestinations').should.be.eq(true)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a finalized crowdsale', async () => {
              let saleInfo = await initCrowdsale.getCrowdsaleInfo(
                storage.address, executionID
              ).should.be.fulfilled
              saleInfo.length.should.be.eq(5)

              saleInfo[0].toNumber().should.be.eq(0)
              saleInfo[1].should.be.eq(teamWallet)
              saleInfo[2].toNumber().should.be.eq(0)
              saleInfo[3].should.be.eq(true)
              saleInfo[4].should.be.eq(true)
            })

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })
          })
        })

        context('when there are several addresses to distribute to', async () => {

          let multiBalances = [1000, 0, 2000, 3000]
          let totalAdded = 6000

          beforeEach(async () => {
            let setBalanceCalldata = await tokenUtil.setBalance(
              singleDestination[0], multiBalances[0]
            ).should.be.fulfilled

            await storage.exec(
              tokenMock.address, executionID, setBalanceCalldata,
              { from: exec }
            ).should.be.fulfilled

            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(multiBalances[0])

            setBalanceCalldata = await tokenUtil.setBalance(
              multiDestination[0], multiBalances[1]
            ).should.be.fulfilled

            await storage.exec(
              tokenMock.address, executionID, setBalanceCalldata,
              { from: exec }
            ).should.be.fulfilled

            balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[0]
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(multiBalances[1])

            setBalanceCalldata = await tokenUtil.setBalance(
              multiDestination[1], multiBalances[2]
            ).should.be.fulfilled

            await storage.exec(
              tokenMock.address, executionID, setBalanceCalldata,
              { from: exec }
            ).should.be.fulfilled

            balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[1]
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(multiBalances[2])

            setBalanceCalldata = await tokenUtil.setBalance(
              multiDestination[2], multiBalances[3]
            ).should.be.fulfilled

            await storage.exec(
              tokenMock.address, executionID, setBalanceCalldata,
              { from: exec }
            ).should.be.fulfilled

            balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[2]
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(multiBalances[3])

            // Update total sold and total supply to accomodate added balances
            let setTotalSoldCalldata = await consoleUtils.setTotalSold(
              totalSold + totalAdded
            ).should.be.fulfilled
            setTotalSoldCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenMock.address, executionID, setTotalSoldCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            // Reserve tokens for more addresses
            multiCalldata = await consoleUtils.updateMultipleReservedTokens(
              multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
            ).should.be.fulfilled
            multiCalldata.should.not.eq('0x')

            let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
              adminContext
            ).should.be.fulfilled
            initCrowdsaleCalldata.should.not.eq('0x')

            let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
              adminContext
            ).should.be.fulfilled
            finalizeCalldata.should.not.eq('0x')

            distCalldata = await consoleUtils.distributeReservedTokens(
              100, adminContext
            ).should.be.fulfilled
            distCalldata.should.not.eq('0x')

            events = await storage.exec(
              tokenConsole.address, executionID, multiCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let destInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            destInfo.length.should.be.eq(2)
            destInfo[0].toNumber().should.be.eq(4)
            destInfo[1].length.should.be.eq(4)

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
              crowdsaleConsole.address, executionID, finalizeCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            events = await storage.exec(
              tokenConsole.address, executionID, distCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            distEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            distEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = distEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenConsole address', async () => {
              let emittedAppAddr = distEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenConsole.address)
            })
          })

          describe('the resulting storage', async () => {

            it('should have a reserved destination list length of 0', async () => {
              let resInfo = await initCrowdsale.getReservedTokenDestinationList(
                storage.address, executionID
              ).should.be.fulfilled
              resInfo.length.should.be.eq(2)

              resInfo[0].toNumber().should.be.eq(0)
              resInfo[1].length.should.be.eq(0)
            })

            it('should have correctly calculated the new total supply', async () => {
              let balanceOne = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled

              let balanceTwo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[0]
              ).should.be.fulfilled

              let balanceThree = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[1]
              ).should.be.fulfilled

              let balanceFour = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[2]
              ).should.be.fulfilled

              let totalUpdated = balanceOne.toNumber() + balanceTwo.toNumber()
                  + balanceThree.toNumber() + balanceFour.toNumber()

              let supplyInfo = await initCrowdsale.totalSupply(
                storage.address, executionID
              ).should.be.fulfilled
              supplyInfo.toNumber().should.be.eq(totalUpdated + totalSold)
            })

            describe('Destination 1', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(0)
                destInfo[1].toNumber().should.be.eq(singleToken[0])
                destInfo[2].toNumber().should.be.eq(singlePercent[0])
                destInfo[3].toNumber().should.be.eq(singleDecimal[0])
              })

              it('should have correctly calculated the new token balance', async () => {
                let prevBal = multiBalances[0]
                let tokens = singleToken[0]
                let percent = singlePercent[0]
                let precision = singleDecimal[0]
                precision = (10 ** (2 + precision))

                let expectedBalance =
                    (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

                let balanceInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, singleDestination[0]
                ).should.be.fulfilled
                balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
              })
            })

            describe('Destination 2', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[0]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(1)
                destInfo[1].toNumber().should.be.eq(multiTokens[0])
                destInfo[2].toNumber().should.be.eq(multiPercents[0])
                destInfo[3].toNumber().should.be.eq(multiDecimals[0])
              })

              it('should have correctly calculated the new token balance', async () => {
                let prevBal = multiBalances[1]
                let tokens = multiTokens[0]
                let percent = multiPercents[0]
                let precision = multiDecimals[0]
                precision = (10 ** (2 + precision))

                let expectedBalance =
                    (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

                let balanceInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, multiDestination[0]
                ).should.be.fulfilled
                balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
              })
            })

            describe('Destination 3', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[1]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(2)
                destInfo[1].toNumber().should.be.eq(multiTokens[1])
                destInfo[2].toNumber().should.be.eq(multiPercents[1])
                destInfo[3].toNumber().should.be.eq(multiDecimals[1])
              })

              it('should have correctly calculated the new token balance', async () => {
                let prevBal = multiBalances[2]
                let tokens = multiTokens[1]
                let percent = multiPercents[1]
                let precision = multiDecimals[1]
                precision = (10 ** (2 + precision))

                let expectedBalance =
                    (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

                let balanceInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, multiDestination[1]
                ).should.be.fulfilled
                balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
              })
            })

            describe('Destination 4', async () => {

              it('should store the correct reserved token information', async () => {
                let destInfo = await initCrowdsale.getReservedDestinationInfo(
                  storage.address, executionID, multiDestination[2]
                ).should.be.fulfilled
                destInfo.length.should.be.eq(4)

                destInfo[0].toNumber().should.be.eq(3)
                destInfo[1].toNumber().should.be.eq(multiTokens[2])
                destInfo[2].toNumber().should.be.eq(multiPercents[2])
                destInfo[3].toNumber().should.be.eq(multiDecimals[2])
              })

              it('should have correctly calculated the new token balance', async () => {
                let prevBal = multiBalances[3]
                let tokens = multiTokens[2]
                let percent = multiPercents[2]
                let precision = multiDecimals[2]
                precision = (10 ** (2 + precision))

                let expectedBalance =
                    (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

                let balanceInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, multiDestination[2]
                ).should.be.fulfilled
                balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
              })
            })
          })
        })
      })
    })
  })

  context('finalizeCrowdsaleAndToken', async () => {

    context('when the crowdsale is not initialized', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        invalidCalldata = await consoleUtils.finalizeCrowdsaleAndToken(
          adminContext
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenConsole.address, executionID, invalidCalldata,
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

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('the resulting storage', async () => {

        it('should have an uninitialized crowdsale', async () => {
          let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
    })

    context('when the crowdsale is already finalized', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
          adminContext
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
          adminContext
        ).should.be.fulfilled
        finalizeCalldata.should.not.eq('0x')

        invalidCalldata = await consoleUtils.finalizeCrowdsaleAndToken(
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
          crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleConsole.address, executionID, finalizeCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          tokenConsole.address, executionID, invalidCalldata,
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

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('the resulting storage', async () => {

        it('should have a finalized crowdsale', async () => {
          let saleInfo = await initCrowdsale.getCrowdsaleInfo(
            storage.address, executionID
          ).should.be.fulfilled
          saleInfo.length.should.be.eq(5)

          saleInfo[0].toNumber().should.be.eq(0)
          saleInfo[1].should.be.eq(teamWallet)
          saleInfo[2].toNumber().should.be.eq(0)
          saleInfo[3].should.be.eq(true)
          saleInfo[4].should.be.eq(true)
        })
      })
    })

    context('when the sender is not the admin', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {
        let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
          adminContext
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        invalidCalldata = await consoleUtils.finalizeCrowdsaleAndToken(
          otherContext
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
          tokenConsole.address, executionID, invalidCalldata,
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

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })

        it('should contain the error message \'NotAdminOrStatusInvalid\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'NotAdminOrStatusInvalid').should.be.eq(true)
        })
      })

      describe('the resulting storage', async () => {

        it('should have an initialized, but not finalized, crowdsale', async () => {
          let saleInfo = await initCrowdsale.getCrowdsaleInfo(
            storage.address, executionID
          ).should.be.fulfilled
          saleInfo.length.should.be.eq(5)

          saleInfo[0].toNumber().should.be.eq(0)
          saleInfo[1].should.be.eq(teamWallet)
          saleInfo[2].toNumber().should.be.eq(0)
          saleInfo[3].should.be.eq(true)
          saleInfo[4].should.be.eq(false)
        })
      })
    })

    context('when the sender is the admin', async () => {

      let finalizeCalldata
      let finalizeEvent

      context('when there is only one address to distribute to', async () => {

        beforeEach(async () => {
          singleCalldata = await consoleUtils.updateMultipleReservedTokens(
            singleDestination, singleToken, singlePercent, singleDecimal, adminContext
          ).should.be.fulfilled
          singleCalldata.should.not.eq('0x')

          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let setTotalSoldCalldata = await consoleUtils.setTotalSold(
            totalSold
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await consoleUtils.finalizeCrowdsaleAndToken(
            adminContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, singleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenMock.address, executionID, setTotalSoldCalldata,
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
            tokenConsole.address, executionID, finalizeCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled

            let supplyInfo = await initCrowdsale.totalSupply(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
          })

          describe('Destination 1', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(0)
              destInfo[1].toNumber().should.be.eq(singleToken[0])
              destInfo[2].toNumber().should.be.eq(singlePercent[0])
              destInfo[3].toNumber().should.be.eq(singleDecimal[0])
            })

            it('should have correctly calculated the new token balance', async () => {
              let tokens = singleToken[0]
              let percent = singlePercent[0]
              let precision = singleDecimal[0]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  ((totalSold * percent) / precision) + tokens

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })

            it('should allow token transfers', async () => {
              let transferCalldata = await tokenUtil.transfer(
                crowdsaleAdmin, 1, singleContext
              ).should.be.fulfilled
              transferCalldata.should.not.eq('0x')

              let events = await storage.exec(
                tokenTransfer.address, executionID, transferCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, crowdsaleAdmin
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(1)
            })
          })
        })
      })

      context('when there are no addresses to distribute to', async () => {

        beforeEach(async () => {
          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let setTotalSoldCalldata = await consoleUtils.setTotalSold(
            totalSold
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let setBalanceCalldata = await tokenUtil.setBalance(
            otherAddress, 100
          ).should.be.fulfilled
          setBalanceCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await consoleUtils.finalizeCrowdsaleAndToken(
            adminContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

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
            tokenMock.address, executionID, setTotalSoldCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
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
            tokenConsole.address, executionID, finalizeCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let supplyInfo = await initCrowdsale.totalSupply(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(totalSold)
          })

          it('should allow token transfers', async () => {
            let transferCalldata = await tokenUtil.transfer(
              crowdsaleAdmin, 1, otherContext
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenTransfer.address, executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, crowdsaleAdmin
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(1)
          })
        })
      })

      context('when there are several addresses to distribute to', async () => {

        let multiBalances = [0, 1000, 2000, 3000]
        let totalAdded = 6000

        beforeEach(async () => {
          let setBalanceCalldata = await tokenUtil.setBalance(
            singleDestination[0], multiBalances[0]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          let balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, singleDestination[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[0])

          setBalanceCalldata = await tokenUtil.setBalance(
            multiDestination[0], multiBalances[1]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, multiDestination[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[1])

          setBalanceCalldata = await tokenUtil.setBalance(
            multiDestination[1], multiBalances[2]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, multiDestination[1]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[2])

          setBalanceCalldata = await tokenUtil.setBalance(
            multiDestination[2], multiBalances[3]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, multiDestination[2]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[3])

          singleCalldata = await consoleUtils.updateMultipleReservedTokens(
            singleDestination, singleToken, singlePercent, singleDecimal, adminContext
          ).should.be.fulfilled
          singleCalldata.should.not.eq('0x')

          multiCalldata = await consoleUtils.updateMultipleReservedTokens(
            multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
          ).should.be.fulfilled
          multiCalldata.should.not.eq('0x')

          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          // Update total sold and total supply to accomodate added balances
          let setTotalSoldCalldata = await consoleUtils.setTotalSold(
            totalSold + totalAdded
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await consoleUtils.finalizeCrowdsaleAndToken(
            adminContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, singleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, multiCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          let destInfo = await initCrowdsale.getReservedTokenDestinationList(
            storage.address, executionID
          ).should.be.fulfilled
          destInfo.length.should.be.eq(2)
          destInfo[0].toNumber().should.be.eq(4)
          destInfo[1].length.should.be.eq(4)

          events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenMock.address, executionID, setTotalSoldCalldata,
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
            tokenConsole.address, executionID, finalizeCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let balanceOne = await initCrowdsale.balanceOf(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled

            let balanceTwo = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[0]
            ).should.be.fulfilled

            let balanceThree = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[1]
            ).should.be.fulfilled

            let balanceFour = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[2]
            ).should.be.fulfilled

            let totalUpdated = balanceOne.toNumber() + balanceTwo.toNumber()
                + balanceThree.toNumber() + balanceFour.toNumber()

            let supplyInfo = await initCrowdsale.totalSupply(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(totalUpdated + totalSold)
          })

          it('should allow token transfers', async () => {
            let transferCalldata = await tokenUtil.transfer(
              crowdsaleAdmin, 1, singleContext
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenTransfer.address, executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, crowdsaleAdmin
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(1)
          })

          describe('Destination 1', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(0)
              destInfo[1].toNumber().should.be.eq(singleToken[0])
              destInfo[2].toNumber().should.be.eq(singlePercent[0])
              destInfo[3].toNumber().should.be.eq(singleDecimal[0])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[0]
              let tokens = singleToken[0]
              let percent = singlePercent[0]
              let precision = singleDecimal[0]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 2', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, multiDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(1)
              destInfo[1].toNumber().should.be.eq(multiTokens[0])
              destInfo[2].toNumber().should.be.eq(multiPercents[0])
              destInfo[3].toNumber().should.be.eq(multiDecimals[0])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[1]
              let tokens = multiTokens[0]
              let percent = multiPercents[0]
              let precision = multiDecimals[0]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 3', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, multiDestination[1]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(2)
              destInfo[1].toNumber().should.be.eq(multiTokens[1])
              destInfo[2].toNumber().should.be.eq(multiPercents[1])
              destInfo[3].toNumber().should.be.eq(multiDecimals[1])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[2]
              let tokens = multiTokens[1]
              let percent = multiPercents[1]
              let precision = multiDecimals[1]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[1]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 4', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, multiDestination[2]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(3)
              destInfo[1].toNumber().should.be.eq(multiTokens[2])
              destInfo[2].toNumber().should.be.eq(multiPercents[2])
              destInfo[3].toNumber().should.be.eq(multiDecimals[2])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[3]
              let tokens = multiTokens[2]
              let percent = multiPercents[2]
              let precision = multiDecimals[2]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[2]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })
        })
      })
    })
  })

  context('finalizeAndDistributeToken', async () => {

    context('when the crowdsale is not finalized', async () => {

      let invalidCalldata
      let invalidEvent

      beforeEach(async () => {

        let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
          tokenName, tokenSymbol, tokenDecimals, adminContext
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
          adminContext
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        invalidCalldata = await consoleUtils.finalizeAndDistributeToken(
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
          crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          tokenConsole.address, executionID, invalidCalldata,
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

        it('should match the TokenConsole address', async () => {
          let emittedAppAddr = invalidEvent.args['application_address']
          emittedAppAddr.should.be.eq(tokenConsole.address)
        })

        it('should contain the error message \'CrowdsaleNotFinalized\'', async () => {
          let emittedMessage = invalidEvent.args['message']
          hexStrEquals(emittedMessage, 'CrowdsaleNotFinalized').should.be.eq(true)
        })
      })

      describe('the resulting storage', async () => {

        it('should have an initialized, but not finalized, crowdsale', async () => {
          let saleInfo = await initCrowdsale.getCrowdsaleInfo(
            storage.address, executionID
          ).should.be.fulfilled
          saleInfo.length.should.be.eq(5)

          saleInfo[0].toNumber().should.be.eq(0)
          saleInfo[1].should.be.eq(teamWallet)
          saleInfo[2].toNumber().should.be.eq(0)
          saleInfo[3].should.be.eq(true)
          saleInfo[4].should.be.eq(false)
        })
      })
    })

    context('when the crowdsale is finalized', async () => {

      let finalizeCalldata
      let finalizeEvent

      context('when there is only one address to distribute to', async () => {

        beforeEach(async () => {
          singleCalldata = await consoleUtils.updateMultipleReservedTokens(
            singleDestination, singleToken, singlePercent, singleDecimal, adminContext
          ).should.be.fulfilled
          singleCalldata.should.not.eq('0x')

          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let setTotalSoldCalldata = await consoleUtils.setTotalSold(
            totalSold
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalCrowdsaleCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
            adminContext
          ).should.be.fulfilled
          finalCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await consoleUtils.finalizeAndDistributeToken(
            otherContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, singleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenMock.address, executionID, setTotalSoldCalldata,
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
            crowdsaleConsole.address, executionID, finalCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, finalizeCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled

            let supplyInfo = await initCrowdsale.totalSupply(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
          })

          describe('Destination 1', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(0)
              destInfo[1].toNumber().should.be.eq(singleToken[0])
              destInfo[2].toNumber().should.be.eq(singlePercent[0])
              destInfo[3].toNumber().should.be.eq(singleDecimal[0])
            })

            it('should have correctly calculated the new token balance', async () => {
              let tokens = singleToken[0]
              let percent = singlePercent[0]
              let precision = singleDecimal[0]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  ((totalSold * percent) / precision) + tokens

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })

            it('should allow token transfers', async () => {
              let transferCalldata = await tokenUtil.transfer(
                crowdsaleAdmin, 1, singleContext
              ).should.be.fulfilled
              transferCalldata.should.not.eq('0x')

              let events = await storage.exec(
                tokenTransfer.address, executionID, transferCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, crowdsaleAdmin
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(1)
            })
          })
        })
      })

      context('when there are no addresses to distribute to', async () => {

        beforeEach(async () => {
          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let setTotalSoldCalldata = await consoleUtils.setTotalSold(
            totalSold
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let setBalanceCalldata = await tokenUtil.setBalance(
            otherAddress, 100
          ).should.be.fulfilled
          setBalanceCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalCrowdsaleCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
            adminContext
          ).should.be.fulfilled
          finalCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await consoleUtils.finalizeAndDistributeToken(
            otherContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

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
            tokenMock.address, executionID, setTotalSoldCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
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
            crowdsaleConsole.address, executionID, finalCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, finalizeCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let supplyInfo = await initCrowdsale.totalSupply(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(totalSold)
          })

          it('should allow token transfers', async () => {
            let transferCalldata = await tokenUtil.transfer(
              crowdsaleAdmin, 1, otherContext
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenTransfer.address, executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, crowdsaleAdmin
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(1)
          })
        })
      })

      context('when there are several addresses to distribute to', async () => {

        let multiBalances = [0, 1000, 2000, 3000]
        let totalAdded = 6000

        beforeEach(async () => {
          let setBalanceCalldata = await tokenUtil.setBalance(
            singleDestination[0], multiBalances[0]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          let balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, singleDestination[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[0])

          setBalanceCalldata = await tokenUtil.setBalance(
            multiDestination[0], multiBalances[1]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, multiDestination[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[1])

          setBalanceCalldata = await tokenUtil.setBalance(
            multiDestination[1], multiBalances[2]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, multiDestination[1]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[2])

          setBalanceCalldata = await tokenUtil.setBalance(
            multiDestination[2], multiBalances[3]
          ).should.be.fulfilled

          await storage.exec(
            tokenMock.address, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await initCrowdsale.balanceOf(
            storage.address, executionID, multiDestination[2]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[3])

          singleCalldata = await consoleUtils.updateMultipleReservedTokens(
            singleDestination, singleToken, singlePercent, singleDecimal, adminContext
          ).should.be.fulfilled
          singleCalldata.should.not.eq('0x')

          multiCalldata = await consoleUtils.updateMultipleReservedTokens(
            multiDestination, multiTokens, multiPercents, multiDecimals, adminContext
          ).should.be.fulfilled
          multiCalldata.should.not.eq('0x')

          let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken(
            tokenName, tokenSymbol, tokenDecimals, adminContext
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          // Update total sold and total supply to accomodate added balances
          let setTotalSoldCalldata = await consoleUtils.setTotalSold(
            totalSold + totalAdded
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
            adminContext
          ).should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalCrowdsaleCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
            adminContext
          ).should.be.fulfilled
          finalCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await consoleUtils.finalizeAndDistributeToken(
            otherContext
          ).should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenConsole.address, executionID, singleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, multiCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          let destInfo = await initCrowdsale.getReservedTokenDestinationList(
            storage.address, executionID
          ).should.be.fulfilled
          destInfo.length.should.be.eq(2)
          destInfo[0].toNumber().should.be.eq(4)
          destInfo[1].length.should.be.eq(4)

          events = await storage.exec(
            crowdsaleConsole.address, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenMock.address, executionID, setTotalSoldCalldata,
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
            crowdsaleConsole.address, executionID, finalCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            tokenConsole.address, executionID, finalizeCalldata,
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

          it('should match the TokenConsole address', async () => {
            let emittedAppAddr = finalizeEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenConsole.address)
          })
        })

        describe('the resulting storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await initCrowdsale.getCrowdsaleInfo(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(5)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].toNumber().should.be.eq(0)
            saleInfo[3].should.be.eq(true)
            saleInfo[4].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await initCrowdsale.getReservedTokenDestinationList(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let balanceOne = await initCrowdsale.balanceOf(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled

            let balanceTwo = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[0]
            ).should.be.fulfilled

            let balanceThree = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[1]
            ).should.be.fulfilled

            let balanceFour = await initCrowdsale.balanceOf(
              storage.address, executionID, multiDestination[2]
            ).should.be.fulfilled

            let totalUpdated = balanceOne.toNumber() + balanceTwo.toNumber()
                + balanceThree.toNumber() + balanceFour.toNumber()

            let supplyInfo = await initCrowdsale.totalSupply(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(totalUpdated + totalSold)
          })

          it('should allow token transfers', async () => {
            let transferCalldata = await tokenUtil.transfer(
              crowdsaleAdmin, 1, singleContext
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenTransfer.address, executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let balanceInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, crowdsaleAdmin
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(1)
          })

          describe('Destination 1', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(0)
              destInfo[1].toNumber().should.be.eq(singleToken[0])
              destInfo[2].toNumber().should.be.eq(singlePercent[0])
              destInfo[3].toNumber().should.be.eq(singleDecimal[0])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[0]
              let tokens = singleToken[0]
              let percent = singlePercent[0]
              let precision = singleDecimal[0]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 2', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, multiDestination[0]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(1)
              destInfo[1].toNumber().should.be.eq(multiTokens[0])
              destInfo[2].toNumber().should.be.eq(multiPercents[0])
              destInfo[3].toNumber().should.be.eq(multiDecimals[0])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[1]
              let tokens = multiTokens[0]
              let percent = multiPercents[0]
              let precision = multiDecimals[0]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 3', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, multiDestination[1]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(2)
              destInfo[1].toNumber().should.be.eq(multiTokens[1])
              destInfo[2].toNumber().should.be.eq(multiPercents[1])
              destInfo[3].toNumber().should.be.eq(multiDecimals[1])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[2]
              let tokens = multiTokens[1]
              let percent = multiPercents[1]
              let precision = multiDecimals[1]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[1]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 4', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await initCrowdsale.getReservedDestinationInfo(
                storage.address, executionID, multiDestination[2]
              ).should.be.fulfilled
              destInfo.length.should.be.eq(4)

              destInfo[0].toNumber().should.be.eq(3)
              destInfo[1].toNumber().should.be.eq(multiTokens[2])
              destInfo[2].toNumber().should.be.eq(multiPercents[2])
              destInfo[3].toNumber().should.be.eq(multiDecimals[2])
            })

            it('should have correctly calculated the new token balance', async () => {
              let prevBal = multiBalances[3]
              let tokens = multiTokens[2]
              let percent = multiPercents[2]
              let precision = multiDecimals[2]
              precision = (10 ** (2 + precision))

              let expectedBalance =
                  (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal

              let balanceInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, multiDestination[2]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })
        })
      })
    })
  })

})
