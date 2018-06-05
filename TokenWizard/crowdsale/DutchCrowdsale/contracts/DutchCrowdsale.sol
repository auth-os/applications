pragma solidity ^0.4.23;

import "./lib/Contract.sol";
import "./classes/token/Token.sol";
import "./classes/sale/Sale.sol";
import "./classes/admin/Admin.sol";
import "./Initialize.sol";

library DutchCrowdsale {

  //TODO - set script exec address in constructor and check for each function

  // Initialization function - uses a new exec id to create a new instance of this application
  function init(
    address _wallet, uint _total_supply, uint _max_amount_to_sell, uint _starting_rate,
    uint _ending_rate, uint _duration, uint _start_time, bool _sale_is_whitelisted,
    address _admin
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.initialize();
    // Checks preconditions for execution - 
    Contract.checks(Initialize.first);
    // Execute initialize function
    Initialize.init(
      _wallet, _total_supply, _max_amount_to_sell, _starting_rate,
      _ending_rate, _duration, _start_time, _sale_is_whitelisted,
      _admin
    );
    // Check postconditions for execution
    Contract.checks(Initialize.last);
    // Commit state changes to storage
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
    // Execute transferFrom function -
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
    // Execute approve function -
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
    // Execute increaseApproval function -
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
    // Execute decreaseApproval function -
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
    // Execute buy function -
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
    // Execute decreaseApproval function -
    ConfigureSale.updateGlobalMinContribution(new_min_contribution);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }
  function whitelistMulti(
    address[] to_update, uint[] min_contribution, uint[] max_spend_amt
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute decreaseApproval function -
    ConfigureSale.whitelistMulti(to_update, min_contribution, max_spend_amt);
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
    // Execute decreaseApproval function -
    ConfigureSale.initCrowdsaleToken(name, symbol, decimals);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }
  function setCrowdsaleStartandDuration(uint start_time, uint duration)
  external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute decreaseApproval function -
    ConfigureSale.setCrowdsaleStartandDuration(start_time, duration);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  // Feature - ManageSale: ///
/*  function init(
    address _wallet, uint _total_supply, uint _max_amount_to_sell, uint _starting_rate,
    uint _ending_rate, uint _duration, uint _start_time, bool _sale_is_whitelisted,
    address _admin, bytes context
  ) external view {
    // Start Contract execution -
    Abstract.contractAt(context);
    // Invoke Sale class, which should invoke Purchase feature-
    Abstract.invoke(ManageSale._class);
    // Execute function
    ManageSale.init(
      Abstract.ptr(), 
      _wallet, 
      _total_supply,
      _max_amount_to_sell,
      _starting_rate,
      _ending_rate,
      _duration,
      _start_time,
      _sale_is_whitelisted,
      _admin);
    // Validate execution and finalize state -
    Abstract.finalize();
  }
*/
  function initializeCrowdsale() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Admin.first);
    // Execute decreaseApproval function -
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
    // Execute decreaseApproval function -
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
    // Execute decreaseApproval function -
    ManageToken.setTransferAgentStatus(agent, is_agent);
    // Check postconditions for execution -
    Contract.checks(Admin.last);
    // Commit state changes to storage -
    Contract.commit();
  }

}
