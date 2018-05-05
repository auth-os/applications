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

contract('#MintedCappedBuyTokens', function (accounts) {

  let storage

  let exec = accounts[0]
  let updater = accounts[1]
  let executionID

  let initCrowdsale
  let crowdsaleBuy
  let crowdsaleConsole
  let tokenConsole
  let tokenTransfer
  let tokenTransferFrom
  let tokenApprove

  beforeEach(async () => {

  })

  describe('/tiered', async () => {

    describe('/global-mincap', async () => {

      describe('/whitelisted', async () => {

      })

      describe('/non-whitelisted', async () => {

      })
    })

    describe('/non-global-mincap', async () => {

      describe('/whitelisted', async () => {

      })

      describe('/non-whitelisted', async () => {

      })
    })
  })

  describe('/non-tiered', async () => {

    describe('/global-mincap', async () => {

      describe('/whitelisted', async () => {

      })

      describe('/non-whitelisted', async () => {

      })
    })

    describe('/non-global-mincap', async () => {

      describe('/whitelisted', async () => {

      })

      describe('/non-whitelisted', async () => {

      })
    })
  })
})
