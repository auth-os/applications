pragma solidity ^0.4.23;

import "./lib/Contract.sol";
import "./Initialize.sol";
import "./classes/token/Token.sol";
import "./classes/sale/Sale.sol";
import "./classes/admin/Admin.sol";

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
  function buy() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Sale.first);
    // Execute approval function -
    Purchase.buy();
    // Check postconditions for execution -
    Contract.checks(Sale.last);
    // Commit state changes to storage -
    Contract.commit();
  } 

  //// CLASS - Admin: ////

  /// Feature - ConfigureSale: ///
  function updateGlobalMinContribution(uint new_min_contribution)
  external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ConfigureSale.updateGlobalMinContribution(new_min_contribution);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function createCrowdsaleTiers(
    bytes32[] tier_names, uint[] tier_durations, uint[] tier_prices, uint[] tier_caps,
    bool[] tier_modifiable, bool[] tier_whitelisted
  ) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ConfigureSale.createCrowdsaleTiers(
      tier_names, tier_durations, tier_prices, tier_caps, tier_modifiable, tier_whitelisted 
    );
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function whitelistMultiForTier(
    uint tier_index, address[] to_whitelist, uint[] min_token_purchase, uint[] max_wei_spend
  ) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ConfigureSale.whitelistMultiForTier(
      tier_index, to_whitelist, min_token_purchase, max_wei_spend 
    );
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function initCrowdsaleToken(bytes32 name, bytes32 symbol, uint decimals)
  external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ConfigureSale.initCrowdsaleToken(
      name, symbol, decimals
    );
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }
  
  function updateTierDuration(uint tier_index, uint new_duration)
  external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ConfigureSale.updateTierDuration(
      tier_index, new_duration 
    );
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  } 

  // Feature - ManageSale: ///
  function initializeCrowdsale() external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageSale.initializeCrowdsale();
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function finalizeCrowdsale() external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageSale.finalizeCrowdsale();
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  } 

  // Feature - ManageTokens: ///
  function setTransferAgentStatus(address agent, bool is_agent) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.setTransferAgentStatus(agent, is_agent);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function updateMultipleReservedTokens(address[] destinations, uint[] num_tokens, uint[] num_percents, uint[] percent_decimals) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.updateMultipleReservedTokens(destinations, num_tokens, num_percents, percent_decimals);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function removeReservedTokens(address destination) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.removeReservedTokens(destination);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function distributeReservedTokens(uint num_destinations) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.distributeReservedTokens(num_destinations);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function finalizeCrowdsaleAndToken() external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.finalizeCrowdsaleAndToken();
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function distributeAndUnlockTokens() external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.distributeAndUnlockTokens();
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function finalizeAndDistributeToken() external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute approval function -
    ManageTokens.finalizeAndDistributeToken();
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }
}