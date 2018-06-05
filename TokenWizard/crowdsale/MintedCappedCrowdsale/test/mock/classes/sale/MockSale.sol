pragma solidity ^0.4.23;

import "../../MockMintedCapped.sol";
import "../../Contract.sol";
import "./features/MockPurchase.sol";

library MockSale {

  using Contract for *;

  /// CROWDSALE STORAGE ///
  
  function ends_at() internal pure returns (bytes32 location) {
    location = keccak256('current_tier_ends_at');
  }

  function crowdsale_tiers() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_list");
  }

  // Storage location of the CROWDSALE_TIERS index (-1) of the current tier. If zero, no tier is currently active
  function current_tier() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_current_tier");
  }

  // Storage location of the total number of tokens remaining for purchase in the current tier
  function tokens_remaining() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_tokens_remaining");
  }

  // Storage location for token decimals
  function decimals() internal pure returns (bytes32 location) {
    location = keccak256("token_decimals");
  }

  // Storage location of team funds wallet
  function wallet() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wallet");
  }

  // Storage location of amount of wei raised during the crowdsale, total
  function wei_raised() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wei_raised");
  }

  // Returns the storage location of the initialization status
  function is_init() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_init");
  }

  // Returns the storage location of the finalization status
  function is_final() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_finalized");
  }
  // Returns the storage location of the Crowdsale's start time
  function start_time() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_start_time");
  }

  // Returns the storage location of the number of tokens sold
  function tokens_sold() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tokens_sold");
  }

  // Returns the storage location of the total token supply
  function total_supply() internal pure returns (bytes32 location) {
    location = keccak256('tokens_total_supply');
  }

  // Returns the storage location of the minimum amount of tokens allowed to be purchased
  function min_contribution() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_min_cap");
  }

  // Storage seed for unique contributors
  bytes32 private constant UNIQUE_CONTRIB_SEED = keccak256('crowdsale_unique_contributions');

  function contributors() internal pure returns (bytes32 location) {
    location = UNIQUE_CONTRIB_SEED;
  }

  // Returns the storage location of the sender's contribution status
  function has_contributed(address sender) internal pure returns (bytes32 location) {
    location = keccak256(sender, UNIQUE_CONTRIB_SEED);
  }

  bytes32 private constant CROWDSALE_TIERS = keccak256('crowdsale_tiers');

  // Returns the storage location of the tier's token sell cap
  function tier_sell_cap(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(64 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Returns the storage location of the tier's price 
  function tier_price(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(96 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Returns the storage location of the tier's duration 
  function tier_duration(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(128 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Returns the storage location of the tier's whitelist status  
  function tier_is_whitelisted(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(192 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Storage seed for the sale whitelist
  bytes32 internal constant SALE_WHITELIST = keccak256("crowdsale_purchase_whitelist");

  // Returns the storage location for the sender's whitelist status in the tier
  function whitelist_max_cap(address sender, uint tier) internal pure returns (bytes32 location) {
    location = keccak256(sender, keccak256(tier, SALE_WHITELIST));
  }

  // Returns the storage location for the sender's whitelist status in the tier
  function whitelist_min_cap(address sender, uint tier) internal pure returns (bytes32 location) {
    location = bytes32(32 + uint(keccak256(sender, keccak256(tier, SALE_WHITELIST))));
  }

  /// TOKEN STORAGE ///
  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address owner) internal pure returns (bytes32 location) {
    location = keccak256(owner, TOKEN_BALANCES);
  }
  
  // Function selector for buy
  bytes4 internal constant BUY_SEL = bytes4(keccak256('buy()'));

  // Sale pre/post conditions for execution -

  // Check msg.sig, and check the appropriate preconditions
  function first() internal pure {
    if (msg.sig == BUY_SEL) 
      Contract.checks(MockPurchase.first);
    else 
      revert('Invalid function selector');
  }


  // After each Purchase feature executes, ensure that the result
  // will both emit an event and store values in storage
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('Invalid state change');
  }


}

