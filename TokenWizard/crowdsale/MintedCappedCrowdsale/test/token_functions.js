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
let TokenUtils = artifacts.require('./TokenFunctionsUtil')
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

contract('#MintableToken', function (accounts) {

  let storage
  let testUtils
  let tokenUtils

  let exec = accounts[0]
  let updater = accounts[1]
  let crowdsaleAdmin = accounts[2]
  let teamWallet = accounts[3]

  let initCrowdsale
  let crowdsaleBuy
  let crowdsaleConsole
  let tokenMock
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

  let stdBalance = 100

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled
    tokenUtils = await TokenUtils.new().should.be.fulfilled

    initCrowdsale = await InitMintedCapped.new().should.be.fulfilled
    crowdsaleBuy = await MintedCappedBuy.new().should.be.fulfilled
    crowdsaleConsole = await MintedCappedCrowdsaleConsole.new().should.be.fulfilled
    tokenMock = await TokenFunctionsMock.new().should.be.fulfilled
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
        crowdsaleBuy.address, crowdsaleConsole.address, tokenMock.address,
        tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
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
  })

  describe('/TokenTransfer', async () => {

    let transferCalldata
    let transferEvent

    let senderAccount = accounts[accounts.length - 1]
    let recipientAccount = accounts[accounts.length - 2]

    let senderContext

    beforeEach(async () => {
      senderContext = await testUtils.getContext(
        executionID, senderAccount, 0
      ).should.be.fulfilled
      senderContext.should.not.eq('0x')

      let setBalanceCalldata = await tokenUtils.setBalance(
        senderAccount, stdBalance
      ).should.be.fulfilled
      setBalanceCalldata.should.not.eq('0x')

      let events = await storage.exec(
        tokenMock.address, executionID, setBalanceCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)

      events[0].event.should.be.eq('ApplicationExecution')

      let balanceInfo = await initCrowdsale.balanceOf(
        storage.address, executionID, senderAccount
      ).should.be.fulfilled
      balanceInfo.toNumber().should.be.eq(stdBalance)
    })

    context('when the token is locked', async () => {

      let unlockedSender = accounts[accounts.length - 3]
      let unlockedContext

      beforeEach(async () => {
        unlockedContext = await testUtils.getContext(
          executionID, unlockedSender, 0
        ).should.be.fulfilled
        unlockedContext.should.not.eq('0x')

        let unlockCalldata = await tokenUtils.setTransferAgentStatus(
          unlockedSender, true
        ).should.be.fulfilled
        unlockCalldata.should.not.eq('0x')

        let setBalanceCalldata = await tokenUtils.setBalance(
          unlockedSender, stdBalance
        ).should.be.fulfilled
        setBalanceCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenMock.address, executionID, unlockCalldata,
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

        let balanceInfo = await initCrowdsale.balanceOf(
          storage.address, executionID, unlockedSender
        ).should.be.fulfilled
        balanceInfo.toNumber().should.be.eq(stdBalance)

        let transferAgentInfo = await initCrowdsale.getTransferAgentStatus(
          storage.address, executionID, unlockedSender
        ).should.be.fulfilled
        transferAgentInfo.should.be.eq(true)
      })

      context('and the sender is not a transfer agent', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await tokenUtils.transfer(
            recipientAccount, stdBalance / 2, senderContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenTransfer.address, executionID, invalidCalldata,
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

          it('should match the TokenTransfer address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenTransfer.address)
          })

          it('should contain the error message \'TransfersLocked\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'TransfersLocked').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

          it('should maintain the sender\'s balance', async () => {
            let senderInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, senderAccount
            ).should.be.fulfilled
            senderInfo.toNumber().should.be.eq(stdBalance)
          })

          it('should not have changed the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('and the sender is a transfer agent', async () => {

        beforeEach(async () => {
          transferCalldata = await tokenUtils.transfer(
            recipientAccount, stdBalance / 2, unlockedContext
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
          transferEvent = events[0]
        })

        it('should emit an ApplicationExecution event', async () => {
          transferEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = transferEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the TokenTransfer address', async () => {
            let emittedAppAddr = transferEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenTransfer.address)
          })
        })

        describe('the resulting token storage', async () => {

          it('should have changed the sender\'s balance', async () => {
            let senderInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, unlockedSender
            ).should.be.fulfilled
            senderInfo.toNumber().should.be.eq(stdBalance / 2)
          })

          it('should have changed the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(stdBalance / 2)
          })
        })
      })
    })

    context('when the token is unlocked', async () => {

      beforeEach(async () => {
        let unlockTokenCalldata = await tokenUtils.unlockToken().should.be.fulfilled
        unlockTokenCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenMock.address, executionID, unlockTokenCalldata,
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
        let invalidEvent

        let invalidRecipient = zeroAddress();

        beforeEach(async () => {
          invalidCalldata = await tokenUtils.transfer(
            invalidRecipient, stdBalance / 2, senderContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenTransfer.address, executionID, invalidCalldata,
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

          it('should match the TokenTransfer address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenTransfer.address)
          })

          it('should contain the error message \'InvalidRecipient\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidRecipient').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

          it('should maintain the sender\'s balance', async () => {
            let senderInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, senderAccount
            ).should.be.fulfilled
            senderInfo.toNumber().should.be.eq(stdBalance)
          })

          it('should not have changed the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, invalidRecipient
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('when the recipient address is valid', async () => {

        context('when the sender has insufficient balance', async () => {

          let invalidCalldata
          let invalidEvent

          let invalidSendAmt = stdBalance + 1

          beforeEach(async () => {
            invalidCalldata = await tokenUtils.transfer(
              recipientAccount, invalidSendAmt, senderContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenTransfer.address, executionID, invalidCalldata,
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

            it('should match the TokenTransfer address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(tokenTransfer.address)
            })

            it('should contain the error message \'DefaultException\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
            })
          })

          describe('the resulting token storage', async () => {

            it('should maintain the sender\'s balance', async () => {
              let senderInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, senderAccount
              ).should.be.fulfilled
              senderInfo.toNumber().should.be.eq(stdBalance)
            })

            it('should not have changed the recipient\'s balance', async () => {
              let recipientInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, recipientAccount
              ).should.be.fulfilled
              recipientInfo.toNumber().should.be.eq(0)
            })
          })
        })

        context('when the sender has sufficient balance', async () => {

          beforeEach(async () => {
            transferCalldata = await tokenUtils.transfer(
              recipientAccount, stdBalance, senderContext
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
            transferEvent = events[0]
          })

          it('should emit an ApplicationExecution event', async () => {
            transferEvent.event.should.be.eq('ApplicationExecution')
          })

          describe('the ApplicationExecution event', async () => {

            it('should match the used execution id', async () => {
              let emittedExecID = transferEvent.args['execution_id']
              emittedExecID.should.be.eq(executionID)
            })

            it('should match the TokenTransfer address', async () => {
              let emittedAppAddr = transferEvent.args['script_target']
              emittedAppAddr.should.be.eq(tokenTransfer.address)
            })
          })

          describe('the resulting token storage', async () => {

            it('should have changed the sender\'s balance', async () => {
              let senderInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, senderAccount
              ).should.be.fulfilled
              senderInfo.toNumber().should.be.eq(0)
            })

            it('should have changed the recipient\'s balance', async () => {
              let recipientInfo = await initCrowdsale.balanceOf(
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

    let ownerContext

    let stdApproval = 1000

    beforeEach(async () => {

      ownerContext = await testUtils.getContext(
        executionID, ownerAccount, 0
      ).should.be.fulfilled
      ownerContext.should.not.eq('0x')
    })

    describe('-approve', async () => {

      beforeEach(async () => {

        approveCalldata = await tokenUtils.approve(
          spenderAccount, stdApproval, ownerContext
        ).should.be.fulfilled
        approveCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenApprove.address, executionID, approveCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        approveEvent = events[0]
      })

      it('should emit an ApplicationExecution event', async () => {
        approveEvent.event.should.be.eq('ApplicationExecution')
      })

      describe('the ApplicationExecution event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = approveEvent.args['execution_id']
          emittedExecID.should.be.eq(executionID)
        })

        it('should match the TokenApprove address', async () => {
          let emittedAppAddr = approveEvent.args['script_target']
          emittedAppAddr.should.be.eq(tokenApprove.address)
        })
      })

      describe('the resulting token storage', async () => {

        it('should have changed the spender\'s allowance', async () => {
          let spenderInfo = await initCrowdsale.allowance(
            storage.address, executionID, ownerAccount, spenderAccount
          ).should.be.fulfilled
          spenderInfo.toNumber().should.be.eq(stdApproval)
        })
      })
    })

    describe('-increaseApproval', async () => {

      beforeEach(async () => {

        approveCalldata = await tokenUtils.approve(
          spenderAccount, stdApproval, ownerContext
        ).should.be.fulfilled
        approveCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenApprove.address, executionID, approveCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        approveEvent = events[0]
      })

      it('should emit an ApplicationExecution event', async () => {
        approveEvent.event.should.be.eq('ApplicationExecution')
      })

      describe('the ApplicationExecution event', async () => {

        it('should match the used execution id', async () => {
          let emittedExecID = approveEvent.args['execution_id']
          emittedExecID.should.be.eq(executionID)
        })

        it('should match the TokenApprove address', async () => {
          let emittedAppAddr = approveEvent.args['script_target']
          emittedAppAddr.should.be.eq(tokenApprove.address)
        })
      })

      describe('the resulting token storage', async () => {

        it('should have changed the spender\'s allowance', async () => {
          let spenderInfo = await initCrowdsale.allowance(
            storage.address, executionID, ownerAccount, spenderAccount
          ).should.be.fulfilled
          spenderInfo.toNumber().should.be.eq(stdApproval)
        })
      })
    })

    describe('-decreaseApproval', async () => {

      beforeEach(async () => {

        let preApprovalCalldata = await tokenUtils.approve(
          spenderAccount, stdApproval, ownerContext
        ).should.be.fulfilled
        preApprovalCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenApprove.address, executionID, preApprovalCalldata,
          { from: exec }
        ).then((tx) => {
          return tx.logs
        })
        events.should.not.eq(null)
        events.length.should.be.eq(1)
        events[0].event.should.be.eq('ApplicationExecution')

        let approvalInfo = await initCrowdsale.allowance(
          storage.address, executionID, ownerAccount, spenderAccount
        ).should.be.fulfilled
        approvalInfo.toNumber().should.be.eq(stdApproval)
      })

      context('when the amount to approve would underflow the spender\'s allowance', async () => {

        beforeEach(async () => {
          approveCalldata = await tokenUtils.decreaseApproval(
            spenderAccount, stdApproval + 1, ownerContext
          ).should.be.fulfilled
          approveCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenApprove.address, executionID, approveCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          approveEvent = events[0]
        })

        it('should emit an ApplicationExecution event', async () => {
          approveEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = approveEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the TokenApprove address', async () => {
            let emittedAppAddr = approveEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenApprove.address)
          })
        })

        describe('the resulting token storage', async () => {

          it('should have changed the spender\'s allowance', async () => {
            let spenderInfo = await initCrowdsale.allowance(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('when the amount to approve would not underflow', async () => {

        beforeEach(async () => {
          approveCalldata = await tokenUtils.decreaseApproval(
            spenderAccount, stdApproval - 1, ownerContext
          ).should.be.fulfilled
          approveCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenApprove.address, executionID, approveCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          approveEvent = events[0]
        })

        it('should emit an ApplicationExecution event', async () => {
          approveEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = approveEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the TokenApprove address', async () => {
            let emittedAppAddr = approveEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenApprove.address)
          })
        })

        describe('the resulting token storage', async () => {

          it('should have changed the spender\'s allowance', async () => {
            let spenderInfo = await initCrowdsale.allowance(
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

    let spenderContext
    let ownerContext

    beforeEach(async () => {
      spenderContext = await testUtils.getContext(
        executionID, spenderAccount, 0
      ).should.be.fulfilled
      spenderContext.should.not.eq('0x')

      ownerContext = await testUtils.getContext(
        executionID, ownerAccount, 0
      ).should.be.fulfilled
      ownerContext.should.not.eq('0x')

      let setBalanceCalldata = await tokenUtils.setBalance(
        ownerAccount, stdBalance
      ).should.be.fulfilled
      setBalanceCalldata.should.not.eq('0x')

      let setAllowanceCalldata = await tokenUtils.approve(
        spenderAccount, stdBalance - 1, ownerContext
      ).should.be.fulfilled
      setAllowanceCalldata.should.not.eq('0x')

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
        tokenApprove.address, executionID, setAllowanceCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')

      let balanceInfo = await initCrowdsale.balanceOf(
        storage.address, executionID, ownerAccount
      ).should.be.fulfilled
      balanceInfo.toNumber().should.be.eq(stdBalance)

      let allowanceInfo = await initCrowdsale.allowance(
        storage.address, executionID, ownerAccount, spenderAccount
      ).should.be.fulfilled
      allowanceInfo.toNumber().should.be.eq(stdBalance - 1)
    })

    context('when the token is locked', async () => {

      context('and the owner is not a transfer agent', async () => {

        let invalidCalldata
        let invalidEvent

        beforeEach(async () => {
          invalidCalldata = await tokenUtils.transferFrom(
            ownerAccount, recipientAccount, 1, spenderContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenTransferFrom.address, executionID, invalidCalldata,
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

          it('should match the TokenTransferFrom address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
          })

          it('should contain the error message \'TransfersLocked\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'TransfersLocked').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

          it('should maintain the spender\'s allownace', async () => {
            let spenderInfo = await initCrowdsale.allowance(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(stdBalance - 1)
          })

          it('should maintain the owner\'s balance', async () => {
            let ownerInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, ownerAccount
            ).should.be.fulfilled
            ownerInfo.toNumber().should.be.eq(stdBalance)
          })

          it('should maintain the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('and the owner is a transfer agent', async () => {

        beforeEach(async () => {
          let setTransferAgentCalldata = await tokenUtils.setTransferAgentStatus(
            ownerAccount, true
          ).should.be.fulfilled
          setTransferAgentCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenMock.address, executionID, setTransferAgentCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('ApplicationExecution')

          let transferAgentInfo = await initCrowdsale.getTransferAgentStatus(
            storage.address, executionID, ownerAccount
          ).should.be.fulfilled
          transferAgentInfo.should.be.eq(true)

          transferCalldata = await tokenUtils.transferFrom(
            ownerAccount, recipientAccount, 1, spenderContext
          ).should.be.fulfilled
          transferCalldata.should.not.eq('0x')

          events = await storage.exec(
            tokenTransferFrom.address, executionID, transferCalldata,
            { from: exec }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          transferEvent = events[0]
        })

        it('should emit an ApplicationExecution event', async () => {
          transferEvent.event.should.be.eq('ApplicationExecution')
        })

        describe('the ApplicationExecution event', async () => {

          it('should match the used execution id', async () => {
            let emittedExecID = transferEvent.args['execution_id']
            emittedExecID.should.be.eq(executionID)
          })

          it('should match the TokenTransferFrom address', async () => {
            let emittedAppAddr = transferEvent.args['script_target']
            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
          })
        })

        describe('the resulting token storage', async () => {

          it('should have changed the spender\'s allownace', async () => {
            let spenderInfo = await initCrowdsale.allowance(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(stdBalance - 2)
          })

          it('should have changed the owner\'s balance', async () => {
            let ownerInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, ownerAccount
            ).should.be.fulfilled
            ownerInfo.toNumber().should.be.eq(stdBalance - 1)
          })

          it('should have changed the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(1)
          })
        })
      })
    })

    context('when the token is unlocked', async () => {

      beforeEach(async () => {
        let unlockCalldata = await tokenUtils.unlockToken().should.be.fulfilled
        unlockCalldata.should.not.eq('0x')

        let events = await storage.exec(
          tokenMock.address, executionID, unlockCalldata,
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
        let invalidEvent

        let invalidAddress = zeroAddress()

        beforeEach(async () => {
          invalidCalldata = await tokenUtils.transferFrom(
            ownerAccount, invalidAddress, 1, spenderContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenTransferFrom.address, executionID, invalidCalldata,
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

          it('should match the TokenTransferFrom address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
          })

          it('should contain the error message \'InvalidSenderOrRecipient\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidSenderOrRecipient').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

          it('should maintain the spender\'s allownace', async () => {
            let spenderInfo = await initCrowdsale.allowance(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(stdBalance - 1)
          })

          it('should maintain the owner\'s balance', async () => {
            let ownerInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, ownerAccount
            ).should.be.fulfilled
            ownerInfo.toNumber().should.be.eq(stdBalance)
          })

          it('should maintain the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, invalidAddress
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('when the owner address is invalid', async () => {

        let invalidCalldata
        let invalidEvent

        let invalidAddress = zeroAddress()

        beforeEach(async () => {
          invalidCalldata = await tokenUtils.transferFrom(
            invalidAddress, recipientAccount, 1, spenderContext
          ).should.be.fulfilled
          invalidCalldata.should.not.eq('0x')

          let events = await storage.exec(
            tokenTransferFrom.address, executionID, invalidCalldata,
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

          it('should match the TokenTransferFrom address', async () => {
            let emittedAppAddr = invalidEvent.args['application_address']
            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
          })

          it('should contain the error message \'InvalidSenderOrRecipient\'', async () => {
            let emittedMessage = invalidEvent.args['message']
            hexStrEquals(emittedMessage, 'InvalidSenderOrRecipient').should.be.eq(true)
          })
        })

        describe('the resulting token storage', async () => {

          it('should maintain the spender\'s allownace', async () => {
            let spenderInfo = await initCrowdsale.allowance(
              storage.address, executionID, ownerAccount, spenderAccount
            ).should.be.fulfilled
            spenderInfo.toNumber().should.be.eq(stdBalance - 1)
          })

          it('should maintain the owner\'s balance', async () => {
            let ownerInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, invalidAddress
            ).should.be.fulfilled
            ownerInfo.toNumber().should.be.eq(0)
          })

          it('should maintain the recipient\'s balance', async () => {
            let recipientInfo = await initCrowdsale.balanceOf(
              storage.address, executionID, recipientAccount
            ).should.be.fulfilled
            recipientInfo.toNumber().should.be.eq(0)
          })
        })
      })

      context('when the recipient address is valid', async () => {

        context('when the spender has insufficient allowance', async () => {

          let invalidCalldata
          let invalidEvent

          beforeEach(async () => {
            invalidCalldata = await tokenUtils.transferFrom(
              ownerAccount, recipientAccount, stdBalance, spenderContext
            ).should.be.fulfilled
            invalidCalldata.should.not.eq('0x')

            let events = await storage.exec(
              tokenTransferFrom.address, executionID, invalidCalldata,
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

            it('should match the TokenTransferFrom address', async () => {
              let emittedAppAddr = invalidEvent.args['application_address']
              emittedAppAddr.should.be.eq(tokenTransferFrom.address)
            })

            it('should contain the error message \'DefaultException\'', async () => {
              let emittedMessage = invalidEvent.args['message']
              hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
            })
          })

          describe('the resulting token storage', async () => {

            it('should maintain the spender\'s allownace', async () => {
              let spenderInfo = await initCrowdsale.allowance(
                storage.address, executionID, ownerAccount, spenderAccount
              ).should.be.fulfilled
              spenderInfo.toNumber().should.be.eq(stdBalance - 1)
            })

            it('should maintain the owner\'s balance', async () => {
              let ownerInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, ownerAccount
              ).should.be.fulfilled
              ownerInfo.toNumber().should.be.eq(stdBalance)
            })

            it('should maintain the recipient\'s balance', async () => {
              let recipientInfo = await initCrowdsale.balanceOf(
                storage.address, executionID, recipientAccount
              ).should.be.fulfilled
              recipientInfo.toNumber().should.be.eq(0)
            })
          })
        })

        context('when the spender has sufficient allowance', async () => {

          context('but the owner has insufficient balance', async () => {

            let invalidCalldata
            let invalidEvent

            beforeEach(async () => {
              let preTransferCalldata = await tokenUtils.transfer(
                spenderAccount, 2, ownerContext
              ).should.be.fulfilled
              preTransferCalldata.should.not.eq('0x')

              invalidCalldata = await tokenUtils.transferFrom(
                ownerAccount, recipientAccount, stdBalance, spenderContext
              ).should.be.fulfilled
              invalidCalldata.should.not.eq('0x')

              let events = await storage.exec(
                tokenTransfer.address, executionID, preTransferCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              events[0].event.should.be.eq('ApplicationExecution')

              events = await storage.exec(
                tokenTransferFrom.address, executionID, invalidCalldata,
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

              it('should match the TokenTransferFrom address', async () => {
                let emittedAppAddr = invalidEvent.args['application_address']
                emittedAppAddr.should.be.eq(tokenTransferFrom.address)
              })

              it('should contain the error message \'DefaultException\'', async () => {
                let emittedMessage = invalidEvent.args['message']
                hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
              })
            })

            describe('the resulting token storage', async () => {

              it('should maintain the spender\'s allownace', async () => {
                let spenderInfo = await initCrowdsale.allowance(
                  storage.address, executionID, ownerAccount, spenderAccount
                ).should.be.fulfilled
                spenderInfo.toNumber().should.be.eq(stdBalance - 1)
              })

              it('should maintain the owner\'s balance', async () => {
                let ownerInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, ownerAccount
                ).should.be.fulfilled
                ownerInfo.toNumber().should.be.eq(stdBalance - 2)
              })

              it('should maintain the recipient\'s balance', async () => {
                let recipientInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, recipientAccount
                ).should.be.fulfilled
                recipientInfo.toNumber().should.be.eq(0)
              })
            })
          })

          context('and the owner has sufficient balance', async () => {

            beforeEach(async () => {

              transferCalldata = await tokenUtils.transferFrom(
                ownerAccount, recipientAccount, stdBalance - 1, spenderContext
              ).should.be.fulfilled
              transferCalldata.should.not.eq('0x')

              let events = await storage.exec(
                tokenTransferFrom.address, executionID, transferCalldata,
                { from: exec }
              ).then((tx) => {
                return tx.logs
              })
              events.should.not.eq(null)
              events.length.should.be.eq(1)
              transferEvent = events[0]
            })

            it('should emit an ApplicationExecution event', async () => {
              transferEvent.event.should.be.eq('ApplicationExecution')
            })

            describe('the ApplicationExecution event', async () => {

              it('should match the used execution id', async () => {
                let emittedExecID = transferEvent.args['execution_id']
                emittedExecID.should.be.eq(executionID)
              })

              it('should match the TokenTransferFrom address', async () => {
                let emittedAppAddr = transferEvent.args['script_target']
                emittedAppAddr.should.be.eq(tokenTransferFrom.address)
              })
            })

            describe('the resulting token storage', async () => {

              it('should have changed the spender\'s allownace', async () => {
                let spenderInfo = await initCrowdsale.allowance(
                  storage.address, executionID, ownerAccount, spenderAccount
                ).should.be.fulfilled
                spenderInfo.toNumber().should.be.eq(0)
              })

              it('should have changed the owner\'s balance', async () => {
                let ownerInfo = await initCrowdsale.balanceOf(
                  storage.address, executionID, ownerAccount
                ).should.be.fulfilled
                ownerInfo.toNumber().should.be.eq(1)
              })

              it('should have changed the recipient\'s balance', async () => {
                let recipientInfo = await initCrowdsale.balanceOf(
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
