pragma solidity ^0.4.23;

import "./lib/Contract.sol";
import "./lib/SafeMath.sol";
import "./Initialize.sol";
import "./classes/Token.sol";
import "./classes/Sale.sol";
import "./classes/Admin.sol";

library MintedCapped {

  // TODO - set script exec address in constructor and check for each function

  // Initialization function - uses a new exec id to create a new instance of this application
  function init(
    address team_wallet, uint start_time, bytes32 initial_tier_name,
    uint initial_tier_price, uint initial_tier_duration, uint initial_tier_token_sell_cap,
    bool initial_tier_is_whitelisted, bool initial_tier_duration_is_modifiable, address admin
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.initialize();
    // Check preconditions for execution -
    Contract.checks(Initialize.first);
    // Execute transfer function -
    Initialize.init(
      team_wallet, start_time, initial_tier_name, initial_tier_price,
      initial_tier_duration, initial_tier_token_sell_cap, initial_tier_is_whitelisted,
      initial_tier_duration_is_modifiable, admin
    );
    // Check postconditions for execution -
    Contract.checks(Initialize.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  //// CLASS - Token: ////

  /// Feature - Transfer: ///
  function transfer(address to, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute transfer function -
    Transfer.transfer(to, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function transferFrom(address owner, address recipient, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute transfer function -
    Transfer.transferFrom(owner, recipient, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  /// Feature - Approve: ///
  function approve(address spender, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute approval function -
    Approve.approve(spender, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function increaseApproval(address spender, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute approval function -
    Approve.increaseApproval(spender, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function decreaseApproval(address spender, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute approval function -
    Approve.decreaseApproval(spender, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  //// CLASS - Sale: ////

  /// Feature - Purchase: ///
  /* function buy(bytes context) external view {
  } */

  //// CLASS - Admin: ////

  /// Feature - ConfigureSale: ///
  /* function updateGlobalMinContribution(uint new_min_contribution, bytes context)
  external view { }
  function createCrowdsaleTiers(
    bytes32[] tier_names, uint[] tier_durations, uint[] tier_prices, uint[] tier_caps,
    bool[] tier_modifiable, bool[] tier_whitelisted, bytes context
  ) external view { }
  function whitelistMultiForTier(
    uint tier_index, address[] to_whitelist, uint[] min_token_purchase, uint[] max_wei_spend,
    bytes context
  ) external view { }
  function initCrowdsaleToken(bytes32 name, bytes32 symbol, uint decimals, bytes context)
  external view { }
  function updateTierDuration(uint tier_index, uint new_duration, bytes context)
  external view { } */

  // Feature - ManageSale: ///
  /* function initializeCrowdsale(bytes context) external view { }
  function finalizeCrowdsale(bytes context) external view { } */

  // Feature - ManageTokens: ///
  /* function setTransferAgentStatus(address agent, bool is_agent, bytes context) external view { }
  function updateMultipleReservedTokens(address[] destinations, uint[] num_tokens, uint[] num_percents, uint[] percent_decimals, bytes context) external view { }
  function removeReservedTokens(address destination, bytes context) external view { }
  function distributeReservedTokens(uint num_destinations, bytes context) external view { }
  function finalizeCrowdsaleAndToken(bytes context) external view { }
  function distributeAndUnlockTokens(bytes context) external view { }
  function finalizeAndDistributeToken(bytes context) external view { } */
}
