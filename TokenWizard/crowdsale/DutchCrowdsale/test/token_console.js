// // Abstract storage contract
// let AbstractStorage = artifacts.require('./AbstractStorage')
// // DutchCrowdsale
// let InitDutch = artifacts.require('./InitCrowdsale')
// let DutchBuy = artifacts.require('./CrowdsaleBuyTokens')
// let DutchCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
// let DutchTokenConsole = artifacts.require('./TokenConsole')
// let DutchTokenTransfer = artifacts.require('./TokenTransfer')
// let DutchTokenTransferFrom = artifacts.require('./TokenTransferFrom')
// let DutchTokenApprove = artifacts.require('./TokenApprove')
// // Utils
// let TestUtils = artifacts.require('./TestUtils')
// let TokenConsoleUtils = artifacts.require('./TokenConsoleUtils')
// let TokenFunctionUtils = artifacts.require('./TokenFunctionsUtil')
// let CrowdsaleConsoleUtils = artifacts.require('./CrowdsaleConsoleUtils')
// // Mock
// let TokenFunctionsMock = artifacts.require('./TokenFunctionsMock')
//
// function getTime() {
//   let block = web3.eth.getBlock('latest')
//   return block.timestamp;
// }
//
// function zeroAddress() {
//   return web3.toHex(0)
// }
//
// function hexStrEquals(hex, expected) {
//   return web3.toAscii(hex).substring(0, expected.length) == expected;
// }
//
// contract('#TokenConsole', function (accounts) {
//
//   let storage
//   let testUtils
//   let consoleUtils
//
//   let tokenMock
//   let tokenUtil
//   let crowdsaleConsoleUtil
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//   let teamWallet = accounts[3]
//
//   let otherAddress = accounts[4]
//   let otherContext
//
//   let initCrowdsale
//   let crowdsaleBuy
//   let crowdsaleConsole
//   let tokenConsole
//   let tokenTransfer
//   let tokenTransferFrom
//   let tokenApprove
//
//   let executionID
//   let adminContext
//
//   let initCalldata
//   let startTime
//   let totalSupply = 100000
//   let sellCap = 90000
//   let startPrice = 1000 // 1000 wei per token (1 token = [10 ** decimals] units)
//   let endPrice = 100 // 100 wei per token
//   let duration = 3600 // 1 hour
//   let isWhitelisted = true
//
//   let tokenName = 'Token'
//   let tokenSymbol = 'TOK'
//   let tokenDecimals = 18
//
//   // Event signatures
//   let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
//   let finalHash = web3.sha3('ApplicationFinalization(bytes32,address)')
//   let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
//   let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')
//
//   let transferHash = web3.sha3('Transfer(address,address,uint256)')
//   let approvalHash = web3.sha3('Approval(address,address,uint256)')
//   let transferAgentHash = web3.sha3('TransferAgentStatusUpdate(bytes32,address,bool)')
//
//   before(async () => {
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
//     consoleUtils = await TokenConsoleUtils.new().should.be.fulfilled
//
//     tokenUtil = await TokenFunctionUtils.new().should.be.fulfilled
//     tokenMock = await TokenFunctionsMock.new().should.be.fulfilled
//     crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled
//
//     initCrowdsale = await InitDutch.new().should.be.fulfilled
//     crowdsaleBuy = await DutchBuy.new().should.be.fulfilled
//     crowdsaleConsole = await DutchCrowdsaleConsole.new().should.be.fulfilled
//     tokenConsole = await DutchTokenConsole.new().should.be.fulfilled
//     tokenTransfer = await DutchTokenTransfer.new().should.be.fulfilled
//     tokenTransferFrom = await DutchTokenTransferFrom.new().should.be.fulfilled
//     tokenApprove = await DutchTokenApprove.new().should.be.fulfilled
//   })
//
//   beforeEach(async () => {
//     startTime = getTime() + 3600
//
//     initCalldata = await testUtils.init.call(
//       teamWallet, totalSupply, sellCap, startPrice, endPrice,
//       duration, startTime, isWhitelisted, crowdsaleAdmin
//     ).should.be.fulfilled
//     initCalldata.should.not.eq('0x')
//
//     let events = await storage.initAndFinalize(
//       updater, true, initCrowdsale.address, initCalldata, [
//         crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//         tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address,
//         tokenMock.address
//       ],
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(2)
//
//     events[0].event.should.be.eq('ApplicationInitialized')
//     events[1].event.should.be.eq('ApplicationFinalization')
//     executionID = events[0].args['execution_id']
//     web3.toDecimal(executionID).should.not.eq(0)
//
//     adminContext = await testUtils.getContext.call(
//       executionID, crowdsaleAdmin, 0
//     ).should.be.fulfilled
//     adminContext.should.not.eq('0x')
//
//     otherContext = await testUtils.getContext.call(
//       executionID, otherAddress, 0
//     ).should.be.fulfilled
//     otherContext.should.not.eq('0x')
//   })
//
//   context('setTransferAgentStatus', async () => {
//
//     let agentCalldata
//     let agentEvents
//     let agentReturn
//
//     context('when the input agent is address 0', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//       let invalidReturn
//
//       let invalidAddress = zeroAddress()
//
//       beforeEach(async () => {
//         invalidCalldata = await consoleUtils.setTransferAgentStatus.call(
//           invalidAddress, true, adminContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         invalidReturn = await storage.exec.call(
//           tokenConsole.address, executionID, invalidCalldata,
//           { from: exec }
//         ).should.be.fulfilled
//
//         let events = await storage.exec(
//           tokenConsole.address, executionID, invalidCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         invalidEvent = events[0]
//       })
//
//       describe('returned data', async () => {
//
//         it('should return a tuple with 3 fields', async () => {
//           invalidReturn.length.should.be.eq(3)
//         })
//
//         it('should return the correct number of events emitted', async () => {
//           invalidReturn[0].toNumber().should.be.eq(0)
//         })
//
//         it('should return the correct number of addresses paid', async () => {
//           invalidReturn[1].toNumber().should.be.eq(0)
//         })
//
//         it('should return the correct number of storage slots written to', async () => {
//           invalidReturn[2].toNumber().should.be.eq(0)
//         })
//       })
//
//       it('should emit an ApplicationException event', async () => {
//         invalidEvent.event.should.be.eq('ApplicationException')
//       })
//
//       describe('the ApplicationException event', async () => {
//
//         it('should match the used execution id', async () => {
//           let emittedExecID = invalidEvent.args['execution_id']
//           emittedExecID.should.be.eq(executionID)
//         })
//
//         it('should match the TokenTransfer address', async () => {
//           let emittedAppAddr = invalidEvent.args['application_address']
//           emittedAppAddr.should.be.eq(tokenConsole.address)
//         })
//
//         it('should contain the error message \'InvalidTransferAgent\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'InvalidTransferAgent').should.be.eq(true)
//         })
//       })
//
//       describe('storage', async () => {
//
//         it('should not record the zero address as a transfer agent', async () => {
//           let agentInfo = await initCrowdsale.getTransferAgentStatus.call(
//             storage.address, executionID, invalidAddress
//           ).should.be.fulfilled
//           agentInfo.should.not.eq(true)
//         })
//       })
//     })
//
//     context('when the sender is the admin', async () => {
//
//       beforeEach(async () => {
//         let setBalanceCalldata = await tokenUtil.setBalance.call(
//           otherAddress, 100
//         ).should.be.fulfilled
//         setBalanceCalldata.should.not.eq('0x')
//
//         agentCalldata = await consoleUtils.setTransferAgentStatus.call(
//           otherAddress, true, adminContext
//         ).should.be.fulfilled
//         agentCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           tokenMock.address, executionID, setBalanceCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         agentReturn = await storage.exec.call(
//           tokenConsole.address, executionID, agentCalldata,
//           { from: exec }
//         ).should.be.fulfilled
//
//         agentEvents = await storage.exec(
//           tokenConsole.address, executionID, agentCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.receipt.logs
//         })
//       })
//
//       describe('returned data', async () => {
//
//         it('should return a tuple with 3 fields', async () => {
//           agentReturn.length.should.be.eq(3)
//         })
//
//         it('should return the correct number of events emitted', async () => {
//           agentReturn[0].toNumber().should.be.eq(1)
//         })
//
//         it('should return the correct number of addresses paid', async () => {
//           agentReturn[1].toNumber().should.be.eq(0)
//         })
//
//         it('should return the correct number of storage slots written to', async () => {
//           agentReturn[2].toNumber().should.be.eq(1)
//         })
//       })
//
//       describe('events', async () => {
//
//         it('should have emitted 2 events total', async () => {
//           agentEvents.length.should.be.eq(2)
//         })
//
//         describe('the ApplicationExecution event', async () => {
//
//           let eventTopics
//           let eventData
//
//           beforeEach(async () => {
//             eventTopics = agentEvents[1].topics
//             eventData = agentEvents[1].data
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
//             web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenConsole.address))
//             web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//           })
//
//           it('should have an empty data field', async () => {
//             eventData.should.be.eq('0x00')
//           })
//         })
//
//         describe('the other event', async () => {
//
//           let eventTopics
//           let eventData
//
//           beforeEach(async () => {
//             eventTopics = agentEvents[0].topics
//             eventData = agentEvents[0].data
//           })
//
//           it('should have the correct number of topics', async () => {
//             eventTopics.length.should.be.eq(3)
//           })
//
//           it('should match the correct event signature for the first topic', async () => {
//             let sig = eventTopics[0]
//             web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferAgentHash))
//           })
//
//           it('should match the agent and execution id for the other two topics', async () => {
//             web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
//             web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(otherAddress))
//           })
//
//           it('should contain the set status as data', async () => {
//             web3.toDecimal(eventData).should.be.eq(1)
//           })
//         })
//       })
//
//       describe('storage', async () => {
//
//         it('should accurately record the transfer agent\'s status', async () => {
//           let agentInfo = await initCrowdsale.getTransferAgentStatus.call(
//             storage.address, executionID, otherAddress
//           ).should.be.fulfilled
//           agentInfo.should.be.eq(true)
//         })
//
//         it('should allow the transfer agent to transfer tokens', async () => {
//           let transferCalldata = await tokenUtil.transfer.call(
//             crowdsaleAdmin, 50, otherContext
//           ).should.be.fulfilled
//           transferCalldata.should.not.eq('0x')
//
//           let events = await storage.exec(
//             tokenTransfer.address, executionID, transferCalldata,
//             { from: exec }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(1)
//           events[0].event.should.be.eq('ApplicationExecution')
//
//           let balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, crowdsaleAdmin
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(50 + (totalSupply - sellCap))
//
//           balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, otherAddress
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(50)
//         })
//       })
//     })
//
//     context('when the sender is not the admin', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//       let invalidReturn
//
//       beforeEach(async () => {
//         invalidCalldata = await consoleUtils.setTransferAgentStatus.call(
//           otherAddress, true, otherContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         invalidReturn = await storage.exec.call(
//           tokenConsole.address, executionID, invalidCalldata,
//           { from: exec }
//         ).should.be.fulfilled
//
//         let events = await storage.exec(
//           tokenConsole.address, executionID, invalidCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         invalidEvent = events[0]
//       })
//
//       describe('returned data', async () => {
//
//         it('should return a tuple with 3 fields', async () => {
//           invalidReturn.length.should.be.eq(3)
//         })
//
//         it('should return the correct number of events emitted', async () => {
//           invalidReturn[0].toNumber().should.be.eq(0)
//         })
//
//         it('should return the correct number of addresses paid', async () => {
//           invalidReturn[1].toNumber().should.be.eq(0)
//         })
//
//         it('should return the correct number of storage slots written to', async () => {
//           invalidReturn[2].toNumber().should.be.eq(0)
//         })
//       })
//
//       it('should emit an ApplicationException event', async () => {
//         invalidEvent.event.should.be.eq('ApplicationException')
//       })
//
//       describe('the ApplicationException event', async () => {
//
//         it('should match the used execution id', async () => {
//           let emittedExecID = invalidEvent.args['execution_id']
//           emittedExecID.should.be.eq(executionID)
//         })
//
//         it('should match the TokenTransfer address', async () => {
//           let emittedAppAddr = invalidEvent.args['application_address']
//           emittedAppAddr.should.be.eq(tokenConsole.address)
//         })
//
//         it('should contain the error message \'SenderIsNotAdmin\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'SenderIsNotAdmin').should.be.eq(true)
//         })
//       })
//
//       describe('storage', async () => {
//
//         it('should not record the passed in address as a transfer agent', async () => {
//           let agentInfo = await initCrowdsale.getTransferAgentStatus.call(
//             storage.address, executionID, otherAddress
//           ).should.be.fulfilled
//           agentInfo.should.not.eq(true)
//         })
//       })
//     })
//   })
//
// })
