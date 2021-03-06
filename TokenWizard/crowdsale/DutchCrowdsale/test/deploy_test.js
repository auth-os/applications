// Script exec and storage contracts
let ScriptExec = artifacts.require('./RegistryExec')
let AbstractStorage = artifacts.require('./AbstractStorage')
// Registry
let RegistryUtil = artifacts.require('./RegistryUtil')
let RegistryIdx = artifacts.require('./RegistryIdx')
let Provider = artifacts.require('./Provider')
// DutchAuction
let Token = artifacts.require('./Token')
let Sale = artifacts.require('./Sale')
let Admin = artifacts.require('./Admin')
let DutchSale = artifacts.require('./DutchCrowdsaleIdx')
// Utils
let DutchUtils = artifacts.require('./utils/DutchUtils')

function hexStrEquals(hex, expected) {
  return web3.toAscii(hex).substring(0, expected.length) == expected;
}

function getTime() {
  let block = web3.eth.getBlock('latest')
  return block.timestamp;
}

contract('DutchCrowdsale', function (accounts) {

  let storage
  let scriptExec

  let exec = accounts[0]
  let execAdmin = accounts[1]

  let regExecID
  let regUtil
  let regProvider
  let regIdx

  let saleUtils
  let saleSelectors
  let saleAddrs

  let saleIdx
  let token
  let sale
  let admin

  let appName = 'DutchCrowdsale'

  before(async () => {
    storage = await AbstractStorage.new().should.be.fulfilled

    regUtil = await RegistryUtil.new().should.be.fulfilled
    regProvider = await Provider.new().should.be.fulfilled
    regIdx = await RegistryIdx.new().should.be.fulfilled

    saleIdx = await DutchSale.new().should.be.fulfilled
    token = await Token.new().should.be.fulfilled
    sale = await Sale.new().should.be.fulfilled
    admin = await Admin.new().should.be.fulfilled

    saleUtils = await DutchUtils.new().should.be.fulfilled

    saleSelectors = await saleUtils.getSelectors.call().should.be.fulfilled
    saleSelectors.length.should.be.eq(13)

    saleAddrs = [
      // admin
      admin.address, admin.address, admin.address, admin.address,
      admin.address, admin.address, admin.address,

      // sale
      sale.address,

      // token
      token.address, token.address, token.address, token.address, token.address
    ]
    saleAddrs.length.should.be.eq(saleSelectors.length)

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

    scriptExec = await ScriptExec.new().should.be.fulfilled
    await scriptExec.configure(
      execAdmin, storage.address, exec,
      { from: execAdmin }
    ).should.be.fulfilled
    await scriptExec.setRegistryExecID(regExecID, { from: execAdmin }).should.be.fulfilled
  })

  it('should correctly set up script exec', async () => {
    let storedAdmin = await scriptExec.exec_admin.call().should.be.fulfilled
    let defaultStorage = await scriptExec.app_storage.call().should.be.fulfilled
    let defaultRegistryExecID = await scriptExec.registry_exec_id.call().should.be.fulfilled
    let defaultProvider = await scriptExec.provider.call().should.be.fulfilled

    storedAdmin.should.be.eq(execAdmin)
    defaultStorage.should.be.eq(storage.address)
    defaultRegistryExecID.should.be.eq(regExecID)
    defaultProvider.should.be.eq(exec)
  })

  context('crowdsale application registration', async () => {

    let registerAppCalldata

    before(async () => {
      registerAppCalldata = await regUtil.registerApp.call(
        appName, saleIdx.address, saleSelectors, saleAddrs
      ).should.be.fulfilled
      registerAppCalldata.should.not.eq('0x')

      let events = await storage.exec(
        exec, regExecID, registerAppCalldata,
        { from: exec }
      ).then((tx) => {
        return tx.logs
      })
      events.should.not.eq(null)
      events.length.should.be.eq(1)
      events[0].event.should.be.eq('ApplicationExecution')
    })

    describe('#getLatestVersion', async () => {

      let appLatest

      beforeEach(async () => {
        appLatest = await regIdx.getLatestVersion.call(
          storage.address, regExecID, exec, appName
        ).should.be.fulfilled
      })

      it('should match the app registered', async () => {
        hexStrEquals(appLatest, appName).should.be.eq(true)
      })
    })

    describe('#getVersionImplementation', async () => {

      let verImpl

      beforeEach(async () => {
        verImpl = await regIdx.getVersionImplementation.call(
          storage.address, regExecID, exec, appName, appName
        ).should.be.fulfilled
        verImpl.length.should.be.eq(3)
      })

      it('should have a valid index address', async () => {
        verImpl[0].should.be.eq(saleIdx.address)
      })

      it('should match the selectors passed in', async () => {
        verImpl[1].should.be.eql(saleSelectors)
      })

      it('should match the addresses passed in', async () => {
        verImpl[2].should.be.eql(saleAddrs)
      })
    })

    context('crowdsale app instance initialization', async () => {

      let initCrowdsaleCalldata
      let initCrowdsaleEvent
      let crowdsaleExecID

      let teamWallet = accounts[1]
      let totalSupply = web3.toWei('1000', 'ether')
      let sellAmount = web3.toWei('500', 'ether')
      let startRate = web3.toWei('0.01', 'ether')
      let endRate = web3.toWei('0.001', 'ether')
      let duration = 3600
      let startTime
      let isWhitelisted = true
      let admin = execAdmin
      let burnExcess = true

      beforeEach(async () => {
        startTime = getTime() + 3600

        initCrowdsaleCalldata = await saleUtils.init.call(
          teamWallet, totalSupply, sellAmount, startRate,
          endRate, duration, startTime, isWhitelisted, admin, burnExcess
        ).should.be.fulfilled
        initCrowdsaleCalldata.should.not.eq('0x')
      })

      describe('#initAppInstance - script exec', async () => {

        let deployer = accounts[accounts.length - 1]

        let appInstanceEvent

        beforeEach(async () => {
          let events = await scriptExec.createAppInstance(
            appName, initCrowdsaleCalldata,
            { from: deployer }
          ).then((tx) => {
            return tx.logs
          })
          events.should.not.eq(null)
          events.length.should.be.eq(1)
          events[0].event.should.be.eq('AppInstanceCreated')

          appInstanceEvent = events[0]
          crowdsaleExecID = appInstanceEvent.args['execution_id']
        })

        describe('the AppInstanceCreated event', async () => {

          it('should contain the indexed deployer address', async () => {
            let creatorAddr = appInstanceEvent.args['creator']
            creatorAddr.should.be.eq(deployer)
          })

          it('should contain a valid execution ID', async () => {
            web3.toDecimal(crowdsaleExecID).should.not.eq(0)
          })
        })
      })
    })
  })
})
