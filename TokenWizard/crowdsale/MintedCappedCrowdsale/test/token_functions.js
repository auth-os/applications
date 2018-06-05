//// Abstract storage contract
//let AbstractStorage = artifacts.require('./AbstractStorage')
//// MintedCappedCrowdsale
//let InitMintedCapped = artifacts.require('./InitCrowdsale')
//let MintedCappedBuy = artifacts.require('./CrowdsaleBuyTokens')
//let MintedCappedCrowdsaleConsole = artifacts.require('./CrowdsaleConsole')
//let MintedCappedTokenConsole = artifacts.require('./TokenConsole')
//let MintedCappedTokenTransfer = artifacts.require('./TokenTransfer')
//let MintedCappedTokenTransferFrom = artifacts.require('./TokenTransferFrom')
//let MintedCappedTokenApprove = artifacts.require('./TokenApprove')
//// Utils
//let TestUtils = artifacts.require('./TestUtils')
//let TokenUtils = artifacts.require('./TokenFunctionsUtil')
//// Mock
//let TokenFunctionsMock = artifacts.require('./TokenFunctionsMock')
//
//function getTime() {
//  let block = web3.eth.getBlock('latest')
//  return block.timestamp;
//}
//
//function zeroAddress() {
//  return web3.toHex(0)
//}
//
//function hexStrEquals(hex, expected) {
//  return web3.toAscii(hex).substring(0, expected.length) == expected;
//}
//
//contract('#MintableToken', function (accounts) {
//
//  let storage
//  let testUtils
//  let tokenUtils
//
//  let exec = accounts[0]
//  let updater = accounts[1]
//  let crowdsaleAdmin = accounts[2]
//  let teamWallet = accounts[3]
//
//  let initCrowdsale
//  let crowdsaleBuy
//  let crowdsaleConsole
//  let tokenMock
//  let tokenTransfer
//  let tokenTransferFrom
//  let tokenApprove
//
//  let executionID
//  let adminContext
//
//  let initCalldata
//  let startTime
//  let initialTierName = 'Initial Tier'
//  let initialTierPrice = web3.toWei('0.001', 'ether') // 1e15 wei per 1e18 tokens
//  let initialTierDuration = 3600 // 1 hour
//  let initialTierTokenSellCap = web3.toWei('1000', 'ether') // 1000 (e18) tokens for sale
//  let initialTierIsWhitelisted = true
//  let initialTierDurIsModifiable = true
//
//  let tokenName = 'Token'
//  let tokenSymbol = 'TOK'
//  let tokenDecimals = 18
//
//  let stdBalance = 100
//
//  // Event signatures
//  let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
//  let finalHash = web3.sha3('ApplicationFinalization(bytes32,address)')
//  let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
//  let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')
//
//  let transferHash = web3.sha3('Transfer(address,address,uint256)')
//  let approvalHash = web3.sha3('Approval(address,address,uint256)')
//
//  before(async () => {
//    storage = await AbstractStorage.new().should.be.fulfilled
//    testUtils = await TestUtils.new().should.be.fulfilled
//    tokenUtils = await TokenUtils.new().should.be.fulfilled
//
//    initCrowdsale = await InitMintedCapped.new().should.be.fulfilled
//    crowdsaleBuy = await MintedCappedBuy.new().should.be.fulfilled
//    crowdsaleConsole = await MintedCappedCrowdsaleConsole.new().should.be.fulfilled
//    tokenMock = await TokenFunctionsMock.new().should.be.fulfilled
//    tokenTransfer = await MintedCappedTokenTransfer.new().should.be.fulfilled
//    tokenTransferFrom = await MintedCappedTokenTransferFrom.new().should.be.fulfilled
//    tokenApprove = await MintedCappedTokenApprove.new().should.be.fulfilled
//  })
//
//  beforeEach(async () => {
//    startTime = getTime() + 3600
//
//    initCalldata = await testUtils.init(
//      teamWallet, startTime, initialTierName, initialTierPrice,
//      initialTierDuration, initialTierTokenSellCap, initialTierIsWhitelisted,
//      initialTierDurIsModifiable, crowdsaleAdmin
//    ).should.be.fulfilled
//    initCalldata.should.not.eq('0x')
//
//    let events = await storage.initAndFinalize(
//      updater, true, initCrowdsale.address, initCalldata, [
//        crowdsaleBuy.address, crowdsaleConsole.address, tokenMock.address,
//        tokenTransfer.address, tokenTransferFrom.address, tokenApprove.address
//      ],
//      { from: exec }
//    ).then((tx) => {
//      return tx.logs
//    })
//    events.should.not.eq(null)
//    events.length.should.be.eq(2)
//
//    events[0].event.should.be.eq('ApplicationInitialized')
//    events[1].event.should.be.eq('ApplicationFinalization')
//    executionID = events[0].args['execution_id']
//    web3.toDecimal(executionID).should.not.eq(0)
//
//    adminContext = await testUtils.getContext.call(
//      executionID, crowdsaleAdmin, 0
//    ).should.be.fulfilled
//    adminContext.should.not.eq('0x')
//  })
//
//  describe('/TokenTransfer', async () => {
//
//    let transferCalldata
//    let transferEvent
//
//    let senderAccount = accounts[accounts.length - 1]
//    let recipientAccount = accounts[accounts.length - 2]
//
//    let senderContext
//
//    beforeEach(async () => {
//      senderContext = await testUtils.getContext.call(
//        executionID, senderAccount, 0
//      ).should.be.fulfilled
//      senderContext.should.not.eq('0x')
//
//      let setBalanceCalldata = await tokenUtils.setBalance.call(
//        senderAccount, stdBalance
//      ).should.be.fulfilled
//      setBalanceCalldata.should.not.eq('0x')
//
//      let events = await storage.exec(
//        tokenMock.address, executionID, setBalanceCalldata,
//        { from: exec }
//      ).then((tx) => {
//        return tx.logs
//      })
//      events.should.not.eq(null)
//      events.length.should.be.eq(1)
//
//      events[0].event.should.be.eq('ApplicationExecution')
//
//      let balanceInfo = await initCrowdsale.balanceOf.call(
//        storage.address, executionID, senderAccount
//      ).should.be.fulfilled
//      balanceInfo.toNumber().should.be.eq(stdBalance)
//    })
//
//    context('when the token is locked', async () => {
//
//      let unlockedSender = accounts[accounts.length - 3]
//      let unlockedContext
//
//      beforeEach(async () => {
//        unlockedContext = await testUtils.getContext.call(
//          executionID, unlockedSender, 0
//        ).should.be.fulfilled
//        unlockedContext.should.not.eq('0x')
//
//        let unlockCalldata = await tokenUtils.setTransferAgentStatus.call(
//          unlockedSender, true
//        ).should.be.fulfilled
//        unlockCalldata.should.not.eq('0x')
//
//        let setBalanceCalldata = await tokenUtils.setBalance.call(
//          unlockedSender, stdBalance
//        ).should.be.fulfilled
//        setBalanceCalldata.should.not.eq('0x')
//
//        let events = await storage.exec(
//          tokenMock.address, executionID, unlockCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.logs
//        })
//        events.should.not.eq(null)
//        events.length.should.be.eq(1)
//        events[0].event.should.be.eq('ApplicationExecution')
//
//        events = await storage.exec(
//          tokenMock.address, executionID, setBalanceCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.logs
//        })
//        events.should.not.eq(null)
//        events.length.should.be.eq(1)
//        events[0].event.should.be.eq('ApplicationExecution')
//
//        let balanceInfo = await initCrowdsale.balanceOf.call(
//          storage.address, executionID, unlockedSender
//        ).should.be.fulfilled
//        balanceInfo.toNumber().should.be.eq(stdBalance)
//
//        let transferAgentInfo = await initCrowdsale.getTransferAgentStatus.call(
//          storage.address, executionID, unlockedSender
//        ).should.be.fulfilled
//        transferAgentInfo.should.be.eq(true)
//      })
//
//      context('and the sender is not a transfer agent', async () => {
//
//        let invalidCalldata
//        let invalidEvent
//        let invalidReturn
//
//        beforeEach(async () => {
//          invalidCalldata = await tokenUtils.transfer.call(
//            recipientAccount, stdBalance / 2, senderContext
//          ).should.be.fulfilled
//          invalidCalldata.should.not.eq('0x')
//
//          invalidReturn = await storage.exec.call(
//            tokenTransfer.address, executionID, invalidCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          let events = await storage.exec(
//            tokenTransfer.address, executionID, invalidCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.logs
//          })
//          events.should.not.eq(null)
//          events.length.should.be.eq(1)
//          invalidEvent = events[0]
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            invalidReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            invalidReturn[0].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            invalidReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            invalidReturn[2].toNumber().should.be.eq(0)
//          })
//        })
//
//        it('should emit an ApplicationException event', async () => {
//          invalidEvent.event.should.be.eq('ApplicationException')
//        })
//
//        describe('the ApplicationException event', async () => {
//
//          it('should match the used execution id', async () => {
//            let emittedExecID = invalidEvent.args['execution_id']
//            emittedExecID.should.be.eq(executionID)
//          })
//
//          it('should match the TokenTransfer address', async () => {
//            let emittedAppAddr = invalidEvent.args['application_address']
//            emittedAppAddr.should.be.eq(tokenTransfer.address)
//          })
//
//          it('should contain the error message \'TransfersLocked\'', async () => {
//            let emittedMessage = invalidEvent.args['message']
//            hexStrEquals(emittedMessage, 'TransfersLocked').should.be.eq(true)
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should maintain the sender\'s balance', async () => {
//            let senderInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, senderAccount
//            ).should.be.fulfilled
//            senderInfo.toNumber().should.be.eq(stdBalance)
//          })
//
//          it('should not have changed the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, recipientAccount
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(0)
//          })
//        })
//      })
//
//      context('and the sender is a transfer agent', async () => {
//
//        let execEvents
//        let execReturn
//
//        beforeEach(async () => {
//          transferCalldata = await tokenUtils.transfer.call(
//            recipientAccount, stdBalance / 2, unlockedContext
//          ).should.be.fulfilled
//          transferCalldata.should.not.eq('0x')
//
//          execReturn = await storage.exec.call(
//            tokenTransfer.address, executionID, transferCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//          execEvents = await storage.exec(
//            tokenTransfer.address, executionID, transferCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.receipt.logs
//          })
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            execReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            execReturn[0].toNumber().should.be.eq(1)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            execReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            execReturn[2].toNumber().should.be.eq(2)
//          })
//        })
//
//        describe('events', async () => {
//
//          it('should have emitted 2 events total', async () => {
//            execEvents.length.should.be.eq(2)
//          })
//
//          describe('the ApplicationExecution event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[1].topics
//              eventData = execEvents[1].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should list the correct event signature in the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//            })
//
//            it('should have the target app address and execution id as the other 2 topics', async () => {
//              let emittedAddr = eventTopics[2]
//              let emittedExecId = eventTopics[1]
//              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenTransfer.address))
//              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//            })
//
//            it('should have an empty data field', async () => {
//              eventData.should.be.eq('0x0')
//            })
//          })
//
//          describe('the other event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[0].topics
//              eventData = execEvents[0].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should match the Transfer event signature for the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
//            })
//
//            it('should match the sender and recipient addresses for the other two topics', async () => {
//              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(unlockedSender))
//              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
//            })
//
//            it('should contain the number of tokens transferred as the data field', async () => {
//              web3.toDecimal(eventData).should.be.eq(stdBalance / 2)
//            })
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should have changed the sender\'s balance', async () => {
//            let senderInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, unlockedSender
//            ).should.be.fulfilled
//            senderInfo.toNumber().should.be.eq(stdBalance / 2)
//          })
//
//          it('should have changed the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, recipientAccount
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(stdBalance / 2)
//          })
//        })
//      })
//    })
//
//    context('when the token is unlocked', async () => {
//
//      beforeEach(async () => {
//        let unlockTokenCalldata = await tokenUtils.unlockToken.call().should.be.fulfilled
//        unlockTokenCalldata.should.not.eq('0x')
//
//        let events = await storage.exec(
//          tokenMock.address, executionID, unlockTokenCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.logs
//        })
//        events.should.not.eq(null)
//        events.length.should.be.eq(1)
//        events[0].event.should.be.eq('ApplicationExecution')
//      })
//
//      context('when the recipient address is invalid', async () => {
//
//        let invalidCalldata
//        let invalidEvent
//        let invalidReturn
//
//        let invalidRecipient = zeroAddress();
//
//        beforeEach(async () => {
//          invalidCalldata = await tokenUtils.transfer.call(
//            invalidRecipient, stdBalance / 2, senderContext
//          ).should.be.fulfilled
//          invalidCalldata.should.not.eq('0x')
//
//          invalidReturn = await storage.exec.call(
//            tokenTransfer.address, executionID, invalidCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          let events = await storage.exec(
//            tokenTransfer.address, executionID, invalidCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.logs
//          })
//          events.should.not.eq(null)
//          events.length.should.be.eq(1)
//          invalidEvent = events[0]
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            invalidReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            invalidReturn[0].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            invalidReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            invalidReturn[2].toNumber().should.be.eq(0)
//          })
//        })
//
//        it('should emit an ApplicationException event', async () => {
//          invalidEvent.event.should.be.eq('ApplicationException')
//        })
//
//        describe('the ApplicationException event', async () => {
//
//          it('should match the used execution id', async () => {
//            let emittedExecID = invalidEvent.args['execution_id']
//            emittedExecID.should.be.eq(executionID)
//          })
//
//          it('should match the TokenTransfer address', async () => {
//            let emittedAppAddr = invalidEvent.args['application_address']
//            emittedAppAddr.should.be.eq(tokenTransfer.address)
//          })
//
//          it('should contain the error message \'InvalidRecipient\'', async () => {
//            let emittedMessage = invalidEvent.args['message']
//            hexStrEquals(emittedMessage, 'InvalidRecipient').should.be.eq(true)
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should maintain the sender\'s balance', async () => {
//            let senderInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, senderAccount
//            ).should.be.fulfilled
//            senderInfo.toNumber().should.be.eq(stdBalance)
//          })
//
//          it('should not have changed the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, invalidRecipient
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(0)
//          })
//        })
//      })
//
//      context('when the recipient address is valid', async () => {
//
//        context('when the sender has insufficient balance', async () => {
//
//          let invalidCalldata
//          let invalidEvent
//          let invalidReturn
//
//          let invalidSendAmt = stdBalance + 1
//
//          beforeEach(async () => {
//            invalidCalldata = await tokenUtils.transfer.call(
//              recipientAccount, invalidSendAmt, senderContext
//            ).should.be.fulfilled
//            invalidCalldata.should.not.eq('0x')
//
//            invalidReturn = await storage.exec.call(
//              tokenTransfer.address, executionID, invalidCalldata,
//              { from: exec }
//            ).should.be.fulfilled
//
//            let events = await storage.exec(
//              tokenTransfer.address, executionID, invalidCalldata,
//              { from: exec }
//            ).then((tx) => {
//              return tx.logs
//            })
//            events.should.not.eq(null)
//            events.length.should.be.eq(1)
//            invalidEvent = events[0]
//          })
//
//          describe('returned data', async () => {
//
//            it('should return a tuple with 3 fields', async () => {
//              invalidReturn.length.should.be.eq(3)
//            })
//
//            it('should return the correct number of events emitted', async () => {
//              invalidReturn[0].toNumber().should.be.eq(0)
//            })
//
//            it('should return the correct number of addresses paid', async () => {
//              invalidReturn[1].toNumber().should.be.eq(0)
//            })
//
//            it('should return the correct number of storage slots written to', async () => {
//              invalidReturn[2].toNumber().should.be.eq(0)
//            })
//          })
//
//          it('should emit an ApplicationException event', async () => {
//            invalidEvent.event.should.be.eq('ApplicationException')
//          })
//
//          describe('the ApplicationException event', async () => {
//
//            it('should match the used execution id', async () => {
//              let emittedExecID = invalidEvent.args['execution_id']
//              emittedExecID.should.be.eq(executionID)
//            })
//
//            it('should match the TokenTransfer address', async () => {
//              let emittedAppAddr = invalidEvent.args['application_address']
//              emittedAppAddr.should.be.eq(tokenTransfer.address)
//            })
//
//            it('should contain the error message \'DefaultException\'', async () => {
//              let emittedMessage = invalidEvent.args['message']
//              hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
//            })
//          })
//
//          describe('storage', async () => {
//
//            it('should maintain the sender\'s balance', async () => {
//              let senderInfo = await initCrowdsale.balanceOf.call(
//                storage.address, executionID, senderAccount
//              ).should.be.fulfilled
//              senderInfo.toNumber().should.be.eq(stdBalance)
//            })
//
//            it('should not have changed the recipient\'s balance', async () => {
//              let recipientInfo = await initCrowdsale.balanceOf.call(
//                storage.address, executionID, recipientAccount
//              ).should.be.fulfilled
//              recipientInfo.toNumber().should.be.eq(0)
//            })
//          })
//        })
//
//        context('when the sender has sufficient balance', async () => {
//
//          let execEvents
//          let execReturn
//
//          beforeEach(async () => {
//            transferCalldata = await tokenUtils.transfer.call(
//              recipientAccount, stdBalance, senderContext
//            ).should.be.fulfilled
//            transferCalldata.should.not.eq('0x')
//
//            execReturn = await storage.exec.call(
//              tokenTransfer.address, executionID, transferCalldata,
//              { from: exec }
//            ).should.be.fulfilled
//
//            execEvents = await storage.exec(
//              tokenTransfer.address, executionID, transferCalldata,
//              { from: exec }
//            ).then((tx) => {
//              return tx.receipt.logs
//            })
//          })
//
//          describe('returned data', async () => {
//
//            it('should return a tuple with 3 fields', async () => {
//              execReturn.length.should.be.eq(3)
//            })
//
//            it('should return the correct number of events emitted', async () => {
//              execReturn[0].toNumber().should.be.eq(1)
//            })
//
//            it('should return the correct number of addresses paid', async () => {
//              execReturn[1].toNumber().should.be.eq(0)
//            })
//
//            it('should return the correct number of storage slots written to', async () => {
//              execReturn[2].toNumber().should.be.eq(2)
//            })
//          })
//
//          describe('events', async () => {
//
//            it('should have emitted 2 events total', async () => {
//              execEvents.length.should.be.eq(2)
//            })
//
//            describe('the ApplicationExecution event', async () => {
//
//              let eventTopics
//              let eventData
//
//              beforeEach(async () => {
//                eventTopics = execEvents[1].topics
//                eventData = execEvents[1].data
//              })
//
//              it('should have the correct number of topics', async () => {
//                eventTopics.length.should.be.eq(3)
//              })
//
//              it('should list the correct event signature in the first topic', async () => {
//                let sig = eventTopics[0]
//                web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//              })
//
//              it('should have the target app address and execution id as the other 2 topics', async () => {
//                let emittedAddr = eventTopics[2]
//                let emittedExecId = eventTopics[1]
//                web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenTransfer.address))
//                web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//              })
//
//              it('should have an empty data field', async () => {
//                eventData.should.be.eq('0x0')
//              })
//            })
//
//            describe('the other event', async () => {
//
//              let eventTopics
//              let eventData
//
//              beforeEach(async () => {
//                eventTopics = execEvents[0].topics
//                eventData = execEvents[0].data
//              })
//
//              it('should have the correct number of topics', async () => {
//                eventTopics.length.should.be.eq(3)
//              })
//
//              it('should match the Transfer event signature for the first topic', async () => {
//                let sig = eventTopics[0]
//                web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
//              })
//
//              it('should match the sender and recipient addresses for the other two topics', async () => {
//                web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(senderAccount))
//                web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
//              })
//
//              it('should contain the number of tokens transferred as the data field', async () => {
//                web3.toDecimal(eventData).should.be.eq(stdBalance)
//              })
//            })
//          })
//
//          describe('storage', async () => {
//
//            it('should have changed the sender\'s balance', async () => {
//              let senderInfo = await initCrowdsale.balanceOf.call(
//                storage.address, executionID, senderAccount
//              ).should.be.fulfilled
//              senderInfo.toNumber().should.be.eq(0)
//            })
//
//            it('should have changed the recipient\'s balance', async () => {
//              let recipientInfo = await initCrowdsale.balanceOf.call(
//                storage.address, executionID, recipientAccount
//              ).should.be.fulfilled
//              recipientInfo.toNumber().should.be.eq(stdBalance)
//            })
//          })
//        })
//      })
//    })
//  })
//
//  describe('/TokenApprove', async () => {
//
//    let approveCalldata
//    let approveEvent
//
//    let ownerAccount = accounts[accounts.length - 1]
//    let spenderAccount = accounts[accounts.length - 2]
//
//    let ownerContext
//
//    let stdApproval = 1000
//
//    beforeEach(async () => {
//
//      ownerContext = await testUtils.getContext.call(
//        executionID, ownerAccount, 0
//      ).should.be.fulfilled
//      ownerContext.should.not.eq('0x')
//    })
//
//    describe('-approve', async () => {
//
//      let execEvents
//      let execReturn
//
//      beforeEach(async () => {
//        approveCalldata = await tokenUtils.approve.call(
//          spenderAccount, stdApproval, ownerContext
//        ).should.be.fulfilled
//        approveCalldata.should.not.eq('0x')
//
//        execReturn = await storage.exec.call(
//          tokenApprove.address, executionID, approveCalldata,
//          { from: exec }
//        ).should.be.fulfilled
//
//        execEvents = await storage.exec(
//          tokenApprove.address, executionID, approveCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.receipt.logs
//        })
//      })
//
//      describe('returned data', async () => {
//
//        it('should return a tuple with 3 fields', async () => {
//          execReturn.length.should.be.eq(3)
//        })
//
//        it('should return the correct number of events emitted', async () => {
//          execReturn[0].toNumber().should.be.eq(1)
//        })
//
//        it('should return the correct number of addresses paid', async () => {
//          execReturn[1].toNumber().should.be.eq(0)
//        })
//
//        it('should return the correct number of storage slots written to', async () => {
//          execReturn[2].toNumber().should.be.eq(1)
//        })
//      })
//
//      describe('events', async () => {
//
//        it('should have emitted 2 events total', async () => {
//          execEvents.length.should.be.eq(2)
//        })
//
//        describe('the ApplicationExecution event', async () => {
//
//          let eventTopics
//          let eventData
//
//          beforeEach(async () => {
//            eventTopics = execEvents[1].topics
//            eventData = execEvents[1].data
//          })
//
//          it('should have the correct number of topics', async () => {
//            eventTopics.length.should.be.eq(3)
//          })
//
//          it('should list the correct event signature in the first topic', async () => {
//            let sig = eventTopics[0]
//            web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//          })
//
//          it('should have the target app address and execution id as the other 2 topics', async () => {
//            let emittedAddr = eventTopics[2]
//            let emittedExecId = eventTopics[1]
//            web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenApprove.address))
//            web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//          })
//
//          it('should have an empty data field', async () => {
//            eventData.should.be.eq('0x0')
//          })
//        })
//
//        describe('the other event', async () => {
//
//          let eventTopics
//          let eventData
//
//          beforeEach(async () => {
//            eventTopics = execEvents[0].topics
//            eventData = execEvents[0].data
//          })
//
//          it('should have the correct number of topics', async () => {
//            eventTopics.length.should.be.eq(3)
//          })
//
//          it('should match the Transfer event signature for the first topic', async () => {
//            let sig = eventTopics[0]
//            web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
//          })
//
//          it('should match the owner and spender addresses for the other two topics', async () => {
//            web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
//            web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
//          })
//
//          it('should contain the number of tokens approved as the data field', async () => {
//            web3.toDecimal(eventData).should.be.eq(stdApproval)
//          })
//        })
//      })
//
//      describe('storage', async () => {
//
//        it('should have changed the spender\'s allowance', async () => {
//          let spenderInfo = await initCrowdsale.allowance.call(
//            storage.address, executionID, ownerAccount, spenderAccount
//          ).should.be.fulfilled
//          spenderInfo.toNumber().should.be.eq(stdApproval)
//        })
//      })
//    })
//
//    describe('-increaseApproval', async () => {
//
//      let execEvents
//      let execReturn
//
//      beforeEach(async () => {
//        approveCalldata = await tokenUtils.increaseApproval.call(
//          spenderAccount, stdApproval, ownerContext
//        ).should.be.fulfilled
//        approveCalldata.should.not.eq('0x')
//
//        execReturn = await storage.exec.call(
//          tokenApprove.address, executionID, approveCalldata,
//          { from: exec }
//        ).should.be.fulfilled
//
//        execEvents = await storage.exec(
//          tokenApprove.address, executionID, approveCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.receipt.logs
//        })
//      })
//
//      describe('returned data', async () => {
//
//        it('should return a tuple with 3 fields', async () => {
//          execReturn.length.should.be.eq(3)
//        })
//
//        it('should return the correct number of events emitted', async () => {
//          execReturn[0].toNumber().should.be.eq(1)
//        })
//
//        it('should return the correct number of addresses paid', async () => {
//          execReturn[1].toNumber().should.be.eq(0)
//        })
//
//        it('should return the correct number of storage slots written to', async () => {
//          execReturn[2].toNumber().should.be.eq(1)
//        })
//      })
//
//      describe('events', async () => {
//
//        it('should have emitted 2 events total', async () => {
//          execEvents.length.should.be.eq(2)
//        })
//
//        describe('the ApplicationExecution event', async () => {
//
//          let eventTopics
//          let eventData
//
//          beforeEach(async () => {
//            eventTopics = execEvents[1].topics
//            eventData = execEvents[1].data
//          })
//
//          it('should have the correct number of topics', async () => {
//            eventTopics.length.should.be.eq(3)
//          })
//
//          it('should list the correct event signature in the first topic', async () => {
//            let sig = eventTopics[0]
//            web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//          })
//
//          it('should have the target app address and execution id as the other 2 topics', async () => {
//            let emittedAddr = eventTopics[2]
//            let emittedExecId = eventTopics[1]
//            web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenApprove.address))
//            web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//          })
//
//          it('should have an empty data field', async () => {
//            eventData.should.be.eq('0x0')
//          })
//        })
//
//        describe('the other event', async () => {
//
//          let eventTopics
//          let eventData
//
//          beforeEach(async () => {
//            eventTopics = execEvents[0].topics
//            eventData = execEvents[0].data
//          })
//
//          it('should have the correct number of topics', async () => {
//            eventTopics.length.should.be.eq(3)
//          })
//
//          it('should match the Transfer event signature for the first topic', async () => {
//            let sig = eventTopics[0]
//            web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
//          })
//
//          it('should match the owner and spender addresses for the other two topics', async () => {
//            web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
//            web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
//          })
//
//          it('should contain the number of tokens approved as the data field', async () => {
//            web3.toDecimal(eventData).should.be.eq(stdApproval)
//          })
//        })
//      })
//
//      describe('storage', async () => {
//
//        it('should have changed the spender\'s allowance', async () => {
//          let spenderInfo = await initCrowdsale.allowance.call(
//            storage.address, executionID, ownerAccount, spenderAccount
//          ).should.be.fulfilled
//          spenderInfo.toNumber().should.be.eq(stdApproval)
//        })
//      })
//    })
//
//    describe('-decreaseApproval', async () => {
//
//      beforeEach(async () => {
//        let preApprovalCalldata = await tokenUtils.approve.call(
//          spenderAccount, stdApproval, ownerContext
//        ).should.be.fulfilled
//        preApprovalCalldata.should.not.eq('0x')
//
//        let events = await storage.exec(
//          tokenApprove.address, executionID, preApprovalCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.logs
//        })
//        events.should.not.eq(null)
//        events.length.should.be.eq(1)
//        events[0].event.should.be.eq('ApplicationExecution')
//
//        let approvalInfo = await initCrowdsale.allowance.call(
//          storage.address, executionID, ownerAccount, spenderAccount
//        ).should.be.fulfilled
//        approvalInfo.toNumber().should.be.eq(stdApproval)
//      })
//
//      context('when the amount to approve would underflow the spender\'s allowance', async () => {
//
//        let execEvents
//        let execReturn
//
//        beforeEach(async () => {
//          approveCalldata = await tokenUtils.decreaseApproval.call(
//            spenderAccount, stdApproval + 1, ownerContext
//          ).should.be.fulfilled
//          approveCalldata.should.not.eq('0x')
//
//          execReturn = await storage.exec.call(
//            tokenApprove.address, executionID, approveCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          execEvents = await storage.exec(
//            tokenApprove.address, executionID, approveCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.receipt.logs
//          })
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            execReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            execReturn[0].toNumber().should.be.eq(1)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            execReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            execReturn[2].toNumber().should.be.eq(1)
//          })
//        })
//
//        describe('events', async () => {
//
//          it('should have emitted 2 events total', async () => {
//            execEvents.length.should.be.eq(2)
//          })
//
//          describe('the ApplicationExecution event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[1].topics
//              eventData = execEvents[1].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should list the correct event signature in the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//            })
//
//            it('should have the target app address and execution id as the other 2 topics', async () => {
//              let emittedAddr = eventTopics[2]
//              let emittedExecId = eventTopics[1]
//              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenApprove.address))
//              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//            })
//
//            it('should have an empty data field', async () => {
//              eventData.should.be.eq('0x0')
//            })
//          })
//
//          describe('the other event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[0].topics
//              eventData = execEvents[0].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should match the Transfer event signature for the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
//            })
//
//            it('should match the owner and spender addresses for the other two topics', async () => {
//              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
//              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
//            })
//
//            it('should contain the number of tokens approved as the data field', async () => {
//              web3.toDecimal(eventData).should.be.eq(0)
//            })
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should have changed the spender\'s allowance', async () => {
//            let spenderInfo = await initCrowdsale.allowance.call(
//              storage.address, executionID, ownerAccount, spenderAccount
//            ).should.be.fulfilled
//            spenderInfo.toNumber().should.be.eq(0)
//          })
//        })
//      })
//
//      context('when the amount to approve would not underflow', async () => {
//
//        let execEvents
//        let execReturn
//
//        beforeEach(async () => {
//          approveCalldata = await tokenUtils.decreaseApproval.call(
//            spenderAccount, stdApproval - 1, ownerContext
//          ).should.be.fulfilled
//          approveCalldata.should.not.eq('0x')
//
//          execReturn = await storage.exec.call(
//            tokenApprove.address, executionID, approveCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          execEvents = await storage.exec(
//            tokenApprove.address, executionID, approveCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.receipt.logs
//          })
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            execReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            execReturn[0].toNumber().should.be.eq(1)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            execReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            execReturn[2].toNumber().should.be.eq(1)
//          })
//        })
//
//        describe('events', async () => {
//
//          it('should have emitted 2 events total', async () => {
//            execEvents.length.should.be.eq(2)
//          })
//
//          describe('the ApplicationExecution event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[1].topics
//              eventData = execEvents[1].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should list the correct event signature in the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//            })
//
//            it('should have the target app address and execution id as the other 2 topics', async () => {
//              let emittedAddr = eventTopics[2]
//              let emittedExecId = eventTopics[1]
//              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenApprove.address))
//              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//            })
//
//            it('should have an empty data field', async () => {
//              eventData.should.be.eq('0x0')
//            })
//          })
//
//          describe('the other event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[0].topics
//              eventData = execEvents[0].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should match the Transfer event signature for the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(approvalHash))
//            })
//
//            it('should match the owner and spender addresses for the other two topics', async () => {
//              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
//              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(spenderAccount))
//            })
//
//            it('should contain the number of tokens approved as the data field', async () => {
//              web3.toDecimal(eventData).should.be.eq(1)
//            })
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should have changed the spender\'s allowance', async () => {
//            let spenderInfo = await initCrowdsale.allowance.call(
//              storage.address, executionID, ownerAccount, spenderAccount
//            ).should.be.fulfilled
//            spenderInfo.toNumber().should.be.eq(1)
//          })
//        })
//      })
//    })
//  })
//
//  describe('/TokenTransferFrom', async () => {
//
//    let transferCalldata
//    let transferEvent
//
//    let spenderAccount = accounts[accounts.length - 1]
//    let ownerAccount = accounts[accounts.length - 2]
//    let recipientAccount = accounts[accounts.length - 3]
//
//    let spenderContext
//    let ownerContext
//
//    beforeEach(async () => {
//      spenderContext = await testUtils.getContext.call(
//        executionID, spenderAccount, 0
//      ).should.be.fulfilled
//      spenderContext.should.not.eq('0x')
//
//      ownerContext = await testUtils.getContext.call(
//        executionID, ownerAccount, 0
//      ).should.be.fulfilled
//      ownerContext.should.not.eq('0x')
//
//      let setBalanceCalldata = await tokenUtils.setBalance.call(
//        ownerAccount, stdBalance
//      ).should.be.fulfilled
//      setBalanceCalldata.should.not.eq('0x')
//
//      let setAllowanceCalldata = await tokenUtils.approve.call(
//        spenderAccount, stdBalance - 1, ownerContext
//      ).should.be.fulfilled
//      setAllowanceCalldata.should.not.eq('0x')
//
//      let events = await storage.exec(
//        tokenMock.address, executionID, setBalanceCalldata,
//        { from: exec }
//      ).then((tx) => {
//        return tx.logs
//      })
//      events.should.not.eq(null)
//      events.length.should.be.eq(1)
//      events[0].event.should.be.eq('ApplicationExecution')
//
//      events = await storage.exec(
//        tokenApprove.address, executionID, setAllowanceCalldata,
//        { from: exec }
//      ).then((tx) => {
//        return tx.logs
//      })
//      events.should.not.eq(null)
//      events.length.should.be.eq(1)
//      events[0].event.should.be.eq('ApplicationExecution')
//
//      let balanceInfo = await initCrowdsale.balanceOf.call(
//        storage.address, executionID, ownerAccount
//      ).should.be.fulfilled
//      balanceInfo.toNumber().should.be.eq(stdBalance)
//
//      let allowanceInfo = await initCrowdsale.allowance.call(
//        storage.address, executionID, ownerAccount, spenderAccount
//      ).should.be.fulfilled
//      allowanceInfo.toNumber().should.be.eq(stdBalance - 1)
//    })
//
//    context('when the token is locked', async () => {
//
//      context('and the owner is not a transfer agent', async () => {
//
//        let invalidCalldata
//        let invalidEvent
//        let invalidReturn
//
//        beforeEach(async () => {
//          invalidCalldata = await tokenUtils.transferFrom.call(
//            ownerAccount, recipientAccount, 1, spenderContext
//          ).should.be.fulfilled
//          invalidCalldata.should.not.eq('0x')
//
//          invalidReturn = await storage.exec.call(
//            tokenTransferFrom.address, executionID, invalidCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          let events = await storage.exec(
//            tokenTransferFrom.address, executionID, invalidCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.logs
//          })
//          events.should.not.eq(null)
//          events.length.should.be.eq(1)
//          invalidEvent = events[0]
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            invalidReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            invalidReturn[0].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            invalidReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            invalidReturn[2].toNumber().should.be.eq(0)
//          })
//        })
//
//        it('should emit an ApplicationException event', async () => {
//          invalidEvent.event.should.be.eq('ApplicationException')
//        })
//
//        describe('the ApplicationException event', async () => {
//
//          it('should match the used execution id', async () => {
//            let emittedExecID = invalidEvent.args['execution_id']
//            emittedExecID.should.be.eq(executionID)
//          })
//
//          it('should match the TokenTransfer address', async () => {
//            let emittedAppAddr = invalidEvent.args['application_address']
//            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
//          })
//
//          it('should contain the error message \'TransfersLocked\'', async () => {
//            let emittedMessage = invalidEvent.args['message']
//            hexStrEquals(emittedMessage, 'TransfersLocked').should.be.eq(true)
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should maintain the spender\'s allownace', async () => {
//            let spenderInfo = await initCrowdsale.allowance.call(
//              storage.address, executionID, ownerAccount, spenderAccount
//            ).should.be.fulfilled
//            spenderInfo.toNumber().should.be.eq(stdBalance - 1)
//          })
//
//          it('should maintain the owner\'s balance', async () => {
//            let ownerInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, ownerAccount
//            ).should.be.fulfilled
//            ownerInfo.toNumber().should.be.eq(stdBalance)
//          })
//
//          it('should maintain the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, recipientAccount
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(0)
//          })
//        })
//      })
//
//      context('and the owner is a transfer agent', async () => {
//
//        let execEvents
//        let execReturn
//
//        beforeEach(async () => {
//          let setTransferAgentCalldata = await tokenUtils.setTransferAgentStatus.call(
//            ownerAccount, true
//          ).should.be.fulfilled
//          setTransferAgentCalldata.should.not.eq('0x')
//
//          let events = await storage.exec(
//            tokenMock.address, executionID, setTransferAgentCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.logs
//          })
//          events.should.not.eq(null)
//          events.length.should.be.eq(1)
//          events[0].event.should.be.eq('ApplicationExecution')
//
//          let transferAgentInfo = await initCrowdsale.getTransferAgentStatus.call(
//            storage.address, executionID, ownerAccount
//          ).should.be.fulfilled
//          transferAgentInfo.should.be.eq(true)
//
//          transferCalldata = await tokenUtils.transferFrom.call(
//            ownerAccount, recipientAccount, 1, spenderContext
//          ).should.be.fulfilled
//          transferCalldata.should.not.eq('0x')
//
//          execReturn= await storage.exec.call(
//            tokenTransferFrom.address, executionID, transferCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          execEvents = await storage.exec(
//            tokenTransferFrom.address, executionID, transferCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.receipt.logs
//          })
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            execReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            execReturn[0].toNumber().should.be.eq(1)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            execReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            execReturn[2].toNumber().should.be.eq(3)
//          })
//        })
//
//        describe('events', async () => {
//
//          it('should have emitted 2 events total', async () => {
//            execEvents.length.should.be.eq(2)
//          })
//
//          describe('the ApplicationExecution event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[1].topics
//              eventData = execEvents[1].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should list the correct event signature in the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//            })
//
//            it('should have the target app address and execution id as the other 2 topics', async () => {
//              let emittedAddr = eventTopics[2]
//              let emittedExecId = eventTopics[1]
//              web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenTransferFrom.address))
//              web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//            })
//
//            it('should have an empty data field', async () => {
//              eventData.should.be.eq('0x0')
//            })
//          })
//
//          describe('the other event', async () => {
//
//            let eventTopics
//            let eventData
//
//            beforeEach(async () => {
//              eventTopics = execEvents[0].topics
//              eventData = execEvents[0].data
//            })
//
//            it('should have the correct number of topics', async () => {
//              eventTopics.length.should.be.eq(3)
//            })
//
//            it('should match the Transfer event signature for the first topic', async () => {
//              let sig = eventTopics[0]
//              web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
//            })
//
//            it('should match the owner and recipient addresses for the other two topics', async () => {
//              web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
//              web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
//            })
//
//            it('should contain the number of tokens transferred as the data field', async () => {
//              web3.toDecimal(eventData).should.be.eq(1)
//            })
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should have changed the spender\'s allownace', async () => {
//            let spenderInfo = await initCrowdsale.allowance.call(
//              storage.address, executionID, ownerAccount, spenderAccount
//            ).should.be.fulfilled
//            spenderInfo.toNumber().should.be.eq(stdBalance - 2)
//          })
//
//          it('should have changed the owner\'s balance', async () => {
//            let ownerInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, ownerAccount
//            ).should.be.fulfilled
//            ownerInfo.toNumber().should.be.eq(stdBalance - 1)
//          })
//
//          it('should have changed the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, recipientAccount
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(1)
//          })
//        })
//      })
//    })
//
//    context('when the token is unlocked', async () => {
//
//      beforeEach(async () => {
//        let unlockCalldata = await tokenUtils.unlockToken.call().should.be.fulfilled
//        unlockCalldata.should.not.eq('0x')
//
//        let events = await storage.exec(
//          tokenMock.address, executionID, unlockCalldata,
//          { from: exec }
//        ).then((tx) => {
//          return tx.logs
//        })
//        events.should.not.eq(null)
//        events.length.should.be.eq(1)
//        events[0].event.should.be.eq('ApplicationExecution')
//      })
//
//      context('when the recipient address is invalid', async () => {
//
//        let invalidCalldata
//        let invalidEvent
//        let invalidReturn
//
//        let invalidAddress = zeroAddress()
//
//        beforeEach(async () => {
//          invalidCalldata = await tokenUtils.transferFrom.call(
//            ownerAccount, invalidAddress, 1, spenderContext
//          ).should.be.fulfilled
//          invalidCalldata.should.not.eq('0x')
//
//          invalidReturn = await storage.exec.call(
//            tokenTransferFrom.address, executionID, invalidCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          let events = await storage.exec(
//            tokenTransferFrom.address, executionID, invalidCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.logs
//          })
//          events.should.not.eq(null)
//          events.length.should.be.eq(1)
//          invalidEvent = events[0]
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            invalidReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            invalidReturn[0].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            invalidReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            invalidReturn[2].toNumber().should.be.eq(0)
//          })
//        })
//
//        it('should emit an ApplicationException event', async () => {
//          invalidEvent.event.should.be.eq('ApplicationException')
//        })
//
//        describe('the ApplicationException event', async () => {
//
//          it('should match the used execution id', async () => {
//            let emittedExecID = invalidEvent.args['execution_id']
//            emittedExecID.should.be.eq(executionID)
//          })
//
//          it('should match the TokenTransfer address', async () => {
//            let emittedAppAddr = invalidEvent.args['application_address']
//            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
//          })
//
//          it('should contain the error message \'InvalidSenderOrRecipient\'', async () => {
//            let emittedMessage = invalidEvent.args['message']
//            hexStrEquals(emittedMessage, 'InvalidSenderOrRecipient').should.be.eq(true)
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should maintain the spender\'s allownace', async () => {
//            let spenderInfo = await initCrowdsale.allowance.call(
//              storage.address, executionID, ownerAccount, spenderAccount
//            ).should.be.fulfilled
//            spenderInfo.toNumber().should.be.eq(stdBalance - 1)
//          })
//
//          it('should maintain the owner\'s balance', async () => {
//            let ownerInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, ownerAccount
//            ).should.be.fulfilled
//            ownerInfo.toNumber().should.be.eq(stdBalance)
//          })
//
//          it('should maintain the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, invalidAddress
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(0)
//          })
//        })
//      })
//
//      context('when the owner address is invalid', async () => {
//
//        let invalidCalldata
//        let invalidEvent
//        let invalidReturn
//
//        let invalidAddress = zeroAddress()
//
//        beforeEach(async () => {
//          invalidCalldata = await tokenUtils.transferFrom.call(
//            invalidAddress, recipientAccount, 1, spenderContext
//          ).should.be.fulfilled
//          invalidCalldata.should.not.eq('0x')
//
//          invalidReturn = await storage.exec.call(
//            tokenTransferFrom.address, executionID, invalidCalldata,
//            { from: exec }
//          ).should.be.fulfilled
//
//          let events = await storage.exec(
//            tokenTransferFrom.address, executionID, invalidCalldata,
//            { from: exec }
//          ).then((tx) => {
//            return tx.logs
//          })
//          events.should.not.eq(null)
//          events.length.should.be.eq(1)
//          invalidEvent = events[0]
//        })
//
//        describe('returned data', async () => {
//
//          it('should return a tuple with 3 fields', async () => {
//            invalidReturn.length.should.be.eq(3)
//          })
//
//          it('should return the correct number of events emitted', async () => {
//            invalidReturn[0].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of addresses paid', async () => {
//            invalidReturn[1].toNumber().should.be.eq(0)
//          })
//
//          it('should return the correct number of storage slots written to', async () => {
//            invalidReturn[2].toNumber().should.be.eq(0)
//          })
//        })
//
//        it('should emit an ApplicationException event', async () => {
//          invalidEvent.event.should.be.eq('ApplicationException')
//        })
//
//        describe('the ApplicationException event', async () => {
//
//          it('should match the used execution id', async () => {
//            let emittedExecID = invalidEvent.args['execution_id']
//            emittedExecID.should.be.eq(executionID)
//          })
//
//          it('should match the TokenTransfer address', async () => {
//            let emittedAppAddr = invalidEvent.args['application_address']
//            emittedAppAddr.should.be.eq(tokenTransferFrom.address)
//          })
//
//          it('should contain the error message \'InvalidSenderOrRecipient\'', async () => {
//            let emittedMessage = invalidEvent.args['message']
//            hexStrEquals(emittedMessage, 'InvalidSenderOrRecipient').should.be.eq(true)
//          })
//        })
//
//        describe('storage', async () => {
//
//          it('should maintain the spender\'s allownace', async () => {
//            let spenderInfo = await initCrowdsale.allowance.call(
//              storage.address, executionID, ownerAccount, spenderAccount
//            ).should.be.fulfilled
//            spenderInfo.toNumber().should.be.eq(stdBalance - 1)
//          })
//
//          it('should maintain the owner\'s balance', async () => {
//            let ownerInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, invalidAddress
//            ).should.be.fulfilled
//            ownerInfo.toNumber().should.be.eq(0)
//          })
//
//          it('should maintain the recipient\'s balance', async () => {
//            let recipientInfo = await initCrowdsale.balanceOf.call(
//              storage.address, executionID, recipientAccount
//            ).should.be.fulfilled
//            recipientInfo.toNumber().should.be.eq(0)
//          })
//        })
//      })
//
//      context('when the recipient address is valid', async () => {
//
//        context('when the spender has insufficient allowance', async () => {
//
//          let invalidCalldata
//          let invalidEvent
//          let invalidReturn
//
//          beforeEach(async () => {
//            invalidCalldata = await tokenUtils.transferFrom.call(
//              ownerAccount, recipientAccount, stdBalance, spenderContext
//            ).should.be.fulfilled
//            invalidCalldata.should.not.eq('0x')
//
//            invalidReturn = await storage.exec.call(
//              tokenTransferFrom.address, executionID, invalidCalldata,
//              { from: exec }
//            ).should.be.fulfilled
//
//            let events = await storage.exec(
//              tokenTransferFrom.address, executionID, invalidCalldata,
//              { from: exec }
//            ).then((tx) => {
//              return tx.logs
//            })
//            events.should.not.eq(null)
//            events.length.should.be.eq(1)
//            invalidEvent = events[0]
//          })
//
//          describe('returned data', async () => {
//
//            it('should return a tuple with 3 fields', async () => {
//              invalidReturn.length.should.be.eq(3)
//            })
//
//            it('should return the correct number of events emitted', async () => {
//              invalidReturn[0].toNumber().should.be.eq(0)
//            })
//
//            it('should return the correct number of addresses paid', async () => {
//              invalidReturn[1].toNumber().should.be.eq(0)
//            })
//
//            it('should return the correct number of storage slots written to', async () => {
//              invalidReturn[2].toNumber().should.be.eq(0)
//            })
//          })
//
//          it('should emit an ApplicationException event', async () => {
//            invalidEvent.event.should.be.eq('ApplicationException')
//          })
//
//          describe('the ApplicationException event', async () => {
//
//            it('should match the used execution id', async () => {
//              let emittedExecID = invalidEvent.args['execution_id']
//              emittedExecID.should.be.eq(executionID)
//            })
//
//            it('should match the TokenTransfer address', async () => {
//              let emittedAppAddr = invalidEvent.args['application_address']
//              emittedAppAddr.should.be.eq(tokenTransferFrom.address)
//            })
//
//            it('should contain the error message \'DefaultException\'', async () => {
//              let emittedMessage = invalidEvent.args['message']
//              hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
//            })
//          })
//
//          describe('storage', async () => {
//
//            it('should maintain the spender\'s allownace', async () => {
//              let spenderInfo = await initCrowdsale.allowance.call(
//                storage.address, executionID, ownerAccount, spenderAccount
//              ).should.be.fulfilled
//              spenderInfo.toNumber().should.be.eq(stdBalance - 1)
//            })
//
//            it('should maintain the owner\'s balance', async () => {
//              let ownerInfo = await initCrowdsale.balanceOf.call(
//                storage.address, executionID, ownerAccount
//              ).should.be.fulfilled
//              ownerInfo.toNumber().should.be.eq(stdBalance)
//            })
//
//            it('should maintain the recipient\'s balance', async () => {
//              let recipientInfo = await initCrowdsale.balanceOf.call(
//                storage.address, executionID, recipientAccount
//              ).should.be.fulfilled
//              recipientInfo.toNumber().should.be.eq(0)
//            })
//          })
//        })
//
//        context('when the spender has sufficient allowance', async () => {
//
//          context('but the owner has insufficient balance', async () => {
//
//            let invalidCalldata
//            let invalidEvent
//            let invalidReturn
//
//            beforeEach(async () => {
//              let preTransferCalldata = await tokenUtils.transfer.call(
//                spenderAccount, 2, ownerContext
//              ).should.be.fulfilled
//              preTransferCalldata.should.not.eq('0x')
//
//              invalidCalldata = await tokenUtils.transferFrom.call(
//                ownerAccount, recipientAccount, stdBalance, spenderContext
//              ).should.be.fulfilled
//              invalidCalldata.should.not.eq('0x')
//
//              let events = await storage.exec(
//                tokenTransfer.address, executionID, preTransferCalldata,
//                { from: exec }
//              ).then((tx) => {
//                return tx.logs
//              })
//              events.should.not.eq(null)
//              events.length.should.be.eq(1)
//              events[0].event.should.be.eq('ApplicationExecution')
//
//              invalidReturn = await storage.exec.call(
//                tokenTransferFrom.address, executionID, invalidCalldata,
//                { from: exec }
//              ).should.be.fulfilled
//
//              events = await storage.exec(
//                tokenTransferFrom.address, executionID, invalidCalldata,
//                { from: exec }
//              ).then((tx) => {
//                return tx.logs
//              })
//              events.should.not.eq(null)
//              events.length.should.be.eq(1)
//              invalidEvent = events[0]
//            })
//
//            describe('returned data', async () => {
//
//              it('should return a tuple with 3 fields', async () => {
//                invalidReturn.length.should.be.eq(3)
//              })
//
//              it('should return the correct number of events emitted', async () => {
//                invalidReturn[0].toNumber().should.be.eq(0)
//              })
//
//              it('should return the correct number of addresses paid', async () => {
//                invalidReturn[1].toNumber().should.be.eq(0)
//              })
//
//              it('should return the correct number of storage slots written to', async () => {
//                invalidReturn[2].toNumber().should.be.eq(0)
//              })
//            })
//
//            it('should emit an ApplicationException event', async () => {
//              invalidEvent.event.should.be.eq('ApplicationException')
//            })
//
//            describe('the ApplicationException event', async () => {
//
//              it('should match the used execution id', async () => {
//                let emittedExecID = invalidEvent.args['execution_id']
//                emittedExecID.should.be.eq(executionID)
//              })
//
//              it('should match the TokenTransfer address', async () => {
//                let emittedAppAddr = invalidEvent.args['application_address']
//                emittedAppAddr.should.be.eq(tokenTransferFrom.address)
//              })
//
//              it('should contain the error message \'DefaultException\'', async () => {
//                let emittedMessage = invalidEvent.args['message']
//                hexStrEquals(emittedMessage, 'DefaultException').should.be.eq(true)
//              })
//            })
//
//            describe('storage', async () => {
//
//              it('should maintain the spender\'s allownace', async () => {
//                let spenderInfo = await initCrowdsale.allowance.call(
//                  storage.address, executionID, ownerAccount, spenderAccount
//                ).should.be.fulfilled
//                spenderInfo.toNumber().should.be.eq(stdBalance - 1)
//              })
//
//              it('should maintain the owner\'s balance', async () => {
//                let ownerInfo = await initCrowdsale.balanceOf.call(
//                  storage.address, executionID, ownerAccount
//                ).should.be.fulfilled
//                ownerInfo.toNumber().should.be.eq(stdBalance - 2)
//              })
//
//              it('should maintain the recipient\'s balance', async () => {
//                let recipientInfo = await initCrowdsale.balanceOf.call(
//                  storage.address, executionID, recipientAccount
//                ).should.be.fulfilled
//                recipientInfo.toNumber().should.be.eq(0)
//              })
//            })
//          })
//
//          context('and the owner has sufficient balance', async () => {
//
//            let execEvents
//            let execReturn
//
//            beforeEach(async () => {
//
//              transferCalldata = await tokenUtils.transferFrom.call(
//                ownerAccount, recipientAccount, stdBalance - 1, spenderContext
//              ).should.be.fulfilled
//              transferCalldata.should.not.eq('0x')
//
//              execReturn = await storage.exec.call(
//                tokenTransferFrom.address, executionID, transferCalldata,
//                { from: exec }
//              ).should.be.fulfilled
//
//              execEvents = await storage.exec(
//                tokenTransferFrom.address, executionID, transferCalldata,
//                { from: exec }
//              ).then((tx) => {
//                return tx.receipt.logs
//              })
//            })
//
//            describe('returned data', async () => {
//
//              it('should return a tuple with 3 fields', async () => {
//                execReturn.length.should.be.eq(3)
//              })
//
//              it('should return the correct number of events emitted', async () => {
//                execReturn[0].toNumber().should.be.eq(1)
//              })
//
//              it('should return the correct number of addresses paid', async () => {
//                execReturn[1].toNumber().should.be.eq(0)
//              })
//
//              it('should return the correct number of storage slots written to', async () => {
//                execReturn[2].toNumber().should.be.eq(3)
//              })
//            })
//
//            describe('events', async () => {
//
//              it('should have emitted 2 events total', async () => {
//                execEvents.length.should.be.eq(2)
//              })
//
//              describe('the ApplicationExecution event', async () => {
//
//                let eventTopics
//                let eventData
//
//                beforeEach(async () => {
//                  eventTopics = execEvents[1].topics
//                  eventData = execEvents[1].data
//                })
//
//                it('should have the correct number of topics', async () => {
//                  eventTopics.length.should.be.eq(3)
//                })
//
//                it('should list the correct event signature in the first topic', async () => {
//                  let sig = eventTopics[0]
//                  web3.toDecimal(sig).should.be.eq(web3.toDecimal(execHash))
//                })
//
//                it('should have the target app address and execution id as the other 2 topics', async () => {
//                  let emittedAddr = eventTopics[2]
//                  let emittedExecId = eventTopics[1]
//                  web3.toDecimal(emittedAddr).should.be.eq(web3.toDecimal(tokenTransferFrom.address))
//                  web3.toDecimal(emittedExecId).should.be.eq(web3.toDecimal(executionID))
//                })
//
//                it('should have an empty data field', async () => {
//                  eventData.should.be.eq('0x0')
//                })
//              })
//
//              describe('the other event', async () => {
//
//                let eventTopics
//                let eventData
//
//                beforeEach(async () => {
//                  eventTopics = execEvents[0].topics
//                  eventData = execEvents[0].data
//                })
//
//                it('should have the correct number of topics', async () => {
//                  eventTopics.length.should.be.eq(3)
//                })
//
//                it('should match the Transfer event signature for the first topic', async () => {
//                  let sig = eventTopics[0]
//                  web3.toDecimal(sig).should.be.eq(web3.toDecimal(transferHash))
//                })
//
//                it('should match the owner and recipient addresses for the other two topics', async () => {
//                  web3.toDecimal(eventTopics[1]).should.be.eq(web3.toDecimal(ownerAccount))
//                  web3.toDecimal(eventTopics[2]).should.be.eq(web3.toDecimal(recipientAccount))
//                })
//
//                it('should contain the number of tokens transferred as the data field', async () => {
//                  web3.toDecimal(eventData).should.be.eq(stdBalance - 1)
//                })
//              })
//            })
//
//            describe('storage', async () => {
//
//              it('should have changed the spender\'s allownace', async () => {
//                let spenderInfo = await initCrowdsale.allowance.call(
//                  storage.address, executionID, ownerAccount, spenderAccount
//                ).should.be.fulfilled
//                spenderInfo.toNumber().should.be.eq(0)
//              })
//
//              it('should have changed the owner\'s balance', async () => {
//                let ownerInfo = await initCrowdsale.balanceOf.call(
//                  storage.address, executionID, ownerAccount
//                ).should.be.fulfilled
//                ownerInfo.toNumber().should.be.eq(1)
//              })
//
//              it('should have changed the recipient\'s balance', async () => {
//                let recipientInfo = await initCrowdsale.balanceOf.call(
//                  storage.address, executionID, recipientAccount
//                ).should.be.fulfilled
//                recipientInfo.toNumber().should.be.eq(stdBalance - 1)
//              })
//            })
//          })
//        })
//      })
//    })
//  })
//})
