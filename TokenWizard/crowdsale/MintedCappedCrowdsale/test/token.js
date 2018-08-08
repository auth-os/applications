// Abstract storage contract
let AbstractStorage = artifacts.require('./AbstractStorage')
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

contract('#MintableToken', function (accounts) {

  let storage

  let exec = accounts[0]
  let crowdsaleAdmin = accounts[1]
  let teamWallet = accounts[2]

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
  let initialTierMin = 1000
  let initialTierIsWhitelisted = true
  let initialTierDurIsModifiable = true

  let tokenName = 'Token'
  let tokenSymbol = 'TOK'
  let tokenDecimals = 18

  let stdBalance = 100

  // Event signatures
  let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
  let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
  let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')

  let transferHash = web3.sha3('Transfer(address,address,uint256)')
  let approvalHash = web3.sha3('Approval(address,address,uint256)')

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
      initialTierDuration, initialTierTokenSellCap, initialTierMin, initialTierIsWhitelisted,
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

  describe('/TokenTransfer', async () => {

    let transferCalldata
    let transferEvent

    let senderAccount = accounts[accounts.length - 1]
    let recipientAccount = accounts[accounts.length - 2]

    beforeEach(async () => {

      let setBalanceCalldata = await saleUtils.setBalance.call(
        senderAccount, stdBalance
      ).should.be.fulfilled
      setBalanceCalldata.should.not.eq('0x')

      let events = await storage.exec(
        exec, executionID, setBalanceCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      let balanceInfo = await saleIdx.balanceOf.call(
        storage.address, executionID, senderAccount
      ).should.be.fulfilled
      balanceInfo.toNumber().should.be.eq(stdBalance)
    })

    context('when the token is locked', async () => {

      let unlockedSender = accounts[accounts.length - 3]

      beforeEach(async () => {
        let unlockCalldata = await saleUtils.setTransferAgent.call(
          unlockedSender, true
        ).should.be.fulfilled
        unlockCalldata.should.not.eq('0x')

        let setBalanceCalldata = await saleUtils.setBalance.call(
          unlockedSender, stdBalance
        ).should.be.fulfilled
        setBalanceCalldata.should.not.eq('0x')

        let events = await storage.exec(
          exec, executionID, unlockCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        events = await storage.exec(
          exec, executionID, setBalanceCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        let balanceInfo = await saleIdx.balanceOf.call(
          storage.address, executionID, unlockedSender
        ).should.be.fulfilled
        balanceInfo.toNumber().should.be.eq(stdBalance)

        let transferAgentInfo = await saleIdx.getTransferAgentStatus.call(
          storage.address, executionID, unlockedSender
        ).should.be.fulfilled
        transferAgentInfo.should.be.eq(true)
      })

      context('and the sender is not a transfer agent', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transfer.call(
            recipientAccount, stdBalance / 2
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            senderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('and the sender is a transfer agent', async () => {

        let execEvents
        let execReturn

        beforeEach(async () => {
          transferCalldata = await saleUtils.transfer.call(
            recipientAccount, stdBalance / 2
          ).should.be.fulfilled
          transferCalldata.should.not.eq('0x')

          let balanceInfo = await saleIdx.balanceOf.call(
            storage.address, executionID, unlockedSender
          ).should.be.fulfilled
          balanceInfo.toNumber().should.be.eq(stdBalance)
          let transferAgentInfo = await saleIdx.getTransferAgentStatus.call(
            storage.address, executionID, unlockedSender
          ).should.be.fulfilled
          transferAgentInfo.should.be.eq(true)
          let targetInfo = await storage.getTarget.call(executionID, '0xa9059cbb')
          execReturn = await storage.exec.call(
            unlockedSender, executionID, transferCalldata,
            { from: exec }
          ).should.be.fulfilled
          execEvents = await storage.exec(
            unlockedSender, executionID, transferCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            execReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            execReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            execReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            execReturn[2].toNumber().should.be.eq(2)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            execEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = execEvents[1].topics
              eventData = execEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
              eventTopics = execEvents[0].topics
              eventData = execEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the Transfer event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
            })

            it('should match the sender and recipient addresses for the other two topics', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(unlockedSender))
              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
            })

            it('should contain the number of tokens transferred as the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(stdBalance / 2)
            })
          })
        })

        describe('storage', async () => {

          it('should have changed the sender\'s balance', async () => {
            let senderInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, unlockedSender
            ).should.be.fulfilled
            senderInfo.toNumber().should.be.eq(stdBalance / 2)
          })

          it('should have changed the recipient\'s balance', async () => {
            let recipientInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(stdBalance / 2)
          })
        })
      })
    })

    context('when the token is unlocked', async () => {

      beforeEach(async () => {
        let unlockTokenCalldata = await saleUtils.unlockToken.call().should.be.fulfilled
        unlockTokenCalldata.should.not.eq('0x')

        let events = await storage.exec(
          exec, executionID, unlockTokenCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')
      })

      context('when the recipient address is invalid', async () => {

        let invalidCalldata

        let invalidRecipient = zeroAddress();

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transfer.call(
            invalidRecipient, stdBalance / 2
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            senderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the recipient address is the sender', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transfer.call(
            senderAccount, stdBalance / 2
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            senderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the recipient address is valid', async () => {

        context('when the sender has insufficient balance', async () => {

          let invalidCalldata

          let invalidSendAmt = stdBalance + 1

          beforeEach(async () => {
            invalidCalldata = await saleUtils.transfer.call(
              recipientAccount, invalidSendAmt
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              senderAccount, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })

        context('when the sender has sufficient balance', async () => {

          let execEvents
          let execReturn

          beforeEach(async () => {
            transferCalldata = await saleUtils.transfer.call(
              recipientAccount, stdBalance
            ).should.be.fulfilled
            transferCalldata.should.not.eq('0x')

            execReturn = await storage.exec.call(
              senderAccount, executionID, transferCalldata,
              { from: exec }
            ).should.be.fulfilled

            execEvents = await storage.exec(
              senderAccount, executionID, transferCalldata,
              { from: exec }
            ).then((tx) => {
              return tx.receipt.logs
            })
          })

          describe('returned data', async () => {

            it('should return a tuple with 3 fields', async () => {
              execReturn.length.should.be.eq(3)
            })

            it('should return the correct number of events emitted', async () => {
              execReturn[0].toNumber().should.be.eq(1)
            })

            it('should return the correct number of addresses paid', async () => {
              execReturn[1].toNumber().should.be.eq(0)
            })

            it('should return the correct number of storage slots written to', async () => {
              execReturn[2].toNumber().should.be.eq(2)
            })
          })

          describe('events', async () => {

            it('should have emitted 2 events total', async () => {
              execEvents.length.should.be.eq(2)
            })

            describe('the ApplicationExecution event', async () => {

              let eventTopics
              let eventData

              beforeEach(async () => {
                eventTopics = execEvents[1].topics
                eventData = execEvents[1].data
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
                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
                eventTopics = execEvents[0].topics
                eventData = execEvents[0].data
              })

              it('should have the correct number of topics', async () => {
                eventTopics.length.should.be.eq(3)
              })

              it('should match the Transfer event signature for the first topic', async () => {
                let sig = eventTopics[0]
                web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
              })

              it('should match the sender and recipient addresses for the other two topics', async () => {
                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(senderAccount))
                web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
              })

              it('should contain the number of tokens transferred as the data field', async () => {
                web3.toDecimal(eventData).should.be.eq(stdBalance)
              })
            })
          })

          describe('storage', async () => {

            it('should have changed the sender\'s balance', async () => {
              let senderInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, senderAccount
              ).should.be.fulfilled
              senderInfo.toNumber().should.be.eq(0)
            })

            it('should have changed the recipient\'s balance', async () => {
              let recipientInfo = await saleIdx.balanceOf.call(
                storage.address, executionID, recipientAccount
              ).should.be.fulfilled
              recipientInfo.toNumber().should.be.eq(stdBalance)
            })
          })
        })
      })
    })
  })

  describe('/TokenApprove', async () => {

    let approveCalldata
    let approveEvent

    let ownerAccount = accounts[accounts.length - 1]
    let spenderAccount = accounts[accounts.length - 2]

    let stdApproval = 1000

    beforeEach(async () => {
      let setBalanceCalldata = await saleUtils.setBalance.call(
        spenderAccount, stdBalance
      ).should.be.fulfilled
      setBalanceCalldata.should.not.eq('0x')

      let events = await storage.exec(
        exec, executionID, setBalanceCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      let balanceInfo = await saleIdx.balanceOf.call(
        storage.address, executionID, spenderAccount
      ).should.be.fulfilled
      balanceInfo.toNumber().should.be.eq(stdBalance)
    })

    describe('-approve', async () => {

      let execEvents
      let execReturn

      beforeEach(async () => {
        approveCalldata = await saleUtils.approve.call(
          spenderAccount, stdApproval
        ).should.be.fulfilled
        approveCalldata.should.not.eq('0x')

        execReturn = await storage.exec.call(
          ownerAccount, executionID, approveCalldata,
          { from: exec }
        ).should.be.fulfilled

        execEvents = await storage.exec(
          ownerAccount, executionID, approveCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.receipt.logs
        })
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          execReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          execReturn[0].toNumber().should.be.eq(1)
        })

        it('should return the correct number of addresses paid', async () => {
          execReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          execReturn[2].toNumber().should.be.eq(1)
        })
      })

      describe('events', async () => {

        it('should have emitted 2 events total', async () => {
          execEvents.length.should.be.eq(2)
        })

        describe('the ApplicationExecution event', async () => {

          let eventTopics
          let eventData

          beforeEach(async () => {
            eventTopics = execEvents[1].topics
            eventData = execEvents[1].data
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
            web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
            eventTopics = execEvents[0].topics
            eventData = execEvents[0].data
          })

          it('should have the correct number of topics', async () => {
            eventTopics.length.should.be.eq(3)
          })

          it('should match the Transfer event signature for the first topic', async () => {
            let sig = eventTopics[0]
            web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
          })

          it('should match the owner and spender addresses for the other two topics', async () => {
            web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
            web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
          })

          it('should contain the number of tokens approved as the data field', async () => {
            web3.toDecimal(eventData).should.be.eq(stdApproval)
          })
        })
      })

      describe('storage', async () => {

        it('should have changed the spender\'s allowance', async () => {
          let spenderInfo = await saleIdx.allowance.call(
            storage.address, executionID, ownerAccount, spenderAccount
          ).should.be.fulfilled
          spenderInfo.toNumber().should.be.eq(stdApproval)
        })
      })
    })

    describe('-increaseApproval', async () => {

      let execEvents
      let execReturn

      beforeEach(async () => {
        approveCalldata = await saleUtils.increaseApproval.call(
          spenderAccount, stdApproval
        ).should.be.fulfilled
        approveCalldata.should.not.eq('0x')

        execReturn = await storage.exec.call(
          ownerAccount, executionID, approveCalldata,
          { from: exec }
        ).should.be.fulfilled

        execEvents = await storage.exec(
          ownerAccount, executionID, approveCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.receipt.logs
        })
      })

      describe('returned data', async () => {

        it('should return a tuple with 3 fields', async () => {
          execReturn.length.should.be.eq(3)
        })

        it('should return the correct number of events emitted', async () => {
          execReturn[0].toNumber().should.be.eq(1)
        })

        it('should return the correct number of addresses paid', async () => {
          execReturn[1].toNumber().should.be.eq(0)
        })

        it('should return the correct number of storage slots written to', async () => {
          execReturn[2].toNumber().should.be.eq(1)
        })
      })

      describe('events', async () => {

        it('should have emitted 2 events total', async () => {
          execEvents.length.should.be.eq(2)
        })

        describe('the ApplicationExecution event', async () => {

          let eventTopics
          let eventData

          beforeEach(async () => {
            eventTopics = execEvents[1].topics
            eventData = execEvents[1].data
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
            web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
            eventTopics = execEvents[0].topics
            eventData = execEvents[0].data
          })

          it('should have the correct number of topics', async () => {
            eventTopics.length.should.be.eq(3)
          })

          it('should match the Transfer event signature for the first topic', async () => {
            let sig = eventTopics[0]
            web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
          })

          it('should match the owner and spender addresses for the other two topics', async () => {
            web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
            web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
          })

          it('should contain the number of tokens approved as the data field', async () => {
            web3.toDecimal(eventData).should.be.eq(stdApproval)
          })
        })
      })

      describe('storage', async () => {

        it('should have changed the spender\'s allowance', async () => {
          let spenderInfo = await saleIdx.allowance.call(
            storage.address, executionID, ownerAccount, spenderAccount
          ).should.be.fulfilled
          spenderInfo.toNumber().should.be.eq(stdApproval)
        })
      })
    })

    describe('-decreaseApproval', async () => {

      beforeEach(async () => {

        let preApprovalCalldata = await saleUtils.approve.call(
          spenderAccount, stdApproval
        ).should.be.fulfilled
        preApprovalCalldata.should.not.eq('0x')

        let events = await storage.exec(
          ownerAccount, executionID, preApprovalCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        let approvalInfo = await saleIdx.allowance.call(
          storage.address, executionID, ownerAccount, spenderAccount
        ).should.be.fulfilled
        approvalInfo.toNumber().should.be.eq(stdApproval)
      })

      context('when the amount to approve would underflow the spender\'s allowance', async () => {

        let execEvents
        let execReturn

        beforeEach(async () => {

          approveCalldata = await saleUtils.decreaseApproval.call(
            spenderAccount, stdApproval + 1
          ).should.be.fulfilled
          approveCalldata.should.not.eq('0x')

          execReturn = await storage.exec.call(
            ownerAccount, executionID, approveCalldata,
            { from: exec }
          ).should.be.fulfilled

          execEvents = await storage.exec(
            ownerAccount, executionID, approveCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            execReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            execReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            execReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            execReturn[2].toNumber().should.be.eq(1)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            execEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = execEvents[1].topics
              eventData = execEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
              eventTopics = execEvents[0].topics
              eventData = execEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the Transfer event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
            })

            it('should match the owner and spender addresses for the other two topics', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
            })

            it('should contain the number of tokens approved as the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(stdApproval + 1)
            })
          })
        })

        describe('storage', async () => {

          it('should have changed the spender\'s allowance', async () => {
            let spenderInfo = await saleIdx.allowance.call(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('when the amount to approve would not underflow', async () => {

        let execEvents
        let execReturn

        beforeEach(async () => {
          approveCalldata = await saleUtils.decreaseApproval.call(
            spenderAccount, stdApproval - 1
          ).should.be.fulfilled
          approveCalldata.should.not.eq('0x')

          execReturn = await storage.exec.call(
            ownerAccount, executionID, approveCalldata,
            { from: exec }
          ).should.be.fulfilled

          execEvents = await storage.exec(
            ownerAccount, executionID, approveCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            execReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            execReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            execReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            execReturn[2].toNumber().should.be.eq(1)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            execEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = execEvents[1].topics
              eventData = execEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
              eventTopics = execEvents[0].topics
              eventData = execEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the Transfer event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
            })

            it('should match the owner and spender addresses for the other two topics', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
            })

            it('should contain the number of tokens approved as the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(stdApproval - 1)
            })
          })
        })

        describe('storage', async () => {

          it('should have changed the spender\'s allowance', async () => {
            let spenderInfo = await saleIdx.allowance.call(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(1)
          })
        })
      })
    })
  })

  describe('/TokenTransferFrom', async () => {

    let transferCalldata
    let transferEvent

    let spenderAccount = accounts[accounts.length - 1]
    let ownerAccount = accounts[accounts.length - 2]
    let recipientAccount = accounts[accounts.length - 3]

    beforeEach(async () => {

      let setBalanceCalldata = await saleUtils.setBalance.call(
        ownerAccount, stdBalance
      ).should.be.fulfilled
      setBalanceCalldata.should.not.eq('0x')

      let setAllowanceCalldata = await saleUtils.approve.call(
        spenderAccount, stdBalance - 1
      ).should.be.fulfilled
      setAllowanceCalldata.should.not.eq('0x')

      let events = await storage.exec(
        exec, executionID, setBalanceCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      events = await storage.exec(
        ownerAccount, executionID, setAllowanceCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      let balanceInfo = await saleIdx.balanceOf.call(
        storage.address, executionID, ownerAccount
      ).should.be.fulfilled
      balanceInfo.toNumber().should.be.eq(stdBalance)

      let allowanceInfo = await saleIdx.allowance.call(
        storage.address, executionID, ownerAccount, spenderAccount
      ).should.be.fulfilled
      allowanceInfo.toNumber().should.be.eq(stdBalance - 1)
    })

    context('when the token is locked', async () => {

      context('and the owner is not a transfer agent', async () => {

        let invalidCalldata

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transferFrom.call(
            ownerAccount, recipientAccount, 1
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            spenderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('and the owner is a transfer agent', async () => {

        let execEvents
        let execReturn

        beforeEach(async () => {

          let setTransferAgentCalldata = await saleUtils.setTransferAgent.call(
            ownerAccount, true
          ).should.be.fulfilled
          setTransferAgentCalldata.should.not.eq('0x')

          let events = await storage.exec(
            exec, executionID, setTransferAgentCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          let transferAgentInfo = await saleIdx.getTransferAgentStatus.call(
            storage.address, executionID, ownerAccount
          ).should.be.fulfilled
          transferAgentInfo.should.be.eq(true)

          transferCalldata = await saleUtils.transferFrom.call(
            ownerAccount, recipientAccount, 1
          ).should.be.fulfilled
          transferCalldata.should.not.eq('0x')

          execReturn= await storage.exec.call(
            spenderAccount, executionID, transferCalldata,
            { from: exec }
          ).should.be.fulfilled

          execEvents = await storage.exec(
            spenderAccount, executionID, transferCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.receipt.logs
          })
        })

        describe('returned data', async () => {

          it('should return a tuple with 3 fields', async () => {
            execReturn.length.should.be.eq(3)
          })

          it('should return the correct number of events emitted', async () => {
            execReturn[0].toNumber().should.be.eq(1)
          })

          it('should return the correct number of addresses paid', async () => {
            execReturn[1].toNumber().should.be.eq(0)
          })

          it('should return the correct number of storage slots written to', async () => {
            execReturn[2].toNumber().should.be.eq(3)
          })
        })

        describe('events', async () => {

          it('should have emitted 2 events total', async () => {
            execEvents.length.should.be.eq(2)
          })

          describe('the ApplicationExecution event', async () => {

            let eventTopics
            let eventData

            beforeEach(async () => {
              eventTopics = execEvents[1].topics
              eventData = execEvents[1].data
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
              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
              eventTopics = execEvents[0].topics
              eventData = execEvents[0].data
            })

            it('should have the correct number of topics', async () => {
              eventTopics.length.should.be.eq(3)
            })

            it('should match the Transfer event signature for the first topic', async () => {
              let sig = eventTopics[0]
              web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
            })

            it('should match the owner and recipient addresses for the other two topics', async () => {
              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
            })

            it('should contain the number of tokens transferred as the data field', async () => {
              web3.toDecimal(eventData).should.be.eq(1)
            })
          })
        })

        describe('storage', async () => {

          it('should have changed the spender\'s allownace', async () => {
            let spenderInfo = await saleIdx.allowance.call(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(stdBalance - 2)
          })

          it('should have changed the owner\'s balance', async () => {
            let ownerInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, ownerAccount
            ).should.be.fulfilled
            ownerInfo.toNumber().should.be.eq(stdBalance - 1)
          })

          it('should have changed the recipient\'s balance', async () => {
            let recipientInfo = await saleIdx.balanceOf.call(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(1)
          })
        })
      })
    })

    context('when the token is unlocked', async () => {

      beforeEach(async () => {
        let unlockCalldata = await saleUtils.unlockToken.call().should.be.fulfilled
        unlockCalldata.should.not.eq('0x')

        let events = await storage.exec(
          exec, executionID, unlockCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')
      })

      context('when the recipient address is the same as the owner', async () => {

        let invalidCalldata

        let invalidAddress = ownerAccount

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transferFrom.call(
            ownerAccount, invalidAddress, 1
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            spenderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the recipient address is invalid', async () => {

        let invalidCalldata

        let invalidAddress = zeroAddress()

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transferFrom.call(
            ownerAccount, invalidAddress, 1
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            spenderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the owner address is invalid', async () => {

        let invalidCalldata

        let invalidAddress = zeroAddress()

        beforeEach(async () => {
          invalidCalldata = await saleUtils.transferFrom.call(
            invalidAddress, recipientAccount, 1
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')
        })

        it('should throw', async () => {
          await storage.exec(
            spenderAccount, executionID, invalidCalldata,
            { from: exec }
          ).should.not.be.fulfilled
        })
      })

      context('when the recipient address is valid', async () => {

        context('when the spender has insufficient allowance', async () => {

          let invalidCalldata

          beforeEach(async () => {
            invalidCalldata = await saleUtils.transferFrom.call(
              ownerAccount, recipientAccount, stdBalance
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')
          })

          it('should throw', async () => {
            await storage.exec(
              spenderAccount, executionID, invalidCalldata,
              { from: exec }
            ).should.not.be.fulfilled
          })
        })

        context('when the spender has sufficient allowance', async () => {

          context('but the owner has insufficient balance', async () => {

            let invalidCalldata

            beforeEach(async () => {
              let preTransferCalldata = await saleUtils.transfer.call(
                spenderAccount, 2
              ).should.be.fulfilled
              preTransferCalldata.should.not.eq('0x')

              invalidCalldata = await saleUtils.transferFrom.call(
                ownerAccount, recipientAccount, stdBalance - 1
              ).should.be.fulfilled
              invalidCalldata.should.not.eq('0x')

              let events = await storage.exec(
                ownerAccount, executionID, preTransferCalldata,
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
                spenderAccount, executionID, invalidCalldata,
                { from: exec }
              ).should.not.be.fulfilled
            })
          })

          context('and the owner has sufficient balance', async () => {

            let execEvents
            let execReturn

            beforeEach(async () => {

              transferCalldata = await saleUtils.transferFrom.call(
                ownerAccount, recipientAccount, stdBalance - 1
              ).should.be.fulfilled
              transferCalldata.should.not.eq('0x')

              execReturn = await storage.exec.call(
                spenderAccount, executionID, transferCalldata,
                { from: exec }
              ).should.be.fulfilled

              execEvents = await storage.exec(
                spenderAccount, executionID, transferCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.receipt.logs
              })
            })

            describe('returned data', async () => {

              it('should return a tuple with 3 fields', async () => {
                execReturn.length.should.be.eq(3)
              })

              it('should return the correct number of events emitted', async () => {
                execReturn[0].toNumber().should.be.eq(1)
              })

              it('should return the correct number of addresses paid', async () => {
                execReturn[1].toNumber().should.be.eq(0)
              })

              it('should return the correct number of storage slots written to', async () => {
                execReturn[2].toNumber().should.be.eq(3)
              })
            })

            describe('events', async () => {

              it('should have emitted 2 events total', async () => {
                execEvents.length.should.be.eq(2)
              })

              describe('the ApplicationExecution event', async () => {

                let eventTopics
                let eventData

                beforeEach(async () => {
                  eventTopics = execEvents[1].topics
                  eventData = execEvents[1].data
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
                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(token.address))
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
                  eventTopics = execEvents[0].topics
                  eventData = execEvents[0].data
                })

                it('should have the correct number of topics', async () => {
                  eventTopics.length.should.be.eq(3)
                })

                it('should match the Transfer event signature for the first topic', async () => {
                  let sig = eventTopics[0]
                  web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
                })

                it('should match the owner and recipient addresses for the other two topics', async () => {
                  web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
                  web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
                })

                it('should contain the number of tokens transferred as the data field', async () => {
                  web3.toDecimal(eventData).should.be.eq(stdBalance - 1)
                })
              })
            })

            describe('storage', async () => {

              it('should have changed the spender\'s allownace', async () => {
                let spenderInfo = await saleIdx.allowance.call(
                  storage.address, executionID, ownerAccount, spenderAccount
                ).should.be.fulfilled
                spenderInfo.toNumber().should.be.eq(0)
              })

              it('should have changed the owner\'s balance', async () => {
                let ownerInfo = await saleIdx.balanceOf.call(
                  storage.address, executionID, ownerAccount
                ).should.be.fulfilled
                ownerInfo.toNumber().should.be.eq(1)
              })

              it('should have changed the recipient\'s balance', async () => {
                let recipientInfo = await saleIdx.balanceOf.call(
                  storage.address, executionID, recipientAccount
                ).should.be.fulfilled
                recipientInfo.toNumber().should.be.eq(stdBalance - 1)
              })
            })
          })
        })
      })
    })
  })
})
