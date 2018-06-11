// // Abstract storage contract
// let AbstractStorage = artifacts.require('./AbstractStorage')
// // MintedCappedCrowdsale
// let Token = artifacts.require('./Token')
// let Sale = artifacts.require('./Sale')
// let TokenManager = artifacts.require('./TokenManager')
// let SaleManager = artifacts.require('./SaleManager')
// let MintedCapped = artifacts.require('./MintedCappedIdx')
// // Registry
// let RegistryUtil = artifacts.require('./RegistryUtil')
// let RegistryIdx = artifacts.require('./RegistryIdx')
// let Provider = artifacts.require('./Provider')
// // Util
// let MintedCappedUtils = artifacts.require('./MintedCappedUtils')
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
// contract('#MintedCappedInit', function (accounts) {
//
//   let storage
//
//   let exec = accounts[0]
//   let crowdsaleAdmin = accounts[1]
//   let teamWallet = accounts[2]
//
//   let regExecID
//   let regUtil
//   let regProvider
//   let regIdx
//
//   let saleUtils
//   let saleAddrs
//   let saleSelectors
//
//   let saleIdx
//   let token
//   let sale
//   let tokenManager
//   let saleManager
//
//   let executionID
//   let initCalldata
//   let initEvent
//
//   let appName = 'MintedCappedCrowdsale'
//
//   let startTime
//   let initialTierName = 'Initial Tier'
//   let initialTierPrice = web3.toWei('0.001', 'ether') // 1e15 wei per 1e18 tokens
//   let initialTierDuration = 3600 // 1 hour
//   let initialTierTokenSellCap = web3.toWei('1000', 'ether') // 1000 (e18) tokens for sale
//   let initialTierIsWhitelisted = true
//   let initialTierDurIsModifiable = true
//
//   // Event signatures
//   let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
//   let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
//   let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')
//
//   let transferHash = web3.sha3('Transfer(address,address,uint256)')
//   let approvalHash = web3.sha3('Approval(address,address,uint256)')
//   let transferAgentHash = web3.sha3('TransferAgentStatusUpdate(bytes32,address,bool)')
//   let finalSaleHash = web3.sha3('CrowdsaleFinalized(bytes32)')
//
//   before(async () => {
//     storage = await AbstractStorage.new().should.be.fulfilled
//
//     regUtil = await RegistryUtil.new().should.be.fulfilled
//     regProvider = await Provider.new().should.be.fulfilled
//     regIdx = await RegistryIdx.new().should.be.fulfilled
//
//     saleIdx = await MintedCapped.new().should.be.fulfilled
//     token = await Token.new().should.be.fulfilled
//     sale = await Sale.new().should.be.fulfilled
//     tokenManager = await TokenManager.new().should.be.fulfilled
//     saleManager = await SaleManager.new().should.be.fulfilled
//
//     saleUtils = await MintedCappedUtils.new().should.be.fulfilled
//
//     saleSelectors = await saleUtils.getSelectors.call().should.be.fulfilled
//     saleSelectors.length.should.be.eq(19)
//
//     saleAddrs = [
//       saleManager.address, saleManager.address, saleManager.address,
//       saleManager.address, saleManager.address, saleManager.address,
//
//       tokenManager.address, tokenManager.address, tokenManager.address,
//       tokenManager.address, tokenManager.address, tokenManager.address,
//       tokenManager.address,
//
//       sale.address,
//
//       token.address, token.address, token.address, token.address, token.address
//     ]
//     saleAddrs.length.should.be.eq(19)
//   })
//
//   describe('valid initialization', async () => {
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       let events = await storage.createRegistry(
//         regIdx.address, regProvider.address, { from: exec }
//       ).should.be.fulfilled.then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationInitialized')
//       regExecID = events[0].args['execution_id']
//       web3.toDecimal(regExecID).should.not.eq(0)
//
//       let registerCalldata = await regUtil.registerApp.call(
//         appName, saleIdx.address, saleSelectors, saleAddrs
//       ).should.be.fulfilled
//       registerCalldata.should.not.eq('0x0')
//
//       events = await storage.exec(
//         exec, regExecID, registerCalldata,
//         { from: exec }
//       ).should.be.fulfilled.then((tx) => {
//         return tx.logs;
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       events[0].event.should.be.eq('ApplicationExecution')
//       events[0].args['script_target'].should.be.eq(regProvider.address)
//
//       // Get valid init calldata
//       initCalldata = await saleUtils.init.call(
//         teamWallet, startTime, initialTierName,
//         initialTierPrice, initialTierDuration, initialTierTokenSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
//       ).should.be.fulfilled
//       initCalldata.should.not.be.eq('0x')
//
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, initCalldata,
//         { from: exec }
//       ).should.be.fulfilled.then((tx) => {
//         return tx.logs
//       })
//       events.should.not.eq(null)
//       events.length.should.be.eq(1)
//       initEvent = events[0]
//       executionID = events[0].args['execution_id']
//       web3.toDecimal(executionID).should.not.eq(0)
//     })
//
//     it('should emit an ApplicationInitialized event', async () => {
//       initEvent.event.should.be.eq('ApplicationInitialized')
//     })
//
//     describe('the ApplicationInitialized event', async () => {
//
//       it('should contain the indexed initialization address for the crowdsale', async () => {
//         let initAddress = initEvent.args['index']
//         initAddress.should.be.eq(saleIdx.address)
//       })
//
//       it('should contain an indexed execution id', async () => {
//         let execID = initEvent.args['execution_id']
//         web3.toDecimal(execID).should.not.eq(0)
//       })
//     })
//
//     describe('#getAdmin', async () => {
//
//       let adminAddr
//
//       beforeEach(async () => {
//         adminAddr = await saleIdx.getAdmin.call(storage.address, executionID).should.be.fulfilled
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
//         crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(storage.address, executionID).should.be.fulfilled
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
//         crowdsaleFullInfo = await saleIdx.isCrowdsaleFull.call(storage.address, executionID).should.be.fulfilled
//         crowdsaleFullInfo.length.should.be.eq(2)
//       })
//
//       it('should not be a full crowdsale', async () => {
//         crowdsaleFullInfo[0].should.be.eq(false)
//       })
//
//       it('should get the correct maximum tokens sellable', async () => {
//         crowdsaleFullInfo[1].equals(web3.toBigNumber(initialTierTokenSellCap)).should.be.eq(true)
//       })
//     })
//
//     describe('#getCrowdsaleUniqueBuyers', async () => {
//
//       let buyerInfo
//
//       beforeEach(async () => {
//         buyerInfo = await saleIdx.getCrowdsaleUniqueBuyers.call(storage.address, executionID).should.be.fulfilled
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
//         crowdsaleTimeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(storage.address, executionID).should.be.fulfilled
//         crowdsaleTimeInfo.length.should.be.eq(2)
//       })
//
//       it('should match the set start time', async () => {
//         crowdsaleTimeInfo[0].toNumber().should.be.eq(startTime)
//       })
//
//       it('should store an end time equal to the start time plus the set duration', async () => {
//         crowdsaleTimeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
//       })
//     })
//
//     describe('#getCurrentTierInfo', async () => {
//
//       let curTierInfo
//
//       beforeEach(async () => {
//         curTierInfo = await saleIdx.getCurrentTierInfo.call(storage.address, executionID).should.be.fulfilled
//         curTierInfo.length.should.be.eq(7)
//       })
//
//       it('should set the current tier name to the initial tier', async () => {
//         hexStrEquals(curTierInfo[0], initialTierName).should.be.eq(true)
//       })
//
//       it('should set the tier index to 0', async () => {
//         curTierInfo[1].toNumber().should.be.eq(0)
//       })
//
//       it('should match the crowdsale end time to the tier end time', async () => {
//         curTierInfo[2].toNumber().should.be.eq(startTime + initialTierDuration)
//       })
//
//       it('should match the number of tokens remaining to the total supply', async () => {
//         web3.fromWei(curTierInfo[3].toNumber(), 'ether').should.be.eq(
//           web3.fromWei(initialTierTokenSellCap, 'ether')
//         )
//       })
//
//       it('should store the same price that was passed in', async () => {
//         web3.fromWei(curTierInfo[4].toNumber(), 'ether').should.be.eq(
//           web3.fromWei(initialTierPrice, 'ether')
//         )
//       })
//
//       it('should be modifiable and whitelist-enabled', async () => {
//         curTierInfo[5].should.be.eq(true)
//         curTierInfo[6].should.be.eq(true)
//       })
//     })
//
//     describe('#getCrowdsaleTier', async () => {
//
//       let crowdsaleTier
//
//       beforeEach(async () => {
//         crowdsaleTier = await saleIdx.getCrowdsaleTier.call(
//           storage.address, executionID, 0
//         ).should.be.fulfilled
//         crowdsaleTier.length.should.be.eq(6)
//       })
//
//       it('should set the current tier name to the initial tier', async () => {
//         hexStrEquals(crowdsaleTier[0], initialTierName).should.be.eq(true)
//       })
//
//       it('match the tier token sell cap to the amount passed in', async () => {
//         web3.fromWei(crowdsaleTier[1].toNumber(), 'ether').should.be.eq(
//           web3.fromWei(initialTierTokenSellCap, 'ether')
//         )
//       })
//
//       it('should store the same price that was passed in', async () => {
//         web3.fromWei(crowdsaleTier[2].toNumber(), 'ether').should.be.eq(
//           web3.fromWei(initialTierPrice, 'ether')
//         )
//       })
//
//       it('should match the duration that was passed in', async () => {
//         crowdsaleTier[3].toNumber().should.be.eq(initialTierDuration)
//       })
//
//       it('should be modifiable and whitelist-enabled', async () => {
//         crowdsaleTier[4].should.be.eq(true)
//         crowdsaleTier[5].should.be.eq(true)
//       })
//     })
//
//     describe('#getCrowedsaleMaxRaise', async () => {
//
//       let maxRaiseInfo
//
//       beforeEach(async () => {
//         maxRaiseInfo = await saleIdx.getCrowdsaleMaxRaise.call(storage.address, executionID).should.be.fulfilled
//         maxRaiseInfo.length.should.be.eq(2)
//       })
//
//       it('should not set a max raise amount, because token decimals have not been set', async () => {
//         maxRaiseInfo[0].toNumber().should.be.eq(0)
//       })
//
//       it('should not set a max sellable amount, because token decimals have not been set', async () => {
//         maxRaiseInfo[1].toNumber().should.be.eq(0)
//       })
//     })
//
//     describe('#getCrowdsaleTierList', async () => {
//
//       let tierListInfo
//
//       beforeEach(async () => {
//         tierListInfo = await saleIdx.getCrowdsaleTierList.call(storage.address, executionID).should.be.fulfilled
//       })
//
//       it('should return a list with one tier in it', async () => {
//         tierListInfo.length.should.be.eq(1)
//         hexStrEquals(tierListInfo[0], initialTierName).should.be.eq(true)
//       })
//     })
//
//     describe('#getTierStartAndEndDates', async () => {
//
//       let tierTimeInfo
//
//       beforeEach(async () => {
//         tierTimeInfo = await saleIdx.getTierStartAndEndDates.call(
//           storage.address, executionID, 0
//         ).should.be.fulfilled
//         tierTimeInfo.length.should.be.eq(2)
//       })
//
//       it('should match the crowdsale\'s start date', async () => {
//         tierTimeInfo[0].toNumber().should.be.eq(startTime)
//       })
//
//       it('should match the crowdsale\'s end date', async () => {
//         tierTimeInfo[1].toNumber().should.be.eq(startTime + initialTierDuration)
//       })
//     })
//
//     describe('#getTokensSold', async () => {
//
//       let soldInfo
//
//       beforeEach(async () => {
//         soldInfo = await saleIdx.getTokensSold.call(storage.address, executionID).should.be.fulfilled
//       })
//
//       it('should not have any tokens sold', async () => {
//         soldInfo.toNumber().should.be.eq(0)
//       })
//     })
//
//     describe('#getTierWhitelist', async () => {
//
//       let whitelistInfo
//
//       beforeEach(async () => {
//         whitelistInfo = await saleIdx.getTierWhitelist.call(
//           storage.address, executionID, 0
//         ).should.be.fulfilled
//         whitelistInfo.length.should.be.eq(2)
//       })
//
//       it('should not have a whitelist for tier 0', async () => {
//         whitelistInfo[0].toNumber().should.be.eq(0)
//         whitelistInfo[1].length.should.be.eq(0)
//       })
//     })
//
//     describe('#getTokenInfo', async () => {
//
//       let tokenInfo
//
//       beforeEach(async () => {
//         tokenInfo = await saleIdx.getTokenInfo.call(
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
//       it('should not have set a total supply', async () => {
//         tokenInfo[3].toNumber().should.be.eq(0)
//       })
//     })
//
//     describe('#getReservedTokenDestinationList', async () => {
//
//       let resInfo
//
//       beforeEach(async () => {
//         resInfo = await saleIdx.getReservedTokenDestinationList.call(storage.address, executionID).should.be.fulfilled
//         resInfo.length.should.be.eq(2)
//       })
//
//       it('should not have any reserved tokens', async () => {
//         resInfo[0].toNumber().should.be.eq(0)
//         resInfo[1].length.should.be.eq(0)
//       })
//     })
//   })
//
//   describe('invalid team wallet', async () => {
//
//     let invalidWallet = zeroAddress()
//     let invalidInitCalldata
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await saleUtils.init.call(
//         invalidWallet, startTime, initialTierName,
//         initialTierPrice, initialTierDuration, initialTierTokenSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//     })
//
//     it('should throw', async () => {
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, invalidInitCalldata,
//         { from: exec }
//       ).should.not.be.fulfilled
//     })
//   })
//
//   describe('invalid start time', async () => {
//
//     let invalidStartTime = 0
//     let invalidInitCalldata
//
//     beforeEach(async () => {
//
//       // Get invalid init calldata
//       invalidInitCalldata = await saleUtils.init.call(
//         teamWallet, invalidStartTime, initialTierName,
//         initialTierPrice, initialTierDuration, initialTierTokenSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//     })
//
//     it('should throw', async () => {
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, invalidInitCalldata,
//         { from: exec }
//       ).should.not.be.fulfilled
//     })
//   })
//
//   describe('invalid initial tier price', async () => {
//
//     let invalidTierPrice = 0
//     let invalidInitCalldata
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await saleUtils.init.call(
//         teamWallet, startTime, initialTierName,
//         invalidTierPrice, initialTierDuration, initialTierTokenSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//     })
//
//     it('should throw', async () => {
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, invalidInitCalldata,
//         { from: exec }
//       ).should.not.be.fulfilled
//     })
//   })
//
//   describe('invalid initial tier duration', async () => {
//
//     let invalidDuration = 0
//     let invalidInitCalldata
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await saleUtils.init.call(
//         teamWallet, startTime, initialTierName,
//         initialTierPrice, invalidDuration, initialTierTokenSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//     })
//
//     it('should throw', async () => {
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, invalidInitCalldata,
//         { from: exec }
//       ).should.not.be.fulfilled
//     })
//   })
//
//   describe('invalid initial tier token sell cap', async () => {
//
//     let invalidSellCap = 0
//     let invalidInitCalldata
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await saleUtils.init.call(
//         teamWallet, startTime, initialTierName,
//         initialTierPrice, initialTierDuration, invalidSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, crowdsaleAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//     })
//
//     it('should throw', async () => {
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, invalidInitCalldata,
//         { from: exec }
//       ).should.not.be.fulfilled
//     })
//   })
//
//   describe('invalid admin address', async () => {
//
//     let invalidAdmin = zeroAddress()
//     let invalidInitCalldata
//
//     beforeEach(async () => {
//       startTime = getTime() + 3600 // Starts in 1 hour
//
//       // Get invalid init calldata
//       invalidInitCalldata = await saleUtils.init.call(
//         teamWallet, startTime, initialTierName,
//         initialTierPrice, initialTierDuration, initialTierTokenSellCap,
//         initialTierIsWhitelisted, initialTierDurIsModifiable, invalidAdmin
//       ).should.be.fulfilled
//       invalidInitCalldata.should.not.be.eq('0x')
//     })
//
//     it('should throw', async () => {
//       events = await storage.createInstance(
//         exec, appName, exec, regExecID, invalidInitCalldata,
//         { from: exec }
//       ).should.not.be.fulfilled
//     })
//   })
// })
