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

  // Storage location of the amount of time the crowdsale will take, accounting for all tiers
  function totalDuration() internal pure returns (bytes32)
    { return keccak256("sale_total_duration"); }

  // Returns the storage location of number of tokens remaining in crowdsale
  function tokensRemaining() internal pure returns (bytes32)
    { return keccak256("sale_tokens_remaining"); }

  // Returns the storage location of crowdsale's starting sale rate
  function startRate() internal pure returns (bytes32)
    { return keccak256("sale_start_rate"); }

  // Returns the storage location of crowdsale's ending sale rate
  function endRate() internal pure returns (bytes32)
    { return keccak256("sale_end_rate"); }

  // Storage location of the minimum amount of tokens allowed to be purchased
  function globalMinPurchaseAmt() internal pure returns (bytes32)
    { return keccak256("sale_min_purchase_amt"); }

  // Stores the amount of unique contributors so far in this crowdsale
  function contributors() internal pure returns (bytes32)
    { return keccak256("sale_contributors"); }

  // Maps addresses to a boolean indicating whether or not this address has contributed
  function hasContributed(address _purchaser) internal pure returns (bytes32)
    { return keccak256(_purchaser, contributors()); }

  /// FUNDS ///

  // Storage location of team funds wallet
  function wallet() internal pure returns (bytes32)
    { return keccak256("sale_destination_wallet"); }

  // Storage location of amount of wei raised during the crowdsale, total
  function totalWeiRaised() internal pure returns (bytes32)
    { return keccak256("sale_tot_wei_raised"); }

  /// WHITELIST ///

  // Whether or not the sale is whitelist-enabled
  function isWhitelisted() internal pure returns (bytes32)
    { return keccak256('sale_is_whitelisted'); }

  // Stores the sale's whitelist
  function saleWhitelist() internal pure returns (bytes32)
    { return keccak256("sale_whitelist"); }

  // Stores a spender's maximum wei spend amount
  function whitelistMaxWei(address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, "max_wei", saleWhitelist()); }

  // Stores a spender's minimum token purchase amount
  function whitelistMinTok(address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, "min_tok", saleWhitelist()); }

  /// TOKEN ///

  // Storage location for token decimals
  function tokenDecimals() internal pure returns (bytes32)
    { return keccak256("token_decimals"); }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address _owner) internal pure returns (bytes32)
    { return keccak256(_owner, TOKEN_BALANCES); }

  /// CHECKS ///

  // Ensures the sale has been configured, and that the sale has not finished
  function validState() internal view {
    // Ensure ETH was sent with the transaction
    if (msg.value == 0)
      revert('no wei sent');

    // Ensure the sale has started
    if (uint(Contract.read(startTime())) > now)
      revert('sale has not started');

    // Ensure the team wallet is correct
    if (Contract.read(wallet()) == 0)
  	  revert('invalid Crowdsale wallet');

    // Ensure the sale was configured
    if (Contract.read(isConfigured()) == 0)
      revert('sale not initialized');

    // Ensure the sale is not finished
    if (Contract.read(isFinished()) != 0)
      revert('sale already finalized');

    // Ensure the sale is not sold out
  	if (Contract.read(tokensRemaining()) == 0)
  	  revert('Crowdsale is sold out');

  	// Ensure the start and end rate were correctly set
  	if (Contract.read(startRate()) <= Contract.read(endRate()))
  	  revert("end sale rate is greater than starting sale rate");

  	// Ensure the sale is not over
  	if (now > uint(Contract.read(startTime())) + uint(Contract.read(totalDuration())))
  	  revert("the crowdsale is over");
  }

  // Ensures both storage and events have been pushed to the buffer
  function emitStoreAndPay() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0 || Contract.paid() != 1)
      revert('invalid state change');
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
