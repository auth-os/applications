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
// contract('#DutchCrowdsaleInit', function (accounts) {
//
//   let storage
//   let testUtils
//
//   let exec = accounts[0]
//   let updater = accounts[1]
//   let crowdsaleAdmin = accounts[2]
//   let teamWallet = accounts[3]
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
//   let initCalldata
//   let initEvent
//   let finalizeEvent
//
//   let startTime
//   let totalSupply = 100000
//   let sellCap = 90000
//   let startPrice = 1000 // 1000 wei per token (1 token = [10 ** decimals] units)
//   let endPrice = 100 // 100 wei per token
//   let duration = 3600 // 1 hour
//   let isWhitelisted = true
//
//   before(async () => {
//     storage = await AbstractStorage.new().should.be.fulfilled
//     testUtils = await TestUtils.new().should.be.fulfilled
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
//   describe('valid initialization', async () => {
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get valid init calldata
//       initCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, startPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       initCalldata.should.not.be.eq('0x')
//
//       // Initialize a valid sale
//       let events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, initCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(2)
//       initEvent = events[0]
//       finalizeEvent = events[1]
//
//       executionID = initEvent.args['execution_id']
//       executionID.should.not.eq(0)
//     })
//
//     it('should emit an ApplicationInitialized event', async () => {
//       initEvent.event.should.be.eq('ApplicationInitialized')
//     })
//
//     it('should emit an ApplicationFinalization event', async () => {
//       finalizeEvent.event.should.be.eq('ApplicationFinalization')
//     })
//
//     describe('the ApplicationInitialized event', async () => {
//
//       it('should contain the indexed initialization address for the crowdsale', async () => {
//         let initAddress = initEvent.args['init_address']
//         initAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id', async () => {
//         let execID = initEvent.args['execution_id']
//         web3.toDecimal(execID).should.not.eq(0)
//       })
//     })
//
//     describe('the ApplicationFinalization event', async () => {
//
//       it('should contain the indexed initialization address for the crowdsale', async () => {
//         let initAddress = finalizeEvent.args['init_address']
//         initAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id', async () => {
//         let execID = finalizeEvent.args['execution_id']
//         web3.toDecimal(execID).should.not.eq(0)
//       })
//     })
//
//     describe('#getAdmin', async () => {
//
//       let adminAddr
//
//       beforeEach(async () => {
//         adminAddr = await initCrowdsale.getAdmin.call(storage.address, executionID).should.be.fulfilled
//       })
//
//       it('should store the correct admin address', async () => {
//         adminAddr.should.be.eq(crowdsaleAdmin)
//       })
//     })
//
//     describe('#getCrowdsaleInfo', async () => {
//
//       let crowdsaleInfo
//
//       beforeEach(async () => {
//         crowdsaleInfo = await initCrowdsale.getCrowdsaleInfo.call(storage.address, executionID).should.be.fulfilled
//         crowdsaleInfo.length.should.be.eq(5)
//       })
//
//       it('should not have any wei raised', async () => {
//         crowdsaleInfo[0].toNumber().should.be.eq(0)
//       })
//
//       it('should store the valid team wallet', async () => {
//         crowdsaleInfo[1].should.be.eq(teamWallet)
//       })
//
//       it('should not have a minimum contribution', async () => {
//         crowdsaleInfo[2].toNumber().should.be.eq(0)
//       })
//
//       it('should not be initialized or finalized', async () => {
//         crowdsaleInfo[3].should.be.eq(false)
//         crowdsaleInfo[4].should.be.eq(false)
//       })
//     })
//
//     describe('#isCrowdsaleFull', async () => {
//
//       let crowdsaleFullInfo
//
//       beforeEach(async () => {
//         crowdsaleFullInfo = await initCrowdsale.isCrowdsaleFull.call(storage.address, executionID).should.be.fulfilled
//         crowdsaleFullInfo.length.should.be.eq(2)
//       })
//
//       it('should not be a full crowdsale', async () => {
//         crowdsaleFullInfo[0].should.be.eq(false)
//       })
//
//       it('should get the correct maximum tokens sellable', async () => {
//         crowdsaleFullInfo[1].toNumber().should.be.eq(sellCap)
//       })
//     })
//
//     describe('#getCrowdsaleUniqueBuyers', async () => {
//
//       let buyerInfo
//
//       beforeEach(async () => {
//         buyerInfo = await initCrowdsale.getCrowdsaleUniqueBuyers.call(storage.address, executionID).should.be.fulfilled
//       })
//
//       it('should not have any unique buyers', async () => {
//         buyerInfo.toNumber().should.be.eq(0)
//       })
//     })
//
//     describe('#getCrowdsaleStartAndEndTimes', async () => {
//
//       let crowdsaleTimeInfo
//
//       beforeEach(async () => {
//         crowdsaleTimeInfo = await initCrowdsale.getCrowdsaleStartAndEndTimes.call(storage.address, executionID).should.be.fulfilled
//         crowdsaleTimeInfo.length.should.be.eq(2)
//       })
//
//       it('should match the set start time', async () => {
//         crowdsaleTimeInfo[0].toNumber().should.be.eq(startTime)
//       })
//
//       it('should store an end time equal to the start time plus the set duration', async () => {
//         crowdsaleTimeInfo[1].toNumber().should.be.eq(startTime + duration)
//       })
//     })
//
//     describe('#getCrowdsaleStatus', async () => {
//
//       let crowdsaleStatusInfo
//
//       beforeEach(async () => {
//         crowdsaleStatusInfo = await initCrowdsale.getCrowdsaleStatus.call(storage.address, executionID).should.be.fulfilled
//         crowdsaleStatusInfo.length.should.be.eq(6)
//       })
//
//       it('should store the correct start price', async () => {
//         crowdsaleStatusInfo[0].toNumber().should.be.eq(startPrice)
//       })
//
//       it('should store the correct end price', async () => {
//         crowdsaleStatusInfo[1].toNumber().should.be.eq(endPrice)
//       })
//
//       it('should calculate a valid current price', async () => {
//         crowdsaleStatusInfo[2].toNumber().should.be.eq(startPrice)
//       })
//
//       it('should store the correct sale duration', async () => {
//         crowdsaleStatusInfo[3].toNumber().should.be.eq(duration)
//       })
//
//       it('should calculate a valid time remaining', async() => {
//         crowdsaleStatusInfo[4].toNumber().should.be.above(duration)
//         crowdsaleStatusInfo[4].toNumber().should.be.within(3600, duration + 3600)
//       })
//
//       it('should have all sellable tokens remaining', async () => {
//         crowdsaleStatusInfo[5].toNumber().should.be.eq(sellCap)
//       })
//     })
//
//     describe('#getTokensSold', async () => {
//
//       let soldInfo
//
//       beforeEach(async () => {
//         soldInfo = await initCrowdsale.getTokensSold.call(storage.address, executionID).should.be.fulfilled
//       })
//
//       it('should not have any tokens sold', async () => {
//         soldInfo.toNumber().should.be.eq(0)
//       })
//     })
//
//     describe('#getCrowdsaleWhitelist', async () => {
//
//       let saleWhitelist
//
//       beforeEach(async () => {
//         saleWhitelist = await initCrowdsale.getCrowdsaleWhitelist.call(storage.address, executionID).should.be.fulfilled
//         saleWhitelist.length.should.be.eq(2)
//       })
//
//       it('should have 0 addresses whitelisted', async () => {
//         saleWhitelist[0].toNumber().should.be.eq(0)
//       })
//
//       it('should have a whitelist length of 0', async () => {
//         saleWhitelist[1].length.should.be.eq(0)
//       })
//     })
//
//     describe('#balanceOf', async () => {
//
//       let adminBalance
//
//       beforeEach(async () => {
//         adminBalance = await initCrowdsale.balanceOf.call(
//           storage.address, executionID, crowdsaleAdmin
//         ).should.be.fulfilled
//       })
//
//       it('should award the admin with the difference between the total supply and the sale cap', async () => {
//         adminBalance.toNumber().should.be.eq(totalSupply - sellCap)
//       })
//     })
//
//     describe('#totalSupply', async () => {
//
//       let supplyInfo
//
//       beforeEach(async () => {
//         supplyInfo = await initCrowdsale.totalSupply.call(storage.address, executionID).should.be.fulfilled
//       })
//
//       it('should correctly store the total supply of the token', async () => {
//         supplyInfo.toNumber().should.be.eq(totalSupply)
//       })
//     })
//
//     describe('#getTokenInfo', async () => {
//
//       let tokenInfo
//
//       beforeEach(async () => {
//         tokenInfo = await initCrowdsale.getTokenInfo.call(
//           storage.address, executionID
//         ).should.be.fulfilled
//         tokenInfo.length.should.be.eq(4)
//       })
//
//       it('should not have set a token name', async () => {
//         web3.toDecimal(tokenInfo[0]).should.be.eq(0)
//       })
//
//       it('should not have set a token symbol', async () => {
//         web3.toDecimal(tokenInfo[1]).should.be.eq(0)
//       })
//
//       it('should not have set token decimals', async () => {
//         tokenInfo[2].toNumber().should.be.eq(0)
//       })
//
//       it('should have set a total supply', async () => {
//         tokenInfo[3].toNumber().should.be.eq(totalSupply)
//       })
//     })
//   })
//
//   describe('invalid team wallet', async () => {
//
//     let invalidWallet = zeroAddress()
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         invalidWallet, totalSupply, sellCap, startPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     context('when the team wallet address is 0', async () => {
//
//       it('should emit an ApplicationException event', async () => {
//         invalidInitEvent.event.should.be.eq('ApplicationException')
//       })
//
//       describe('the ApplicationException event', async () => {
//
//         it('should contain an indexed application address', async () => {
//           let appAddress = invalidInitEvent.args['application_address']
//           appAddress.should.be.eq(initCrowdsale.address)
//         })
//
//         it('should contain an indexed execution id of value 0', async () => {
//           let execID = invalidInitEvent.args['execution_id']
//           web3.toDecimal(execID).should.be.eq(0)
//         })
//
//         it('should contain an indexed error message', async () => {
//           let message = invalidInitEvent.args['message']
//           hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//         })
//       })
//     })
//   })
//
//   describe('invalid start time', async () => {
//
//     let invalidStartTime = 0
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, startPrice, endPrice,
//         duration, invalidStartTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid duration', async () => {
//
//     let invalidDuration = 0
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, startPrice, endPrice,
//         invalidDuration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid token sell cap - 0', async () => {
//
//     let invalidSellCap = 0
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, invalidSellCap, startPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid token sell cap - greater than totalSupply', async () => {
//
//     let invalidSellCap = totalSupply + 1
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, invalidSellCap, startPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid start price - 0', async () => {
//
//     let invalidPrice = 0
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, invalidPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid start price - less than end price', async () => {
//
//     let invalidPrice = endPrice - 1
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, invalidPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid start price - equal to end price', async () => {
//
//     let invalidPrice = endPrice
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, invalidPrice, endPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid end price - 0', async () => {
//
//     let invalidPrice = 0
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, startPrice, invalidPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid end price - greater than start price', async () => {
//
//     let invalidPrice = startPrice + 1
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, startPrice, invalidPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid end price - equal to start price', async () => {
//
//     let invalidPrice = startPrice
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init.call(
//         teamWallet, totalSupply, sellCap, startPrice, invalidPrice,
//         duration, startTime, isWhitelisted, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
//
//   describe('invalid admin address', async () => {
//
//     let invalidAdmin = zeroAddress()
//     let invalidInitCalldata
//     let invalidInitEvent
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await testUtils.init(
//         teamWallet, totalSupply, sellCap, startPrice, endPrice,
//         duration, startTime, isWhitelisted, invalidAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//
//       // Initialize an invalid sale
//       events = await storage.initAndFinalize(
//         updater, true, initCrowdsale.address, invalidInitCalldata, [
//           crowdsaleBuy.address, crowdsaleConsole.address, tokenConsole.address,
//           tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//         ], { from: exec }
//       ).then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       invalidInitEvent = events[0]
//     })
//
//     it('should emit an ApplicationException event', async () => {
//       invalidInitEvent.event.should.be.eq('ApplicationException')
//     })
//
//     describe('the ApplicationException event', async () => {
//
//       it('should contain an indexed application address', async () => {
//         let appAddress = invalidInitEvent.args['application_address']
//         appAddress.should.be.eq(initCrowdsale.address)
//       })
//
//       it('should contain an indexed execution id of value 0', async () => {
//         let execID = invalidInitEvent.args['execution_id']
//         web3.toDecimal(execID).should.be.eq(0)
//       })
//
//       it('should contain an indexed error message', async () => {
//         let message = invalidInitEvent.args['message']
//         hexStrEquals(message, 'ImproperInitialization').should.be.eq(true)
//       })
//     })
//   })
// })
