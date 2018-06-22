### DutchCrowdsale:

##### Install:

`npm install`

##### Test: 

`npm test`

##### About:

A crowdsale contract in which the purchase price begins at a set maximum, and decreases steadily over the sale's duration until the set minimum price is reached, or until the total number of tokens marked to sell is reached. This crowdsale additionally supports whitelisting.

- `DutchProxy`: Instead of a `ScriptExec` variant, this contract acts as a solitary interface through which the application can be interacted with. This interface is ERC20-compatible.

- `DutchCrowdsaleIdx`: Contains the sale's `init` function, as well as all of the relevant getters for the sale. As with all auth_os apps, the `init` function is called once upon creation of the application instance, after which this contract serves primarily to hold getters.

- `Admin`: Implements functionality to allow the sale `admin` to configure various aspects of the sale, manage the sale while it is active, and finalize the state of the sale when it is completed.

    - `ConfigureSale.initCrowdsaleToken`: Configures the token that will be sold during the sale by setting a name, symbol, and decimal amount. This can be changed until sale configuration is locked by the admin.
    - `ConfigureSale.updateGlobalMinContribution`: Allows the admin to define a minimum purchase size during the sale. Purchasers that have not already participated will need to buy this amount at a minimum.
    - `ConfigureSale.whitelistMulti`: Allows the admin to whitelist several addresses by passing in a list of destinations and minimum and maximum purchase sizes.
    - `ConfigureSale.setCrowdsaleStartandDuration`: Allows the admin to update the crowdsale's start date and duration, provided the sale's configuration is not locked.
    - `ManageSale.initializeCrowdsale`: Called by the admin when sale configuration is complete. This function requires that the sale's token was configured, and that the sale has not passed its set start time already. Most further configuration is locked once this is called.
    - `ManageSale.finalizeCrowdsale`: Called by the admin when the sale has completed. Unlocks tokens purchased by accounts for transfer.
    - `ManageTokens.setTransferAgentStatus`: Allows the admin to set an address as a 'transfer agent,' allowing them to transfer tokens while the tokens are still locked.

- `Token`: Implements functionality for a token with basic ERC20 functions. Tokens can only be transferred by a transfer agent, or when the token is unlocked (after sale finalization).

    - `Transfer.transfer`: Allows a user to transfer tokens from one address to another.
    - `Transfer.transferFrom`: Allows a user to transfer tokens to an address on another address' behalf (assuming they have been allowed tokens for spending by the owner).
    - `Approve.approve`: Allows a user to approve tokens for spending by another address.
    - `Approve.increaseApproval`: Allows a user to increase the amount of tokens another address may spend on their behalf.
    - `Approve.decreaseApproval`: Allows a user to decrease the amount of tokens another address may spend on their behalf, to a minimum of 0.

- `Sale`: Implements the `buy` function, allowing token purchase after the sale has started.

    - `Purchase.buy`: Allows a user to purchase tokens, assuming they meet the conditions set in place by the current tier.
