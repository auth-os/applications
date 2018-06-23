// Abstract storage contract
let AbstractStorage = artifacts.require('./StorageMock')
// Registry
let RegistryUtil = artifacts.require('./RegistryUtil')
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// DutchAuction
let Token = artifacts.require('./Token')
let TokenMock = artifacts.require('./TokenMock')
let Sale = artifacts.require('./Sale')
let Admin = artifacts.require('./AdminMock')
let DutchSale = artifacts.require('./DutchCrowdsaleIdx')
// Utils
let DutchUtils = artifacts.require('./utils/DutchTokenMockUtils')

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

  let exec = accounts[0]
  let crowdsaleAdmin = accounts[1]
  let teamWallet = accounts[2]

  let otherAddress = accounts[3]

  let regExecID
  let regUtil
  let regProvider
  let regIdx

  let saleUtils
  let saleAddrs
  let saleSelectors

  let saleIdx
  let token
  let tokenMock
  let sale
  let admin

  let executionID
  let initCalldata
  let initEvent

  let appName = 'DutchCrowdsale'

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

  // Event signatures
  let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
  let finalHash = web3.sha3('ApplicationFinalization(bytes32,address)')
  let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
  let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')

  let initTokenHash = web3.sha3('CrowdsaleTokenInit(bytes32,bytes32,bytes32,uint256)')
  let updateMinHash = web3.sha3('GlobalMinUpdate(bytes32,uint256)')
  let timeUpdateHash = web3.sha3('CrowdsaleTimeUpdated(bytes32)')
  let initSaleHash = web3.sha3('CrowdsaleConfigured(bytes32,bytes32,uint256)')
  let finalSaleHash = web3.sha3('CrowdsaleFinalized(bytes32)')
  let transferAgentHash = web3.sha3('TransferAgentStatusUpdate(bytes32,address,bool)')

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    saleUtils = await DutchUtils.new().should.be.fulfilled

    regUtil = await RegistryUtil.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    saleIdx = await DutchSale.new().should.be.fulfilled
    token = await Token.new().should.be.fulfilled
    tokenMock = await TokenMock.new().should.be.fulfilled
    sale = await Sale.new().should.be.fulfilled
    admin = await Admin.new().should.be.fulfilled

    saleSelectors = await saleUtils.getSelectors.call().should.be.fulfilled
    saleSelectors.length.should.be.eq(16)

    saleAddrs = [
      // admin
      admin.address, admin.address, admin.address, admin.address,
      admin.address, admin.address, admin.address,

      // sale
      sale.address,

      // token
      token.address, token.address, token.address, token.address, token.address,

      // mock
      tokenMock.address, tokenMock.address, tokenMock.address
    ]
    saleAddrs.length.should.be.eq(saleSelectors.length)
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
      teamWallet, totalSupply, sellCap, startPrice, endPrice,
      duration, startTime, isWhitelisted, crowdsaleAdmin
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

    await storage.resetTime().should.be.fulfilled
  })

  describe('#initCrowdsaleToken', async () => {

    let initTokenCalldata
    let initTokenEvents
    let initTokenReturn

    describe('crowdsale storage with no initialized token', async () => {

      it('should not have information about the token, except the totalSupply', async () => {
        let tokenInfo = await saleIdx.getTokenInfo.call(
          storage.address, executionID
        ).should.be.fulfilled
        tokenInfo.length.should.be.eq(4)

        web3.toDecimal(tokenInfo[0]).should.be.eq(0)
        web3.toDecimal(tokenInfo[1]).should.be.eq(0)
        tokenInfo[2].toNumber().should.be.eq(0)
        tokenInfo[3].toNumber().should.be.eq(totalSupply)
      })

      it('should not have an initialized crowdsale', async () => {
        let saleInfo = await saleIdx.getCrowdsaleInfo.call(
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

      context('such as an invalid name', async () => {

        let invalidName = ''

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            invalidName, tokenSymbol, tokenDecimals
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

      context('such as an invalid symbol', async () => {

        let invalidSymbol = ''

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, invalidSymbol, tokenDecimals
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

      context('such as an invalid decimal count', async () => {

        let invalidDecimals = 19

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, invalidDecimals
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
    })

    context('when the token is initialized with valid parameters', async () => {

      context('when the sender is the admin', async () => {

        beforeEach(async () => {
          initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          initTokenReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).should.be.fulfilled

          initTokenEvents = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            initTokenReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            initTokenReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            initTokenReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            initTokenReturn[2].toNumber().should.be.eq(3)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            initTokenEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = initTokenEvents[1].topics
              eventData = initTokenEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              eventData.should.be.eq('0x00')
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = initTokenEvents[0].topics
              eventData = initTokenEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(4)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(initTokenHash))
            })

            it('should match the exec id, token name, and token symbol for the other topics', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
              hexStrEquals(eventTopics[2], tokenName).should.be.eq(true)
              hexStrEquals(eventTopics[3], tokenSymbol).should.be.eq(true)
            })

            it('should contain the number of decimals as the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(tokenDecimals)
            })
          })
        })

        describe('storage', async () => {

          let tokenInfo

          beforeEach(async () => {
            tokenInfo = await saleIdx.getTokenInfo.call(
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

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
        })

        it('should throw', async () => {
          await storage.exec(
            exec, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })
    })
  })

  describe('#updateGlobalMinContribution', async () => {

    let updateMinCalldata
    let updateMinEvents
    let updateMinReturn

    let updateTo = 100
    let updateToZero = 0

    context('when the crowdsale is already initialized', async () => {

      let invalidCalldata

      beforeEach(async () => {
        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        let invalidCalldata = await saleUtils.updateGlobalMinContribution.call(
          updateTo
        ).should.be.fulfilled
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

    context('when the crowdsale is not yet initialized', async () => {

      context('when the sender is the admin', async () => {

        context('when the new amount is 0', async () => {

          beforeEach(async () => {
            updateMinCalldata = await saleUtils.updateGlobalMinContribution.call(
              updateTo
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            let events = await storage.exec(
              crowdsaleAdmin, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.logs
            })
            events.should.not.eq(null)
            events.length.should.be.eq(1)
            events[0].event.should.be.eq('ApplicationExecution')

            updateMinCalldata = await saleUtils.updateGlobalMinContribution.call(
              updateToZero
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            updateMinReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, updateMinCalldata,
              { from: exec }
            ).should.be.fulfilled

            updateMinEvents = await storage.exec(
              crowdsaleAdmin, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              updateMinReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              updateMinReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              updateMinReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              updateMinReturn[2].toNumber().should.be.eq(1)
            })
          })

          describe('events', async () => {

            it('should have emitted 2 events total', async () => {
              updateMinEvents.length.should.be.eq(2)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = updateMinEvents[1].topics
                eventData = updateMinEvents[1].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                eventData.should.be.eq('0x00')
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = updateMinEvents[0].topics
                eventData = updateMinEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(2)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(updateMinHash))
              })

              it('should match the exec id for the other topic', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })
          })

          describe('storage', async () => {

            let crowdsaleInfo

            beforeEach(async () => {
              crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
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
            updateMinCalldata = await saleUtils.updateGlobalMinContribution.call(
              updateTo
            ).should.be.fulfilled
            updateMinCalldata.should.not.eq('0x')

            updateMinReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, updateMinCalldata,
              { from: exec }
            ).should.be.fulfilled

            updateMinEvents = await storage.exec(
              crowdsaleAdmin, executionID, updateMinCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              updateMinReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              updateMinReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              updateMinReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              updateMinReturn[2].toNumber().should.be.eq(1)
            })
          })

          describe('events', async () => {

            it('should have emitted 2 events total', async () => {
              updateMinEvents.length.should.be.eq(2)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = updateMinEvents[1].topics
                eventData = updateMinEvents[1].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                eventData.should.be.eq('0x00')
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = updateMinEvents[0].topics
                eventData = updateMinEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(2)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(updateMinHash))
              })

              it('should match the exec id for the other topic', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
              })

              it('should match the updated amount in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(updateTo)
              })
            })
          })

          describe('storage', async () => {

            let crowdsaleInfo

            beforeEach(async () => {
              crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
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

        beforeEach(async () => {
          let invalidCalldata = await saleUtils.updateGlobalMinContribution.call(
            updateTo
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
  })

  describe('#whitelistMulti', async () => {

    let whitelistCalldata
    let whitelistEvents
    let whitelistReturn

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

      context('such as mismatched input lengths', async () => {

        let invalidMultiMinimum = singleMinimumNonZero

        beforeEach(async () => {
          invalidCalldata = await saleUtils.whitelistMulti.call(
            multiWhitelist, invalidMultiMinimum, multiMaximum
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

      context('such as input lengths of 0', async () => {

        let invalidMultiWhitelist = []

        beforeEach(async () => {
          invalidCalldata = await saleUtils.whitelistMulti.call(
            invalidMultiWhitelist, multiMinimum, multiMaximum
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
    })

    context('when the input parameters are valid', async () => {

      context('when the sender is the admin', async () => {

        context('when multiple addresses are being updated', async () => {

          beforeEach(async () => {
            whitelistCalldata = await saleUtils.whitelistMulti.call(
              multiWhitelist, multiMinimum, multiMaximum
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            whitelistEvents = await storage.exec(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              whitelistReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              whitelistReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              whitelistReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              whitelistReturn[2].toNumber().should.be.eq(10)
            })
          })

          describe('events', async () => {

            it('should have emitted 1 events total', async () => {
              whitelistEvents.length.should.be.eq(1)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = whitelistEvents[0].topics
                eventData = whitelistEvents[0].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 3', async () => {
              let whitelistInfo = await saleIdx.getCrowdsaleWhitelist.call(
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
              let whitelistOneInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, multiWhitelist[0]
              ).should.be.fulfilled
              whitelistOneInfo.length.should.be.eq(2)

              let whitelistTwoInfo = await saleIdx.getWhitelistStatus.call(
                storage.address, executionID, multiWhitelist[1]
              ).should.be.fulfilled
              whitelistTwoInfo.length.should.be.eq(2)

              let whitelistThreeInfo = await saleIdx.getWhitelistStatus.call(
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
            whitelistCalldata = await saleUtils.whitelistMulti.call(
              singleWhitelist, singleMinimumNonZero, singleMaximumNonZero
            ).should.be.fulfilled
            whitelistCalldata.should.not.eq('0x')

            whitelistReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).should.be.fulfilled

            whitelistEvents = await storage.exec(
              crowdsaleAdmin, executionID, whitelistCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              whitelistReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              whitelistReturn[0].toNumber().should.be.eq(0)
            })

            it('should return the correct number of addresses paid', async () => {
              whitelistReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              whitelistReturn[2].toNumber().should.be.eq(4)
            })
          })

          describe('events', async () => {

            it('should have emitted 1 events total', async () => {
              whitelistEvents.length.should.be.eq(1)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = whitelistEvents[0].topics
                eventData = whitelistEvents[0].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })
          })

          describe('storage', async () => {

            it('should have a whitelist of length 1', async () => {
              let whitelistInfo = await saleIdx.getCrowdsaleWhitelist.call(
                storage.address, executionID
              ).should.be.fulfilled
              whitelistInfo.length.should.be.eq(2)

              whitelistInfo[0].toNumber().should.be.eq(1)
              whitelistInfo[1].length.should.be.eq(1)
              whitelistInfo[1][0].should.be.eq(singleWhitelist[0])
            })

            it('should have correct whitelist information for the whitelisted account', async () => {
              let whitelistOneInfo = await saleIdx.getWhitelistStatus.call(
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

        beforeEach(async () => {
          invalidCalldata = await saleUtils.whitelistMulti.call(
            multiWhitelist, multiMinimum, multiMaximum
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
  })

  describe('#setCrowdsaleStartandDuration', async () => {

    let newDuration = 1000
    let newStartTime

    let updateCalldata
    let updateEvents
    let updateReturn

    beforeEach(async () => {
      newStartTime = getTime() + 4000

      let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
        tokenName, tokenSymbol, tokenDecimals
      ).should.be.fulfilled
      initTokenCalldata.should.not.eq('0x')

      let events = await storage.exec(
        crowdsaleAdmin, executionID, initTokenCalldata,
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

      beforeEach(async () => {
        let initCrowdsaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')

        invalidCalldata = await saleUtils.setCrowdsaleStartandDuration.call(
          newStartTime, newDuration
        ).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        let events = await storage.exec(
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

    context('when the crowdsale is not initialized', async () => {

      context('but both of the input parameters are invalid', async () => {

        let invalidStartTime = startTime - 1
        let invalidDuration = 0

        let invalidCalldata

        beforeEach(async () => {

          invalidCalldata = await saleUtils.setCrowdsaleStartandDuration.call(
            invalidStartTime, invalidDuration
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

      context('and all of the parameters are valid', async () => {

        context('but the sender is not the admin', async () => {

          let invalidCalldata

          beforeEach(async () => {
            invalidCalldata = await saleUtils.setCrowdsaleStartandDuration.call(
              newStartTime, newDuration
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

        context('and the sender is the admin', async () => {

          beforeEach(async () => {

            updateCalldata = await saleUtils.setCrowdsaleStartandDuration.call(
              newStartTime, newDuration
            ).should.be.fulfilled
            updateCalldata.should.not.eq('0x')

            updateReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, updateCalldata,
              { from: exec }
            ).should.be.fulfilled

            updateEvents = await storage.exec(
              crowdsaleAdmin, executionID, updateCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              updateReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              updateReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              updateReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              updateReturn[2].toNumber().should.be.eq(2)
            })
          })

          describe('events', async () => {

            it('should have emitted 2 events total', async () => {
              updateEvents.length.should.be.eq(2)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = updateEvents[1].topics
                eventData = updateEvents[1].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = updateEvents[0].topics
                eventData = updateEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(2)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(timeUpdateHash))
              })

              it('should match the exec id for the other topic', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })
          })

          describe('storage', async () => {

            it('should have correctly updated the start time and duration', async () => {
              let timeInfo = await saleIdx.getCrowdsaleStartAndEndTimes.call(
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

  describe('#setTransferAgentStatus', async () => {

    let agentCalldata
    let agentEvents
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
          crowdsaleAdmin, executionID, setBalanceCalldata,
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
            web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
            web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
          })

          it('should have an empty data field', async () => {
            eventData.should.be.eq('0x00')
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
          balanceInfo.toNumber().should.be.eq(50 + (totalSupply - sellCap))

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

  describe('#initializeCrowdsale', async () => {

    let initSaleCalldata
    let initSaleEvents
    let initSaleReturn

    context('when the crowdsale has already started', async () => {

      let invalidCalldata

      beforeEach(async () => {
        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.be.eq('0x')

        invalidCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
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

        await storage.setTime(startTime + 1).should.be.fulfilled
        let storedTime = await storage.getTime().should.be.fulfilled
        storedTime.toNumber().should.be.eq(startTime + 1)
      })

      it('should throw', async () => {
        await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })
    })

    context('when the crowdsale has not yet started', async () => {

      context('when the crowdsale token is not initialized', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            crowdsaleAdmin, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the crowdsale token is initialized', async () => {

        beforeEach(async () => {
          let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
            tokenName, tokenSymbol, tokenDecimals
          ).should.be.fulfilled
          initTokenCalldata.should.not.eq('0x')

          let events = await storage.exec(
            crowdsaleAdmin, executionID, initTokenCalldata,
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

          beforeEach(async () => {
            invalidCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              exec, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })

        context('and the sender is the admin', async () => {

          beforeEach(async () => {
            initSaleCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
            initSaleCalldata.should.not.eq('0x')

            initSaleReturn = await storage.exec.call(
              crowdsaleAdmin, executionID, initSaleCalldata,
              { from: exec }
            ).should.be.fulfilled

            initSaleEvents = await storage.exec(
              crowdsaleAdmin, executionID, initSaleCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              initSaleReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              initSaleReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              initSaleReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              initSaleReturn[2].toNumber().should.be.eq(1)
            })
          })

          describe('events', async () => {

            it('should have emitted 2 events total', async () => {
              initSaleEvents.length.should.be.eq(2)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = initSaleEvents[1].topics
                eventData = initSaleEvents[1].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
              })

              it('should have an empty data field', async () => {
                web3.toDecimal(eventData).should.be.eq(0)
              })
            })

            describe('the other event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = initSaleEvents[0].topics
                eventData = initSaleEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(initSaleHash))
              })

              it('should match the exec id and token name for the other topics', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
                hexStrEquals(eventTopics[2], tokenName).should.be.eq(true)
              })

              it('should match the start time in the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(startTime)
              })
            })
          })

          describe('storage', async () => {

            it('should have an initialized token', async () => {
              let tokenInfo = await saleIdx.getTokenInfo.call(
                storage.address, executionID
              ).should.be.fulfilled
              tokenInfo.length.should.be.eq(4)

              hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
              hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
              tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
              tokenInfo[3].toNumber().should.be.eq(totalSupply)
            })

            it('should have an initialized crowdsale', async () => {
              let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
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
    let finalizeEvents
    let finalizeReturn

    context('when the crowdsale is not yet intialized', async () => {

      let invalidCalldata

      beforeEach(async () => {
        invalidCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
        invalidCalldata.should.not.eq('0x')
      })

      it('should throw', async () => {
        await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })
    })

    context('when the crowdsale is already finalized', async () => {

      let invalidCalldata

      beforeEach(async () => {
        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

        invalidCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
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
          crowdsaleAdmin, executionID, initCrCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          crowdsaleAdmin, executionID, invalidCalldata,
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

    context('when the crowdsale is in a valid state to be finalized', async () => {

      beforeEach(async () => {

        let initTokenCalldata = await saleUtils.initCrowdsaleToken.call(
          tokenName, tokenSymbol, tokenDecimals
        ).should.be.fulfilled
        initTokenCalldata.should.not.eq('0x')

        let initCrCalldata = await saleUtils.initializeCrowdsale.call().should.be.fulfilled
        initCrCalldata.should.not.eq('0x')

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
          crowdsaleAdmin, executionID, initCrCalldata,
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

        beforeEach(async () => {
          invalidCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            exec, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('and the sender is the admin', async () => {

        beforeEach(async () => {
          finalizeCalldata = await saleUtils.finalizeCrowdsale.call().should.be.fulfilled
          finalizeCalldata.should.not.eq('0x')

          finalizeReturn = await storage.exec.call(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).should.be.fulfilled

          finalizeEvents = await storage.exec(
            crowdsaleAdmin, executionID, finalizeCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            finalizeReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            finalizeReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            finalizeReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            finalizeReturn[2].toNumber().should.be.eq(1)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            finalizeEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = finalizeEvents[1].topics
              eventData = finalizeEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(admin.address))
              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })

          describe('the other event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = finalizeEvents[0].topics
              eventData = finalizeEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(2)
            })

            it('should match the event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(finalSaleHash))
            })

            it('should match the exec id for the other topic', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(executionID))
            })

            it('should have an empty data field', async () => {
              web3.toDecimal(eventData).should.be.eq(0)
            })
          })
        })

        describe('storage', async () => {

          it('should have an initialized token', async () => {
            let tokenInfo = await saleIdx.getTokenInfo.call(
              storage.address, executionID
            ).should.be.fulfilled
            tokenInfo.length.should.be.eq(4)

            hexStrEquals(tokenInfo[0], tokenName).should.be.eq(true)
            hexStrEquals(tokenInfo[1], tokenSymbol).should.be.eq(true)
            tokenInfo[2].toNumber().should.be.eq(tokenDecimals)
            tokenInfo[3].toNumber().should.be.eq(totalSupply)
          })

          it('should have an initialized and finalized crowdsale', async () => {
            let crowdsaleInfo = await saleIdx.getCrowdsaleInfo.call(
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
