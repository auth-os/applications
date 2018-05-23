// // Abstract storage contract
// let AbstractStorage = artifacts.require('./AbstractStorage')
// // MintedCappedCrowdsale
// let InitMintedCapped = artifacts.require('./InitCrowdsale')
// // let MintedCappedBuy = artifacts.require('./CrowdsaleBuyTokens')
// let MintedCappedCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
// let MintedCappedTokenConsole = artifacts.require('./TokenConsole')
// let MintedCappedTokenTransfer = artifacts.require('./TokenTransfer')
// let MintedCappedTokenTransferFrom = artifacts.require('./TokenTransferFrom')
// let MintedCappedTokenApprove = artifacts.require('./TokenApprove')
// // Utils
// let TestUtils = artifacts.require('./TestUtils')
// let TokenConsoleUtils = artifacts.require('./TokenConsoleUtils')
// let CrowdsaleConsoleUtils = artifacts.require('./CrowdsaleConsoleUtils')
// let BuyTokensUtil = artifacts.require('./BuyTokensUtil')
// // Mock
// let CrowdsaleBuyTokensMock = artifacts.require('./CrowdsaleBuyTokensMock')
// let AdminMockContract = artifacts.require('./MockAdminContract')
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
// contract('#MintedCappedBuyTokens', function (accounts) {
//
//   let storage
//   let testUtils
//   let tokenConsoleUtil
//   let buyTokensUtil
//
//   let crowdsaleConsoleUtil
//   let adminMock
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//
//   let teamWallet = accounts[3]
//   let teamWalletInitBalance
//   let execInitBalance
//
//   let initCrowdsale
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
//   let initialTierName = 'Initial Tier'
//   let initialTierPrice = 1 // 1 wei per 1 token
//   let initialTierDuration = 3600 // 1 hour
//   let initialTierTokenSellCap = 1000000 // 1 million tokens for sale in first tier
//   let initialTierIsWhitelisted = false
//   let initialTierDurIsModifiable = true
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
//   let tierNames = ['Tier 1', 'Tier 2', 'Tier 3']
//   let tierDurations = [10000, 20000, 30000]
//   let tierPrices = [10, 100, 1000] // 10, 100, and 1000 wei per 1 token
//   let tierCaps = [100000, 10000, 1000] // 100000, 10000, and 1000 tokens for sale
//   let tierModStats = [true, true, true] // All tier durations are modifiable
//   let tierWhitelistStats = [true, false, true] // Only Tier 0 and Tier 2 are not whitelisted
//
//   before(async () => {
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = web3.eth.getBalance(teamWallet).toNumber()
//     bal.should.be.eq(0)
//
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
//     tokenConsoleUtil = await TokenConsoleUtils.new().should.be.fulfilled
//     buyTokensUtil = await BuyTokensUtil.new().should.be.fulfilled
//
//     crowdsaleConsoleUtil = await CrowdsaleConsoleUtils.new().should.be.fulfilled
//     adminMock = await AdminMockContract.new().should.be.fulfilled
//
//     initCrowdsale = await InitMintedCapped.new().should.be.fulfilled
//     crowdsaleBuyMock = await CrowdsaleBuyTokensMock.new().should.be.fulfilled
//     crowdsaleConsole = await MintedCappedCrowdsaleConsole.new().should.be.fulfilled
//     tokenConsole = await MintedCappedTokenConsole.new().should.be.fulfilled
//     tokenTransfer = await MintedCappedTokenTransfer.new().should.be.fulfilled
//     tokenTransferFrom = await MintedCappedTokenTransferFrom.new().should.be.fulfilled
//     tokenApprove = await MintedCappedTokenApprove.new().should.be.fulfilled
//   })
//
//   beforeEach(async () => {
//     // Transfer funds from teamWallet to exec
//     sendBalanceTo(teamWallet, exec)
//     let bal = web3.eth.getBalance(teamWallet).toNumber()
//     bal.should.be.eq(0)
//
//     startTime = getTime() + 3600
//     teamWalletInitBalance = web3.eth.getBalance(teamWallet).toNumber()
//     execInitBalance = web3.eth.getBalance(exec).toNumber()
//
//     initCalldata = await testUtils.init.call(
//       teamWallet, startTime, initialTierName, initialTierPrice,
//       initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
//       initialTierDurIsModifiable, crowdsaleAdmin
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
//       let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//       let tokenInfo = await initCrowdsale.getTokenInfo(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tokenInfo.length.should.be.eq(4)
//
//       hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//       hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//       tokenInfo[2].toNumber().should.be.eq(0)
//       tokenInfo[3].toNumber().should.be.eq(0)
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
//       invalidContext = await testUtils.getContext(
//         executionID, purchaserList[0], 0
//       ).should.be.fulfilled
//       invalidContext.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy(
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
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//         let tokenInfo = await initCrowdsale.getTokenInfo(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(0)
//         tokenInfo[3].toNumber().should.be.eq(0)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//         curTeamBalance.should.be.eq(teamWalletInitBalance)
//       })
//     })
//   })
//
//   describe('crowdsale is not initialized', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = 1000
//
//     beforeEach(async () => {
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime + 1).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + 1)
//
//       let purchaseContext = await testUtils.getContext(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy(
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
//       it('should contain the error message \'CrowdsaleInvalidState\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleInvalidState').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an uninitialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//         let tokenInfo = await initCrowdsale.getTokenInfo(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(0)
//         tokenInfo[3].toNumber().should.be.eq(0)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//         curTeamBalance.should.be.eq(teamWalletInitBalance)
//       })
//     })
//   })
//
//   describe('crowdsale is already finalized', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = 1000
//
//     beforeEach(async () => {
//       // Fast-forward to start time
//       await crowdsaleBuyMock.setTime(startTime + 1).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + 1)
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let finalizeCalldata = await crowdsaleConsoleUtil.finalizeCrowdsale(
//         adminContext
//       ).should.be.fulfilled
//       finalizeCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy(
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
//       it('should contain the error message \'CrowdsaleInvalidState\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'CrowdsaleInvalidState').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized and finalized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//         let tokenInfo = await initCrowdsale.getTokenInfo(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(0)
//         tokenInfo[3].toNumber().should.be.eq(0)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//         curTeamBalance.should.be.eq(teamWalletInitBalance)
//       })
//     })
//   })
//
//   describe('crowdsale has not started', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = 1000
//
//     beforeEach(async () => {
//
//       let purchaseContext = await testUtils.getContext(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy(
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
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//         let tokenInfo = await initCrowdsale.getTokenInfo(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(0)
//         tokenInfo[3].toNumber().should.be.eq(0)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//         curTeamBalance.should.be.eq(teamWalletInitBalance)
//       })
//     })
//   })
//
//   describe('crowdsale has already ended', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = 1000
//
//     context('current stored tier is beyond tier list range', async () => {
//
//       beforeEach(async () => {
//         let advanceCalldata = await buyTokensUtil.advanceToTier(2).should.be.fulfilled
//         advanceCalldata.should.not.eq('0x')
//
//         let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
//           adminContext
//         ).should.be.fulfilled
//         initCrowdsaleCalldata.should.not.eq('0x')
//
//         let purchaseContext = await testUtils.getContext(
//           executionID, purchaserList[0], valueSent
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         invalidCalldata = await buyTokensUtil.buy(
//           purchaseContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           adminMock.address, executionID, advanceCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, invalidCalldata,
//           { from: exec }
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
//         it('should contain the error message \'CrowdsaleFinished\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//         })
//       })
//
//       describe('the resulting crowdsale storage', async () => {
//
//         it('should have an initialized crowdsale', async () => {
//           let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//           let tokenInfo = await initCrowdsale.getTokenInfo(
//             storage.address, executionID
//           ).should.be.fulfilled
//           tokenInfo.length.should.be.eq(4)
//
//           hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//           hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//           tokenInfo[2].toNumber().should.be.eq(0)
//           tokenInfo[3].toNumber().should.be.eq(0)
//         })
//
//         it('should currently be on tier 1 in storage', async () => {
//           let curTierInfo = await initCrowdsale.getCurrentTierInfo(
//             storage.address, executionID
//           ).should.be.fulfilled
//           curTierInfo.length.should.be.eq(7)
//
//           web3.toDecimal(curTierInfo[0]).should.be.eq(0)
//           curTierInfo[1].toNumber().should.be.eq(1)
//           curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
//           curTierInfo[3].toNumber().should.be.eq(initialTierTokenSellCap)
//           curTierInfo[4].toNumber().should.be.eq(0)
//           curTierInfo[5].should.be.eq(false)
//           curTierInfo[6].should.be.eq(false)
//         })
//
//         it('should have an unchanged team wallet balance', async () => {
//           let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//           curTeamBalance.should.be.eq(teamWalletInitBalance)
//         })
//       })
//     })
//
//     context('current time is beyond end crowdsale time', async () => {
//
//       beforeEach(async () => {
//
//         // Fast-forward to start time
//         await crowdsaleBuyMock.setTime(startTime + initialTierDuration + 1).should.be.fulfilled
//         let storedTime = await crowdsaleBuyMock.set_time().should.be.fulfilled
//         storedTime.toNumber().should.be.eq(startTime + initialTierDuration + 1)
//
//         let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
//           adminContext
//         ).should.be.fulfilled
//         initCrowdsaleCalldata.should.not.eq('0x')
//
//         let purchaseContext = await testUtils.getContext(
//           executionID, purchaserList[0], valueSent
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         invalidCalldata = await buyTokensUtil.buy(
//           purchaseContext
//         ).should.be.fulfilled
//         invalidCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//           { from: exec }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         events[0].event.should.be.eq('ApplicationExecution')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, invalidCalldata,
//           { from: exec }
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
//         it('should contain the error message \'CrowdsaleFinished\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'CrowdsaleFinished').should.be.eq(true)
//         })
//       })
//
//       describe('the resulting crowdsale storage', async () => {
//
//         it('should have an initialized crowdsale', async () => {
//           let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//           let tokenInfo = await initCrowdsale.getTokenInfo(
//             storage.address, executionID
//           ).should.be.fulfilled
//           tokenInfo.length.should.be.eq(4)
//
//           hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//           hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//           tokenInfo[2].toNumber().should.be.eq(0)
//           tokenInfo[3].toNumber().should.be.eq(0)
//         })
//
//         it('should have an unchanged team wallet balance', async () => {
//           let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//           curTeamBalance.should.be.eq(teamWalletInitBalance)
//         })
//       })
//     })
//   })
//
//   describe('tier has sold out', async () => {
//
//     let invalidCalldata
//     let invalidEvent
//
//     let valueSent = 1000
//
//     beforeEach(async () => {
//       // Fast-forward to crowdsale start
//       await crowdsaleBuyMock.setTime(startTime + 1).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + 1)
//
//       let clearTokensCalldata = await buyTokensUtil.setTierTokensRemaining(0).should.be.fulfilled
//       clearTokensCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let purchaseContext = await testUtils.getContext(
//         executionID, purchaserList[0], valueSent
//       ).should.be.fulfilled
//       purchaseContext.should.not.eq('0x')
//
//       invalidCalldata = await buyTokensUtil.buy(
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
//       it('should contain the error message \'TierSoldOut\'', async () => {
//         let emittedMessage = invalidEvent.args['message']
//         hexStrEquals(emittedMessage, 'TierSoldOut').should.be.eq(true)
//       })
//     })
//
//     describe('the resulting crowdsale storage', async () => {
//
//       it('should have an initialized crowdsale', async () => {
//         let saleInfo = await initCrowdsale.getCrowdsaleInfo(
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
//         let tokenInfo = await initCrowdsale.getTokenInfo(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//
//         hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//         hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//         tokenInfo[2].toNumber().should.be.eq(0)
//         tokenInfo[3].toNumber().should.be.eq(0)
//       })
//
//       it('should have no tokens remaining in the current tier', async () => {
//         let curTierInfo = await initCrowdsale.getCurrentTierInfo(
//           storage.address, executionID
//         ).should.be.fulfilled
//         curTierInfo.length.should.be.eq(7)
//
//         hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
//         curTierInfo[1].toNumber().should.be.eq(0)
//         curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
//         curTierInfo[3].toNumber().should.be.eq(0)
//         curTierInfo[4].toNumber().should.be.eq(initialTierPrice)
//         curTierInfo[5].should.be.eq(initialTierDurIsModifiable)
//         curTierInfo[6].should.be.eq(initialTierIsWhitelisted)
//       })
//
//       it('should have an unchanged team wallet balance', async () => {
//         let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//         curTeamBalance.should.be.eq(teamWalletInitBalance)
//       })
//     })
//   })
//
//   describe('whitelist-enabled-tier', async () => {
//
//     let whitelistTier = 1
//
//     beforeEach(async () => {
//       // Create tiers
//       let createTiersCalldata = await crowdsaleConsoleUtil.createCrowdsaleTiers.call(
//         tierNames, tierDurations, tierPrices, tierCaps, tierModStats, tierWhitelistStats, adminContext
//       ).should.be.fulfilled
//       createTiersCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, createTiersCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tierListInfo.length.should.be.eq(4)
//
//       events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       // Fast-forward to tier 1 start time (tier 1 is whitelisted)
//       await crowdsaleBuyMock.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)
//     })
//
//     context('sender is not whitelisted', async () => {
//
//       let invalidCalldata
//       let invalidEvent
//
//       let valueSent = 1000
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
//         it('should contain the error message \'InvalidSpendAmount\'', async () => {
//           let emittedMessage = invalidEvent.args['message']
//           hexStrEquals(emittedMessage, 'InvalidSpendAmount').should.be.eq(true)
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
//           tokenInfo[2].toNumber().should.be.eq(0)
//           tokenInfo[3].toNumber().should.be.eq(0)
//         })
//
//         it('should have an unchanged team wallet balance', async () => {
//           let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//           curTeamBalance.should.be.eq(teamWalletInitBalance)
//         })
//       })
//     })
//
//     context('sender is whitelisted', async () => {
//
//       let purchaser = [purchaserList[0]]
//       let purchaserMinimum = [100] // Must buy minimum of 100 tokens (tier 1 price is 10 wei/token)
//       let purchaserMaximum = [10000] // Can spend maximum of 10000 wei
//
//       beforeEach(async () => {
//         let whitelistCalldata = await crowdsaleConsoleUtil.whitelistMultiForTier.call(
//           whitelistTier, purchaser, purchaserMinimum, purchaserMaximum, adminContext
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
//         it('should have correctly whitelisted the purchaser', async () => {
//           let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//             storage.address, executionID, whitelistTier, purchaser
//           ).should.be.fulfilled
//           whitelistInfo.length.should.be.eq(2)
//           whitelistInfo[0].toNumber().should.be.eq(purchaserMinimum[0])
//           whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0])
//         })
//
//         it('should have a whitelist of length 1 for the first tier', async () => {
//           let tierWhitelistInfo = await initCrowdsale.getTierWhitelist.call(
//             storage.address, executionID, 1
//           ).should.be.fulfilled
//           tierWhitelistInfo.length.should.be.eq(2)
//           tierWhitelistInfo[0].toNumber().should.be.eq(1)
//           tierWhitelistInfo[1].length.should.be.eq(1)
//           tierWhitelistInfo[1][0].should.be.eq(purchaser[0])
//         })
//
//         it('should have 0 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(0)
//         })
//
//         it('should correctly store the initial purchaser\'s balance as 0', async () => {
//           let balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, purchaser[0]
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
//           let teamBalance = web3.eth.getBalance(teamWallet)
//           teamBalance.toNumber().should.be.eq(teamWalletInitBalance)
//         })
//       })
//
//       context('sender has contributed before', async () => {
//
//         let initialSpend = tierPrices[0] * purchaserMinimum[0]
//
//         let paymentEvent
//
//         beforeEach(async () => {
//           // Transfer funds from teamWallet to exec
//           sendBalanceTo(teamWallet, exec)
//           let bal = web3.eth.getBalance(teamWallet).toNumber()
//           bal.should.be.eq(0)
//
//           let purchaseContext = await testUtils.getContext.call(
//             executionID, purchaser[0], initialSpend
//           ).should.be.fulfilled
//           purchaseContext.should.not.eq('0x')
//
//           let spendCalldata = await buyTokensUtil.buy.call(
//             purchaseContext
//           ).should.be.fulfilled
//           spendCalldata.should.not.eq('0x')
//
//           let events = await storage.exec(
//             crowdsaleBuyMock.address, executionID, spendCalldata,
//             { from: exec, value: initialSpend }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(2)
//           paymentEvent = events[0]
//           let execEvent = events[1]
//
//           execEvent.event.should.be.eq('ApplicationExecution')
//         })
//
//         describe('initial payment results', async () => {
//
//           it('should emit a DeliveredPayment event', async () => {
//             paymentEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = paymentEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = paymentEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the initial spend amount', async () => {
//               let sent = paymentEvent.args['amount']
//               sent.toNumber().should.be.eq(initialSpend)
//             })
//           })
//
//           it('should have the correct amount of wei raised', async () => {
//             let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             crowdsaleInfo.length.should.be.eq(5)
//             crowdsaleInfo[0].toNumber().should.be.eq(initialSpend)
//           })
//
//           it('should have 1 unique buyer', async () => {
//             let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             uniqueInfo.toNumber().should.be.eq(1)
//           })
//
//           it('should correctly store the initial purchaser\'s balance', async () => {
//             let balanceInfo = await initCrowdsale.balanceOf.call(
//               storage.address, executionID, purchaser[0]
//             ).should.be.fulfilled
//             balanceInfo.toNumber().should.be.eq(purchaserMinimum[0])
//           })
//
//           it('should have sent the wei to the team wallet', async () => {
//             let teamBalance = web3.eth.getBalance(teamWallet)
//             teamBalance.toNumber().should.be.eq(initialSpend)
//           })
//
//           it('should correctly update the purchaser\'s whitelist information', async () => {
//             let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//               storage.address, executionID, whitelistTier, purchaser[0]
//             ).should.be.fulfilled
//             whitelistInfo.length.should.be.eq(2)
//             whitelistInfo[0].toNumber().should.be.eq(0)
//             whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0] - initialSpend)
//           })
//
//           it('should correctly update the token total supply', async () => {
//             let supplyInfo = await initCrowdsale.totalSupply.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             supplyInfo.toNumber().should.be.eq(purchaserMinimum[0])
//           })
//
//           it('should correctly update the current tier', async () => {
//             let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             curTierInfo.length.should.be.eq(7)
//             hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
//             curTierInfo[1].toNumber().should.be.eq(1)
//             curTierInfo[2].toNumber().should.be.eq(
//               startTime + initialTierDuration + tierDurations[0]
//             )
//             curTierInfo[3].toNumber().should.be.eq(tierCaps[0] - purchaserMinimum[0])
//             curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
//             curTierInfo[5].should.be.eq(tierModStats[0])
//             curTierInfo[6].should.be.eq(tierWhitelistStats[0])
//           })
//
//           it('should correctly update the total tokens sold', async () => {
//             let soldInfo = await initCrowdsale.getTokensSold.call(
//               storage.address, executionID
//             ).should.be.fulfilled
//             soldInfo.toNumber().should.be.eq(purchaserMinimum[0])
//           })
//         })
//
//         context('sender is spending over their maximum spend amount', async () => {
//
//           let purchaseCalldata
//           let purchaseEvent
//
//           let sendAmount
//           let maxSpendAmount
//
//           beforeEach(async () => {
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = web3.eth.getBalance(teamWallet).toNumber()
//             bal.should.be.eq(0)
//
//             sendAmount = (purchaserMaximum[0] - initialSpend) + 1
//             maxSpendAmount = purchaserMaximum[0] - initialSpend
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaser[0], sendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             // Fast-forward to tier 1 start time (tier 1 is whitelisted)
//             await crowdsaleBuyMock.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
//             let storedTime = await crowdsaleBuyMock.set_time().should.be.fulfilled
//             storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: sendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             purchaseEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           it('should emit a DeliveredPayment event', async () => {
//             purchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = purchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = purchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the maximum spend amount', async () => {
//               let sent = purchaseEvent.args['amount']
//               sent.toNumber().should.be.eq(maxSpendAmount)
//             })
//           })
//
//           describe('payment results', async () => {
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(initialSpend + maxSpendAmount)
//             })
//
//             it('should have 1 unique buyer', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(1)
//             })
//
//             it('should correctly store the purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaser[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(
//                 purchaserMinimum[0] + (maxSpendAmount / tierPrices[0])
//               )
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = web3.eth.getBalance(teamWallet)
//               teamBalance.toNumber().should.be.eq(maxSpendAmount)
//             })
//
//             it('should correctly update the purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, whitelistTier, purchaser[0]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(0)
//             })
//
//             it('should correctly update the token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(
//                 purchaserMinimum[0] + (maxSpendAmount / tierPrices[0])
//               )
//             })
//
//             it('should correctly update the current tier', async () => {
//               let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               curTierInfo.length.should.be.eq(7)
//               hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
//               curTierInfo[1].toNumber().should.be.eq(1)
//               curTierInfo[2].toNumber().should.be.eq(
//                 startTime + initialTierDuration + tierDurations[0]
//               )
//               curTierInfo[3].toNumber().should.be.eq(
//                 tierCaps[0] - (purchaserMinimum[0] + (maxSpendAmount / tierPrices[0]))
//               )
//               curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
//               curTierInfo[5].should.be.eq(tierModStats[0])
//               curTierInfo[6].should.be.eq(tierWhitelistStats[0])
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(
//                 purchaserMinimum[0] + (maxSpendAmount / tierPrices[0])
//               )
//             })
//           })
//
//           it('should disallow purchases from the same sender', async () => {
//             let invalidAmount = 1
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaser[0], invalidAmount
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
//             hexStrEquals(invalidEvent.args['message'], 'InvalidSpendAmount').should.be.eq(true)
//           })
//         })
//
//         context('sender is not spending over their maximum spend amount', async () => {
//
//           let purchaseCalldata
//           let purchaseEvent
//
//           let sendAmount = tierPrices[0]
//
//           beforeEach(async () => {
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = web3.eth.getBalance(teamWallet).toNumber()
//             bal.should.be.eq(0)
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaser[0], sendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             // Fast-forward to tier 1 start time (tier 1 is whitelisted)
//             await crowdsaleBuyMock.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
//             let storedTime = await crowdsaleBuyMock.set_time().should.be.fulfilled
//             storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: sendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             purchaseEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           it('should emit a DeliveredPayment event', async () => {
//             purchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = purchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = purchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the amount sent', async () => {
//               let sent = purchaseEvent.args['amount']
//               sent.toNumber().should.be.eq(sendAmount)
//             })
//           })
//
//           describe('payment results', async () => {
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(initialSpend + sendAmount)
//             })
//
//             it('should have 1 unique buyer', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(1)
//             })
//
//             it('should correctly store the purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaser[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(
//                 purchaserMinimum[0] + (sendAmount / tierPrices[0])
//               )
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = web3.eth.getBalance(teamWallet)
//               teamBalance.toNumber().should.be.eq(sendAmount)
//             })
//
//             it('should correctly update the purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, whitelistTier, purchaser[0]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(purchaserMaximum[0] - initialSpend - sendAmount)
//             })
//
//             it('should correctly update the token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(
//                 purchaserMinimum[0] + (sendAmount / tierPrices[0])
//               )
//             })
//
//             it('should correctly update the current tier', async () => {
//               let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               curTierInfo.length.should.be.eq(7)
//               hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
//               curTierInfo[1].toNumber().should.be.eq(1)
//               curTierInfo[2].toNumber().should.be.eq(
//                 startTime + initialTierDuration + tierDurations[0]
//               )
//               curTierInfo[3].toNumber().should.be.eq(
//                 tierCaps[0] - (purchaserMinimum[0] + (sendAmount / tierPrices[0]))
//               )
//               curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
//               curTierInfo[5].should.be.eq(tierModStats[0])
//               curTierInfo[6].should.be.eq(tierWhitelistStats[0])
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(
//                 purchaserMinimum[0] + (sendAmount / tierPrices[0])
//               )
//             })
//           })
//         })
//
//         context('sender is spending exactly their maximum spend amount', async () => {
//
//           let purchaseCalldata
//           let purchaseEvent
//
//           let sendAmount = purchaserMaximum[0] - initialSpend
//
//           beforeEach(async () => {
//             // Transfer funds from teamWallet to exec
//             sendBalanceTo(teamWallet, exec)
//             let bal = web3.eth.getBalance(teamWallet).toNumber()
//             bal.should.be.eq(0)
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaser[0], sendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             // Fast-forward to tier 1 start time (tier 1 is whitelisted)
//             await crowdsaleBuyMock.setTime(startTime + 1 + initialTierDuration).should.be.fulfilled
//             let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//             storedTime.toNumber().should.be.eq(startTime + 1 + initialTierDuration)
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: sendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             purchaseEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           it('should emit a DeliveredPayment event', async () => {
//             purchaseEvent.event.should.be.eq('DeliveredPayment')
//           })
//
//           describe('the DeliveredPayment event', async () => {
//
//             it('should match the execution ID', async () => {
//               let emittedExecID = purchaseEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the team wallet destination address', async () => {
//               let destination = purchaseEvent.args['destination']
//               destination.should.be.eq(teamWallet)
//             })
//
//             it('should match the amount sent', async () => {
//               let sent = purchaseEvent.args['amount']
//               sent.toNumber().should.be.eq(sendAmount)
//             })
//           })
//
//           describe('payment results', async () => {
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(purchaserMaximum[0])
//             })
//
//             it('should have 1 unique buyer', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(1)
//             })
//
//             it('should correctly store the purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaser[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(purchaserMaximum[0] / tierPrices[0])
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = web3.eth.getBalance(teamWallet)
//               teamBalance.toNumber().should.be.eq(sendAmount)
//             })
//
//             it('should correctly update the purchaser\'s whitelist information', async () => {
//               let whitelistInfo = await initCrowdsale.getWhitelistStatus.call(
//                 storage.address, executionID, whitelistTier, purchaser[0]
//               ).should.be.fulfilled
//               whitelistInfo.length.should.be.eq(2)
//               whitelistInfo[0].toNumber().should.be.eq(0)
//               whitelistInfo[1].toNumber().should.be.eq(0)
//             })
//
//             it('should correctly update the token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(purchaserMaximum[0] / tierPrices[0])
//             })
//
//             it('should correctly update the current tier', async () => {
//               let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               curTierInfo.length.should.be.eq(7)
//               hexStrEquals(curTierInfo[0], tierNames[0]).should.be.eq(true)
//               curTierInfo[1].toNumber().should.be.eq(1)
//               curTierInfo[2].toNumber().should.be.eq(
//                 startTime + initialTierDuration + tierDurations[0]
//               )
//               curTierInfo[3].toNumber().should.be.eq(
//                 tierCaps[0] - (purchaserMaximum[0] / tierPrices[0])
//               )
//               curTierInfo[4].toNumber().should.be.eq(tierPrices[0])
//               curTierInfo[5].should.be.eq(tierModStats[0])
//               curTierInfo[6].should.be.eq(tierWhitelistStats[0])
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(purchaserMaximum[0] / tierPrices[0])
//             })
//           })
//
//           it('should disallow purchases from the same sender', async () => {
//             let invalidAmount = 1
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaser[0], invalidAmount
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
//             hexStrEquals(invalidEvent.args['message'], 'InvalidSpendAmount').should.be.eq(true)
//           })
//         })
//       })
//
//       context('sender has not contributed before', async () => {
//
//         beforeEach(async () => {
//           // Transfer funds from teamWallet to exec
//           sendBalanceTo(teamWallet, exec)
//           let bal = web3.eth.getBalance(teamWallet).toNumber()
//           bal.should.be.eq(0)
//         })
//
//         context('sender is not buying above minimum contribution', async () => {
//
//           let invalidCalldata
//           let invalidEvent
//
//           // Sending 1 under the amount required to buy the minimum amount
//           let invalidAmount = (purchaserMinimum[0] * tierPrices[0]) - 1
//
//           beforeEach(async () => {
//             let invalidContext = await testUtils.getContext(
//               executionID, purchaser[0], invalidAmount
//             ).should.be.fulfilled
//             invalidContext.should.not.eq('0x')
//
//             invalidCalldata = await buyTokensUtil.buy(
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
//             invalidEvent = events[0]
//           })
//
//           it('should emit an ApplicationException event', async () => {
//             invalidEvent.event.should.be.eq('ApplicationException')
//           })
//
//           describe('the ApplicationException event', async () => {
//
//             it('should match the used execution id', async () => {
//               let emittedExecID = invalidEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the BuyTokensMock address', async () => {
//               let emittedAppAddr = invalidEvent.args['application_address']
//               emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//             })
//
//             it('should contain the error message \'UnderMinCap\'', async () => {
//               let emittedMessage = invalidEvent.args['message']
//               hexStrEquals(emittedMessage, 'UnderMinCap').should.be.eq(true, web3.toAscii(emittedMessage))
//             })
//           })
//
//           describe('the resulting crowdsale storage', async () => {
//
//             it('should have an initialized crowdsale', async () => {
//               let saleInfo = await initCrowdsale.getCrowdsaleInfo(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               saleInfo.length.should.be.eq(5)
//
//               saleInfo[0].toNumber().should.be.eq(0)
//               saleInfo[1].should.be.eq(teamWallet)
//               saleInfo[2].toNumber().should.be.eq(0)
//               saleInfo[3].should.be.eq(true)
//               saleInfo[4].should.be.eq(false)
//             })
//
//             it('should have a correctly initialized token', async () => {
//               let tokenInfo = await initCrowdsale.getTokenInfo(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               tokenInfo.length.should.be.eq(4)
//
//               hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//               hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//               tokenInfo[2].toNumber().should.be.eq(0)
//               tokenInfo[3].toNumber().should.be.eq(0)
//             })
//
//             it('should have an unchanged team wallet balance', async () => {
//               let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//               curTeamBalance.should.be.eq(teamWalletInitBalance)
//             })
//           })
//         })
//
//         context('sender is buying above minimum contribution', async () => {
//
//         })
//
//         context('sender is spending over their maximum spend amount', async () => {
//
//         })
//
//         context('sender is not spending over their maximum spend amount', async () => {
//
//         })
//       })
//     })
//   })
//
//   describe('non-whitelist-enabled-tier', async () => {
//
//     let defaultTier = 2
//
//     beforeEach(async () => {
//       // Create tiers
//       let createTiersCalldata = await crowdsaleConsoleUtil.createCrowdsaleTiers.call(
//         tierNames, tierDurations, tierPrices, tierCaps, tierModStats, tierWhitelistStats, adminContext
//       ).should.be.fulfilled
//       createTiersCalldata.should.not.eq('0x')
//
//       let initCrowdsaleCalldata = await crowdsaleConsoleUtil.initializeCrowdsale.call(
//         adminContext
//       ).should.be.fulfilled
//       initCrowdsaleCalldata.should.not.eq('0x')
//
//       let events = await storage.exec(
//         crowdsaleConsole.address, executionID, createTiersCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       let tierListInfo = await initCrowdsale.getCrowdsaleTierList.call(
//         storage.address, executionID
//       ).should.be.fulfilled
//       tierListInfo.length.should.be.eq(4)
//
//       events = await storage.exec(
//         crowdsaleConsole.address, executionID, initCrowdsaleCalldata,
//         { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//
//       // Fast-forward to tier 2 start time (tier 2 is not whitelisted)
//       await crowdsaleBuyMock.setTime(startTime + initialTierDuration + tierDurations[0] + 1).should.be.fulfilled
//       let storedTime = await crowdsaleBuyMock.set_time.call().should.be.fulfilled
//       storedTime.toNumber().should.be.eq(startTime + initialTierDuration + tierDurations[0] + 1)
//     })
//
//     context('multiple purchases', async () => {
//
//       let initialSpend = tierPrices[1] // Buying the bare-minimum: 1 token
//       let secondSpend = tierPrices[1] - 1 // Sending less than the price of 1 token
//       let thirdSpend = tierPrices[1] * 1000 // Sending enough for 1000 tokens
//
//       let firstPaymentEvent
//       let thirdPaymentEvent
//
//       beforeEach(async () => {
//         // Transfer funds from teamWallet to exec
//         sendBalanceTo(teamWallet, exec)
//         let bal = web3.eth.getBalance(teamWallet).toNumber()
//         bal.should.be.eq(0)
//
//         let purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], initialSpend
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         let spendCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         spendCalldata.should.not.eq('0x')
//
//         let events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, spendCalldata,
//           { from: exec, value: initialSpend }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         firstPaymentEvent = events[0]
//         let execEvent = events[1]
//         execEvent.event.should.be.eq('ApplicationExecution')
//
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[0], secondSpend
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         spendCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         spendCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, spendCalldata,
//           { from: exec, value: secondSpend }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(1)
//         execEvent = events[0]
//         execEvent.event.should.be.eq('ApplicationException')
//
//         purchaseContext = await testUtils.getContext.call(
//           executionID, purchaserList[1], thirdSpend
//         ).should.be.fulfilled
//         purchaseContext.should.not.eq('0x')
//
//         spendCalldata = await buyTokensUtil.buy.call(
//           purchaseContext
//         ).should.be.fulfilled
//         spendCalldata.should.not.eq('0x')
//
//         events = await storage.exec(
//           crowdsaleBuyMock.address, executionID, spendCalldata,
//           { from: exec, value: thirdSpend }
//         ).then((tx) => {
//           return tx.logs
//         })
//         events.should.not.eq(null)
//         events.length.should.be.eq(2)
//         thirdPaymentEvent = events[0]
//         execEvent = events[1]
//         execEvent.event.should.be.eq('ApplicationExecution')
//       })
//
//       describe('payment results', async () => {
//
//         it('should emit 2 DeliveredPayment events', async () => {
//           firstPaymentEvent.event.should.be.eq('DeliveredPayment')
//           thirdPaymentEvent.event.should.be.eq('DeliveredPayment')
//         })
//
//         describe('the DeliveredPayment events', async () => {
//
//           it('should match the execution ID', async () => {
//             let emittedExecID = firstPaymentEvent.args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//             emittedExecID = thirdPaymentEvent.args['execution_id']
//             emittedExecID.should.be.eq(executionID)
//           })
//
//           it('should match the team wallet destination address', async () => {
//             let destination = firstPaymentEvent.args['destination']
//             destination.should.be.eq(teamWallet)
//             destination = thirdPaymentEvent.args['destination']
//             destination.should.be.eq(teamWallet)
//           })
//
//           it('should match the initial spend amount', async () => {
//             let sent = firstPaymentEvent.args['amount']
//             sent.toNumber().should.be.eq(initialSpend)
//             sent = thirdPaymentEvent.args['amount']
//             sent.toNumber().should.be.eq(thirdSpend)
//           })
//         })
//
//         it('should have the correct amount of wei raised', async () => {
//           let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           crowdsaleInfo.length.should.be.eq(5)
//           crowdsaleInfo[0].toNumber().should.be.eq(initialSpend + thirdSpend)
//         })
//
//         it('should have 2 unique buyers', async () => {
//           let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           uniqueInfo.toNumber().should.be.eq(2)
//         })
//
//         it('should correctly store the initial purchasers\' balance', async () => {
//           let balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, purchaserList[0]
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(initialSpend / tierPrices[1])
//
//           balanceInfo = await initCrowdsale.balanceOf.call(
//             storage.address, executionID, purchaserList[1]
//           ).should.be.fulfilled
//           balanceInfo.toNumber().should.be.eq(thirdSpend / tierPrices[1])
//         })
//
//         it('should have sent the wei to the team wallet', async () => {
//           let teamBalance = web3.eth.getBalance(teamWallet)
//           teamBalance.toNumber().should.be.eq(initialSpend + thirdSpend)
//         })
//
//         it('should correctly update the token total supply', async () => {
//           let supplyInfo = await initCrowdsale.totalSupply.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           supplyInfo.toNumber().should.be.eq(
//             (initialSpend / tierPrices[1]) + (thirdSpend / tierPrices[1])
//           )
//         })
//
//         it('should correctly update the current tier', async () => {
//           let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           curTierInfo.length.should.be.eq(7)
//           hexStrEquals(curTierInfo[0], tierNames[1]).should.be.eq(true)
//           curTierInfo[1].toNumber().should.be.eq(defaultTier)
//           curTierInfo[2].toNumber().should.be.eq(
//             startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
//           )
//           curTierInfo[3].toNumber().should.be.eq(
//             tierCaps[1] - (
//               (initialSpend / tierPrices[1]) + (thirdSpend / tierPrices[1])
//             )
//           )
//           curTierInfo[4].toNumber().should.be.eq(tierPrices[1])
//           curTierInfo[5].should.be.eq(tierModStats[1])
//           curTierInfo[6].should.be.eq(tierWhitelistStats[1])
//         })
//
//         it('should correctly update the total tokens sold', async () => {
//           let soldInfo = await initCrowdsale.getTokensSold.call(
//             storage.address, executionID
//           ).should.be.fulfilled
//           soldInfo.toNumber().should.be.eq(
//             (initialSpend / tierPrices[1]) + (thirdSpend / tierPrices[1])
//           )
//         })
//       })
//     })
//
//     context('sender has not contributed before', async () => {
//
//       context('global min cap exists', async () => {
//
//         let globalMinCap = 1000 // Set minimum purchase amount at 1000 tokens
//
//         beforeEach(async () => {
//           let setMinCalldata = await buyTokensUtil.updateGlobalMin.call(globalMinCap).should.be.fulfilled
//           setMinCalldata.should.not.eq('0x')
//
//           let events = await storage.exec(
//             adminMock.address, executionID, setMinCalldata,
//             { from: exec }
//           ).then((tx) => {
//             return tx.logs
//           })
//           events.should.not.eq(null)
//           events.length.should.be.eq(1)
//           events[0].event.should.be.eq('ApplicationExecution')
//         })
//
//         context('sender is buying above minimum contribution', async () => {
//
//           let purchaseCalldata
//           let purchaseEvent
//           let sendAmount
//
//           beforeEach(async () => {
//             sendAmount = globalMinCap * tierPrices[1]
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], sendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: sendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             purchaseEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           describe('payment results', async () => {
//
//             it('should emit a DeliveredPayment event', async () => {
//               purchaseEvent.event.should.be.eq('DeliveredPayment')
//             })
//
//             describe('the DeliveredPayment event', async () => {
//
//               it('should match the execution ID', async () => {
//                 let emittedExecID = purchaseEvent.args['execution_id']
//                 emittedExecID.should.be.eq(executionID)
//               })
//
//               it('should match the team wallet destination address', async () => {
//                 let destination = purchaseEvent.args['destination']
//                 destination.should.be.eq(teamWallet)
//               })
//
//               it('should match the initial spend amount', async () => {
//                 let sent = purchaseEvent.args['amount']
//                 sent.toNumber().should.be.eq(sendAmount)
//               })
//             })
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(sendAmount)
//             })
//
//             it('should have 1 unique buyer', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(1)
//             })
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(sendAmount / tierPrices[1])
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = web3.eth.getBalance(teamWallet)
//               teamBalance.toNumber().should.be.eq(sendAmount)
//             })
//
//             it('should correctly update the token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(sendAmount / tierPrices[1])
//             })
//
//             it('should correctly update the current tier', async () => {
//               let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               curTierInfo.length.should.be.eq(7)
//               hexStrEquals(curTierInfo[0], tierNames[1]).should.be.eq(true)
//               curTierInfo[1].toNumber().should.be.eq(defaultTier)
//               curTierInfo[2].toNumber().should.be.eq(
//                 startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
//               )
//               curTierInfo[3].toNumber().should.be.eq(
//                 tierCaps[1] - (sendAmount / tierPrices[1])
//               )
//               curTierInfo[4].toNumber().should.be.eq(tierPrices[1])
//               curTierInfo[5].should.be.eq(tierModStats[1])
//               curTierInfo[6].should.be.eq(tierWhitelistStats[1])
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(sendAmount / tierPrices[1])
//             })
//           })
//         })
//
//         context('sender is not buying above minimum contribution', async () => {
//
//           let invalidCalldata
//           let invalidEvent
//           let invalidAmount
//
//           beforeEach(async () => {
//             invalidAmount = (globalMinCap * tierPrices[1]) - 1
//             let invalidContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], invalidAmount
//             ).should.be.fulfilled
//             invalidContext.should.not.eq('0x')
//
//             invalidCalldata = await buyTokensUtil.buy.call(
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
//             invalidEvent = events[0]
//           })
//
//           it('should emit an ApplicationException event', async () => {
//             invalidEvent.event.should.be.eq('ApplicationException')
//           })
//
//           describe('the ApplicationException event', async () => {
//
//             it('should match the used execution id', async () => {
//               let emittedExecID = invalidEvent.args['execution_id']
//               emittedExecID.should.be.eq(executionID)
//             })
//
//             it('should match the BuyTokensMock address', async () => {
//               let emittedAppAddr = invalidEvent.args['application_address']
//               emittedAppAddr.should.be.eq(crowdsaleBuyMock.address)
//             })
//
//             it('should contain the error message \'UnderMinCap\'', async () => {
//               let emittedMessage = invalidEvent.args['message']
//               hexStrEquals(emittedMessage, 'UnderMinCap').should.be.eq(true)
//             })
//           })
//
//           describe('the resulting crowdsale storage', async () => {
//
//             it('should have an initialized crowdsale', async () => {
//               let saleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               saleInfo.length.should.be.eq(5)
//
//               saleInfo[0].toNumber().should.be.eq(0)
//               saleInfo[1].should.be.eq(teamWallet)
//               saleInfo[2].toNumber().should.be.eq(globalMinCap)
//               saleInfo[3].should.be.eq(true)
//               saleInfo[4].should.be.eq(false)
//             })
//
//             it('should have a correctly initialized token', async () => {
//               let tokenInfo = await initCrowdsale.getTokenInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               tokenInfo.length.should.be.eq(4)
//
//               hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
//               hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
//               tokenInfo[2].toNumber().should.be.eq(0)
//               tokenInfo[3].toNumber().should.be.eq(0)
//             })
//
//             it('should have an unchanged team wallet balance', async () => {
//               let curTeamBalance = web3.eth.getBalance(teamWallet).toNumber()
//               curTeamBalance.should.be.eq(teamWalletInitBalance)
//             })
//           })
//         })
//       })
//
//       context('global min cap does not exist', async () => {
//
//         context('sender purchases every token in a tier', async () => {
//
//           let purchaseCalldata
//           let purchaseEvent
//           let sendAmount
//
//           let deliverAmount
//
//           beforeEach(async () => {
//             sendAmount = (tierCaps[1] * tierPrices[1]) + 1
//             deliverAmount = sendAmount - 1
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[0], sendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: sendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(2)
//             purchaseEvent = events[0]
//             events[1].event.should.be.eq('ApplicationExecution')
//           })
//
//           describe('payment results', async () => {
//
//             it('should emit a DeliveredPayment event', async () => {
//               purchaseEvent.event.should.be.eq('DeliveredPayment')
//             })
//
//             describe('the DeliveredPayment event', async () => {
//
//               it('should match the execution ID', async () => {
//                 let emittedExecID = purchaseEvent.args['execution_id']
//                 emittedExecID.should.be.eq(executionID)
//               })
//
//               it('should match the team wallet destination address', async () => {
//                 let destination = purchaseEvent.args['destination']
//                 destination.should.be.eq(teamWallet)
//               })
//
//               it('should match the initial spend amount', async () => {
//                 let sent = purchaseEvent.args['amount']
//                 sent.toNumber().should.be.eq(deliverAmount)
//               })
//             })
//
//             it('should have the correct amount of wei raised', async () => {
//               let crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               crowdsaleInfo.length.should.be.eq(5)
//               crowdsaleInfo[0].toNumber().should.be.eq(deliverAmount)
//             })
//
//             it('should have 1 unique buyer', async () => {
//               let uniqueInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               uniqueInfo.toNumber().should.be.eq(1)
//             })
//
//             it('should correctly store the initial purchaser\'s balance', async () => {
//               let balanceInfo = await initCrowdsale.balanceOf.call(
//                 storage.address, executionID, purchaserList[0]
//               ).should.be.fulfilled
//               balanceInfo.toNumber().should.be.eq(deliverAmount / tierPrices[1])
//             })
//
//             it('should have sent the wei to the team wallet', async () => {
//               let teamBalance = web3.eth.getBalance(teamWallet)
//               teamBalance.toNumber().should.be.eq(deliverAmount)
//             })
//
//             it('should correctly update the token total supply', async () => {
//               let supplyInfo = await initCrowdsale.totalSupply.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               supplyInfo.toNumber().should.be.eq(deliverAmount / tierPrices[1])
//             })
//
//             it('should correctly update the current tier', async () => {
//               let curTierInfo = await initCrowdsale.getCurrentTierInfo.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               curTierInfo.length.should.be.eq(7)
//               hexStrEquals(curTierInfo[0], tierNames[1]).should.be.eq(true)
//               curTierInfo[1].toNumber().should.be.eq(defaultTier)
//               curTierInfo[2].toNumber().should.be.eq(
//                 startTime + initialTierDuration + tierDurations[0] + tierDurations[1]
//               )
//               curTierInfo[3].toNumber().should.be.eq(0)
//               curTierInfo[4].toNumber().should.be.eq(tierPrices[1])
//               curTierInfo[5].should.be.eq(tierModStats[1])
//               curTierInfo[6].should.be.eq(tierWhitelistStats[1])
//             })
//
//             it('should correctly update the total tokens sold', async () => {
//               let soldInfo = await initCrowdsale.getTokensSold.call(
//                 storage.address, executionID
//               ).should.be.fulfilled
//               soldInfo.toNumber().should.be.eq(deliverAmount / tierPrices[1])
//             })
//           })
//
//           it('should not allow subsequent purchases', async () => {
//
//             let nextSendAmount = tierPrices[1]
//
//             let purchaseContext = await testUtils.getContext.call(
//               executionID, purchaserList[1], nextSendAmount
//             ).should.be.fulfilled
//             purchaseContext.should.not.eq('0x')
//
//             purchaseCalldata = await buyTokensUtil.buy.call(
//               purchaseContext
//             ).should.be.fulfilled
//             purchaseCalldata.should.not.eq('0x')
//
//             let events = await storage.exec(
//               crowdsaleBuyMock.address, executionID, purchaseCalldata,
//               { from: exec, value: nextSendAmount }
//             ).then((tx) => {
//               return tx.logs
//             })
//             events.should.not.eq(null)
//             events.length.should.be.eq(1)
//             events[0].event.should.be.eq('ApplicationException')
//             hexStrEquals(events[0].args['message'], 'TierSoldOut').should.be.eq(true)
//           })
//         })
//       })
//     })
//   })
// })
