// FIXME I think that I need to reevaluate whether or not I should always be using TestRegistryIdx 
// FIXME This test suite should use real test versions once those are implemented

// Abstract storage contract
let AbstractStorage = artifacts.require('./AbstractStorage')
// TestRegistry
let TestRegistryIdx = artifacts.require('./TestRegistryIdx')
let TestRegistryProxy = artifacts.require('./TestRegistryProxy')
let Registration = artifacts.require('./Registration')
let Completion = artifacts.require('./Completion') 
// Registry
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// Utils
let RegistryUtils = artifacts.require('./RegistryUtils')
let TestUtils = artifacts.require('./TestRegistryUtils')
// Support
let Utils = require('./support/utils.js')

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

contract('#TestRegistryInit', function(accounts) {
  
  let storage 

  let testProxy
  let testIdx 
  let testUtils
  let registration
  let completion

  let testAddr
  let testSelectors

  let regExecID
  let regUtil
  let regProvider
  let regIdx

  let exec = accounts[0]
  let proxyAdmin = accounts[1]
  let teamWallet = accounts[2]

  let executionID
  let initCalldata
  let initEvent

  let appName = 'TestRegistry'

  // Event signatures 
  let initHash = web3.sha3('ApplicationInitialized(bytes32,address,address,address)')
  let execHash = web3.sha3('ApplicationExecution(bytes32,address)')
  let payHash = web3.sha3('DeliveredPayment(bytes32,address,uint256)')

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled

    testIdx = await TestRegistryIdx.new().should.be.fulfilled
    testUtils = await TestUtils.new().should.be.fulfilled

    registration = await Registration.new().should.be.fulfilled
    completion = await Completion.new().should.be.fulfilled

    regUtil = await RegistryUtils.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    testSelectors = await testUtils.getSelectors.call().should.be.fulfilled 
    testSelectors.length.should.be.eq(4)
    testAddr = [
      testIdx.address, testIdx.address, testIdx.address, testIdx.address
    ]
    testAddr.length.should.be.eq(4)
  })

  beforeEach(async () => {
    let events = await storage.createRegistry(
      regIdx.address, regProvider.address, { from:exec }
    ).should.be.fulfilled.then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(1)
    events[0].event.should.be.eq('ApplicationInitialized')
    regExecID = events[0].args['execution_id']
    web3.toDecimal(regExecID).should.not.eq(0)

    let registerCalldata = await regUtil.registerApp.call(
      appName, testIdx.address, testSelectors, testAddr 
    ).should.be.fulfilled
    registerCalldata.should.not.eq('0x0')

    events = await storage.exec(
      exec, regExecID, registerCalldata,
      { from: exec } 
    ).should.be.fulfilled.then((tx) => {
      return tx.logs
    })
    events.should.not.eq(null)
    events.length.should.be.eq(1)
    events[0].event.should.be.eq('ApplicationExecution')
    events[0].args['script_target'].should.be.eq(regProvider.address)

  })
  
  describe('valid initialization', async() => {

    beforeEach(async () => {
      // Get valid init calldata
      initCalldata = await testUtils.init.call().should.be.fulfilled
      initCalldata.should.not.be.eq('0x')

      events = await storage.createInstance(
        exec, appName, exec, regExecID, initCalldata,
        { from: exec }
      ).should.be.fulfilled.then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      initEvent = events[0]
      executionID = events[0].args['execution_id']
      web3.toDecimal(executionID).should.not.eq(0)
    })

    it('should emit an ApplicationInitialized event', async () => {
      initEvent.event.should.be.eq('ApplicationInitialized')
    })

    describe('the ApplicationInitialized event', async () => {

      it('should contain the indexed initialization address for the crowdsale', async () => {
        let initAddress = initEvent.args['index']
        initAddress.should.be.eq(testIdx.address)
      })

      it('should contain an indexed execution id', async () => {
        let execID = initEvent.args['execution_id']
        web3.toDecimal(execID).should.not.eq(0)
      })
    })

  })

  describe('#registerTest', async () => {

    // The hash of 'Test'
    let name = web3.sha3('Test') 
    // FIXME - This test should eventually use real test versions
    let initial

    before(async () => {
      // Get valid init calldata
      initCalldata = await testUtils.init.call().should.be.fulfilled
      initCalldata.should.not.be.eq('0x')
      events = await storage.createInstance(
        exec, appName, exec, regExecID, initCalldata,
        { from: exec }
      ).should.be.fulfilled.then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      initEvent = events[0]
      executionID = events[0].args['execution_id']
      web3.toDecimal(executionID).should.not.eq(0)

      initial = storage.address
    })

    describe('the valid registration', async () => {

      let events
      
      before(async () => {
        let calldata = await testUtils.registerTest.call(name, initial).should.be.fulfilled
        calldata.should.not.eq('0x')

        events = await storage.exec(
          exec, executionID, calldata,
          { from: exec }
        ).should.be.fulfilled.then((tx) => {
          return tx.logs
        })
        events.length.should.be.eq(1)
      })
      
      it('should have emitted an ApplicationExecution event', async () => {
        events[0].event.should.be.eq('ApplicationExecution')
      })

      describe('#getRegisteredTests', async() => {
        let registeredTests

        beforeEach(async() => {
          registeredTests = await testIdx.getRegisteredTests.call(storage.address, executionID).should.be.fulfilled
        })

        it('should return 1 registered test', async () => {
          registeredTests.length.should.be.eq(1)
        })

        it('should return the test that was registered', async () => {
          registeredTests[0].should.be.eq(name)
        })

      })

      describe('#getTestVersions', async () => {
        let testVersions

        beforeEach(async () => {
          testVersions = await testIdx.getTestVersions.call(storage.address, executionID, name).should.be.fulfilled
        })

        it('should return 1 test version', async () => {
          testVersions.length.should.be.eq(1)
        })

        it('should return the initial version', async () => {
          testVersions[0].should.be.eq(initial)
        })

      })


    })

    describe('invalid name', async () => {

      let invalidName = Utils.BYTES32_EMPTY 

      it('should throw', async () => {
        let invalidCalldata = await testUtils.registerTest.call(invalidName, storage.address).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        events = await storage.exec(
          exec, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })

    })

    describe('invalid initial', async () => {

      let invalidInitial = Utils.ADDRESS_0x

      it('should throw', async () => {
        let invalidCalldata = await testUtils.registerTest.call(name, invalidInitial).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        events = await storage.exec(
          exec, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })

    })

    describe('invalid name and invalid initial', async () => {

      let invalidName = Utils.BYTES32_EMPTY 
      let invalidInitial = Utils.ADDRESS_0x

      it('should throw', async () => {
        let invalidCalldata = await testUtils.registerTest.call(invalidName, invalidInitial).should.be.fulfilled
        invalidCalldata.should.not.eq('0x')

        events = await storage.exec(
          exec, executionID, invalidCalldata,
          { from: exec }
        ).should.not.be.fulfilled
      })

    })

  })
  
})
