### MintedCappedCrowdsale:

##### Install:

`npm install`

##### Test: 

`npm test`

##### About:

A crowdsale contract in which tokens are minted for each purchase, towards a maximum sell cap. The sale additionally supports the initialization of several tiers - each with customized parameters (name, duration, price, sell cap, whitelisting, and more).

- `MintedCappedProxy`: Instead of a `ScriptExec` variant, this contract acts as a solitary interface through which the application can be interacted with. This interface is ERC20-compatible.

- `MintedCappedIdx`: Contains the sale's `init` function, as well as all of the relevant getters for the sale. As with all auth_os apps, the `init` function is called once upon creation of the application instance, after which this contract serves primarily to hold getters.

- `SaleManager`: Implements functionality to allow the sale `admin` to configure various aspects of the sale before it starts. Additionally, allows the `admin` to 'lock' configuration by initializing the sale, as well as 'finalize' the sale, releasing tokens for transfer.

    - `ConfigureSale.createCrowdsaleTiers`: Allows the admin to define additional tiers of the crowdsale. The sale must not have started or have its configuration 'locked.'
    - `ConfigureSale.whitelistMultiForTier`: Allows the admin to update the whitelist information for a tier of the sale by providing a list of affected addresses, minimum purchase sizes, and maximum purchase amounts. This will only take effect if the targeted tier was configured with an enabled whitelist. The admin may update the whitelist at any point.
    - `ConfigureSale.updateTierDuration`: If the targeted tier was configured to allow updates, this function will allow the sale admin to update a tier's duration. The targeted tier must not be the current tier, or an already-passed tier.
    - `ConfigureSale.updateTierMinimum`: If the targeted tier was configured to allow updates, this function will allow the sale admin to update a tier's minimum purchase size. Any purchaser during the targeted tier, if they have not already purchased in the sale, must purchase at a minimum the amount of tokens set here. The targeted tier must not be the current tier, or an already-passed tier.
    - `ManageSale.initializeCrowdsale`: Called by the admin when sale configuration is complete. This function requires that the sale's token was configured, and that the sale has not passed its set start time already. Most further configuration is locked once this is called.
    - `ManageSale.finalizeCrowdsale`: Called by the admin when the sale has completed. Unlocks tokens purchased by accounts for transfer.

- `TokenManager`: Implements functionaliy to allow the sale `admin` to configure the token that will be sold during the sale, as well as set reserved tokens to be minted and paid out once the sale is complete.

    - `ManageTokens.initCrowdsaleToken`: Configures the token that will be sold during the sale by setting a name, symbol, and decimal amount. This can be changed until sale configuration is locked by the admin.
    - `ManageTokens.setTransferAgentStatus`: Allows the admin to set an address as a 'transfer agent,' allowing them to transfer tokens while the tokens are still locked.
    - `ManageTokens.updateMultipleReservedTokens`: Allows the admin to configure several destinations to which tokens will be sent when the sale concludes. All functions updating reservations must be called prior to configuation lock.
    - `ManageTokens.removeReservedTokens`: Allows the admin to remove token reservation information from a destination.
    - `ManageTokens.distributeReservedTokens`: If the sale is finalized, anyone can call this function to trigger distribution of a number of reserved tokens to their appropriate destinations.
    - `ManageTokens.finalizeCrowdsaleAndToken`: Allows the admin to finalize the crowdsale, distibute reserved tokens, and unlock the token for transfers - all in the same function.
    - `ManageTokens.finalizeAndDistributeToken`: If the sale is finalized, anyone can call this function to trigger distribution of all reserved tokens, as well as the token's transfer lock to be removed.

- `Token`: Implements functionality for a token with basic ERC20 functions. Tokens can only be transferred by a transfer agent, or when the token is unlocked (after sale finalization).

    - `Transfer.transfer`: Allows a user to transfer tokens from one address to another.
    - `Transfer.transferFrom`: Allows a user to transfer tokens to an address on another address' behalf (assuming they have been allowed tokens for spending by the owner).
    - `Approve.approve`: Allows a user to approve tokens for spending by another address.
    - `Approve.increaseApproval`: Allows a user to increase the amount of tokens another address may spend on their behalf.
    - `Approve.decreaseApproval`: Allows a user to decrease the amount of tokens another address may spend on their behalf, to a minimum of 0.

- `Sale`: Implements the `buy` function, allowing token purchase after the sale has started.

    - `Purchase.buy`: Allows a user to purchase tokens, assuming they meet the conditions set in place by the current tier.
