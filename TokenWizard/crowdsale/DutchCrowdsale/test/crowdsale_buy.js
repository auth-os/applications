// // Abstract storage contract
// let AbstractStorage = artifacts.require('./AbstractStorage')
// // DutchCrowdsale
// let InitDutch = artifacts.require('./InitCrowdsale')
// let DutchCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
// let DutchTokenConsole = artifacts.require('./TokenConsole')
// let DutchTokenTransfer = artifacts.require('./TokenTransfer')
// let DutchTokenTransferFrom = artifacts.require('./TokenTransferFrom')
// let DutchTokenApprove = artifacts.require('./TokenApprove')
// // Utils
// let TestUtils = artifacts.require('./TestUtils')
// let TokenConsoleUtils = artifacts.require('./TokenConsoleUtils')
// let CrowdsaleConsoleUtils = artifacts.require('./CrowdsaleConsoleUtils')
// let BuyTokensUtil = artifacts.require('./BuyTokensUtil')
// let ViewBalance = artifacts.require('./ViewBalance')
// // Mock
// let CrowdsaleBuyTokensMock = artifacts.require('./CrowdsaleBuyTokensMock')
// let AdminMockContract = artifacts.require('./MockAdminContract')
// let InitCrowdsaleMock = artifacts.require('./MockInitCrowdsale')
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
// function sendBalanceTo(_from, _to) {
//   let bal = web3.eth.getBalance(_from).toNumber()
//   web3.eth.sendTransaction({ from: _from, to: _to, value: bal, gasPrice: 0 })
// }
//
// function deepToNumber(num) {
//   return web3.toBigNumber(num).toNumber()
// }
//
// async function getBalance(contract, owner) {
//   let bal = await contract.viewOwnerBalance.call(owner).should.be.fulfilled
//   return bal.toNumber()
// }
//
// contract('#DutchBuyTokens - (standard price, 0 decimals)', function (accounts) {
//
//   let storage
//
//   let testUtils
//   let tokenConsoleUtil
//   let buyTokensUtil
//   let crowdsaleConsoleUtil
//   let viewBalance
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//
//   let teamWallet = accounts[3]
//
//   let initCrowdsale
//   let adminMock
//   let crowdsaleBuyMock
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
//   let totalSupply = 1100000 // 1.1 million units in existence
//   let sellCap = 1000000   // 1 million units for sale
//   let startPrice = 1000 // 1000 wei per token (1 token = [10 ** decimals] units)
//   let endPrice = 100 // 100 wei per token
//   let duration = 3600 // 1 hour
//   let isWhitelisted = true
//
//   let tokenName = 'Token'
//   let tokenSymbol = 'TOK'
//   let tokenDecimals = 0
//
//   let purchaserList = [
//     accounts[accounts.length - 1],
//     accounts[accounts.length - 2],
//     accounts[accounts.length - 3]
//   ]
//
//   before(async () => {
//
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
//     tokenConsoleUtil = await TokenConsoleUtils.new().should.be.fulfilled
//     buyTokensUtil = await BuyTokensUtil.new().should.be.fulfilled
//     viewBalance = await ViewBalance.new().should.be.fulfilled
//
//     crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled
//     adminMock = await AdminMockContract.new().should.be.fulfilled
//
//     initCrowdsale = await InitDutch.new().should.be.fulfilled
//     crowdsaleBuyMock = await CrowdsaleBuyTokensMock.new().should.be.fulfilled
//     crowdsaleConsole = await DutchCrowdsaleConsole.new().should.be.fulfilled
//     tokenConsole = await DutchTokenConsole.new().should.be.fulfilled
//     tokenTransfer = await DutchTokenTransfer.new().should.be.fulfilled
//     tokenTransferFrom = await DutchTokenTransferFrom.new().should.be.fulfilled
//     tokenApprove = await DutchTokenApprove.new().should.be.fulfilled
//
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//   })
//
//   beforeEach(async () => {
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//
//     startTime = getTime() + 3600
//     execInitBalance = await getBalance(viewBalance, exec)
//
//     initCalldata = await testUtils.init.call(
//       teamWallet, totalSupply, sellCap, startPrice, endPrice,
//       duration, startTime, isWhitelisted, crowdsaleAdmin
//     ).should.be.fulfilled
//     initCalldata.should.not.eq('0x')
//
//     let events = await storage.initAndFinalize(
//       updater, true, initCrowdsale.address, initCalldata, [
//         crowdsaleBuyMock.address, crowdsaleConsole.address, tokenConsole.address,
//         tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address,
//         adminMock.address
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
//     await crowdsaleBuyMock.resetTime().should.be.fulfilled
//     let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//     storedTime.toNumber().should.be.eq(0)
//
//     let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken.call(
//       tokenName, tokenSymbol, tokenDecimals, adminContext
//     ).should.be.fulfilled
//     initTokenCalldata.should.not.eq('0x')
//
//     events = await storage.exec(
//       crowdsaleConsole.address, executionID, initTokenCalldata,
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(1)
//     events[0].event.should.be.eq('ApplicationExecution')
//   })
//
//   describe('pre-test-storage', async() => {
//
//     it('should be an uninitialized crowdsale', async () => {
//       let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       saleInfo.length.should.be.eq(5)
//
//       saleInfo[0].toNumber().should.be.eq(0)
//       saleInfo[1].should.be.eq(teamWallet)
//       saleInfo[2].toNumber().should.be.eq(0)
//       saleInfo[3].should.be.eq(false)
//       saleInfo[4].should.be.eq(false)
//     })
//
//     it('should have a correctly initialized token', async () => {
//       let tokenInfo = await initCrowdsale.getTokenInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tokenInfo.length.should.be.eq(4)
//
//       hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//       hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//       tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//       tokenInfo[3].toNumber().should.be.eq(totalSupply)
//     })
//   })
//
//   describe('no wei sent', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let invalidContext
//
//     beforeEach(async () => {
//       invalidContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], 0
//       ).should.be.fulfilled
//       invalidContext.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         invalidContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'NoWeiSent\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'NoWeiSent').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should be an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale is not initialized', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec, value: valueSent }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an uninitialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(false)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale is already finalized', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       finalizeCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleConsole.address, executionID, finalizeCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec, value: valueSent }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized and finalized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(true)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale has not started', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec, value: valueSent }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'BeforeStartTime\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'BeforeStartTime').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an uninitialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(false)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale has already ended', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//
//       // Fast-forward to time after crowdsale end
//       await crowdsaleBuyMock.setTime(startTime + duration).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + duration)
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('sale has sold out', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//       // Fast-forward to crowdsale start
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//
//       let clearTokensCalldata = await buyTokensUtil.setTokensRemaining.call(0).should.be.fulfilled
//       clearTokensCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         adminMock.address, executionID, clearTokensCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have no tokens remaining for sale', async () => {
//         let isFullInfo = await initCrowdsale.isCrowdsaleFull.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         isFullInfo.length.should.be.eq(2)
//
//         isFullInfo[0].should.be.eq(true)
//         isFullInfo[1].toNumber().should.be.eq(sellCap)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('whitelist-enabled', async () => {
//
//     beforeEach(async () => {
//
//       let setWhitelistedCalldata = await buyTokensUtil.setSaleIsWhitelisted.call(true).should.be.fulfilled
//       setWhitelistedCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         adminMock.address, executionID, setWhitelistedCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//     })
//
//     context('sender is not whitelisted', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//
//       let valueSent = startPrice
//
//       beforeEach(async () => {
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], valueSent
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         invalidCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, invalidCalldata,
//           { from: exec, value: valueSent }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
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
//         it('should match the BuyTokensMock address', async () => {
//           let emittedAppAddr = invalidEvent.args['application_address']
//           emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//         })
//
//         it('should contain the error message \'SpendAmountExceeded\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'SpendAmountExceeded').should.be.eq(true)
//         })
//       })
//
//       describe('the resulting crowdsale storage', async () => {
//
//         it('should have an initialized crowdsale', async () => {
//           let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           saleInfo.length.should.be.eq(5)
//
//           saleInfo[0].toNumber().should.be.eq(0)
//           saleInfo[1].should.be.eq(teamWallet)
//           saleInfo[2].toNumber().should.be.eq(0)
//           saleInfo[3].should.be.eq(true)
//           saleInfo[4].should.be.eq(false)
//         })
//
//         it('should have a correctly initialized token', async () => {
//           let tokenInfo = await initCrowdsale.getTokenInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           tokenInfo.length.should.be.eq(4)
//
//           hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//           hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//           tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//           tokenInfo[3].toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should have an unchanged team wallet balance', async () => {
//           let curTeamBalance = await getBalance(viewBalance, teamWallet)
//           curTeamBalance.should.be.eq(0)
//         })
//       })
//     })
//
//     context('sender is whitelisted', async () => {
//
//       // Each whitelisted address must purchase minimum 10 tokens initially
//       let purchaserMinimums = [10, 10, 10]
//       // Maximum amounts each address may spend (wei) over the course of the sale:
//       // The first address may purchase 100 tokens immediately
//       // The second address may only purchase 1 token (if they buy immediately)
//       // The third address must wait until the endPrice of 100 is reached (10 * 100 is their maximum of 1000)
//       let purchaserMaximums = [100000, 10000, 1000]
//
//       beforeEach(async () => {
//         let whitelistCalldata = await crowdsaleConsoleUtil.whitelistMulti.call(
//           purchaserList, purchaserMinimums, purchaserMaximums, adminContext
//         ).should.be.fulfilled
//         whitelistCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleConsole.address, executionID, whitelistCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//       })
//
//       describe('pre-purchase storage', async () => {
//
//         it('should have correctly whitelisted the first purchaser', async () => {
//           let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//             storage.address, executionID, purchaserList[0]
//           ).should.be.fulfilled
//           whitelistInfo.length.should.be.eq(2)
//           whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[0])
//           whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[0])
//         })
//
//         it('should have correctly whitelisted the second purchaser', async () => {
//           let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//             storage.address, executionID, purchaserList[1]
//           ).should.be.fulfilled
//           whitelistInfo.length.should.be.eq(2)
//           whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[1])
//           whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[1])
//         })
//
//         it('should have correctly whitelisted the third purchaser', async () => {
//           let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//             storage.address, executionID, purchaserList[2]
//           ).should.be.fulfilled
//           whitelistInfo.length.should.be.eq(2)
//           whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[2])
//           whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[2])
//         })
//
//         it('should have a whitelist of length 3', async () => {
//           let tierWhitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           tierWhitelistInfo.length.should.be.eq(2)
//           tierWhitelistInfo[0].toNumber().should.be.eq(3)
//           tierWhitelistInfo[1].length.should.be.eq(3)
//           tierWhitelistInfo[1].should.be.eql(purchaserList)
//         })
//
//         it('should have 0 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(0)
//         })
//
//         it('should correctly store the first purchaser\'s balance as 0', async () => {
//           let balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, purchaserList[0]
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(0)
//         })
//
//         it('should correctly store the second purchaser\'s balance as 0', async () => {
//           let balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, purchaserList[1]
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(0)
//         })
//
//         it('should correctly store the third purchaser\'s balance as 0', async () => {
//           let balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, purchaserList[2]
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(0)
//         })
//
//         it('should have the correct amount of wei raised as 0', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(0)
//         })
//
//         it('should have the correct value for the team\'s current balance', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(0)
//         })
//       })
//
//       context('multiple consecutive spends', async () => {
//
//         let initialSpends = [
//           startPrice * purchaserMinimums[0],
//           startPrice * purchaserMinimums[1],
//           startPrice * purchaserMinimums[2]
//         ]
//
//         let purchaseContexts
//         let paymentEvents
//         let spendCalldataList
//
//         beforeEach(async () => {
//           purchaseContexts = []
//           paymentEvents = []
//           spendCalldataList = []
//
//           // Transfer funds from teamWallet to exec
//           sendBalanceTo(teamWallet, exec)
//           let bal = await getBalance(viewBalance, teamWallet)
//           bal.should.be.eq(0)
//
//           purchaseContexts.push(
//             await testUtils.getContext.call(
//               executionID, purchaserList[0], initialSpends[0]
//             ).should.be.fulfilled
//           )
//           purchaseContexts.push(
//             await testUtils.getContext.call(
//               executionID, purchaserList[1], initialSpends[1]
//             ).should.be.fulfilled
//           )
//           purchaseContexts.push(
//             await testUtils.getContext.call(
//               executionID, purchaserList[2], initialSpends[2]
//             ).should.be.fulfilled
//           )
//           purchaseContexts.length.should.be.eq(3)
//           purchaseContexts[0].should.not.eq('0x')
//           purchaseContexts[1].should.not.eq('0x')
//           purchaseContexts[2].should.not.eq('0x')
//
//           spendCalldataList.push(
//             await buyTokensUtil.buy.call(purchaseContexts[0]).should.be.fulfilled
//           )
//           spendCalldataList.push(
//             await buyTokensUtil.buy.call(purchaseContexts[1]).should.be.fulfilled
//           )
//           spendCalldataList.push(
//             await buyTokensUtil.buy.call(purchaseContexts[2]).should.be.fulfilled
//           )
//           spendCalldataList[0].should.not.eq('0x')
//           spendCalldataList[1].should.not.eq('0x')
//           spendCalldataList[2].should.not.eq('0x')
//
//           let events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldataList[0],
//             { from: exec, value: initialSpends[0] }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(2)
//           paymentEvents.push(events[0])
//           events[1].event.should.be.eq('ApplicationExecution')
//
//           events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldataList[1],
//             { from: exec, value: initialSpends[1] }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(2)
//           paymentEvents.push(events[0])
//           events[1].event.should.be.eq('ApplicationExecution')
//
//           events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldataList[2],
//             { from: exec, value: initialSpends[2] }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(1) // Final call will fail, as the sender's maximum is too restrictive
//           paymentEvents.push(events[0])
//
//           paymentEvents.length.should.be.eq(3)
//         })
//
//         describe('payment results', async () => {
//
//           it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//             paymentEvents[0].event.should.be.eq('DeliveredPayment')
//             paymentEvents[1].event.should.be.eq('DeliveredPayment')
//             paymentEvents[2].event.should.be.eq('ApplicationException')
//           })
//
//           describe('the DeliveredPayment events', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = paymentEvents[0].args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//               emittedExecID = paymentEvents[1].args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = paymentEvents[0].args['destination']
//               destination.should.be.eq(teamWallet)
//               destination = paymentEvents[1].args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the initial spend amounts', async () => {
//               let sent = paymentEvents[0].args['amount']
//               sent.toNumber().should.be.eq(initialSpends[0])
//               sent = paymentEvents[1].args['amount']
//               sent.toNumber().should.be.eq(initialSpends[1])
//             })
//           })
//
//           describe('the ApplicationException event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = paymentEvents[2].args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the CrowdsaleBuyTokensMock address', async () => {
//               let emittedAddr = paymentEvents[2].args['application_address']
//               emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//             })
//
//             it('should contain the error message \'UnderMinCap\'', async () => {
//               let message = paymentEvents[2].args['message']
//               hexStrEquals(message, 'UnderMinCap').should.be.eq(true)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].toNumber().should.be.eq(
//               initialSpends[0] + initialSpends[1]
//             )
//           })
//
//           it('should have 2 unique buyers', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(2)
//           })
//
//           describe('token balances', async () => {
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(initialSpends[0] / startPrice)
//             })
//
//             it('should correctly store the second purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[1]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(initialSpends[1] / startPrice)
//             })
//
//             it('should have a 0 balance for the third purchaser', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[2]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(0)
//             })
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = await getBalance(viewBalance, teamWallet)
//             teamBalance.should.be.eq(
//               initialSpends[0] + initialSpends[1]
//             )
//           })
//
//           describe('whitelist information', async () => {
//
//             it('should correctly update the first purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[0] - initialSpends[0])
//             })
//
//             it('should correctly update the second purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, purchaserList[1]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[1] - initialSpends[1])
//             })
//
//             it('should not have updated the third purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, purchaserList[2]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[2])
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[2])
//             })
//           })
//
//           it('should have the same token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(totalSupply)
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq((initialSpends[0] + initialSpends[1]) / startPrice)
//           })
//         })
//
//         context('sender spent exactly their maximum spend amount', async () => {
//
//           it('should disallow further purchases from the same sender', async () => {
//
//             let invalidAmount = startPrice
//
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaserList[1], invalidAmount
//             ).should.be.fulfilled
//             invalidContext.should.not.eq('0x')
//
//             let invalidCalldata = await buyTokensUtil.buy.call(
//               invalidContext
//             ).should.be.fulfilled
//             invalidCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, invalidCalldata,
//               { from: exec, value: invalidAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(1)
//             let invalidEvent = events[0]
//
//             invalidEvent.event.should.be.eq('ApplicationException')
//             hexStrEquals(invalidEvent.args['message'], 'SpendAmountExceeded').should.be.eq(true)
//           })
//         })
//
//         context('sender did not spend over their maximum spend amount', async () => {
//
//           let newSendAmount
//           let newSendEvent
//
//           beforeEach(async () => {
//             newSendAmount = startPrice
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = await getBalance(viewBalance, teamWallet)
//             bal.should.be.eq(0)
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], newSendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             let purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: newSendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             newSendEvent = events[1]
//           })
//
//           it('should allow another purchase by the same sender', async () => {
//             newSendEvent.event.should.be.eq('ApplicationExecution')
//           })
//         })
//
//         describe('sender spending over their maximum spend amount', async () => {
//
//           let maxSpendAmount
//
//           let newSpendAmount
//           let newSpendEvent
//
//           beforeEach(async () => {
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = await getBalance(viewBalance, teamWallet)
//             bal.should.be.eq(0)
//
//             newSpendAmount = startPrice + (purchaserMaximums[0] - initialSpends[0])
//             maxSpendAmount = (purchaserMaximums[0] - initialSpends[0])
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], newSpendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             let purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: newSpendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             newSpendEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           describe('payment results', async () => {
//
//             it('should emit a DeliveredPayment event', async () => {
//               newSpendEvent.event.should.be.eq('DeliveredPayment')
//             })
//
//             describe('the DeliveredPayment event', async () => {
//
//               it('should match the execution ID', async () => {
//                 let emittedExecID = newSpendEvent.args['execution_id']
//                 emittedExecID.should.be.eq(executionID)
//               })
//
//               it('should match the team wallet destination address', async () => {
//                 let destination = newSpendEvent.args['destination']
//                 destination.should.be.eq(teamWallet)
//               })
//
//               it('should match the max spend amount', async () => {
//                 let sent = newSpendEvent.args['amount']
//                 sent.toNumber().should.be.eq(maxSpendAmount)
//               })
//             })
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(
//                 initialSpends[0] + initialSpends[1] + maxSpendAmount
//               )
//             })
//
//             it('should have 2 unique buyers', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(2)
//             })
//
//             describe('token balances', async () => {
//
//               it('should correctly store the initial purchaser\'s balance', async () => {
//                 let balanceInfo = await initCrowdsale.balanceOf.call(
//                   storage.address, executionID, purchaserList[0]
//                 ).should.be.fulfilled
//                 balanceInfo.toNumber().should.be.eq(
//                   (initialSpends[0] + maxSpendAmount) / startPrice
//                 )
//               })
//
//               it('should correctly store the second purchaser\'s balance', async () => {
//                 let balanceInfo = await initCrowdsale.balanceOf.call(
//                   storage.address, executionID, purchaserList[1]
//                 ).should.be.fulfilled
//                 balanceInfo.toNumber().should.be.eq(initialSpends[1] / startPrice)
//               })
//
//               it('should have a 0 balance for the third purchaser', async () => {
//                 let balanceInfo = await initCrowdsale.balanceOf.call(
//                   storage.address, executionID, purchaserList[2]
//                 ).should.be.fulfilled
//                 balanceInfo.toNumber().should.be.eq(0)
//               })
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = await getBalance(viewBalance, teamWallet)
//               teamBalance.should.be.eq(maxSpendAmount)
//             })
//
//             describe('whitelist information', async () => {
//
//               it('should correctly update the first purchaser\'s whitelist information', async () => {
//                 let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                   storage.address, executionID, purchaserList[0]
//                 ).should.be.fulfilled
//                 whitelistInfo.length.should.be.eq(2)
//                 whitelistInfo[0].toNumber().should.be.eq(0)
//                 whitelistInfo[1].toNumber().should.be.eq(0)
//               })
//
//               it('should not have updated the second purchaser\'s whitelist information', async () => {
//                 let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                   storage.address, executionID, purchaserList[1]
//                 ).should.be.fulfilled
//                 whitelistInfo.length.should.be.eq(2)
//                 whitelistInfo[0].toNumber().should.be.eq(0)
//                 whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[1] - initialSpends[1])
//               })
//
//               it('should not have updated the third purchaser\'s whitelist information', async () => {
//                 let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                   storage.address, executionID, purchaserList[2]
//                 ).should.be.fulfilled
//                 whitelistInfo.length.should.be.eq(2)
//                 whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[2])
//                 whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[2])
//               })
//             })
//
//             it('should have the same token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(totalSupply)
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(
//                 (maxSpendAmount + initialSpends[0] + initialSpends[1]) / startPrice
//               )
//             })
//           })
//
//           it('should disallow further purchases from the same sender', async () => {
//
//             let invalidAmount = startPrice
//
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], invalidAmount
//             ).should.be.fulfilled
//             invalidContext.should.not.eq('0x')
//
//             let invalidCalldata = await buyTokensUtil.buy.call(
//               invalidContext
//             ).should.be.fulfilled
//             invalidCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, invalidCalldata,
//               { from: exec, value: invalidAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(1)
//             let invalidEvent = events[0]
//
//             invalidEvent.event.should.be.eq('ApplicationException')
//             hexStrEquals(invalidEvent.args['message'], 'SpendAmountExceeded').should.be.eq(true)
//           })
//         })
//       })
//
//       describe('sender cannot buy immediately', async () => {
//
//         let newMinimum = 5
//
//         let invalidPurchaseAmount
//         let invalidPurchaseTime
//         let invalidCalldata
//         let invalidEvent
//
//         let validPurchaseAmount
//         let validPurchaseTime
//         let purchaseCalldata
//         let purchaseEvent
//
//         beforeEach(async () => {
//           let whitelistCalldata = await crowdsaleConsoleUtil.whitelistMulti.call(
//             [purchaserList[2]], [newMinimum], [purchaserMaximums[2]], adminContext
//           ).should.be.fulfilled
//           whitelistCalldata.should.not.eq('0x')
//
//           invalidPurchaseAmount = purchaserMaximums[2]
//           invalidPurchaseTime = startTime
//
//           validPurchaseAmount = purchaserMaximums[2]
//           validPurchaseTime = startTime + (0.9 * duration)
//
//           // Transfer funds from teamWallet to exec
//           sendBalanceTo(teamWallet, exec)
//           let bal = await getBalance(viewBalance, teamWallet)
//           bal.should.be.eq(0)
//
//           let invalidContext = await testUtils.getContext.call(
//             executionID, purchaserList[2], invalidPurchaseAmount
//           ).should.be.fulfilled
//           invalidContext.should.not.eq('0x')
//
//           invalidCalldata = await buyTokensUtil.buy.call(
//             invalidContext
//           ).should.be.fulfilled
//           invalidCalldata.should.not.eq('0x')
//
//           // Fast-forward to invalid purchase time
//           await crowdsaleBuyMock.setTime(invalidPurchaseTime).should.be.fulfilled
//           let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//           storedTime.toNumber().should.be.eq(invalidPurchaseTime)
//
//           let events = await storage.exec(
//             crowdsaleConsole.address, executionID, whitelistCalldata,
//             { from: exec }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(1)
//           events[0].event.should.be.eq('ApplicationExecution')
//
//           events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, invalidCalldata,
//             { from: exec, value: invalidPurchaseAmount }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(1)
//           invalidEvent = events[0]
//
//           // Fast-forward to valid purchase time
//           await crowdsaleBuyMock.setTime(validPurchaseTime).should.be.fulfilled
//           storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//           storedTime.toNumber().should.be.eq(validPurchaseTime)
//
//           let validContext = await testUtils.getContext.call(
//             executionID, purchaserList[2], validPurchaseAmount
//           ).should.be.fulfilled
//           validContext.should.not.eq('0x')
//
//           purchaseCalldata = await buyTokensUtil.buy.call(
//             validContext
//           ).should.be.fulfilled
//           purchaseCalldata.should.not.eq('0x')
//
//           events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, purchaseCalldata,
//             { from: exec, value: validPurchaseAmount }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(2)
//           events[1].event.should.be.eq('ApplicationExecution')
//           purchaseEvent = events[0]
//         })
//
//         it('should disallow the initial purchase, then allow the second purchase', async () => {
//           invalidEvent.event.should.be.eq('ApplicationException')
//           purchaseEvent.event.should.be.eq('DeliveredPayment')
//         })
//       })
//     })
//   })
//
//   describe('non-whitelist-enabled', async () => {
//
//     beforeEach(async () => {
//       let setWhitelistedCalldata = await buyTokensUtil.setSaleIsWhitelisted.call(false).should.be.fulfilled
//       setWhitelistedCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         adminMock.address, executionID, setWhitelistedCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//     })
//
//     context('global minimum exists', async () => {
//
//       let initialPurchaseEvent
//       let nextPurchaseEvent
//       let invalidPurchaseEvent
//
//       let globalMin = 10 // 10 token minimum purchase
//       let spendAmount = startPrice * globalMin
//
//       beforeEach(async () => {
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         let updateMinCalldata = await buyTokensUtil.updateGlobalMin.call(
//           globalMin
//         ).should.be.fulfilled
//         updateMinCalldata.should.not.eq('0x')
//
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], spendAmount
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         let purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let invalidContext = await testUtils.getContext.call(
//           executionID, purchaserList[1], spendAmount - 1
//         ).should.be.fulfilled
//         invalidContext.should.not.eq('0x')
//
//         let invalidCalldata = await buyTokensUtil.buy.call(
//           invalidContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           adminMock.address, executionID, updateMinCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: spendAmount }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         initialPurchaseEvent = events[0]
//         events[1].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: spendAmount }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         nextPurchaseEvent = events[0]
//         events[1].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, invalidCalldata,
//           { from: exec, value: spendAmount - 1 }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         invalidPurchaseEvent = events[0]
//       })
//
//       context('sender does not buy at least the global minimum token amount', async () => {
//
//         it('should emit an ApplicationException event', async () => {
//           invalidPurchaseEvent.event.should.be.eq('ApplicationException')
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the used execution id', async () => {
//             let emittedExecID = invalidPurchaseEvent.args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the BuyTokensMock address', async () => {
//             let emittedAppAddr = invalidPurchaseEvent.args['application_address']
//             emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'UnderMinCap\'', async () => {
//             let emittedMessage = invalidPurchaseEvent.args['message']
//             hexStrEquals(emittedMessage, 'UnderMinCap').should.be.eq(true)
//           })
//         })
//
//         describe('the resulting crowdsale storage', async () => {
//
//           it('should have an initialized crowdsale', async () => {
//             let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             saleInfo.length.should.be.eq(5)
//
//             saleInfo[0].toNumber().should.be.eq(spendAmount * 2)
//             saleInfo[1].should.be.eq(teamWallet)
//             saleInfo[2].toNumber().should.be.eq(globalMin)
//             saleInfo[3].should.be.eq(true)
//             saleInfo[4].should.be.eq(false)
//           })
//
//           it('should have a correctly initialized token', async () => {
//             let tokenInfo = await initCrowdsale.getTokenInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             tokenInfo.length.should.be.eq(4)
//
//             hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//             hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//             tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//             tokenInfo[3].toNumber().should.be.eq(totalSupply)
//           })
//         })
//       })
//
//       context('sender has contributed before', async () => {
//
//         describe('payment results', async () => {
//
//           it('should emit a DeliveredPayment event', async () => {
//             nextPurchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = nextPurchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = nextPurchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the amount spent', async () => {
//               let sent = nextPurchaseEvent.args['amount']
//               sent.toNumber().should.be.eq(spendAmount)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].toNumber().should.be.eq(spendAmount * 2)
//           })
//
//           it('should have 1 unique buyer', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(1)
//           })
//
//           describe('token balances', async () => {
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(globalMin * 2)
//             })
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = await getBalance(viewBalance, teamWallet)
//             teamBalance.should.be.eq(spendAmount * 2)
//           })
//
//           it('should have the same token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(totalSupply)
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq(globalMin * 2)
//           })
//         })
//       })
//
//       context('sender has not contributed before', async () => {
//
//         describe('payment results', async () => {
//
//           it('should emit a DeliveredPayment event', async () => {
//             initialPurchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = initialPurchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = initialPurchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the amount spent', async () => {
//               let sent = initialPurchaseEvent.args['amount']
//               sent.toNumber().should.be.eq(spendAmount)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].toNumber().should.be.eq(spendAmount * 2)
//           })
//
//           it('should have 1 unique buyer', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(1)
//           })
//
//           describe('token balances', async () => {
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(globalMin * 2)
//             })
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = await getBalance(viewBalance, teamWallet)
//             teamBalance.should.be.eq(spendAmount * 2)
//           })
//
//           it('should have the same token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(totalSupply)
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq(globalMin * 2)
//           })
//         })
//       })
//     })
//
//     context('sender purchases all remaining tokens', async () => {
//
//       let spendAmount
//       let purchaseCalldata
//       let purchaseEvent
//
//       beforeEach(async () => {
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         spendAmount = (startPrice * sellCap) + startPrice
//
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], spendAmount
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: spendAmount }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         purchaseEvent = events[0]
//         events[1].event.should.be.eq('ApplicationExecution')
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit a DeliveredPayment event', async () => {
//           purchaseEvent.event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvent.args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvent.args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvent.args['amount']
//             sent.toNumber().should.be.eq(spendAmount - startPrice)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(spendAmount - startPrice)
//         })
//
//         it('should have 1 unique buyer', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(1)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchaserList[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(sellCap)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(spendAmount - startPrice)
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(sellCap)
//         })
//       })
//     })
//   })
// })
//
// contract('#DutchBuyTokens - (flat price, 18 decimals)', function (accounts) {
//
//   let storage
//
//   let testUtils
//   let tokenConsoleUtil
//   let buyTokensUtil
//   let crowdsaleConsoleUtil
//   let viewBalance
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//
//   let teamWallet = accounts[3]
//
//   let initCrowdsale
//   let adminMock
//   let crowdsaleBuyMock
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
//   let totalSupply = deepToNumber(web3.toWei('1100000', 'ether')) // 1.1 million tokens in existence
//   let sellCap = deepToNumber(web3.toWei('1000000', 'ether'))   // 1 million tokens for sale
//   let startPrice = deepToNumber(web3.toWei('0.001', 'ether')) // 1e15 wei per token (1 token = [10 ** decimals] units)
//   let endPrice = deepToNumber(web3.toWei('0.000999', 'ether')) // 9.99e14 wei per token (1 token = [10 ** decimals] units)
//   let duration = 3600 // 1 hour
//   let isWhitelisted = true
//
//   let tokenName = 'Token'
//   let tokenSymbol = 'TOK'
//   let tokenDecimals = 18
//
//   // One token - 1e18 units
//   let oneToken = deepToNumber(web3.toWei('1', 'ether'))
//
//   let purchaserList = [
//     accounts[accounts.length - 1],
//     accounts[accounts.length - 2],
//     accounts[accounts.length - 3]
//   ]
//
//   before(async () => {
//
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
//     tokenConsoleUtil = await TokenConsoleUtils.new().should.be.fulfilled
//     buyTokensUtil = await BuyTokensUtil.new().should.be.fulfilled
//     viewBalance = await ViewBalance.new().should.be.fulfilled
//
//     crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled
//     adminMock = await AdminMockContract.new().should.be.fulfilled
//
//     initCrowdsale = await InitDutch.new().should.be.fulfilled
//     crowdsaleBuyMock = await CrowdsaleBuyTokensMock.new().should.be.fulfilled
//     crowdsaleConsole = await DutchCrowdsaleConsole.new().should.be.fulfilled
//     tokenConsole = await DutchTokenConsole.new().should.be.fulfilled
//     tokenTransfer = await DutchTokenTransfer.new().should.be.fulfilled
//     tokenTransferFrom = await DutchTokenTransferFrom.new().should.be.fulfilled
//     tokenApprove = await DutchTokenApprove.new().should.be.fulfilled
//
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//   })
//
//   beforeEach(async () => {
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//
//     startTime = getTime() + 3600
//     execInitBalance = await getBalance(viewBalance, exec)
//
//     initCalldata = await testUtils.init.call(
//       teamWallet, totalSupply, sellCap, startPrice, endPrice,
//       duration, startTime, isWhitelisted, crowdsaleAdmin
//     ).should.be.fulfilled
//     initCalldata.should.not.eq('0x')
//
//     let events = await storage.initAndFinalize(
//       updater, true, initCrowdsale.address, initCalldata, [
//         crowdsaleBuyMock.address, crowdsaleConsole.address, tokenConsole.address,
//         tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address,
//         adminMock.address
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
//     await crowdsaleBuyMock.resetTime().should.be.fulfilled
//     let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//     storedTime.toNumber().should.be.eq(0)
//
//     let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken.call(
//       tokenName, tokenSymbol, tokenDecimals, adminContext
//     ).should.be.fulfilled
//     initTokenCalldata.should.not.eq('0x')
//
//     events = await storage.exec(
//       crowdsaleConsole.address, executionID, initTokenCalldata,
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(1)
//     events[0].event.should.be.eq('ApplicationExecution')
//   })
//
//   describe('pre-test-storage', async() => {
//
//     it('should be an uninitialized crowdsale', async () => {
//       let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       saleInfo.length.should.be.eq(5)
//
//       saleInfo[0].toNumber().should.be.eq(0)
//       saleInfo[1].should.be.eq(teamWallet)
//       saleInfo[2].toNumber().should.be.eq(0)
//       saleInfo[3].should.be.eq(false)
//       saleInfo[4].should.be.eq(false)
//     })
//
//     it('should have a correctly initialized token', async () => {
//       let tokenInfo = await initCrowdsale.getTokenInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tokenInfo.length.should.be.eq(4)
//
//       hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//       hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//       tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//       tokenInfo[3].toNumber().should.be.eq(totalSupply)
//     })
//   })
//
//   describe('no wei sent', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let invalidContext
//
//     beforeEach(async () => {
//       invalidContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], 0
//       ).should.be.fulfilled
//       invalidContext.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         invalidContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'NoWeiSent\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'NoWeiSent').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should be an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale is not initialized', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec, value: valueSent }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an uninitialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(false)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale is already finalized', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       finalizeCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleConsole.address, executionID, finalizeCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec, value: valueSent }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized and finalized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(true)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale has not started', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec, value: valueSent }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'BeforeStartTime\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'BeforeStartTime').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an uninitialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(false)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('crowdsale has already ended', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//
//       // Fast-forward to time after crowdsale end
//       await crowdsaleBuyMock.setTime(startTime + duration).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + duration)
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('sale has sold out', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = startPrice // Send enough for at least one token
//
//     beforeEach(async () => {
//       // Fast-forward to crowdsale start
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//
//       let clearTokensCalldata = await buyTokensUtil.setTokensRemaining.call(0).should.be.fulfilled
//       clearTokensCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext.call(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy.call(
//         purchaseContext
//       ).should.be.fulfilled
//       invalidCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         adminMock.address, executionID, clearTokensCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         crowdsaleBuyMock.address, executionID, invalidCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should match the used execution id', async () => {
//         let emittedExecID = invalidEvent.args['execution_id']
//         emittedExecID.should.be.eq(executionID)
//       })
//
//       it('should match the BuyTokensMock address', async () => {
//         let emittedAppAddr = invalidEvent.args['application_address']
//         emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//       })
//
//       it('should contain the error message \'CrowdsaleFinished\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         saleInfo.length.should.be.eq(5)
//
//         saleInfo[0].toNumber().should.be.eq(0)
//         saleInfo[1].should.be.eq(teamWallet)
//         saleInfo[2].toNumber().should.be.eq(0)
//         saleInfo[3].should.be.eq(true)
//         saleInfo[4].should.be.eq(false)
//       })
//
//       it('should have a correctly initialized token', async () => {
//         let tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//
//       it('should have no tokens remaining for sale', async () => {
//         let isFullInfo = await initCrowdsale.isCrowdsaleFull.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         isFullInfo.length.should.be.eq(2)
//
//         isFullInfo[0].should.be.eq(true)
//         isFullInfo[1].toNumber().should.be.eq(sellCap)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = await getBalance(viewBalance, teamWallet)
//         curTeamBalance.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('whitelist-enabled', async () => {
//
//     beforeEach(async () => {
//
//       let setWhitelistedCalldata = await buyTokensUtil.setSaleIsWhitelisted.call(true).should.be.fulfilled
//       setWhitelistedCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         adminMock.address, executionID, setWhitelistedCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//     })
//
//     context('sender is not whitelisted', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//
//       let valueSent = startPrice
//
//       beforeEach(async () => {
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], valueSent
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         invalidCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, invalidCalldata,
//           { from: exec, value: valueSent }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
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
//         it('should match the BuyTokensMock address', async () => {
//           let emittedAppAddr = invalidEvent.args['application_address']
//           emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//         })
//
//         it('should contain the error message \'SpendAmountExceeded\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'SpendAmountExceeded').should.be.eq(true)
//         })
//       })
//
//       describe('the resulting crowdsale storage', async () => {
//
//         it('should have an initialized crowdsale', async () => {
//           let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           saleInfo.length.should.be.eq(5)
//
//           saleInfo[0].toNumber().should.be.eq(0)
//           saleInfo[1].should.be.eq(teamWallet)
//           saleInfo[2].toNumber().should.be.eq(0)
//           saleInfo[3].should.be.eq(true)
//           saleInfo[4].should.be.eq(false)
//         })
//
//         it('should have a correctly initialized token', async () => {
//           let tokenInfo = await initCrowdsale.getTokenInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           tokenInfo.length.should.be.eq(4)
//
//           hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//           hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//           tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//           tokenInfo[3].toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should have an unchanged team wallet balance', async () => {
//           let curTeamBalance = await getBalance(viewBalance, teamWallet)
//           curTeamBalance.should.be.eq(0)
//         })
//       })
//     })
//
//     context('sender is whitelisted', async () => {
//
//       let tenTokens = oneToken * 10
//       let initialPrice = (tenTokens * startPrice) / (10 ** tokenDecimals)
//       let finalPrice = (tenTokens * endPrice) / (10 ** tokenDecimals)
//
//       // Each whitelisted address must purchase minimum 10 tokens
//       let purchaserMinimums = [tenTokens, tenTokens, tenTokens]
//       // Maximum amounts each address may spend (wei) over the course of the sale
//       // First address may contribute 2 * the price of 20 tokens at the start of the sale
//       // Second address may only contribute the price of 10 tokens at the start of the sale
//       // Third address may only contribute the price of 20 tokens at the end of the sale
//       let purchaserMaximums = [initialPrice * 2, initialPrice, finalPrice - 1]
//
//       beforeEach(async () => {
//         let whitelistCalldata = await crowdsaleConsoleUtil.whitelistMulti.call(
//           purchaserList, purchaserMinimums, purchaserMaximums, adminContext
//         ).should.be.fulfilled
//         whitelistCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleConsole.address, executionID, whitelistCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//       })
//
//       describe('pre-purchase storage', async () => {
//
//         describe('whitelist information', async () => {
//
//           it('should have correctly whitelisted the first purchaser', async () => {
//             let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//               storage.address, executionID, purchaserList[0]
//             ).should.be.fulfilled
//             whitelistInfo.length.should.be.eq(2)
//             whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[0])
//             whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[0])
//           })
//
//           it('should have correctly whitelisted the second purchaser', async () => {
//             let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//               storage.address, executionID, purchaserList[1]
//             ).should.be.fulfilled
//             whitelistInfo.length.should.be.eq(2)
//             whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[1])
//             whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[1])
//           })
//
//           it('should have correctly whitelisted the third purchaser', async () => {
//             let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//               storage.address, executionID, purchaserList[2]
//             ).should.be.fulfilled
//             whitelistInfo.length.should.be.eq(2)
//             whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[2])
//             whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[2])
//           })
//
//           it('should have a whitelist of length 3', async () => {
//             let tierWhitelistInfo = await initCrowdsale.getCrowdsaleWhitelist.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             tierWhitelistInfo.length.should.be.eq(2)
//             tierWhitelistInfo[0].toNumber().should.be.eq(3)
//             tierWhitelistInfo[1].length.should.be.eq(3)
//             tierWhitelistInfo[1].should.be.eql(purchaserList)
//           })
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the first purchaser\'s balance as 0', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchaserList[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//
//           it('should correctly store the second purchaser\'s balance as 0', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchaserList[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//
//           it('should correctly store the third purchaser\'s balance as 0', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchaserList[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have 0 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(0)
//         })
//
//         it('should have the correct amount of wei raised as 0', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(0)
//         })
//
//         it('should have the correct value for the team\'s current balance', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(0)
//         })
//       })
//
//       context('multiple consecutive spends', async () => {
//
//         let initialSpends = [
//           purchaserMaximums[0] / 2,
//           purchaserMaximums[1],
//           purchaserMaximums[2]
//         ]
//
//         let purchaseContexts
//         let paymentEvents
//         let spendCalldataList
//
//         beforeEach(async () => {
//           purchaseContexts = []
//           paymentEvents = []
//           spendCalldataList = []
//
//           // Transfer funds from teamWallet to exec
//           sendBalanceTo(teamWallet, exec)
//           let bal = await getBalance(viewBalance, teamWallet)
//           bal.should.be.eq(0)
//
//           purchaseContexts.push(
//             await testUtils.getContext.call(
//               executionID, purchaserList[0], initialSpends[0]
//             ).should.be.fulfilled
//           )
//           purchaseContexts.push(
//             await testUtils.getContext.call(
//               executionID, purchaserList[1], initialSpends[1]
//             ).should.be.fulfilled
//           )
//           purchaseContexts.push(
//             await testUtils.getContext.call(
//               executionID, purchaserList[2], initialSpends[2]
//             ).should.be.fulfilled
//           )
//           purchaseContexts.length.should.be.eq(3)
//           purchaseContexts[0].should.not.eq('0x')
//           purchaseContexts[1].should.not.eq('0x')
//           purchaseContexts[2].should.not.eq('0x')
//
//           spendCalldataList.push(
//             await buyTokensUtil.buy.call(purchaseContexts[0]).should.be.fulfilled
//           )
//           spendCalldataList.push(
//             await buyTokensUtil.buy.call(purchaseContexts[1]).should.be.fulfilled
//           )
//           spendCalldataList.push(
//             await buyTokensUtil.buy.call(purchaseContexts[2]).should.be.fulfilled
//           )
//           spendCalldataList[0].should.not.eq('0x')
//           spendCalldataList[1].should.not.eq('0x')
//           spendCalldataList[2].should.not.eq('0x')
//
//           let events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldataList[0],
//             { from: exec, value: initialSpends[0] }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(2)
//           paymentEvents.push(events[0])
//           events[1].event.should.be.eq('ApplicationExecution')
//
//           events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldataList[1],
//             { from: exec, value: initialSpends[1] }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(2)
//           paymentEvents.push(events[0])
//           events[1].event.should.be.eq('ApplicationExecution')
//
//           events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldataList[2],
//             { from: exec, value: initialSpends[2] }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(1) // Final call will fail, as the sender's maximum is too restrictive
//           paymentEvents.push(events[0])
//
//           paymentEvents.length.should.be.eq(3)
//         })
//
//         describe('payment results', async () => {
//
//           it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//             paymentEvents[0].event.should.be.eq('DeliveredPayment')
//             paymentEvents[1].event.should.be.eq('DeliveredPayment')
//             paymentEvents[2].event.should.be.eq('ApplicationException')
//           })
//
//           describe('the DeliveredPayment events', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = paymentEvents[0].args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//               emittedExecID = paymentEvents[1].args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = paymentEvents[0].args['destination']
//               destination.should.be.eq(teamWallet)
//               destination = paymentEvents[1].args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the initial spend amounts', async () => {
//               let sent = paymentEvents[0].args['amount']
//               sent.toNumber().should.be.eq(initialSpends[0])
//               sent = paymentEvents[1].args['amount']
//               sent.toNumber().should.be.eq(initialSpends[1])
//             })
//           })
//
//           describe('the ApplicationException event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = paymentEvents[2].args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the CrowdsaleBuyTokensMock address', async () => {
//               let emittedAddr = paymentEvents[2].args['application_address']
//               emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//             })
//
//             it('should contain the error message \'UnderMinCap\'', async () => {
//               let message = paymentEvents[2].args['message']
//               hexStrEquals(message, 'UnderMinCap').should.be.eq(true)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].toNumber().should.be.eq(
//               initialSpends[0] + initialSpends[1]
//             )
//           })
//
//           it('should have 2 unique buyers', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(2)
//           })
//
//           describe('token balances', async () => {
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(
//                 (initialSpends[0] / startPrice) * (10 ** tokenDecimals)
//               )
//             })
//
//             it('should correctly store the second purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[1]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(
//                 (initialSpends[1] / startPrice) * (10 ** tokenDecimals)
//               )
//             })
//
//             it('should have a 0 balance for the third purchaser', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[2]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(0)
//             })
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = await getBalance(viewBalance, teamWallet)
//             teamBalance.should.be.eq(
//               initialSpends[0] + initialSpends[1]
//             )
//           })
//
//           describe('whitelist information', async () => {
//
//             it('should correctly update the first purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[0] - initialSpends[0])
//             })
//
//             it('should correctly update the second purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, purchaserList[1]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[1] - initialSpends[1])
//             })
//
//             it('should not have updated the third purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, purchaserList[2]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[2])
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[2])
//             })
//           })
//
//           it('should have the same token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(totalSupply)
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq(
//               ((initialSpends[0] + initialSpends[1]) / startPrice) * (10 ** tokenDecimals)
//             )
//           })
//         })
//
//         context('sender spent exactly their maximum spend amount', async () => {
//
//           it('should disallow further purchases from the same sender', async () => {
//
//             let invalidAmount = startPrice
//
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaserList[1], invalidAmount
//             ).should.be.fulfilled
//             invalidContext.should.not.eq('0x')
//
//             let invalidCalldata = await buyTokensUtil.buy.call(
//               invalidContext
//             ).should.be.fulfilled
//             invalidCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, invalidCalldata,
//               { from: exec, value: invalidAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(1)
//             let invalidEvent = events[0]
//
//             invalidEvent.event.should.be.eq('ApplicationException')
//             hexStrEquals(invalidEvent.args['message'], 'SpendAmountExceeded').should.be.eq(true)
//           })
//         })
//
//         context('sender did not spend over their maximum spend amount', async () => {
//
//           let newSendAmount
//           let newSendEvent
//
//           beforeEach(async () => {
//             newSendAmount = startPrice
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = await getBalance(viewBalance, teamWallet)
//             bal.should.be.eq(0)
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], newSendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             let purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: newSendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             newSendEvent = events[0]
//           })
//
//           it('should allow another purchase by the same sender', async () => {
//             newSendEvent.event.should.be.eq('DeliveredPayment')
//           })
//         })
//
//         describe('sender spending over their maximum spend amount', async () => {
//
//           let maxSpendAmount
//
//           let newSpendAmount
//           let newSpendEvent
//
//           beforeEach(async () => {
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = await getBalance(viewBalance, teamWallet)
//             bal.should.be.eq(0)
//
//             newSpendAmount = startPrice + (purchaserMaximums[0] - initialSpends[0])
//             maxSpendAmount = (purchaserMaximums[0] - initialSpends[0])
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], newSpendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             let purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: newSpendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             newSpendEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           describe('payment results', async () => {
//
//             it('should emit a DeliveredPayment event', async () => {
//               newSpendEvent.event.should.be.eq('DeliveredPayment')
//             })
//
//             describe('the DeliveredPayment event', async () => {
//
//               it('should match the execution ID', async () => {
//                 let emittedExecID = newSpendEvent.args['execution_id']
//                 emittedExecID.should.be.eq(executionID)
//               })
//
//               it('should match the team wallet destination address', async () => {
//                 let destination = newSpendEvent.args['destination']
//                 destination.should.be.eq(teamWallet)
//               })
//
//               it('should match the max spend amount', async () => {
//                 let sent = newSpendEvent.args['amount']
//                 sent.toNumber().should.be.eq(maxSpendAmount)
//               })
//             })
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(
//                 initialSpends[0] + initialSpends[1] + maxSpendAmount
//               )
//             })
//
//             it('should have 2 unique buyers', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(2)
//             })
//
//             describe('token balances', async () => {
//
//               it('should correctly store the initial purchaser\'s balance', async () => {
//                 let balanceInfo = await initCrowdsale.balanceOf.call(
//                   storage.address, executionID, purchaserList[0]
//                 ).should.be.fulfilled
//                 balanceInfo.toNumber().should.be.eq(
//                   ((initialSpends[0] + maxSpendAmount) / startPrice) * (10 ** tokenDecimals)
//                 )
//               })
//
//               it('should correctly store the second purchaser\'s balance', async () => {
//                 let balanceInfo = await initCrowdsale.balanceOf.call(
//                   storage.address, executionID, purchaserList[1]
//                 ).should.be.fulfilled
//                 balanceInfo.toNumber().should.be.eq(
//                   (initialSpends[1] / startPrice) * (10 ** tokenDecimals)
//                 )
//               })
//
//               it('should have a 0 balance for the third purchaser', async () => {
//                 let balanceInfo = await initCrowdsale.balanceOf.call(
//                   storage.address, executionID, purchaserList[2]
//                 ).should.be.fulfilled
//                 balanceInfo.toNumber().should.be.eq(0)
//               })
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = await getBalance(viewBalance, teamWallet)
//               teamBalance.should.be.eq(maxSpendAmount)
//             })
//
//             describe('whitelist information', async () => {
//
//               it('should correctly update the first purchaser\'s whitelist information', async () => {
//                 let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                   storage.address, executionID, purchaserList[0]
//                 ).should.be.fulfilled
//                 whitelistInfo.length.should.be.eq(2)
//                 whitelistInfo[0].toNumber().should.be.eq(0)
//                 whitelistInfo[1].toNumber().should.be.eq(0)
//               })
//
//               it('should not have updated the second purchaser\'s whitelist information', async () => {
//                 let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                   storage.address, executionID, purchaserList[1]
//                 ).should.be.fulfilled
//                 whitelistInfo.length.should.be.eq(2)
//                 whitelistInfo[0].toNumber().should.be.eq(0)
//                 whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[1] - initialSpends[1])
//               })
//
//               it('should not have updated the third purchaser\'s whitelist information', async () => {
//                 let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                   storage.address, executionID, purchaserList[2]
//                 ).should.be.fulfilled
//                 whitelistInfo.length.should.be.eq(2)
//                 whitelistInfo[0].toNumber().should.be.eq(purchaserMinimums[2])
//                 whitelistInfo[1].toNumber().should.be.eq(purchaserMaximums[2])
//               })
//             })
//
//             it('should have the same token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(totalSupply)
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(
//                 ((initialSpends[0] + initialSpends[1] + maxSpendAmount) / startPrice) * (10 ** tokenDecimals)
//               )
//             })
//           })
//
//           it('should disallow further purchases from the same sender', async () => {
//
//             let invalidAmount = startPrice
//
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], invalidAmount
//             ).should.be.fulfilled
//             invalidContext.should.not.eq('0x')
//
//             let invalidCalldata = await buyTokensUtil.buy.call(
//               invalidContext
//             ).should.be.fulfilled
//             invalidCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, invalidCalldata,
//               { from: exec, value: invalidAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(1)
//             let invalidEvent = events[0]
//
//             invalidEvent.event.should.be.eq('ApplicationException')
//             hexStrEquals(invalidEvent.args['message'], 'SpendAmountExceeded').should.be.eq(true)
//           })
//         })
//       })
//     })
//   })
//
//   describe('non-whitelist-enabled', async () => {
//
//     beforeEach(async () => {
//       let setWhitelistedCalldata = await buyTokensUtil.setSaleIsWhitelisted.call(false).should.be.fulfilled
//       setWhitelistedCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       events = await storage.exec(
//         adminMock.address, executionID, setWhitelistedCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime)
//     })
//
//     context('global minimum exists', async () => {
//
//       let initialPurchaseEvent
//       let nextPurchaseEvent
//       let invalidPurchaseEvent
//
//       let globalMin = 10 * oneToken // 10 token minimum purchase
//       let spendAmount =
//         (web3.toBigNumber(startPrice).times(web3.toBigNumber(globalMin))).div
//         (web3.toBigNumber(10 ** tokenDecimals))
//
//       beforeEach(async () => {
//
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         let updateMinCalldata = await buyTokensUtil.updateGlobalMin.call(
//           globalMin
//         ).should.be.fulfilled
//         updateMinCalldata.should.not.eq('0x')
//
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], spendAmount
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         let purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let invalidContext = await testUtils.getContext.call(
//           executionID, purchaserList[1], spendAmount.minus(1)
//         ).should.be.fulfilled
//         invalidContext.should.not.eq('0x')
//
//         let invalidCalldata = await buyTokensUtil.buy.call(
//           invalidContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           adminMock.address, executionID, updateMinCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: spendAmount }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         initialPurchaseEvent = events[0]
//         events[1].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: spendAmount }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         nextPurchaseEvent = events[0]
//         events[1].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, invalidCalldata,
//           { from: exec, value: spendAmount.minus(1) }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         invalidPurchaseEvent = events[0]
//       })
//
//       context('sender does not buy at least the global minimum token amount', async () => {
//
//         it('should emit an ApplicationException event', async () => {
//           invalidPurchaseEvent.event.should.be.eq('ApplicationException')
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the used execution id', async () => {
//             let emittedExecID = invalidPurchaseEvent.args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the BuyTokensMock address', async () => {
//             let emittedAppAddr = invalidPurchaseEvent.args['application_address']
//             emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'UnderMinCap\'', async () => {
//             let emittedMessage = invalidPurchaseEvent.args['message']
//             hexStrEquals(emittedMessage, 'UnderMinCap').should.be.eq(true)
//           })
//         })
//
//         describe('the resulting crowdsale storage', async () => {
//
//           it('should have an initialized crowdsale', async () => {
//             let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             saleInfo.length.should.be.eq(5)
//
//             saleInfo[0].should.be.bignumber.eq(spendAmount.times(2))
//             saleInfo[1].should.be.eq(teamWallet)
//             saleInfo[2].toNumber().should.be.eq(globalMin)
//             saleInfo[3].should.be.eq(true)
//             saleInfo[4].should.be.eq(false)
//           })
//
//           it('should have a correctly initialized token', async () => {
//             let tokenInfo = await initCrowdsale.getTokenInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             tokenInfo.length.should.be.eq(4)
//
//             hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//             hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//             tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//             tokenInfo[3].toNumber().should.be.eq(totalSupply)
//           })
//         })
//       })
//
//       context('sender has contributed before', async () => {
//
//         describe('payment results', async () => {
//
//           it('should emit a DeliveredPayment event', async () => {
//             nextPurchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = nextPurchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = nextPurchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the amount spent', async () => {
//               let sent = nextPurchaseEvent.args['amount']
//               sent.should.be.bignumber.eq(spendAmount)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].should.be.bignumber.eq(spendAmount.times(2))
//           })
//
//           it('should have 1 unique buyer', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(1)
//           })
//
//           describe('token balances', async () => {
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(globalMin * 2)
//             })
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = await getBalance(viewBalance, teamWallet)
//             teamBalance.should.be.eq(spendAmount.toNumber() * 2)
//           })
//
//           it('should have the same token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(totalSupply)
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq(globalMin * 2)
//           })
//         })
//       })
//
//       context('sender has not contributed before', async () => {
//
//         describe('payment results', async () => {
//
//           it('should emit a DeliveredPayment event', async () => {
//             initialPurchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = initialPurchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = initialPurchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the amount spent', async () => {
//               let sent = initialPurchaseEvent.args['amount']
//               sent.should.be.bignumber.eq(spendAmount)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].should.be.bignumber.eq(spendAmount.times(2))
//           })
//
//           it('should have 1 unique buyer', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(1)
//           })
//
//           describe('token balances', async () => {
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(globalMin * 2)
//             })
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = await getBalance(viewBalance, teamWallet)
//             teamBalance.should.be.eq(spendAmount.toNumber() * 2)
//           })
//
//           it('should have the same token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(totalSupply)
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq(globalMin * 2)
//           })
//         })
//       })
//     })
//
//     context('sender purchases all remaining tokens', async () => {
//
//       let remainingTokens = deepToNumber(web3.toWei('100', 'ether')) // 100 tokens remaining
//       let spendAmount = web3.toBigNumber((startPrice * remainingTokens) / (10 ** tokenDecimals)).plus(startPrice)
//       let purchaseCalldata
//       let purchaseEvent
//
//       beforeEach(async () => {
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         let clearTokensCalldata = await buyTokensUtil.setTokensRemaining(remainingTokens).should.be.fulfilled
//         clearTokensCalldata.should.not.eq('0x')
//
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], spendAmount
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           adminMock.address, executionID, clearTokensCalldata,
//           { from: exec, gasPrice: 0 }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: spendAmount, gasPrice: 0 }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         purchaseEvent = events[0]
//         events[1].event.should.be.eq('ApplicationExecution')
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit a DeliveredPayment event', async () => {
//           purchaseEvent.event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvent.args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvent.args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvent.args['amount']
//             sent.should.be.bignumber.eq(spendAmount.minus(startPrice))
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(spendAmount.minus(startPrice))
//         })
//
//         it('should have 1 unique buyer', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(1)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchaserList[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(remainingTokens)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(spendAmount.minus(startPrice).toNumber())
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//       })
//     })
//   })
// })
//
// contract('#DutchBuyTokens: price change tests - (various prices, 0 decimals)', function (accounts) {
//
//   let storage
//
//   let testUtils
//   let tokenConsoleUtil
//   let buyTokensUtil
//   let crowdsaleConsoleUtil
//   let viewBalance
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//
//   let teamWallet = accounts[3]
//
//   let initCrowdsaleMock
//   let adminMock
//   let crowdsaleBuyMock
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
//   let totalSupply = 1000000000 // 1 billion units in existence
//   let sellCap = 1000000000 // 1 billion units for sale
//   let startPrices = [
//     1000, // 1000 wei per token (1 token is [10 ** decimals] units)
//     1000000, // 1 million wei per token (1 token is [10 ** decimals] units)
//     2 // 2 wei per token
//   ]
//   let endPrices = [
//     750, // 1000 -> 750
//     1000, // 1 million -> 1000
//     1 // 2 -> 1
//   ]
//   let duration = 36000 // 10 hours
//   let isWhitelisted = false
//
//   let purchaseTimes
//
//   let tokenName = 'Token'
//   let tokenSymbol = 'TOK'
//   let tokenDecimals = 0
//
//   let purchasers = [
//     accounts[accounts.length - 1],
//     accounts[accounts.length - 2],
//     accounts[accounts.length - 3]
//   ]
//
//   before(async () => {
//
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
//     tokenConsoleUtil = await TokenConsoleUtils.new().should.be.fulfilled
//     buyTokensUtil = await BuyTokensUtil.new().should.be.fulfilled
//     viewBalance = await ViewBalance.new().should.be.fulfilled
//
//     crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled
//     adminMock = await AdminMockContract.new().should.be.fulfilled
//
//     initCrowdsale = await InitCrowdsaleMock.new().should.be.fulfilled
//     crowdsaleBuyMock = await CrowdsaleBuyTokensMock.new().should.be.fulfilled
//     crowdsaleConsole = await DutchCrowdsaleConsole.new().should.be.fulfilled
//     tokenConsole = await DutchTokenConsole.new().should.be.fulfilled
//     tokenTransfer = await DutchTokenTransfer.new().should.be.fulfilled
//     tokenTransferFrom = await DutchTokenTransferFrom.new().should.be.fulfilled
//     tokenApprove = await DutchTokenApprove.new().should.be.fulfilled
//
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//   })
//
//   beforeEach(async () => {
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//
//     // Reset crowdsale buy and crowdsale init contract times
//     await crowdsaleBuyMock.resetTime().should.be.fulfilled
//     let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//     storedTime.toNumber().should.be.eq(0)
//     await initCrowdsale.resetTime().should.be.fulfilled
//     storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//     storedTime.toNumber().should.be.eq(0)
//
//     startTime = getTime() + 3600
//     purchaseTimes = [
//       startTime, // near the start
//       startTime + (duration / 2), // in the middle
//       startTime + duration - 1 // near the end
//     ]
//
//     initCalldata = await testUtils.init.call(
//       teamWallet, totalSupply, sellCap, startPrices[0], endPrices[0],
//       duration, startTime, isWhitelisted, crowdsaleAdmin
//     ).should.be.fulfilled
//     initCalldata.should.not.eq('0x')
//
//     let events = await storage.initAndFinalize(
//       updater, true, initCrowdsale.address, initCalldata, [
//         crowdsaleBuyMock.address, crowdsaleConsole.address, tokenConsole.address,
//         tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address,
//         adminMock.address
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
//     let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken.call(
//       tokenName, tokenSymbol, tokenDecimals, adminContext
//     ).should.be.fulfilled
//     initTokenCalldata.should.not.eq('0x')
//
//     events = await storage.exec(
//       crowdsaleConsole.address, executionID, initTokenCalldata,
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(1)
//     events[0].event.should.be.eq('ApplicationExecution')
//
//     let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//       adminContext
//     ).should.be.fulfilled
//     initCrowdsaleCalldata.should.not.eq('0x')
//
//     events = await storage.exec(
//       crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(1)
//     events[0].event.should.be.eq('ApplicationExecution')
//   })
//
//   describe('pre-test-storage', async() => {
//
//     it('should be an initialized crowdsale', async () => {
//       let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       saleInfo.length.should.be.eq(5)
//
//       saleInfo[0].toNumber().should.be.eq(0)
//       saleInfo[1].should.be.eq(teamWallet)
//       saleInfo[2].toNumber().should.be.eq(0)
//       saleInfo[3].should.be.eq(true)
//       saleInfo[4].should.be.eq(false)
//     })
//
//     it('should have a correctly initialized token', async () => {
//       let tokenInfo = await initCrowdsale.getTokenInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tokenInfo.length.should.be.eq(4)
//
//       hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//       hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//       tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//       tokenInfo[3].toNumber().should.be.eq(totalSupply)
//     })
//   })
//
//   describe('Prices 1 - (normal distribution)', async () => {
//
//     beforeEach(async () => {
//       let setPricesCalldata = await buyTokensUtil.setStartAndEndPrices.call(
//         startPrices[0], endPrices[0]
//       ).should.be.fulfilled
//       setPricesCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         adminMock.address, executionID, setPricesCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//     })
//
//     describe('near the beginning', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice = startPrices[0]
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[0]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[0])
//         await initCrowdsale.setTime(purchaseTimes[0]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[0])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[0])
//         statusInfo[1].toNumber().should.be.eq(endPrices[0])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//
//     describe('near the middle', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[0] - Math.floor((startPrices[0] - endPrices[0]) / 2)
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[1]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[1])
//         await initCrowdsale.setTime(purchaseTimes[1]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[1])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[0])
//         statusInfo[1].toNumber().should.be.eq(endPrices[0])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration / 2)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//
//     describe('near the end', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[0] - Math.floor(
//             (startPrices[0] - endPrices[0]) * ((duration - 1) / duration)
//           )
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[2]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[2])
//         await initCrowdsale.setTime(purchaseTimes[2]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[2])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[0])
//         statusInfo[1].toNumber().should.be.eq(endPrices[0])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(1)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//   })
//
//   describe('Prices 2 - (steep distribution)', async () => {
//
//     beforeEach(async () => {
//       let setPricesCalldata = await buyTokensUtil.setStartAndEndPrices.call(
//         startPrices[1], endPrices[1]
//       ).should.be.fulfilled
//       setPricesCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         adminMock.address, executionID, setPricesCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//     })
//
//     describe('near the beginning', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice = startPrices[1]
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[0]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[0])
//         await initCrowdsale.setTime(purchaseTimes[0]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[0])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[1])
//         statusInfo[1].toNumber().should.be.eq(endPrices[1])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//
//     describe('near the middle', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[1] - Math.floor((startPrices[1] - endPrices[1]) / 2)
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[1]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[1])
//         await initCrowdsale.setTime(purchaseTimes[1]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[1])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[1])
//         statusInfo[1].toNumber().should.be.eq(endPrices[1])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration / 2)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//
//     describe('near the end', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[1] - Math.floor(
//             (startPrices[1] - endPrices[1]) * ((duration - 1) / duration)
//           )
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[2]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[2])
//         await initCrowdsale.setTime(purchaseTimes[2]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[2])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[1])
//         statusInfo[1].toNumber().should.be.eq(endPrices[1])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(1)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//   })
//
//   describe('Prices 3 - (flat distribution)', async () => {
//
//     beforeEach(async () => {
//       let setPricesCalldata = await buyTokensUtil.setStartAndEndPrices.call(
//         startPrices[2], endPrices[2]
//       ).should.be.fulfilled
//       setPricesCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         adminMock.address, executionID, setPricesCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//     })
//
//     describe('near the beginning', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice = startPrices[2]
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[0]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[0])
//         await initCrowdsale.setTime(purchaseTimes[0]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[0])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[2])
//         statusInfo[1].toNumber().should.be.eq(endPrices[2])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//
//     describe('near the middle', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[2] - Math.floor((startPrices[2] - endPrices[2]) / 2)
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[1]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[1])
//         await initCrowdsale.setTime(purchaseTimes[1]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[1])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[2])
//         statusInfo[1].toNumber().should.be.eq(endPrices[2])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration / 2)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//
//     describe('near the end', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[2] - Math.floor(
//             (startPrices[2] - endPrices[2]) * ((duration - 1) / duration)
//           )
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice * 2,
//           expectedCurrentPrice - 1
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[2]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[2])
//         await initCrowdsale.setTime(purchaseTimes[2]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(purchaseTimes[2])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events, and 1 ApplicationException event', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('ApplicationException')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.toNumber().should.be.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.toNumber().should.be.eq(amounts[1])
//           })
//         })
//
//         describe('the ApplicationException event', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the CrowdsaleBuyTokensMock address', async () => {
//             let emittedAddr = purchaseEvents[2].args['application_address']
//             emittedAddr.should.be.eq(crowdsaleBuyMock.address)
//           })
//
//           it('should contain the error message \'InvalidPurchaseAmount\'', async () => {
//             let message = purchaseEvents[2].args['message']
//             hexStrEquals(message, 'InvalidPurchaseAmount').should.be.eq(true)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[0] / expectedCurrentPrice))
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(Math.floor(amounts[1] / expectedCurrentPrice))
//           })
//
//           it('should have a 0 balance for the third purchaser', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(0)
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0] + amounts[1]
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice))
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].toNumber().should.be.eq(startPrices[2])
//         statusInfo[1].toNumber().should.be.eq(endPrices[2])
//         statusInfo[2].toNumber().should.be.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(1)
//         statusInfo[5].toNumber().should.be.eq(
//           sellCap - Math.floor((amounts[0] + amounts[1]) / expectedCurrentPrice)
//         )
//       })
//     })
//   })
// })
//
// contract('#DutchBuyTokens: price change tests - (various prices, 18 decimals)', function (accounts) {
//
//   let storage
//
//   let testUtils
//   let tokenConsoleUtil
//   let buyTokensUtil
//   let crowdsaleConsoleUtil
//   let viewBalance
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//
//   let teamWallet = accounts[3]
//
//   let initCrowdsaleMock
//   let adminMock
//   let crowdsaleBuyMock
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
//   let totalSupply = web3.toBigNumber(web3.toWei('1000000000', 'ether')) // 1 billion tokens in existence
//   let sellCap = web3.toBigNumber(web3.toWei('1000000000', 'ether')) // 1 billion tokens for sale
//   let startPrices = [
//     web3.toBigNumber(web3.toWei('0.000001', 'ether')), // 0.000001 eth per token (1 token is [10 ** decimals] units)
//     web3.toBigNumber(web3.toWei('0.001', 'ether')), // 0.001 eth per token (1 token is [10 ** decimals] units)
//     web3.toBigNumber(web3.toWei('0.001001', 'ether')) // 0.001001 eth per token
//   ]
//   let endPrices = [
//     web3.toBigNumber(web3.toWei('0.00000075', 'ether')), // 0.000001 -> 0.00000075
//     web3.toBigNumber(web3.toWei('0.000001', 'ether')), // 0.001 -> 0.000001
//     web3.toBigNumber(web3.toWei('0.001', 'ether')) // 0.001001 -> 0.001
//   ]
//   let duration = 36000 // 10 hours
//   let isWhitelisted = false
//
//   let purchaseTimes
//
//   let tokenName = 'Token'
//   let tokenSymbol = 'TOK'
//   let tokenDecimals = 18
//   let unitPrice = web3.toBigNumber(web3.toWei('1', 'ether'))
//
//   let purchasers = [
//     accounts[accounts.length - 1],
//     accounts[accounts.length - 2],
//     accounts[accounts.length - 3]
//   ]
//
//   before(async () => {
//
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
//     tokenConsoleUtil = await TokenConsoleUtils.new().should.be.fulfilled
//     buyTokensUtil = await BuyTokensUtil.new().should.be.fulfilled
//     viewBalance = await ViewBalance.new().should.be.fulfilled
//
//     crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled
//     adminMock = await AdminMockContract.new().should.be.fulfilled
//
//     initCrowdsale = await InitCrowdsaleMock.new().should.be.fulfilled
//     crowdsaleBuyMock = await CrowdsaleBuyTokensMock.new().should.be.fulfilled
//     crowdsaleConsole = await DutchCrowdsaleConsole.new().should.be.fulfilled
//     tokenConsole = await DutchTokenConsole.new().should.be.fulfilled
//     tokenTransfer = await DutchTokenTransfer.new().should.be.fulfilled
//     tokenTransferFrom = await DutchTokenTransferFrom.new().should.be.fulfilled
//     tokenApprove = await DutchTokenApprove.new().should.be.fulfilled
//
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//   })
//
//   beforeEach(async () => {
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = await getBalance(viewBalance, teamWallet)
//     bal.should.be.eq(0)
//
//     // Reset crowdsale buy and crowdsale init contract times
//     await crowdsaleBuyMock.resetTime().should.be.fulfilled
//     let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//     storedTime.toNumber().should.be.eq(0)
//     await initCrowdsale.resetTime().should.be.fulfilled
//     storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//     storedTime.toNumber().should.be.eq(0)
//
//     startTime = getTime() + 3600
//     purchaseTimes = [
//       startTime, // near the start
//       startTime + (duration / 2), // in the middle
//       startTime + duration - 1 // near the end
//     ]
//
//     initCalldata = await testUtils.init.call(
//       teamWallet, totalSupply, sellCap, startPrices[0], endPrices[0],
//       duration, startTime, isWhitelisted, crowdsaleAdmin
//     ).should.be.fulfilled
//     initCalldata.should.not.eq('0x')
//
//     let events = await storage.initAndFinalize(
//       updater, true, initCrowdsale.address, initCalldata, [
//         crowdsaleBuyMock.address, crowdsaleConsole.address, tokenConsole.address,
//         tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address,
//         adminMock.address
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
//     let initTokenCalldata = await crowdsaleConsoleUtil.initCrowdsaleToken.call(
//       tokenName, tokenSymbol, tokenDecimals, adminContext
//     ).should.be.fulfilled
//     initTokenCalldata.should.not.eq('0x')
//
//     events = await storage.exec(
//       crowdsaleConsole.address, executionID, initTokenCalldata,
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(1)
//     events[0].event.should.be.eq('ApplicationExecution')
//
//     let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//       adminContext
//     ).should.be.fulfilled
//     initCrowdsaleCalldata.should.not.eq('0x')
//
//     events = await storage.exec(
//       crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//       { from: exec }
//     ).then((tx) => {
//       return tx.logs
//     })
//     events.should.not.eq(null)
//     events.length.should.be.eq(1)
//     events[0].event.should.be.eq('ApplicationExecution')
//   })
//
//   describe('pre-test-storage', async() => {
//
//     it('should be an initialized crowdsale', async () => {
//       let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       saleInfo.length.should.be.eq(5)
//
//       saleInfo[0].toNumber().should.be.eq(0)
//       saleInfo[1].should.be.eq(teamWallet)
//       saleInfo[2].toNumber().should.be.eq(0)
//       saleInfo[3].should.be.eq(true)
//       saleInfo[4].should.be.eq(false)
//     })
//
//     it('should have a correctly initialized token', async () => {
//       let tokenInfo = await initCrowdsale.getTokenInfo.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tokenInfo.length.should.be.eq(4)
//
//       hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//       hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//       tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
//       tokenInfo[3].should.be.bignumber.eq(totalSupply)
//     })
//   })
//
//   describe('Prices 1 - (normal distribution)', async () => {
//
//     beforeEach(async () => {
//       let setPricesCalldata = await buyTokensUtil.setStartAndEndPrices.call(
//         startPrices[0], endPrices[0]
//       ).should.be.fulfilled
//       setPricesCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         adminMock.address, executionID, setPricesCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//     })
//
//     describe('near the beginning', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice = startPrices[0]
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           expectedCurrentPrice.div(2)
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[0]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[0])
//         await initCrowdsale.setTime(purchaseTimes[0]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[0])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[0])
//         statusInfo[1].should.be.bignumber.eq(endPrices[0])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         )
//       })
//     })
//
//     describe('near the middle', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[0].minus(startPrices[0].minus(endPrices[0]).div(2))
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           expectedCurrentPrice.div(2)
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[1]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[1])
//         await initCrowdsale.setTime(purchaseTimes[1]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[1])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[0])
//         statusInfo[1].should.be.bignumber.eq(endPrices[0])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration / 2)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         )
//       })
//     })
//
//     describe('near the end', async () => {
//
//       let expectedCurrentPrice
//       let optionTwo
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//
//         expectedCurrentPrice =
//           startPrices[0].minus(
//             startPrices[0].minus(endPrices[0])
//               .times(web3.toBigNumber((duration - 1) / duration))
//               .toFixed(0, 1)
//           )
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           web3.toBigNumber(expectedCurrentPrice.div(2).toFixed(0, 1))
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[2]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[2])
//         await initCrowdsale.setTime(purchaseTimes[2]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[2])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         let message = events[0].args['message']
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[0])
//         statusInfo[1].should.be.bignumber.eq(endPrices[0])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(1)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//           )
//         )
//       })
//     })
//   })
//
//   describe('Prices 2 - (steep distribution)', async () => {
//
//     beforeEach(async () => {
//       let setPricesCalldata = await buyTokensUtil.setStartAndEndPrices.call(
//         startPrices[1], endPrices[1]
//       ).should.be.fulfilled
//       setPricesCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         adminMock.address, executionID, setPricesCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//     })
//
//     describe('near the beginning', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice = startPrices[1]
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           expectedCurrentPrice.div(2)
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[0]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[0])
//         await initCrowdsale.setTime(purchaseTimes[0]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[0])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[1])
//         statusInfo[1].should.be.bignumber.eq(endPrices[1])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         )
//       })
//     })
//
//     describe('near the middle', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[1].minus(startPrices[1].minus(endPrices[1]).div(2))
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           expectedCurrentPrice.div(2)
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[1]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[1])
//         await initCrowdsale.setTime(purchaseTimes[1]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[1])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[1])
//         statusInfo[1].should.be.bignumber.eq(endPrices[1])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration / 2)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         )
//       })
//     })
//
//     describe('near the end', async () => {
//
//       let expectedCurrentPrice
//       let optionTwo
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//
//         expectedCurrentPrice =
//           startPrices[1].minus(
//             startPrices[1].minus(endPrices[1])
//               .times(web3.toBigNumber((duration - 1) / duration))
//               .toFixed(0, 1)
//           )
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           web3.toBigNumber(expectedCurrentPrice.div(2).toFixed(0, 1))
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[2]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[2])
//         await initCrowdsale.setTime(purchaseTimes[2]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[2])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         let message = events[0].args['message']
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[1])
//         statusInfo[1].should.be.bignumber.eq(endPrices[1])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(1)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//           )
//         )
//       })
//     })
//   })
//
//   describe('Prices 3 - (flat distribution)', async () => {
//
//     beforeEach(async () => {
//       let setPricesCalldata = await buyTokensUtil.setStartAndEndPrices.call(
//         startPrices[2], endPrices[2]
//       ).should.be.fulfilled
//       setPricesCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         adminMock.address, executionID, setPricesCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//     })
//
//     describe('near the beginning', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice = startPrices[2]
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           expectedCurrentPrice.div(2)
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[0]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[0])
//         await initCrowdsale.setTime(purchaseTimes[0]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[0])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[2])
//         statusInfo[1].should.be.bignumber.eq(endPrices[2])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         )
//       })
//     })
//
//     describe('near the middle', async () => {
//
//       let expectedCurrentPrice
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//         expectedCurrentPrice =
//           startPrices[2].minus(startPrices[2].minus(endPrices[2]).div(2))
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           expectedCurrentPrice.div(2)
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[1]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[1])
//         await initCrowdsale.setTime(purchaseTimes[1]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[1])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[2])
//         statusInfo[1].should.be.bignumber.eq(endPrices[2])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(duration / 2)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice)
//           )
//         )
//       })
//     })
//
//     describe('near the end', async () => {
//
//       let expectedCurrentPrice
//       let optionTwo
//
//       let purchaseCalldata
//       let purchaseEvents
//
//       let amounts = []
//
//       beforeEach(async () => {
//
//         expectedCurrentPrice =
//           startPrices[2].minus(
//             startPrices[2].minus(endPrices[2])
//               .times(web3.toBigNumber((duration - 1) / duration))
//               .toFixed(0, 1)
//           )
//
//         amounts = [
//           expectedCurrentPrice,
//           expectedCurrentPrice.times(2),
//           web3.toBigNumber(expectedCurrentPrice.div(2).toFixed(0, 1))
//         ]
//
//         purchaseEvents = []
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = await getBalance(viewBalance, teamWallet)
//         bal.should.be.eq(0)
//
//         await crowdsaleBuyMock.setTime(purchaseTimes[2]).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[2])
//         await initCrowdsale.setTime(purchaseTimes[2]).should.be.fulfilled
//         storedTime = await initCrowdsale.set_time.call().should.be.fulfilled
//         storedTime.should.be.bignumber.eq(purchaseTimes[2])
//
//         // First purchase, account 0; amount 0
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[0], amounts[0]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[0] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Second purchase, account 1; amount 1
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[1], amounts[1]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[1] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//
//         // Third purchase, account 2; amount 2
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchasers[2], amounts[2]
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         purchaseCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         purchaseCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, purchaseCalldata,
//           { from: exec, value: amounts[2] }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         let message = events[0].args['message']
//         events.length.should.be.eq(2)
//         events[1].event.should.be.eq('ApplicationExecution')
//         purchaseEvents.push(events[0])
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 3 DeliveredPayment events', async () => {
//           purchaseEvents[0].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[1].event.should.be.eq('DeliveredPayment')
//           purchaseEvents[2].event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = purchaseEvents[0].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[1].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = purchaseEvents[2].args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = purchaseEvents[0].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[1].args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = purchaseEvents[2].args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the amount spent', async () => {
//             let sent = purchaseEvents[0].args['amount']
//             sent.should.be.bignumber.eq(amounts[0])
//             sent = purchaseEvents[1].args['amount']
//             sent.should.be.bignumber.eq(amounts[1])
//             sent = purchaseEvents[2].args['amount']
//             sent.should.be.bignumber.eq(amounts[2])
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//           )
//         })
//
//         it('should have 3 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(3)
//         })
//
//         describe('token balances', async () => {
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[0]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[0].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the second purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[1]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[1].times(unitPrice).div(expectedCurrentPrice)
//             )
//           })
//
//           it('should correctly store the third purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchasers[2]
//             ).should.be.fulfilled
//             balanceInfo.should.be.bignumber.eq(
//               amounts[2].times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//             )
//           })
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = await getBalance(viewBalance, teamWallet)
//           teamBalance.should.be.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2]).toNumber()
//           )
//         })
//
//         it('should have the same token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.should.be.bignumber.eq(totalSupply)
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.should.be.bignumber.eq(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//           )
//         })
//       })
//
//       it('should have the correct start and end times', async () => {
//         let timeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         timeInfo.length.should.be.eq(2)
//         timeInfo[0].toNumber().should.be.eq(startTime)
//         timeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//
//       it('should correctly calculate the rate in InitCrowdsale', async () => {
//         let statusInfo = await initCrowdsale.getCrowdsaleStatus.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         statusInfo.length.should.be.eq(6)
//
//         statusInfo[0].should.be.bignumber.eq(startPrices[2])
//         statusInfo[1].should.be.bignumber.eq(endPrices[2])
//         statusInfo[2].should.be.bignumber.eq(expectedCurrentPrice)
//         statusInfo[3].toNumber().should.be.eq(duration)
//         statusInfo[4].toNumber().should.be.eq(1)
//         statusInfo[5].should.be.bignumber.eq(
//           sellCap.minus(
//             amounts[0].plus(amounts[1]).plus(amounts[2])
//               .times(unitPrice).div(expectedCurrentPrice).toFixed(0, 1)
//           )
//         )
//       })
//     })
//   })
// })
