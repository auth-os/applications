// Abstract storage contract
let AbstractStorage = artifacts.require('./StorageMock')
// MintedCappedCrowdsale
let TokenMock = artifacts.require('./TokenMock')
let Token = artifacts.require('./Token')
let Sale = artifacts.require('./Sale')
let TokenManager = artifacts.require('./TokenManager')
let SaleManager = artifacts.require('./SaleManager')
let MintedCapped = artifacts.require('./MintedCappedIdx')
// Registry
let RegistryUtil = artifacts.require('./RegistryUtil')
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// Util
let MintedCappedUtils = artifacts.require('./MintedCappedTokenMockUtils')

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

contract('#MintedCappedTokenManager', function (accounts) {

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
  let tokenMock
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

  let multiCalldata
  let multiDestination = [
    accounts[accounts.length - 1],
    accounts[accounts.length - 2],
    accounts[accounts.length - 3]
  ]
  let multiTokens = [100, 0, 200]
  let multiPercents = [0, 10, 20]
  let multiDecimals = [1, 2, 0]

  let singleCalldata
  let singleDestination = [accounts[accounts.length - 4]]
  let singleToken = [300]
  let singlePercent = [30]
  let singleDecimal = [3]

  let totalSold = 1000000

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
  let transferAgentHash = web3.sha3('TransferAgentStatusUpdate(bytes32,address,bool)')

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    saleUtils = await MintedCappedUtils.new().should.be.fulfilled

    regUtil = await RegistryUtil.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    saleIdx = await MintedCapped.new().should.be.fulfilled
    token = await Token.new().should.be.fulfilled
    tokenMock = await TokenMock.new().should.be.fulfilled
    sale = await Sale.new().should.be.fulfilled
    tokenManager = await TokenManager.new().should.be.fulfilled
    saleManager = await SaleManager.new().should.be.fulfilled

    saleUtils = await MintedCappedUtils.new().should.be.fulfilled
    saleSelectors = await saleUtils.getSelectors.call().should.be.fulfilled
    saleSelectors.length.should.be.eq(23)
    saleAddrs = [
      saleManager.address, saleManager.address, saleManager.address,
      saleManager.address, saleManager.address, saleManager.address,

      tokenManager.address, tokenManager.address, tokenManager.address,
      tokenManager.address, tokenManager.address, tokenManager.address,
      tokenManager.address,

      sale.address,

      token.address, token.address, token.address, token.address, token.address,

      tokenMock.address, tokenMock.address, tokenMock.address, tokenMock.address
    ]
    saleAddrs.length.should.be.eq(23)
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
  })

  context('setTransferAgentStatus', async () => {

    let agentCalldata
    let agentEvent
    let agentReturn

    context('when the input agent is address 0', async () => {

      let invalidCalldata

      let invalidAddress = zeroAddress()

      beforeEach(async () => {
        invalidCalldata = await saleUtils.setTransferAgentStatus.call(
          invalidAddress, true
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

    context('when the sender is the admin', async () => {

      beforeEach(async () => {
        let setBalanceCalldata = await saleUtils.setBalance.call(
          otherAddress, 100
        ).should.be.fulfilled
        setBalanceCalldata.should.not.eq('0x')

        agentCalldata = await saleUtils.setTransferAgentStatus.call(
          otherAddress, true
        ).should.be.fulfilled
        agentCalldata.should.not.eq('0x')

        let events = await storage.exec(
          exec, executionID, setBalanceCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        agentReturn = await storage.exec.call(
          crowdsaleAdmin, executionID, agentCalldata,
          { from: exec }
        ).should.be.fulfilled

        agentEvents = await storage.exec(
          crowdsaleAdmin, executionID, agentCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.receipt.logs
        })
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          agentReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          agentReturn[0].toNumber().should.be.eq(1)
        })

        it('should return the correct number of addresses paid', async () => {
          agentReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          agentReturn[2].toNumber().should.be.eq(1)
        })
      })

      describe('events', async () => {

        it('should have emitted 2 events total', async () => {
          agentEvents.length.should.be.eq(2)
        })

        describe('the ApplicationExecution event', async () => {

          let eventTopics
          let eventData

          beforeEach(async () => {
            eventTopics = agentEvents[1].topics
            eventData = agentEvents[1].data
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
            eventTopics = agentEvents[0].topics
            eventData = agentEvents[0].data
          })

          it('should have the correct number of topics', async () => {
            eventTopics.length.should.be.eq(3)
          })

          it('should match the correct event signature for the first topic', async () => {
            let sig = eventTopics[0]
            web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferAgentHash))
          })

          it('should match the agent and execution id for the other two topics', async () => {
            web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
            web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(otherAddress))
          })

          it('should contain the set status as data', async () => {
            web3.toDecimal(eventData).should.be.eq(1)
          })
        })
      })

      describe('storage', async () => {

        it('should accurately record the transfer agent\'s status', async () => {
          let agentInfo = await saleIdx.getTransferAgentStatus.call(
            storage.address, executionID, otherAddress
          ).should.be.fulfilled
          agentInfo.should.be.eq(true)
        })

        it('should allow the transfer agent to transfer tokens', async () => {
          let transferCalldata = await saleUtils.transfer.call(
            crowdsaleAdmin, 50
          ).should.be.fulfilled
          transferCalldata.should.not.eq('0x')

          let events = await storage.exec(
            otherAddress, executionID, transferCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          let balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, crowdsaleAdmin
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(50)

          balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, otherAddress
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(50)
        })
      })
    })

    context('when the sender is not the admin', async () => {

      let invalidCalldata

      beforeEach(async () => {
        invalidCalldata = await saleUtils.setTransferAgentStatus.call(
          otherAddress, true
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

  // describe('Reserved Tokens', async () => {
  //
  //   let removeCalldata
  //
  //   let distCalldata
  //
  //   context('updateMultipleReservedTokens', async () => {
  //
  //     context('when the admin attempts to reserve tokens with invalid parameters', async () => {
  //
  //       let invalidCalldata
  //
  //       context('such as input lengths of 0', async () => {
  //
  //         let invalidInput = []
  //
  //         beforeEach(async () => {
  //           invalidCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             invalidInput, invalidInput, invalidInput, invalidInput
  //           ).should.be.fulfilled
  //           invalidCalldata.should.not.eq('0x')
  //         })
  //
  //         it('should throw', async () => {
  //           await storage.exec(
  //             crowdsaleAdmin, executionID, invalidCalldata,
  //             { from: exec }
  //           ).should.not.be.fulfilled
  //         })
  //       })
  //
  //       context('such as mismatched input lengths', async () => {
  //
  //         beforeEach(async () => {
  //           invalidCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             singleDestination, multiTokens, multiPercents, multiDecimals
  //           ).should.be.fulfilled
  //           invalidCalldata.should.not.eq('0x')
  //         })
  //
  //         it('should throw', async () => {
  //           await storage.exec(
  //             crowdsaleAdmin, executionID, invalidCalldata,
  //             { from: exec }
  //           ).should.not.be.fulfilled
  //         })
  //       })
  //
  //       context('such as an input address of 0x0 for the destination', async () => {
  //
  //         let invalidAddress = zeroAddress()
  //         let invalidDestination = [invalidAddress]
  //
  //         beforeEach(async () => {
  //           invalidCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             invalidDestination, singleToken, singlePercent, singleDecimal
  //           ).should.be.fulfilled
  //           invalidCalldata.should.not.eq('0x')
  //         })
  //
  //         it('should throw', async () => {
  //           await storage.exec(
  //             crowdsaleAdmin, executionID, invalidCalldata,
  //             { from: exec }
  //           ).should.not.be.fulfilled
  //         })
  //       })
  //     })
  //
  //     context('when the amount of reserved addresses exceeds 20', async () => {
  //
  //       let invalidCalldata
  //
  //       let largeDestinations = []
  //       let largeTokens = []
  //       let largePercents = []
  //       let largeDecimals = []
  //       // Push 20 unique addresses to the array
  //       while (largeDestinations.length <= 20) {
  //         largeDestinations.push(
  //           web3.toHex(100 + largeDestinations.length)
  //         )
  //         largeTokens.push(1)
  //         largePercents.push(1)
  //         largeDecimals.push(1)
  //       }
  //
  //       beforeEach(async () => {
  //         largeDestinations.length.should.be.eq(21)
  //         invalidCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //           largeDestinations, largeTokens, largePercents, largeDecimals
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the sender is not the admin', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         invalidCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //           singleDestination, singleToken, singlePercent, singleDecimal
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           exec, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the crowdsale is already initialized', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //           tokenName, tokenSymbol, tokenDecimals
  //         ).should.be.fulfilled
  //         initTokenCalldata.should.not.eq('0x')
  //
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         invalidCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //           singleDestination, singleToken, singlePercent, singleDecimal
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, initTokenCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the sender is the admin, and the input parameters are valid', async () => {
  //
  //       context('when the admin reserves a single destination', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             singleDestination, singleToken, singlePercent, singleDecimal
  //           ).should.be.fulfilled
  //           singleCalldata.should.not.eq('0x')
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, singleCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, singleCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(6)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 1', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(1)
  //             resInfo[1].length.should.be.eq(1)
  //             resInfo[1][0].should.be.eq(singleDestination[0])
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(singleToken[0])
  //               destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //               destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //             })
  //           })
  //         })
  //       })
  //
  //       context('when the admin reserves multiple destinations', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             multiDestination, multiTokens, multiPercents, multiDecimals
  //           ).should.be.fulfilled
  //           multiCalldata.should.not.eq('0x')
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, multiCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, multiCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(16)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 3', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(3)
  //             resInfo[1].length.should.be.eq(3)
  //             resInfo[1][0].should.be.eq(multiDestination[0])
  //             resInfo[1][1].should.be.eq(multiDestination[1])
  //             resInfo[1][2].should.be.eq(multiDestination[2])
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[0])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[0])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[0])
  //             })
  //           })
  //
  //           describe('Destination 2', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[1]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(1)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[1])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[1])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[1])
  //             })
  //           })
  //
  //           describe('Destination 3', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[2]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(2)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[2])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[2])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[2])
  //             })
  //           })
  //         })
  //
  //       })
  //
  //       context('when the admin reserves multiple destinations over multiple transactions', async () => {
  //
  //         let execEvents
  //         let execReturns
  //
  //         beforeEach(async () => {
  //           execEvents = []
  //           execReturns = []
  //
  //           singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             singleDestination, singleToken, singlePercent, singleDecimal
  //           ).should.be.fulfilled
  //           singleCalldata.should.not.eq('0x')
  //
  //           multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             multiDestination, multiTokens, multiPercents, multiDecimals
  //           ).should.be.fulfilled
  //           multiCalldata.should.not.eq('0x')
  //
  //           execReturns.push(
  //             await storage.exec.call(
  //               crowdsaleAdmin, executionID, multiCalldata,
  //               { from: exec }
  //             ).should.be.fulfilled
  //           )
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, multiCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvents.push(events[0])
  //
  //           execReturns.push(
  //             await storage.exec.call(
  //               crowdsaleAdmin, executionID, singleCalldata,
  //               { from: exec }
  //             ).should.be.fulfilled
  //           )
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, singleCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvents.push(events[0])
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           let execReturn
  //
  //           describe('return (#1)', async () => {
  //
  //             beforeEach(async () => {
  //               execReturn = execReturns[0]
  //             })
  //
  //             it('should return a tuple with 3 fields', async () => {
  //               execReturn.length.should.be.eq(3)
  //             })
  //
  //             it('should return the correct number of events emitted', async () => {
  //               execReturn[0].toNumber().should.be.eq(0)
  //             })
  //
  //             it('should return the correct number of addresses paid', async () => {
  //               execReturn[1].toNumber().should.be.eq(0)
  //             })
  //
  //             it('should return the correct number of storage slots written to', async () => {
  //               execReturn[2].toNumber().should.be.eq(16)
  //             })
  //           })
  //
  //           describe('return (#2)', async () => {
  //
  //             beforeEach(async () => {
  //               execReturn = execReturns[1]
  //             })
  //
  //             it('should return a tuple with 3 fields', async () => {
  //               execReturn.length.should.be.eq(3)
  //             })
  //
  //             it('should return the correct number of events emitted', async () => {
  //               execReturn[0].toNumber().should.be.eq(0)
  //             })
  //
  //             it('should return the correct number of addresses paid', async () => {
  //               execReturn[1].toNumber().should.be.eq(0)
  //             })
  //
  //             it('should return the correct number of storage slots written to', async () => {
  //               execReturn[2].toNumber().should.be.eq(6)
  //             })
  //           })
  //         })
  //
  //         it('should emit 2 ApplicationExecution events', async () => {
  //           execEvents[0].event.should.be.eq('ApplicationExecution')
  //           execEvents[1].event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution events', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvents[0].args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //             emittedExecID = execEvents[1].args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvents[0].args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //             emittedAppAddr = execEvents[1].args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 4', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(4)
  //             resInfo[1].length.should.be.eq(4)
  //             resInfo[1][0].should.be.eq(multiDestination[0])
  //             resInfo[1][1].should.be.eq(multiDestination[1])
  //             resInfo[1][2].should.be.eq(multiDestination[2])
  //             resInfo[1][3].should.be.eq(singleDestination[0])
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[0])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[0])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[0])
  //             })
  //           })
  //
  //           describe('Destination 2', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[1]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(1)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[1])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[1])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[1])
  //             })
  //           })
  //
  //           describe('Destination 3', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[2]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(2)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[2])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[2])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[2])
  //             })
  //           })
  //
  //           describe('Destination 4', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(3)
  //               destInfo[1].toNumber().should.be.eq(singleToken[0])
  //               destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //               destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //             })
  //           })
  //         })
  //       })
  //     })
  //   })
  //
  //   context('removeReservedTokens', async () => {
  //
  //     // Reserve a single destination
  //     beforeEach(async () => {
  //       singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //         singleDestination, singleToken, singlePercent, singleDecimal
  //       ).should.be.fulfilled
  //       singleCalldata.should.not.eq('0x')
  //
  //       let events = await storage.exec(
  //         crowdsaleAdmin, executionID, singleCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //
  //       let destInfo = await saleIdx.getReservedTokenDestinationList.call(
  //         storage.address, executionID
  //       ).should.be.fulfilled
  //       destInfo.length.should.be.eq(2)
  //       destInfo[0].toNumber().should.be.eq(1)
  //       destInfo[1].length.should.be.eq(1)
  //       destInfo[1][0].should.be.eq(singleDestination[0])
  //     })
  //
  //     context('when the input address is invalid', async () => {
  //
  //       let invalidCalldata
  //
  //       let invalidAddress = zeroAddress()
  //
  //       beforeEach(async () => {
  //         invalidCalldata = await saleUtils.removeReservedTokens.call(
  //           invalidAddress
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the crowdsale is already initialized', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //           tokenName, tokenSymbol, tokenDecimals
  //         ).should.be.fulfilled
  //         initTokenCalldata.should.not.eq('0x')
  //
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         invalidCalldata = await saleUtils.removeReservedTokens.call(
  //           singleDestination[0]
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, initTokenCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the sender is not the admin', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         invalidCalldata = await saleUtils.removeReservedTokens.call(
  //           singleDestination
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           exec, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the destination to remove is not in the list of reserved destinations', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         invalidCalldata = await saleUtils.removeReservedTokens.call(
  //           multiDestination[0]
  //         ).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the input and state are valid', async () => {
  //
  //       context('when the destination to remove is the final destination in the reserved list', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             multiDestination, multiTokens, multiPercents, multiDecimals
  //           ).should.be.fulfilled
  //           multiCalldata.should.not.eq('0x')
  //
  //           removeCalldata = await saleUtils.removeReservedTokens.call(
  //             multiDestination[2]
  //           ).should.be.fulfilled
  //           removeCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, multiCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           let destInfo = await saleIdx.getReservedTokenDestinationList.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           destInfo.length.should.be.eq(2)
  //
  //           destInfo[0].toNumber().should.be.eq(4)
  //           destInfo[1].length.should.be.eq(4)
  //           destInfo[1][0].should.be.eq(singleDestination[0])
  //           destInfo[1][1].should.be.eq(multiDestination[0])
  //           destInfo[1][2].should.be.eq(multiDestination[1])
  //           destInfo[1][3].should.be.eq(multiDestination[2])
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, removeCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, removeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(2)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 3', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(3)
  //             resInfo[1].length.should.be.eq(3)
  //             resInfo[1][0].should.be.eq(singleDestination[0])
  //             resInfo[1][1].should.be.eq(multiDestination[0])
  //             resInfo[1][2].should.be.eq(multiDestination[1])
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(singleToken[0])
  //               destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //               destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //             })
  //           })
  //
  //           describe('Destination 2', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(1)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[0])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[0])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[0])
  //             })
  //           })
  //
  //           describe('Destination 3', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[1]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(2)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[1])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[1])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[1])
  //             })
  //           })
  //
  //           describe('Destination 4', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[2]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(0)
  //               destInfo[2].toNumber().should.be.eq(0)
  //               destInfo[3].toNumber().should.be.eq(0)
  //             })
  //           })
  //         })
  //       })
  //
  //       context('when the destination to remove is not the final destination in the list', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             multiDestination, multiTokens, multiPercents, multiDecimals
  //           ).should.be.fulfilled
  //           multiCalldata.should.not.eq('0x')
  //
  //           removeCalldata = await saleUtils.removeReservedTokens.call(
  //             singleDestination[0]
  //           ).should.be.fulfilled
  //           removeCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, multiCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           let destInfo = await saleIdx.getReservedTokenDestinationList.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           destInfo.length.should.be.eq(2)
  //
  //           destInfo[0].toNumber().should.be.eq(4)
  //           destInfo[1].length.should.be.eq(4)
  //           destInfo[1][0].should.be.eq(singleDestination[0])
  //           destInfo[1][1].should.be.eq(multiDestination[0])
  //           destInfo[1][2].should.be.eq(multiDestination[1])
  //           destInfo[1][3].should.be.eq(multiDestination[2])
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, removeCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, removeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(4)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 3', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(3)
  //             resInfo[1].length.should.be.eq(3)
  //             resInfo[1][0].should.be.eq(multiDestination[2])
  //             resInfo[1][1].should.be.eq(multiDestination[0])
  //             resInfo[1][2].should.be.eq(multiDestination[1])
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(0)
  //               destInfo[2].toNumber().should.be.eq(0)
  //               destInfo[3].toNumber().should.be.eq(0)
  //             })
  //           })
  //
  //           describe('Destination 2', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(1)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[0])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[0])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[0])
  //             })
  //           })
  //
  //           describe('Destination 3', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[1]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(2)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[1])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[1])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[1])
  //             })
  //           })
  //
  //           describe('Destination 4', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[2]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[2])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[2])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[2])
  //             })
  //           })
  //         })
  //       })
  //
  //       context('when there is only one destination', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           removeCalldata = await saleUtils.removeReservedTokens.call(
  //             singleDestination[0]
  //           ).should.be.fulfilled
  //           removeCalldata.should.not.eq('0x')
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, removeCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, removeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(2)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 0', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(0)
  //             resInfo[1].length.should.be.eq(0)
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(0)
  //               destInfo[2].toNumber().should.be.eq(0)
  //               destInfo[3].toNumber().should.be.eq(0)
  //             })
  //           })
  //         })
  //       })
  //     })
  //   })
  //
  //   context('distributeReservedTokens', async () => {
  //
  //     beforeEach(async () => {
  //       singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //         singleDestination, singleToken, singlePercent, singleDecimal
  //       ).should.be.fulfilled
  //       singleCalldata.should.not.eq('0x')
  //
  //       let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //         tokenName, tokenSymbol, tokenDecimals
  //       ).should.be.fulfilled
  //       initTokenCalldata.should.not.eq('0x')
  //
  //       let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
  //         totalSold
  //       ).should.be.fulfilled
  //       setTotalSoldCalldata.should.not.eq('0x')
  //
  //       let events = await storage.exec(
  //         crowdsaleAdmin, executionID, singleCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //
  //       events = await storage.exec(
  //         crowdsaleAdmin, executionID, initTokenCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //
  //       events = await storage.exec(
  //         crowdsaleAdmin, executionID, setTotalSoldCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //     })
  //
  //     describe('pre-test storage', async () => {
  //
  //       it('should have properly initialized the token', async () => {
  //         let tokenInfo = await saleIdx.getTokenInfo.call(
  //           storage.address, executionID
  //         ).should.be.fulfilled
  //         tokenInfo.length.should.be.eq(4)
  //
  //         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
  //         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
  //         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
  //         tokenInfo[3].toNumber().should.be.eq(totalSold)
  //       })
  //
  //       it('should not have initialized the crowdsale', async () => {
  //         let saleInfo = await saleIdx.getCrowdsaleInfo.call(
  //           storage.address, executionID
  //         ).should.be.fulfilled
  //         saleInfo.length.should.be.eq(4)
  //
  //         saleInfo[0].toNumber().should.be.eq(0)
  //         saleInfo[1].should.be.eq(teamWallet)
  //         saleInfo[2].should.be.eq(false)
  //         saleInfo[3].should.be.eq(false)
  //       })
  //
  //       it('should have a reserved destination list length of 1', async () => {
  //         let destInfo = await saleIdx.getReservedTokenDestinationList.call(
  //           storage.address, executionID
  //         ).should.be.fulfilled
  //         destInfo.length.should.be.eq(2)
  //
  //         destInfo[0].toNumber().should.be.eq(1)
  //         destInfo[1].length.should.be.eq(1)
  //         destInfo[1][0].should.be.eq(singleDestination[0])
  //       })
  //
  //       it('should have properly stored reserved token information', async () => {
  //         let resInfo = await saleIdx.getReservedDestinationInfo.call(
  //           storage.address, executionID, singleDestination[0]
  //         ).should.be.fulfilled
  //         resInfo.length.should.be.eq(4)
  //
  //         resInfo[0].toNumber().should.be.eq(0)
  //         resInfo[1].toNumber().should.be.eq(singleToken[0])
  //         resInfo[2].toNumber().should.be.eq(singlePercent[0])
  //         resInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //       })
  //
  //       it('should have the correct amount of tokens sold total', async () => {
  //         let soldInfo = await saleIdx.getTokensSold.call(
  //           storage.address, executionID
  //         ).should.be.fulfilled
  //         soldInfo.toNumber().should.be.eq(totalSold)
  //       })
  //     })
  //
  //     context('when the input amount is 0', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
  //         finalizeCalldata.should.not.eq('0x')
  //
  //         invalidCalldata = await saleUtils.distributeReservedTokens.call(0).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the crowdsale is not finalized', async () => {
  //
  //       let invalidCalldata
  //
  //       beforeEach(async () => {
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         invalidCalldata = await saleUtils.distributeReservedTokens.call(1).should.be.fulfilled
  //         invalidCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //       })
  //
  //       it('should throw', async () => {
  //         await storage.exec(
  //           crowdsaleAdmin, executionID, invalidCalldata,
  //           { from: exec }
  //         ).should.not.be.fulfilled
  //       })
  //     })
  //
  //     context('when the input and crowdsale state are valid for token distribution', async () => {
  //
  //       context('when the amount input is greater than the number of destinations to distribute to', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //           initCrowdsaleCalldata.should.not.eq('0x')
  //
  //           let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
  //           finalizeCalldata.should.not.eq('0x')
  //
  //           distCalldata = await saleUtils.distributeReservedTokens.call(2).should.be.fulfilled
  //           distCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, finalizeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(3)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 0', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(0)
  //             resInfo[1].length.should.be.eq(0)
  //           })
  //
  //           it('should have correctly calculated the new total supply', async () => {
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //
  //             let supplyInfo = await saleIdx.totalSupply.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(singleToken[0])
  //               destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //               destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //             })
  //
  //             it('should have correctly calculated the new token balance', async () => {
  //               let tokens = singleToken[0]
  //               let percent = singlePercent[0]
  //               let precision = singleDecimal[0]
  //               precision = (10 ** (2 + precision))
  //
  //               let expectedBalance =
  //                   ((totalSold * percent) / precision) + tokens
  //
  //               let balanceInfo = await saleIdx.balanceOf.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               balanceInfo.toNumber().should.be.eq(expectedBalance)
  //             })
  //           })
  //         })
  //       })
  //
  //       context('when there is only one address to distribute to', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         beforeEach(async () => {
  //           let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //           initCrowdsaleCalldata.should.not.eq('0x')
  //
  //           let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
  //           finalizeCalldata.should.not.eq('0x')
  //
  //           distCalldata = await saleUtils.distributeReservedTokens.call(1).should.be.fulfilled
  //           distCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, finalizeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(3)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 0', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(0)
  //             resInfo[1].length.should.be.eq(0)
  //           })
  //
  //           it('should have correctly calculated the new total supply', async () => {
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //
  //             let supplyInfo = await saleIdx.totalSupply.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(singleToken[0])
  //               destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //               destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //             })
  //
  //             it('should have correctly calculated the new token balance', async () => {
  //               let tokens = singleToken[0]
  //               let percent = singlePercent[0]
  //               let precision = singleDecimal[0]
  //               precision = (10 ** (2 + precision))
  //
  //               let expectedBalance =
  //                   ((totalSold * percent) / precision) + tokens
  //
  //               let balanceInfo = await saleIdx.balanceOf.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               balanceInfo.toNumber().should.be.eq(expectedBalance)
  //             })
  //           })
  //         })
  //       })
  //
  //       context('when there are no addresses to distribute to', async () => {
  //
  //         let invalidCalldata
  //
  //         beforeEach(async () => {
  //           let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //           initCrowdsaleCalldata.should.not.eq('0x')
  //
  //           let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
  //           finalizeCalldata.should.not.eq('0x')
  //
  //           distCalldata = await saleUtils.distributeReservedTokens.call(1).should.be.fulfilled
  //           distCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, finalizeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           invalidCalldata = distCalldata
  //         })
  //
  //         it('should throw', async () => {
  //           await storage.exec(
  //             crowdsaleAdmin, executionID, invalidCalldata
  //           ).should.not.be.fulfilled
  //         })
  //       })
  //
  //       context('when there are several addresses to distribute to', async () => {
  //
  //         let execEvent
  //         let execReturn
  //
  //         let multiBalances = [1000, 0, 2000, 3000]
  //         let totalAdded = 6000
  //
  //         beforeEach(async () => {
  //           let setBalanceCalldata = await saleUtils.setBalance.call(
  //             singleDestination[0], multiBalances[0]
  //           ).should.be.fulfilled
  //
  //           await storage.exec(
  //             exec, executionID, setBalanceCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           let balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, singleDestination[0]
  //           ).should.be.fulfilled
  //           balanceInfo.toNumber().should.be.eq(multiBalances[0])
  //
  //           setBalanceCalldata = await saleUtils.setBalance.call(
  //             multiDestination[0], multiBalances[1]
  //           ).should.be.fulfilled
  //
  //           await storage.exec(
  //             exec, executionID, setBalanceCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, multiDestination[0]
  //           ).should.be.fulfilled
  //           balanceInfo.toNumber().should.be.eq(multiBalances[1])
  //
  //           setBalanceCalldata = await saleUtils.setBalance.call(
  //             multiDestination[1], multiBalances[2]
  //           ).should.be.fulfilled
  //
  //           await storage.exec(
  //             exec, executionID, setBalanceCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, multiDestination[1]
  //           ).should.be.fulfilled
  //           balanceInfo.toNumber().should.be.eq(multiBalances[2])
  //
  //           setBalanceCalldata = await saleUtils.setBalance.call(
  //             multiDestination[2], multiBalances[3]
  //           ).should.be.fulfilled
  //
  //           await storage.exec(
  //             exec, executionID, setBalanceCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, multiDestination[2]
  //           ).should.be.fulfilled
  //           balanceInfo.toNumber().should.be.eq(multiBalances[3])
  //
  //           // Update total sold and total supply to accomodate added balances
  //           let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
  //             totalSold + totalAdded
  //           ).should.be.fulfilled
  //           setTotalSoldCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             exec, executionID, setTotalSoldCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           // Reserve tokens for more addresses
  //           multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //             multiDestination, multiTokens, multiPercents, multiDecimals
  //           ).should.be.fulfilled
  //           multiCalldata.should.not.eq('0x')
  //
  //           let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //           initCrowdsaleCalldata.should.not.eq('0x')
  //
  //           let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
  //           finalizeCalldata.should.not.eq('0x')
  //
  //           distCalldata = await saleUtils.distributeReservedTokens.call(100).should.be.fulfilled
  //           distCalldata.should.not.eq('0x')
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, multiCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           let destInfo = await saleIdx.getReservedTokenDestinationList.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           destInfo.length.should.be.eq(2)
  //           destInfo[0].toNumber().should.be.eq(4)
  //           destInfo[1].length.should.be.eq(4)
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, finalizeCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           execReturn = await storage.exec.call(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).should.be.fulfilled
  //
  //           events = await storage.exec(
  //             crowdsaleAdmin, executionID, distCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           execEvent = events[0]
  //         })
  //
  //         describe('returned data', async () => {
  //
  //           it('should return a tuple with 3 fields', async () => {
  //             execReturn.length.should.be.eq(3)
  //           })
  //
  //           it('should return the correct number of events emitted', async () => {
  //             execReturn[0].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of addresses paid', async () => {
  //             execReturn[1].toNumber().should.be.eq(0)
  //           })
  //
  //           it('should return the correct number of storage slots written to', async () => {
  //             execReturn[2].toNumber().should.be.eq(6)
  //           })
  //         })
  //
  //         it('should emit an ApplicationExecution event', async () => {
  //           execEvent.event.should.be.eq('ApplicationExecution')
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           it('should match the used execution id', async () => {
  //             let emittedExecID = execEvent.args['execution_id']
  //             emittedExecID.should.be.eq(executionID)
  //           })
  //
  //           it('should match the TokenConsole address', async () => {
  //             let emittedAppAddr = execEvent.args['script_target']
  //             emittedAppAddr.should.be.eq(tokenManager.address)
  //           })
  //         })
  //
  //         describe('storage', async () => {
  //
  //           it('should have a reserved destination list length of 0', async () => {
  //             let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             resInfo.length.should.be.eq(2)
  //
  //             resInfo[0].toNumber().should.be.eq(0)
  //             resInfo[1].length.should.be.eq(0)
  //           })
  //
  //           it('should have correctly calculated the new total supply', async () => {
  //             let balanceOne = await saleIdx.balanceOf.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //
  //             let balanceTwo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, multiDestination[0]
  //             ).should.be.fulfilled
  //
  //             let balanceThree = await saleIdx.balanceOf.call(
  //               storage.address, executionID, multiDestination[1]
  //             ).should.be.fulfilled
  //
  //             let balanceFour = await saleIdx.balanceOf.call(
  //               storage.address, executionID, multiDestination[2]
  //             ).should.be.fulfilled
  //
  //             let totalUpdated = balanceOne.toNumber() + balanceTwo.toNumber()
  //                 + balanceThree.toNumber() + balanceFour.toNumber()
  //
  //             let supplyInfo = await saleIdx.totalSupply.call(
  //               storage.address, executionID
  //             ).should.be.fulfilled
  //             supplyInfo.toNumber().should.be.eq(totalUpdated + totalSold)
  //           })
  //
  //           describe('Destination 1', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(0)
  //               destInfo[1].toNumber().should.be.eq(singleToken[0])
  //               destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //               destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //             })
  //
  //             it('should have correctly calculated the new token balance', async () => {
  //               let prevBal = multiBalances[0]
  //               let tokens = singleToken[0]
  //               let percent = singlePercent[0]
  //               let precision = singleDecimal[0]
  //               precision = (10 ** (2 + precision))
  //
  //               let expectedBalance =
  //                   (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //               let balanceInfo = await saleIdx.balanceOf.call(
  //                 storage.address, executionID, singleDestination[0]
  //               ).should.be.fulfilled
  //               balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //             })
  //           })
  //
  //           describe('Destination 2', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[0]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(1)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[0])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[0])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[0])
  //             })
  //
  //             it('should have correctly calculated the new token balance', async () => {
  //               let prevBal = multiBalances[1]
  //               let tokens = multiTokens[0]
  //               let percent = multiPercents[0]
  //               let precision = multiDecimals[0]
  //               precision = (10 ** (2 + precision))
  //
  //               let expectedBalance =
  //                   (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //               let balanceInfo = await saleIdx.balanceOf.call(
  //                 storage.address, executionID, multiDestination[0]
  //               ).should.be.fulfilled
  //               balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //             })
  //           })
  //
  //           describe('Destination 3', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[1]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(2)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[1])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[1])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[1])
  //             })
  //
  //             it('should have correctly calculated the new token balance', async () => {
  //               let prevBal = multiBalances[2]
  //               let tokens = multiTokens[1]
  //               let percent = multiPercents[1]
  //               let precision = multiDecimals[1]
  //               precision = (10 ** (2 + precision))
  //
  //               let expectedBalance =
  //                   (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //               let balanceInfo = await saleIdx.balanceOf.call(
  //                 storage.address, executionID, multiDestination[1]
  //               ).should.be.fulfilled
  //               balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //             })
  //           })
  //
  //           describe('Destination 4', async () => {
  //
  //             it('should store the correct reserved token information', async () => {
  //               let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //                 storage.address, executionID, multiDestination[2]
  //               ).should.be.fulfilled
  //               destInfo.length.should.be.eq(4)
  //
  //               destInfo[0].toNumber().should.be.eq(3)
  //               destInfo[1].toNumber().should.be.eq(multiTokens[2])
  //               destInfo[2].toNumber().should.be.eq(multiPercents[2])
  //               destInfo[3].toNumber().should.be.eq(multiDecimals[2])
  //             })
  //
  //             it('should have correctly calculated the new token balance', async () => {
  //               let prevBal = multiBalances[3]
  //               let tokens = multiTokens[2]
  //               let percent = multiPercents[2]
  //               let precision = multiDecimals[2]
  //               precision = (10 ** (2 + precision))
  //
  //               let expectedBalance =
  //                   (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //               let balanceInfo = await saleIdx.balanceOf.call(
  //                 storage.address, executionID, multiDestination[2]
  //               ).should.be.fulfilled
  //               balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //             })
  //           })
  //         })
  //       })
  //     })
  //   })
  // })

  // context('finalizeCrowdsaleAndToken', async () => {
  //
  //   context('when the crowdsale is not initialized', async () => {
  //
  //     let invalidCalldata
  //
  //     beforeEach(async () => {
  //       invalidCalldata = await saleUtils.finalizeCrowdsaleAndToken.call().should.be.fulfilled
  //       invalidCalldata.should.not.eq('0x')
  //     })
  //
  //     it('should throw', async () => {
  //       await storage.exec(
  //         crowdsaleAdmin, executionID, invalidCalldata,
  //         { from: exec }
  //       ).should.not.be.fulfilled
  //     })
  //   })
  //
  //   context('when the crowdsale is already finalized', async () => {
  //
  //     let invalidCalldata
  //
  //     beforeEach(async () => {
  //       let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //         tokenName, tokenSymbol, tokenDecimals
  //       ).should.be.fulfilled
  //       initTokenCalldata.should.not.eq('0x')
  //
  //       let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //       initCrowdsaleCalldata.should.not.eq('0x')
  //
  //       let finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
  //       finalizeCalldata.should.not.eq('0x')
  //
  //       invalidCalldata = await saleUtils.finalizeCrowdsaleAndToken.call().should.be.fulfilled
  //       invalidCalldata.should.not.eq('0x')
  //
  //       let events = await storage.exec(
  //         crowdsaleAdmin, executionID, initTokenCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //
  //       events = await storage.exec(
  //         crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //
  //       events = await storage.exec(
  //         crowdsaleAdmin, executionID, finalizeCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //     })
  //
  //     it('should throw', async () => {
  //       await storage.exec(
  //         crowdsaleAdmin, executionID, invalidCalldata,
  //         { from: exec }
  //       ).should.not.be.fulfilled
  //     })
  //   })
  //
  //   context('when the sender is not the admin', async () => {
  //
  //     let invalidCalldata
  //
  //     beforeEach(async () => {
  //       let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //         tokenName, tokenSymbol, tokenDecimals
  //       ).should.be.fulfilled
  //       initTokenCalldata.should.not.eq('0x')
  //
  //       let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //       initCrowdsaleCalldata.should.not.eq('0x')
  //
  //       invalidCalldata = await saleUtils.finalizeCrowdsaleAndToken.call().should.be.fulfilled
  //       invalidCalldata.should.not.eq('0x')
  //
  //       let events = await storage.exec(
  //         crowdsaleAdmin, executionID, initTokenCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //
  //       events = await storage.exec(
  //         crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //         { from: exec }
  //       ).then((tx) => {
  //         return tx.logs
  //       })
  //       events.should.not.eq(null)
  //       events.length.should.be.eq(1)
  //       events[0].event.should.be.eq('ApplicationExecution')
  //     })
  //
  //     it('should throw', async () => {
  //       await storage.exec(
  //         exec, executionID, invalidCalldata,
  //         { from: exec }
  //       ).should.not.be.fulfilled
  //     })
  //   })
  //
  //   context('when the sender is the admin', async () => {
  //
  //     let finalizeCalldata
  //     let finalizeEvents
  //     let finalizeReturn
  //
  //     context('when there is only one address to distribute to', async () => {
  //
  //       beforeEach(async () => {
  //         singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //           singleDestination, singleToken, singlePercent, singleDecimal
  //         ).should.be.fulfilled
  //         singleCalldata.should.not.eq('0x')
  //
  //         let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //           tokenName, tokenSymbol, tokenDecimals
  //         ).should.be.fulfilled
  //         initTokenCalldata.should.not.eq('0x')
  //
  //         let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
  //           totalSold
  //         ).should.be.fulfilled
  //         setTotalSoldCalldata.should.not.eq('0x')
  //
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         finalizeCalldata = await saleUtils.finalizeCrowdsaleAndToken.call().should.be.fulfilled
  //         finalizeCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, singleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initTokenCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, setTotalSoldCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         finalizeReturn = await storage.exec.call(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         finalizeEvents = await storage.exec(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.receipt.logs
  //         })
  //       })
  //
  //       describe('returned data', async () => {
  //
  //         it('should return a tuple with 3 fields', async () => {
  //           finalizeReturn.length.should.be.eq(3)
  //         })
  //
  //         it('should return the correct number of events emitted', async () => {
  //           finalizeReturn[0].toNumber().should.be.eq(1)
  //         })
  //
  //         it('should return the correct number of addresses paid', async () => {
  //           finalizeReturn[1].toNumber().should.be.eq(0)
  //         })
  //
  //         it('should return the correct number of storage slots written to', async () => {
  //           finalizeReturn[2].toNumber().should.be.eq(5)
  //         })
  //       })
  //
  //       describe('events', async () => {
  //
  //         it('should have emitted 2 events total', async () => {
  //           finalizeEvents.length.should.be.eq(2)
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           let eventTopics
  //           let eventData
  //
  //           beforeEach(async () => {
  //             eventTopics = finalizeEvents[1].topics
  //             eventData = finalizeEvents[1].data
  //           })
  //
  //           it('should have the correct number of topics', async () => {
  //             eventTopics.length.should.be.eq(3)
  //           })
  //
  //           it('should list the correct event signature in the first topic', async () => {
  //             let sig = eventTopics[0]
  //             web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
  //           })
  //
  //           it('should have the target app address and execution id as the other 2 topics', async () => {
  //             let emittedAddr = eventTopics[2]
  //             let emittedExecId = eventTopics[1]
  //             web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenManager.address))
  //             web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
  //           })
  //
  //           it('should have an empty data field', async () => {
  //             eventData.should.be.eq('0x0')
  //           })
  //         })
  //
  //         describe('the other event', async () => {
  //
  //           let eventTopics
  //           let eventData
  //
  //           beforeEach(async () => {
  //             eventTopics = finalizeEvents[0].topics
  //             eventData = finalizeEvents[0].data
  //           })
  //
  //           it('should have the correct number of topics', async () => {
  //             eventTopics.length.should.be.eq(2)
  //           })
  //
  //           it('should match the correct event signature for the first topic', async () => {
  //             let sig = eventTopics[0]
  //             web3.toDecimal(sig).should.be.eq(web3.toDecimal(finalSaleHash))
  //           })
  //
  //           it('should match the execution id for the other topic', async () => {
  //             web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
  //           })
  //
  //           it('should have an empty data field', async () => {
  //             eventData.should.be.eq('0x0')
  //           })
  //         })
  //       })
  //
  //       describe('storage', async () => {
  //
  //         it('should have a finalized crowdsale', async () => {
  //           let saleInfo = await saleIdx.getCrowdsaleInfo.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           saleInfo.length.should.be.eq(4)
  //
  //           saleInfo[0].toNumber().should.be.eq(0)
  //           saleInfo[1].should.be.eq(teamWallet)
  //           saleInfo[2].should.be.eq(true)
  //           saleInfo[3].should.be.eq(true)
  //         })
  //
  //         it('should have a reserved destination list length of 0', async () => {
  //           let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           resInfo.length.should.be.eq(2)
  //
  //           resInfo[0].toNumber().should.be.eq(0)
  //           resInfo[1].length.should.be.eq(0)
  //         })
  //
  //         it('should have correctly calculated the new total supply', async () => {
  //           let balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, singleDestination[0]
  //           ).should.be.fulfilled
  //
  //           let supplyInfo = await saleIdx.totalSupply.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
  //         })
  //
  //         describe('Destination 1', async () => {
  //
  //           it('should store the correct reserved token information', async () => {
  //             let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //             destInfo.length.should.be.eq(4)
  //
  //             destInfo[0].toNumber().should.be.eq(0)
  //             destInfo[1].toNumber().should.be.eq(singleToken[0])
  //             destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //             destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //           })
  //
  //           it('should have correctly calculated the new token balance', async () => {
  //             let tokens = singleToken[0]
  //             let percent = singlePercent[0]
  //             let precision = singleDecimal[0]
  //             precision = (10 ** (2 + precision))
  //
  //             let expectedBalance =
  //                 ((totalSold * percent) / precision) + tokens
  //
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //             balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //           })
  //
  //           it('should allow token transfers', async () => {
  //             let transferCalldata = await saleUtils.transfer.call(
  //               crowdsaleAdmin, 1
  //             ).should.be.fulfilled
  //             transferCalldata.should.not.eq('0x')
  //
  //             let events = await storage.exec(
  //               singleDestination[0], executionID, transferCalldata,
  //               { from: exec }
  //             ).then((tx) => {
  //               return tx.logs
  //             })
  //             events.should.not.eq(null)
  //             events.length.should.be.eq(1)
  //             events[0].event.should.be.eq('ApplicationExecution')
  //
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, crowdsaleAdmin
  //             ).should.be.fulfilled
  //             balanceInfo.toNumber().should.be.eq(1)
  //           })
  //         })
  //       })
  //     })
  //
  //     context('when there are no addresses to distribute to', async () => {
  //
  //       beforeEach(async () => {
  //         let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //           tokenName, tokenSymbol, tokenDecimals
  //         ).should.be.fulfilled
  //         initTokenCalldata.should.not.eq('0x')
  //
  //         let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
  //           totalSold
  //         ).should.be.fulfilled
  //         setTotalSoldCalldata.should.not.eq('0x')
  //
  //         let setBalanceCalldata = await saleUtils.setBalance.call(
  //           otherAddress, 100
  //         ).should.be.fulfilled
  //         setBalanceCalldata.should.not.eq('0x')
  //
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         finalizeCalldata = await saleUtils.finalizeCrowdsaleAndToken.call().should.be.fulfilled
  //         finalizeCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, initTokenCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, setTotalSoldCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, setBalanceCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         finalizeReturn = await storage.exec.call(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         finalizeEvents = await storage.exec(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.receipt.logs
  //         })
  //       })
  //
  //       describe('returned data', async () => {
  //
  //         it('should return a tuple with 3 fields', async () => {
  //           finalizeReturn.length.should.be.eq(3)
  //         })
  //
  //         it('should return the correct number of events emitted', async () => {
  //           finalizeReturn[0].toNumber().should.be.eq(1)
  //         })
  //
  //         it('should return the correct number of addresses paid', async () => {
  //           finalizeReturn[1].toNumber().should.be.eq(0)
  //         })
  //
  //         it('should return the correct number of storage slots written to', async () => {
  //           finalizeReturn[2].toNumber().should.be.eq(2)
  //         })
  //       })
  //
  //       describe('events', async () => {
  //
  //         it('should have emitted 2 events total', async () => {
  //           finalizeEvents.length.should.be.eq(2)
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           let eventTopics
  //           let eventData
  //
  //           beforeEach(async () => {
  //             eventTopics = finalizeEvents[1].topics
  //             eventData = finalizeEvents[1].data
  //           })
  //
  //           it('should have the correct number of topics', async () => {
  //             eventTopics.length.should.be.eq(3)
  //           })
  //
  //           it('should list the correct event signature in the first topic', async () => {
  //             let sig = eventTopics[0]
  //             web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
  //           })
  //
  //           it('should have the target app address and execution id as the other 2 topics', async () => {
  //             let emittedAddr = eventTopics[2]
  //             let emittedExecId = eventTopics[1]
  //             web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenManager.address))
  //             web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
  //           })
  //
  //           it('should have an empty data field', async () => {
  //             eventData.should.be.eq('0x0')
  //           })
  //         })
  //
  //         describe('the other event', async () => {
  //
  //           let eventTopics
  //           let eventData
  //
  //           beforeEach(async () => {
  //             eventTopics = finalizeEvents[0].topics
  //             eventData = finalizeEvents[0].data
  //           })
  //
  //           it('should have the correct number of topics', async () => {
  //             eventTopics.length.should.be.eq(2)
  //           })
  //
  //           it('should match the correct event signature for the first topic', async () => {
  //             let sig = eventTopics[0]
  //             web3.toDecimal(sig).should.be.eq(web3.toDecimal(finalSaleHash))
  //           })
  //
  //           it('should match the execution id for the other topic', async () => {
  //             web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
  //           })
  //
  //           it('should have an empty data field', async () => {
  //             eventData.should.be.eq('0x0')
  //           })
  //         })
  //       })
  //
  //       describe('storage', async () => {
  //
  //         it('should have a finalized crowdsale', async () => {
  //           let saleInfo = await saleIdx.getCrowdsaleInfo.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           saleInfo.length.should.be.eq(4)
  //
  //           saleInfo[0].toNumber().should.be.eq(0)
  //           saleInfo[1].should.be.eq(teamWallet)
  //           saleInfo[2].should.be.eq(true)
  //           saleInfo[3].should.be.eq(true)
  //         })
  //
  //         it('should have a reserved destination list length of 0', async () => {
  //           let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           resInfo.length.should.be.eq(2)
  //
  //           resInfo[0].toNumber().should.be.eq(0)
  //           resInfo[1].length.should.be.eq(0)
  //         })
  //
  //         it('should have correctly calculated the new total supply', async () => {
  //           let supplyInfo = await saleIdx.totalSupply.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           supplyInfo.toNumber().should.be.eq(totalSold)
  //         })
  //
  //         it('should allow token transfers', async () => {
  //           let transferCalldata = await saleUtils.transfer.call(
  //             crowdsaleAdmin, 1
  //           ).should.be.fulfilled
  //           transferCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             otherAddress, executionID, transferCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           let balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, crowdsaleAdmin
  //           ).should.be.fulfilled
  //           balanceInfo.toNumber().should.be.eq(1)
  //         })
  //       })
  //     })
  //
  //     context('when there are several addresses to distribute to', async () => {
  //
  //       let multiBalances = [0, 1000, 2000, 3000]
  //       let totalAdded = 6000
  //
  //       beforeEach(async () => {
  //         let setBalanceCalldata = await saleUtils.setBalance.call(
  //           singleDestination[0], multiBalances[0]
  //         ).should.be.fulfilled
  //
  //         await storage.exec(
  //           exec, executionID, setBalanceCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         let balanceInfo = await saleIdx.balanceOf.call(
  //           storage.address, executionID, singleDestination[0]
  //         ).should.be.fulfilled
  //         balanceInfo.toNumber().should.be.eq(multiBalances[0])
  //
  //         setBalanceCalldata = await saleUtils.setBalance.call(
  //           multiDestination[0], multiBalances[1]
  //         ).should.be.fulfilled
  //
  //         await storage.exec(
  //           exec, executionID, setBalanceCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         balanceInfo = await saleIdx.balanceOf.call(
  //           storage.address, executionID, multiDestination[0]
  //         ).should.be.fulfilled
  //         balanceInfo.toNumber().should.be.eq(multiBalances[1])
  //
  //         setBalanceCalldata = await saleUtils.setBalance.call(
  //           multiDestination[1], multiBalances[2]
  //         ).should.be.fulfilled
  //
  //         await storage.exec(
  //           exec, executionID, setBalanceCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         balanceInfo = await saleIdx.balanceOf.call(
  //           storage.address, executionID, multiDestination[1]
  //         ).should.be.fulfilled
  //         balanceInfo.toNumber().should.be.eq(multiBalances[2])
  //
  //         setBalanceCalldata = await saleUtils.setBalance.call(
  //           multiDestination[2], multiBalances[3]
  //         ).should.be.fulfilled
  //
  //         await storage.exec(
  //           exec, executionID, setBalanceCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         balanceInfo = await saleIdx.balanceOf.call(
  //           storage.address, executionID, multiDestination[2]
  //         ).should.be.fulfilled
  //         balanceInfo.toNumber().should.be.eq(multiBalances[3])
  //
  //         singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //           singleDestination, singleToken, singlePercent, singleDecimal
  //         ).should.be.fulfilled
  //         singleCalldata.should.not.eq('0x')
  //
  //         multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
  //           multiDestination, multiTokens, multiPercents, multiDecimals
  //         ).should.be.fulfilled
  //         multiCalldata.should.not.eq('0x')
  //
  //         let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
  //           tokenName, tokenSymbol, tokenDecimals
  //         ).should.be.fulfilled
  //         initTokenCalldata.should.not.eq('0x')
  //
  //         // Update total sold and total supply to accomodate added balances
  //         let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
  //           totalSold + totalAdded
  //         ).should.be.fulfilled
  //         setTotalSoldCalldata.should.not.eq('0x')
  //
  //         let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
  //         initCrowdsaleCalldata.should.not.eq('0x')
  //
  //         finalizeCalldata = await saleUtils.finalizeCrowdsaleAndToken.call().should.be.fulfilled
  //         finalizeCalldata.should.not.eq('0x')
  //
  //         let events = await storage.exec(
  //           crowdsaleAdmin, executionID, singleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, multiCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         let destInfo = await saleIdx.getReservedTokenDestinationList.call(
  //           storage.address, executionID
  //         ).should.be.fulfilled
  //         destInfo.length.should.be.eq(2)
  //         destInfo[0].toNumber().should.be.eq(4)
  //         destInfo[1].length.should.be.eq(4)
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initTokenCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, setTotalSoldCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         events = await storage.exec(
  //           crowdsaleAdmin, executionID, initCrowdsaleCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.logs
  //         })
  //         events.should.not.eq(null)
  //         events.length.should.be.eq(1)
  //         events[0].event.should.be.eq('ApplicationExecution')
  //
  //         finalizeReturn = await storage.exec.call(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).should.be.fulfilled
  //
  //         finalizeEvents = await storage.exec(
  //           crowdsaleAdmin, executionID, finalizeCalldata,
  //           { from: exec }
  //         ).then((tx) => {
  //           return tx.receipt.logs
  //         })
  //       })
  //
  //       describe('returned data', async () => {
  //
  //         it('should return a tuple with 3 fields', async () => {
  //           finalizeReturn.length.should.be.eq(3)
  //         })
  //
  //         it('should return the correct number of events emitted', async () => {
  //           finalizeReturn[0].toNumber().should.be.eq(1)
  //         })
  //
  //         it('should return the correct number of addresses paid', async () => {
  //           finalizeReturn[1].toNumber().should.be.eq(0)
  //         })
  //
  //         it('should return the correct number of storage slots written to', async () => {
  //           finalizeReturn[2].toNumber().should.be.eq(8)
  //         })
  //       })
  //
  //       describe('events', async () => {
  //
  //         it('should have emitted 2 events total', async () => {
  //           finalizeEvents.length.should.be.eq(2)
  //         })
  //
  //         describe('the ApplicationExecution event', async () => {
  //
  //           let eventTopics
  //           let eventData
  //
  //           beforeEach(async () => {
  //             eventTopics = finalizeEvents[1].topics
  //             eventData = finalizeEvents[1].data
  //           })
  //
  //           it('should have the correct number of topics', async () => {
  //             eventTopics.length.should.be.eq(3)
  //           })
  //
  //           it('should list the correct event signature in the first topic', async () => {
  //             let sig = eventTopics[0]
  //             web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
  //           })
  //
  //           it('should have the target app address and execution id as the other 2 topics', async () => {
  //             let emittedAddr = eventTopics[2]
  //             let emittedExecId = eventTopics[1]
  //             web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenManager.address))
  //             web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
  //           })
  //
  //           it('should have an empty data field', async () => {
  //             eventData.should.be.eq('0x0')
  //           })
  //         })
  //
  //         describe('the other event', async () => {
  //
  //           let eventTopics
  //           let eventData
  //
  //           beforeEach(async () => {
  //             eventTopics = finalizeEvents[0].topics
  //             eventData = finalizeEvents[0].data
  //           })
  //
  //           it('should have the correct number of topics', async () => {
  //             eventTopics.length.should.be.eq(2)
  //           })
  //
  //           it('should match the correct event signature for the first topic', async () => {
  //             let sig = eventTopics[0]
  //             web3.toDecimal(sig).should.be.eq(web3.toDecimal(finalSaleHash))
  //           })
  //
  //           it('should match the execution id for the other topic', async () => {
  //             web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
  //           })
  //
  //           it('should have an empty data field', async () => {
  //             eventData.should.be.eq('0x0')
  //           })
  //         })
  //       })
  //
  //       describe('storage', async () => {
  //
  //         it('should have a finalized crowdsale', async () => {
  //           let saleInfo = await saleIdx.getCrowdsaleInfo.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           saleInfo.length.should.be.eq(4)
  //
  //           saleInfo[0].toNumber().should.be.eq(0)
  //           saleInfo[1].should.be.eq(teamWallet)
  //           saleInfo[2].should.be.eq(true)
  //           saleInfo[3].should.be.eq(true)
  //         })
  //
  //         it('should have a reserved destination list length of 0', async () => {
  //           let resInfo = await saleIdx.getReservedTokenDestinationList.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           resInfo.length.should.be.eq(2)
  //
  //           resInfo[0].toNumber().should.be.eq(0)
  //           resInfo[1].length.should.be.eq(0)
  //         })
  //
  //         it('should have correctly calculated the new total supply', async () => {
  //           let balanceOne = await saleIdx.balanceOf.call(
  //             storage.address, executionID, singleDestination[0]
  //           ).should.be.fulfilled
  //
  //           let balanceTwo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, multiDestination[0]
  //           ).should.be.fulfilled
  //
  //           let balanceThree = await saleIdx.balanceOf.call(
  //             storage.address, executionID, multiDestination[1]
  //           ).should.be.fulfilled
  //
  //           let balanceFour = await saleIdx.balanceOf.call(
  //             storage.address, executionID, multiDestination[2]
  //           ).should.be.fulfilled
  //
  //           let totalUpdated = balanceOne.toNumber() + balanceTwo.toNumber()
  //               + balanceThree.toNumber() + balanceFour.toNumber()
  //
  //           let supplyInfo = await saleIdx.totalSupply.call(
  //             storage.address, executionID
  //           ).should.be.fulfilled
  //           supplyInfo.toNumber().should.be.eq(totalUpdated + totalSold)
  //         })
  //
  //         it('should allow token transfers', async () => {
  //           let transferCalldata = await saleUtils.transfer.call(
  //             crowdsaleAdmin, 1
  //           ).should.be.fulfilled
  //           transferCalldata.should.not.eq('0x')
  //
  //           let events = await storage.exec(
  //             singleDestination[0], executionID, transferCalldata,
  //             { from: exec }
  //           ).then((tx) => {
  //             return tx.logs
  //           })
  //           events.should.not.eq(null)
  //           events.length.should.be.eq(1)
  //           events[0].event.should.be.eq('ApplicationExecution')
  //
  //           let balanceInfo = await saleIdx.balanceOf.call(
  //             storage.address, executionID, crowdsaleAdmin
  //           ).should.be.fulfilled
  //           balanceInfo.toNumber().should.be.eq(1)
  //         })
  //
  //         describe('Destination 1', async () => {
  //
  //           it('should store the correct reserved token information', async () => {
  //             let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //             destInfo.length.should.be.eq(4)
  //
  //             destInfo[0].toNumber().should.be.eq(0)
  //             destInfo[1].toNumber().should.be.eq(singleToken[0])
  //             destInfo[2].toNumber().should.be.eq(singlePercent[0])
  //             destInfo[3].toNumber().should.be.eq(singleDecimal[0])
  //           })
  //
  //           it('should have correctly calculated the new token balance', async () => {
  //             let prevBal = multiBalances[0]
  //             let tokens = singleToken[0]
  //             let percent = singlePercent[0]
  //             let precision = singleDecimal[0]
  //             precision = (10 ** (2 + precision))
  //
  //             let expectedBalance =
  //                 (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, singleDestination[0]
  //             ).should.be.fulfilled
  //             balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //           })
  //         })
  //
  //         describe('Destination 2', async () => {
  //
  //           it('should store the correct reserved token information', async () => {
  //             let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //               storage.address, executionID, multiDestination[0]
  //             ).should.be.fulfilled
  //             destInfo.length.should.be.eq(4)
  //
  //             destInfo[0].toNumber().should.be.eq(1)
  //             destInfo[1].toNumber().should.be.eq(multiTokens[0])
  //             destInfo[2].toNumber().should.be.eq(multiPercents[0])
  //             destInfo[3].toNumber().should.be.eq(multiDecimals[0])
  //           })
  //
  //           it('should have correctly calculated the new token balance', async () => {
  //             let prevBal = multiBalances[1]
  //             let tokens = multiTokens[0]
  //             let percent = multiPercents[0]
  //             let precision = multiDecimals[0]
  //             precision = (10 ** (2 + precision))
  //
  //             let expectedBalance =
  //                 (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, multiDestination[0]
  //             ).should.be.fulfilled
  //             balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //           })
  //         })
  //
  //         describe('Destination 3', async () => {
  //
  //           it('should store the correct reserved token information', async () => {
  //             let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //               storage.address, executionID, multiDestination[1]
  //             ).should.be.fulfilled
  //             destInfo.length.should.be.eq(4)
  //
  //             destInfo[0].toNumber().should.be.eq(2)
  //             destInfo[1].toNumber().should.be.eq(multiTokens[1])
  //             destInfo[2].toNumber().should.be.eq(multiPercents[1])
  //             destInfo[3].toNumber().should.be.eq(multiDecimals[1])
  //           })
  //
  //           it('should have correctly calculated the new token balance', async () => {
  //             let prevBal = multiBalances[2]
  //             let tokens = multiTokens[1]
  //             let percent = multiPercents[1]
  //             let precision = multiDecimals[1]
  //             precision = (10 ** (2 + precision))
  //
  //             let expectedBalance =
  //                 (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, multiDestination[1]
  //             ).should.be.fulfilled
  //             balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //           })
  //         })
  //
  //         describe('Destination 4', async () => {
  //
  //           it('should store the correct reserved token information', async () => {
  //             let destInfo = await saleIdx.getReservedDestinationInfo.call(
  //               storage.address, executionID, multiDestination[2]
  //             ).should.be.fulfilled
  //             destInfo.length.should.be.eq(4)
  //
  //             destInfo[0].toNumber().should.be.eq(3)
  //             destInfo[1].toNumber().should.be.eq(multiTokens[2])
  //             destInfo[2].toNumber().should.be.eq(multiPercents[2])
  //             destInfo[3].toNumber().should.be.eq(multiDecimals[2])
  //           })
  //
  //           it('should have correctly calculated the new token balance', async () => {
  //             let prevBal = multiBalances[3]
  //             let tokens = multiTokens[2]
  //             let percent = multiPercents[2]
  //             let precision = multiDecimals[2]
  //             precision = (10 ** (2 + precision))
  //
  //             let expectedBalance =
  //                 (((totalSold + totalAdded) * percent) / precision) + tokens + prevBal
  //
  //             let balanceInfo = await saleIdx.balanceOf.call(
  //               storage.address, executionID, multiDestination[2]
  //             ).should.be.fulfilled
  //             balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
  //           })
  //         })
  //       })
  //     })
  //   })
  // })

  context('finalizeAndDistributeToken', async () => {

    context('when the crowdsale is not finalized', async () => {

      let invalidCalldata

      beforeEach(async () => {

        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        invalidCalldata = await saleUtils.finalizeAndDistributeToken.call().should.be.fulfilled
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

    context('when the crowdsale is finalized', async () => {

      let finalizeCalldata
      let finalizeEvent
      let finalizeReturn

      context('when there is only one address to distribute to', async () => {

        beforeEach(async () => {
          singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
            singleDestination, singleToken, singlePercent, singleDecimal
          ).should.be.fulfilled
          singleCalldata.should.not.eq('0x')

          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
            totalSold
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalCrowdsaleCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          finalCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await saleUtils.finalizeAndDistributeToken.call().should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, singleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, setTotalSoldCalldata,
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

          events = await storage.exec(
            crowdsaleAdmin, executionID, finalCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          finalizeReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).should.be.fulfilled

          events = await storage.exec(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          finalizeEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            finalizeReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            finalizeReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            finalizeReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            finalizeReturn[2].toNumber().should.be.eq(4)
          })
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
            emittedAppAddr.should.be.eq(tokenManager.address)
          })
        })

        describe('storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await saleIdx.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(4)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].should.be.eq(true)
            saleInfo[3].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await saleIdx.getReservedTokenDestinationList.call(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let balanceInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled

            let supplyInfo = await saleIdx.totalSupply.call(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(balanceInfo.toNumber() + totalSold)
          })

          describe('Destination 1', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await saleIdx.getReservedDestinationInfo.call(
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

              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })

            it('should allow token transfers', async () => {
              let transferCalldata = await saleUtils.transfer.call(
                crowdsaleAdmin, 1
              ).should.be.fulfilled
              transferCalldata.should.not.eq('0x')

              let events = await storage.exec(
                singleDestination[0], executionID, transferCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, crowdsaleAdmin
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(1)
            })
          })
        })
      })

      context('when there are no addresses to distribute to', async () => {

        beforeEach(async () => {
          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
            totalSold
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let setBalanceCalldata = await saleUtils.setBalance.call(
            otherAddress, 100
          ).should.be.fulfilled
          setBalanceCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalCrowdsaleCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          finalCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await saleUtils.finalizeAndDistributeToken.call().should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

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
            crowdsaleAdmin, executionID, setTotalSoldCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, setBalanceCalldata,
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

          events = await storage.exec(
            crowdsaleAdmin, executionID, finalCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          finalizeReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).should.be.fulfilled

          events = await storage.exec(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          finalizeEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            finalizeReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            finalizeReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            finalizeReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            finalizeReturn[2].toNumber().should.be.eq(1)
          })
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
            emittedAppAddr.should.be.eq(tokenManager.address)
          })
        })

        describe('storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await saleIdx.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(4)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].should.be.eq(true)
            saleInfo[3].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await saleIdx.getReservedTokenDestinationList.call(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let supplyInfo = await saleIdx.totalSupply.call(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(totalSold)
          })

          it('should allow token transfers', async () => {
            let transferCalldata = await saleUtils.transfer.call(
              crowdsaleAdmin, 1
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            let events = await storage.exec(
              otherAddress, executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let balanceInfo = await saleIdx.balanceOf.call(
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
          let setBalanceCalldata = await saleUtils.setBalance.call(
            singleDestination[0], multiBalances[0]
          ).should.be.fulfilled

          await storage.exec(
            crowdsaleAdmin, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          let balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, singleDestination[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[0])

          setBalanceCalldata = await saleUtils.setBalance.call(
            multiDestination[0], multiBalances[1]
          ).should.be.fulfilled

          await storage.exec(
            crowdsaleAdmin, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, multiDestination[0]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[1])

          setBalanceCalldata = await saleUtils.setBalance.call(
            multiDestination[1], multiBalances[2]
          ).should.be.fulfilled

          await storage.exec(
            crowdsaleAdmin, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, multiDestination[1]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[2])

          setBalanceCalldata = await saleUtils.setBalance.call(
            multiDestination[2], multiBalances[3]
          ).should.be.fulfilled

          await storage.exec(
            crowdsaleAdmin, executionID, setBalanceCalldata,
            { from: exec }
          ).should.be.fulfilled

          balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, multiDestination[2]
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(multiBalances[3])

          singleCalldata = await saleUtils.updateMultipleReservedTokens.call(
            singleDestination, singleToken, singlePercent, singleDecimal
          ).should.be.fulfilled
          singleCalldata.should.not.eq('0x')

          multiCalldata = await saleUtils.updateMultipleReservedTokens.call(
            multiDestination, multiTokens, multiPercents, multiDecimals
          ).should.be.fulfilled
          multiCalldata.should.not.eq('0x')

          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          // Update total sold and total supply to accomodate added balances
          let setTotalSoldCalldata = await saleUtils.setTotalSold.call(
            totalSold + totalAdded
          ).should.be.fulfilled
          setTotalSoldCalldata.should.not.eq('0x')

          let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
          initCrowdsaleCalldata.should.not.eq('0x')

          let finalCrowdsaleCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          finalCrowdsaleCalldata.should.not.eq('0x')

          finalizeCalldata = await saleUtils.finalizeAndDistributeToken.call().should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, singleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, multiCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          let destInfo = await saleIdx.getReservedTokenDestinationList.call(
            storage.address, executionID
          ).should.be.fulfilled
          destInfo.length.should.be.eq(2)
          destInfo[0].toNumber().should.be.eq(4)
          destInfo[1].length.should.be.eq(4)

          events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          events = await storage.exec(
            crowdsaleAdmin, executionID, setTotalSoldCalldata,
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

          events = await storage.exec(
            crowdsaleAdmin, executionID, finalCrowdsaleCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          finalizeReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).should.be.fulfilled

          events = await storage.exec(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          finalizeEvent = events[0]
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            finalizeReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            finalizeReturn[0].toNumber().should.be.eq(0)
          })

          it('should return the correct number of addresses paid', async () => {
            finalizeReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            finalizeReturn[2].toNumber().should.be.eq(7)
          })
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
            emittedAppAddr.should.be.eq(tokenManager.address)
          })
        })

        describe('storage', async () => {

          it('should have a finalized crowdsale', async () => {
            let saleInfo = await saleIdx.getCrowdsaleInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            saleInfo.length.should.be.eq(4)

            saleInfo[0].toNumber().should.be.eq(0)
            saleInfo[1].should.be.eq(teamWallet)
            saleInfo[2].should.be.eq(true)
            saleInfo[3].should.be.eq(true)
          })

          it('should have a reserved destination list length of 0', async () => {
            let resInfo = await saleIdx.getReservedTokenDestinationList.call(
              storage.address, executionID
            ).should.be.fulfilled
            resInfo.length.should.be.eq(2)

            resInfo[0].toNumber().should.be.eq(0)
            resInfo[1].length.should.be.eq(0)
          })

          it('should have correctly calculated the new total supply', async () => {
            let balanceOne = await saleIdx.balanceOf.call(
              storage.address, executionID, singleDestination[0]
            ).should.be.fulfilled

            let balanceTwo = await saleIdx.balanceOf.call(
              storage.address, executionID, multiDestination[0]
            ).should.be.fulfilled

            let balanceThree = await saleIdx.balanceOf.call(
              storage.address, executionID, multiDestination[1]
            ).should.be.fulfilled

            let balanceFour = await saleIdx.balanceOf.call(
              storage.address, executionID, multiDestination[2]
            ).should.be.fulfilled

            let totalUpdated = balanceOne.toNumber() + balanceTwo.toNumber()
                + balanceThree.toNumber() + balanceFour.toNumber()

            let supplyInfo = await saleIdx.totalSupply.call(
              storage.address, executionID
            ).should.be.fulfilled
            supplyInfo.toNumber().should.be.eq(totalUpdated + totalSold)
          })

          it('should allow token transfers', async () => {
            let transferCalldata = await saleUtils.transfer.call(
              crowdsaleAdmin, 1
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            let events = await storage.exec(
              singleDestination[0], executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            let balanceInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, crowdsaleAdmin
            ).should.be.fulfilled
            balanceInfo.toNumber().should.be.eq(1)
          })

          describe('Destination 1', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await saleIdx.getReservedDestinationInfo.call(
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

              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, singleDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 2', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await saleIdx.getReservedDestinationInfo.call(
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

              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, multiDestination[0]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 3', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await saleIdx.getReservedDestinationInfo.call(
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

              let balanceInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, multiDestination[1]
              ).should.be.fulfilled
              balanceInfo.toNumber().should.be.eq(Math.floor(expectedBalance))
            })
          })

          describe('Destination 4', async () => {

            it('should store the correct reserved token information', async () => {
              let destInfo = await saleIdx.getReservedDestinationInfo.call(
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

              let balanceInfo = await saleIdx.balanceOf.call(
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
