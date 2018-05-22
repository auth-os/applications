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
//     let agentEvent
//
//     context('when the input agent is address 0', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//
//       let invalidAddress = zeroAddress()
//
//       beforeEach(async () => {
//         invalidCalldata = await consoleUtils.setTransferAgentStatus.call(
//           invalidAddress, true, adminContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           tokenConsole.address, executionID, invalidCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//
//         invalidEvent = events[0]
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
//         it('should match the TokenConsole address', async () => {
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
//       it('should not record the zero address as a transfer agent', async () => {
//         let agentInfo = await initCrowdsale.getTransferAgentStatus.call(
//           storage.address, executionID, invalidAddress
//         ).should.be.fulfilled
//         agentInfo.should.not.eq(true)
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
//         events = await storage.exec(
//           tokenConsole.address, executionID, agentCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//
//         agentEvent = events[0]
//       })
//
//       it('should emit an ApplicationExecution event', async () => {
//         agentEvent.event.should.be.eq('ApplicationExecution')
//       })
//
//       describe('the ApplicationExecution event', async () => {
//
//         it('should match the used execution id', async () => {
//           let emittedExecID = agentEvent.args['execution_id']
//           emittedExecID.should.be.eq(executionID)
//         })
//
//         it('should match the TokenConsole address', async () => {
//           let emittedAppAddr = agentEvent.args['script_target']
//           emittedAppAddr.should.be.eq(tokenConsole.address)
//         })
//       })
//
//       it('should accurately record the transfer agent\'s status', async () => {
//         let agentInfo = await initCrowdsale.getTransferAgentStatus.call(
//           storage.address, executionID, otherAddress
//         ).should.be.fulfilled
//         agentInfo.should.be.eq(true)
//       })
//
//       it('should allow the transfer agent to transfer tokens', async () => {
//         let transferCalldata = await tokenUtil.transfer.call(
//           crowdsaleAdmin, 50, otherContext
//         ).should.be.fulfilled
//         transferCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           tokenTransfer.address, executionID, transferCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         let balanceInfo = await initCrowdsale.balanceOf.call(
//           storage.address, executionID, crowdsaleAdmin
//         ).should.be.fulfilled
//         balanceInfo.toNumber().should.be.eq(50 + (totalSupply - sellCap))
//
//         balanceInfo = await initCrowdsale.balanceOf.call(
//           storage.address, executionID, otherAddress
//         ).should.be.fulfilled
//         balanceInfo.toNumber().should.be.eq(50)
//       })
//     })
//
//     context('when the sender is not the admin', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//
//       beforeEach(async () => {
//         invalidCalldata = await consoleUtils.setTransferAgentStatus.call(
//           otherAddress, true, otherContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           tokenConsole.address, executionID, invalidCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//
//         invalidEvent = events[0]
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
//         it('should match the TokenConsole address', async () => {
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
//       it('should not record the passed in address as a transfer agent', async () => {
//         let agentInfo = await initCrowdsale.getTransferAgentStatus.call(
//           storage.address, executionID, otherAddress
//         ).should.be.fulfilled
//         agentInfo.should.not.eq(true)
//       })
//     })
//   })
//
// })
