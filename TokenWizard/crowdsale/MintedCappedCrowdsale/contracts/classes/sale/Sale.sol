pragma solidity ^0.4.23;

import "./features/Purchase.sol";
import "authos-solidity/contracts/core/Contract.sol";

library Sale {

  using Contract for *;

  /// SALE ///

  // Whether the crowdsale and token are configured, and the sale is ready to run
  function isConfigured() internal pure returns (bytes32)
    { return keccak256("sale_is_configured"); }

  // Whether or not the crowdsale is post-purchase
  function isFinished() internal pure returns (bytes32)
    { return keccak256("sale_is_completed"); }

  // Storage location of the crowdsale's start time
  function startTime() internal pure returns (bytes32)
    { return keccak256("sale_start_time"); }

  // Returns the storage location of the number of tokens sold
  function tokensSold() internal pure returns (bytes32)
    { return keccak256("sale_tokens_sold"); }

  // Stores the amount of unique contributors so far in this crowdsale
  function contributors() internal pure returns (bytes32)
    { return keccak256("sale_contributors"); }

  // Maps addresses to a boolean indicating whether or not this address has contributed
  function hasContributed(address _purchaser) internal pure returns (bytes32)
    { return keccak256(_purchaser, contributors()); }

  /// TIERS ///

  // Stores the number of tiers in the sale
  function saleTierList() internal pure returns (bytes32)
    { return keccak256("sale_tier_list"); }

  // Stores the number of tokens that will be sold in the tier
  function tierCap(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "cap", saleTierList()); }

  // Stores the price of a token (1 * 10^decimals units), in wei
  function tierPrice(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "price", saleTierList()); }

  // Stores the minimum number of tokens a user must purchase for a given tier
  function tierMin(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "minimum", saleTierList()); }

  // Stores the duration of a tier
  function tierDuration(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "duration", saleTierList()); }

  // Returns the storage location of the tier's whitelist status
  function tierWhitelisted(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "wl_stat", saleTierList()); }

  // Storage location of the index of the current tier. If zero, no tier is currently active
  function currentTier() internal pure returns (bytes32)
    { return keccak256("sale_current_tier"); }

  // Storage location of the end time of the current tier. Purchase attempts beyond this time will update the current tier (if another is available)
  function currentEndsAt() internal pure returns (bytes32)
    { return keccak256("current_tier_ends_at"); }

  // Storage location of the total number of tokens remaining for purchase in the current tier
  function currentTokensRemaining() internal pure returns (bytes32)
    { return keccak256("current_tier_tokens_remaining"); }

  /// FUNDS ///

  // Storage location of team funds wallet
  function wallet() internal pure returns (bytes32)
    { return keccak256("sale_destination_wallet"); }

  // Storage location of amount of wei raised during the crowdsale, total
  function totalWeiRaised() internal pure returns (bytes32)
    { return keccak256("sale_tot_wei_raised"); }

  /// WHITELIST ///

  // Stores a tier's whitelist
  function tierWhitelist(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "tier_whitelists"); }

  // Stores a spender's maximum number of tokens allowed to be purchased
  function whitelistMaxTok(uint _idx, address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, "max_tok", tierWhitelist(_idx)); }

  // Stores a spender's minimum token purchase amount for a given whitelisted tier
  function whitelistMinTok(uint _idx, address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, "min_tok", tierWhitelist(_idx)); }

  /// TOKEN ///

  // Storage location for token decimals
  function tokenDecimals() internal pure returns (bytes32)
    { return keccak256("token_decimals"); }

  // Returns the storage location of the total token supply
  function tokenTotalSupply() internal pure returns (bytes32)
    { return keccak256("token_total_supply"); }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address _owner) internal pure returns (bytes32)
    { return keccak256(_owner, TOKEN_BALANCES); }

  /// CHECKS ///

  // Ensures both storage and events have been pushed to the buffer
  function emitStoreAndPay() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0 || Contract.paid() != 1)
      revert('invalid state change');
  }

  // Ensures the sale has been configured, and that the sale has not finished
  function validState() internal view {
    if (msg.value == 0)
      revert('no wei sent');

    if (uint(Contract.read(startTime())) > now)
      revert('sale has not started');

    if (Contract.read(wallet()) == 0)
  	  revert('invalid Crowdsale wallet');

    if (Contract.read(isConfigured()) == 0)
      revert('sale not initialized');

    if (Contract.read(isFinished()) != 0)
      revert('sale already finalized');
  }

  /// FUNCTIONS ///

  // Allows the sender to purchase tokens -
  function buy() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sale is initialized and not yet finalized -
    Contract.checks(validState);
    // Execute approval function -
    Purchase.buy();
    // Check for valid storage buffer
    Contract.checks(emitStoreAndPay);
    // Commit state changes to storage -
    Contract.commit();
  }
}
