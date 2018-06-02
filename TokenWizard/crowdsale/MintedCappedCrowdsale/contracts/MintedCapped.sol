pragma solidity ^0.4.23;

import "../kernal/lib/Abstract.sol";
import "./Token.sol";
import "./Sale.sol";
import "./Admin.sol";

library MintedCapped {

  using Abstract for Abstract.Contract;

  //// CLASS - Token: ////

  /// Feature - Transfer: ///
  function transfer(address to, uint amount, bytes context) external view {
    // Start Contract execution -
    Abstract.strictContract(context);
    // Invoke Token class, which should invoke the Transfer feature -
    Abstract.invoke(Token._class);
    // Execute function -
    Transfer.transfer(Abstract.ptr(), to, amount);
    // Validate execution and finalize state -
    Abstract.finalize();
  }

  function transferFrom(address owner, address recipient, uint amount, bytes context) external view {
    // Start Contract execution -
    Abstract.contractAt(context);
    // Invoke Token class, which should invoke the Transfer feature -
    Abstract.invoke(Token._class);
    // Execute function -
    Transfer.transferFrom(Abstract.ptr(), owner, recipient, amount);
    // Validate execution and finalize state -
    Abstract.finalize();
  }

  /// Feature - Approve: ///
  function approve(address spender, uint amount, bytes context) external view {
    // Start Contract execution -
    Abstract.contractAt(context);
    // Invoke Token class, which should invoke the Approve feature -
    Abstract.invoke(Token._class);
    // Execute function -
    Approve.approve(Abstract.ptr(), spender, amount);
    // Validate execution and finalize state -
    Abstract.finalize();
  }

  function increaseApproval(address spender, uint amount, bytes context) external view {
    // Start Contract execution -
    Abstract.contractAt(context);
    // Invoke Token class, which should invoke the Approve feature -
    Abstract.invoke(Token._class);
    // Execute function -
    Approve.increaseApproval(Abstract.ptr(), spender, amount);
    // Validate execution and finalize state -
    Abstract.finalize();
  }

  function decreaseApproval(address spender, uint amount, bytes context) external view {
    // Start Contract execution -
    Abstract.contractAt(context);
    // Invoke Token class, which should invoke the Approve feature -
    Abstract.invoke(Token._class);
    // Execute function -
    Approve.decreaseApproval(Abstract.ptr(), spender, amount);
    // Validate execution and finalize state -
    Abstract.finalize();
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
