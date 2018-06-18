pragma solidity ^0.4.23;

import "./features/ConfigureSale.sol";
import "./features/ManageSale.sol";
import "authos-solidity/contracts/core/Contract.sol";

library SaleManager {

  using Contract for *;

  /// SALE ///

  // Storage location of crowdsale admin address
  function admin() internal pure returns (bytes32)
    { return keccak256('sale_admin'); }

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

  /// TIERS ///

  // Stores the number of tiers in the sale
  function saleTierList() internal pure returns (bytes32)
    { return keccak256("sale_tier_list"); }

  // Stores the name of the tier
  function tierName(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "name", saleTierList()); }

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

  // Whether or not the tier's duration is modifiable (before it has begin)
  function tierModifiable(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "mod_stat", saleTierList()); }

  // Returns the storage location of the tier's whitelist status
  function tierWhitelisted(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "wl_stat", saleTierList()); }

  // Storage location of the index of the current tier. If zero, no tier is currently active
  function currentTier() internal pure returns (bytes32)
    { return keccak256("sale_current_tier"); }

  // Storage location of the end time of the current tier. Purchase attempts beyond this time will update the current tier (if another is available)
  function currentEndsAt() internal pure returns (bytes32)
    { return keccak256("current_tier_ends_at"); }

  /// WHITELIST ///

  // Stores a tier's whitelist
  function tierWhitelist(uint _idx) internal pure returns (bytes32)
    { return keccak256(_idx, "tier_whitelists"); }

  // Stores a spender's maximum wei spend amount for a given whitelisted tier
  function whitelistMaxWei(uint _idx, address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, "max_wei", tierWhitelist(_idx)); }

  // Stores a spender's minimum token purchase amount for a given whitelisted tier
  function whitelistMinTok(uint _idx, address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, "min_tok", tierWhitelist(_idx)); }

  /// TOKEN ///

  // Storage location for token name
  function tokenName() internal pure returns (bytes32)
    { return keccak256("token_name"); }

  // Storage location for token ticker symbol
  function tokenSymbol() internal pure returns (bytes32)
    { return keccak256("token_symbol"); }

  // Storage location for token decimals
  function tokenDecimals() internal pure returns (bytes32)
    { return keccak256("token_decimals"); }

  // Storage location for token totalSupply
  function tokenTotalSupply() internal pure returns (bytes32)
    { return keccak256("token_total_supply"); }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address _owner) internal pure returns (bytes32)
    { return keccak256(_owner, TOKEN_BALANCES); }

  // Whether or not the token is unlocked for transfers
  function tokensUnlocked() internal pure returns (bytes32)
    { return keccak256('sale_tokens_unlocked'); }

  /// CHECKS ///

  // Ensures that the sender is the admin address, and the sale is not initialized
  function onlyAdminAndNotInit() internal view {
    if (address(Contract.read(admin())) != Contract.sender())
      revert('sender is not admin');

    if (Contract.read(isConfigured()) != 0)
      revert('sale has already been configured');
  }

  // Ensures that the sender is the admin address, and the sale is not finalized
  function onlyAdminAndNotFinal() internal view {
    if (address(Contract.read(admin())) != Contract.sender())
      revert('sender is not admin');

    if (Contract.read(isFinished()) != 0)
      revert('sale has already been finalized');
  }

  // Ensure that the sender is the sale admin
  function onlyAdmin() internal view {
    if (address(Contract.read(admin())) != Contract.sender())
      revert('sender is not admin');
  }

  // Ensures both storage and events have been pushed to the buffer
  function emitAndStore() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  // Ensures the pending state change will only store
  function onlyStores() internal pure {
    if (Contract.paid() != 0 || Contract.emitted() != 0)
      revert('expected only storage');

    if (Contract.stored() == 0)
      revert('expected storage');
  }

  /// FUNCTIONS ///

  /*
  Allows the admin to add additional crowdsale tiers before the start of the sale

  @param _tier_names: The name of each tier to add
  @param _tier_durations: The duration of each tier to add
  @param _tier_prices: The set purchase price for each tier
  @param _tier_caps: The maximum tokens to sell in each tier
  @param _tier_modifiable: Whether each tier's duration is modifiable or not
  @param _tier_whitelisted: Whether each tier incorporates a whitelist
  */
  function createCrowdsaleTiers(
    bytes32[] _tier_names, uint[] _tier_durations, uint[] _tier_prices, uint[] _tier_caps,
    bool[] _tier_modifiable, bool[] _tier_whitelisted
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the admin and the sale is not initialized
    Contract.checks(onlyAdminAndNotInit);
    // Execute function -
    ConfigureSale.createCrowdsaleTiers(
      _tier_names, _tier_durations, _tier_prices,
      _tier_caps, _tier_modifiable, _tier_whitelisted
    );
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Allows the admin to whitelist addresses for a tier which was setup to be whitelist-enabled -

  @param _tier_index: The index of the tier for which the whitelist will be updated
  @param _to_whitelist: An array of addresses that will be whitelisted
  @param _min_token_purchase: Each address' minimum purchase amount
  @param _max_wei_spend: Each address' maximum wei spend amount
  */
  function whitelistMultiForTier(
    uint _tier_index, address[] _to_whitelist, uint[] _min_token_purchase, uint[] _max_wei_spend
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin -
    Contract.checks(onlyAdmin);
    // Execute function -
    ConfigureSale.whitelistMultiForTier(
      _tier_index, _to_whitelist, _min_token_purchase, _max_wei_spend
    );
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Allows the admin to update a tier's duration, provided it was marked as modifiable and has not started

  @param _tier_index: The index of the tier whose duration will be updated
  @param _new_duration: The new duration of the tier
  */
  function updateTierDuration(uint _tier_index, uint _new_duration) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and that the sale is not finalized -
    Contract.checks(onlyAdminAndNotFinal);
    // Execute function -
    ConfigureSale.updateTierDuration(_tier_index, _new_duration);
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Allows the admin to update a tier's minimum purchase amount (if it was marked modifiable)

  @param _tier_index: The index of the tier whose minimum will be updated
  @param _new_minimum: The minimum amount of tokens
  */
  function updateTierMinimum(uint _tier_index, uint _new_minimum) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and that the sale is not finalized -
    Contract.checks(onlyAdminAndNotFinal);
    // Execute function -
    ConfigureSale.updateTierMinimum(_tier_index, _new_minimum);
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }

  // Allows the admin to initialize a crowdsale, marking it configured
  function initializeCrowdsale() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and the sale is not initialized -
    Contract.checks(onlyAdminAndNotInit);
    // Execute function -
    ManageSale.initializeCrowdsale();
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  // Allows the admin to finalize a crowdsale, marking it completed
  function finalizeCrowdsale() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and that the sale is not finalized -
    Contract.checks(onlyAdminAndNotFinal);
    // Execute function -
    ManageSale.finalizeCrowdsale();
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }
}
