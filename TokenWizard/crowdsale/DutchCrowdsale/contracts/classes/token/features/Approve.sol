pragma solidity ^0.4.23; 

import "../Token.sol";
import "../../../lib/Contract.sol";

/// WIP - Contract DutchCrowdsale -> Class Token -> Feature Approve -> executes approve, decreaseApproval, increaseApproval
library Approve {
  
  using Contract for *;

  bytes4 internal constant APPROVE_SEL = bytes4(keccak256('approve(address,uint256,bytes)'));
  bytes4 internal constant INCR_APPR_SEL = bytes4(keccak256('increaseApproval(address,uint256,bytes)'));
  bytes4 internal constant DEC_APPR_SEL = bytes4(keccak256('decreaseApproval(address,uint256,bytes)'));

  // All 'Approve' event selectors 
  bytes32 private constant APPROVE_SIG = keccak256('approve(address,uint256,bytes)');
  bytes32 private constant INCREASE_APPROVAL_SIG = keccak256('increaseApproval(address,uint256,bytes)');
  bytes32 private constant DECREASE_APPROVAL_SIG = keccak256('decreaseApproval(address,uint256,bytes)');

  // Returns the events and data for an 'Approve' event 
  function APPROVE (address _sender, address _spender) private pure
  returns (bytes32[3]) {
    return [APPROVE_SIG, bytes32(_sender), bytes32(_spender)];
  }

  // Returns the events and data for an 'Approve' event 
  function INCREASE_APPROVAL (address _sender, address _spender) private pure
  returns (bytes32[3]) {
    return [INCREASE_APPROVAL_SIG, bytes32(_sender), bytes32(_spender)];
  }

  // Returns the events and data for an 'Approve' event 
  function DECREASE_APPROVAL (address _sender, address _spender) private pure
  returns (bytes32[3]) {
    return [DECREASE_APPROVAL_SIG, bytes32(_sender), bytes32(_spender)];
  }
  
  //Preconditions for Approve - 
  function first() internal pure {
    // Check for valid function selector
    if (
      msg.sig != APPROVE_SEL &&
      msg.sig != INCR_APPR_SEL &&
      msg.sig != DEC_APPR_SEL
    ) revert('invalid function selector');

  }

  //Postconditions for Approve - 
  function last() internal pure { }
  
  // Implements the logic to create the storage buffer for a Token Approval 
  function approve(address _spender, uint _amt) 
  internal pure {
  	// Ensure valid input - 
  	if (_spender == address(0)) revert('invalid recipient');
  	// Begin storing values -
  	Contract.storing();
  	// Update number of tokens _spender can spend on _sender's behalf
  	Contract.set(
      Token.allowed(Contract.sender(), _spender)
    ).by(_amt);
    // Finish storing and begin logging events - 
    Contract.emitting();
    // Log approval event
    Contract.log(
      APPROVE(Contract.sender(), _spender), bytes32(_amt)
    );
  }
  
  // Implements logic to create the storage buffer for a Token increaseApproval
  function increaseApproval(address _spender, uint _amt) 
  internal view {
  	// Ensure valid input - 
  	if (_spender == address(0)) revert('invalid recipient');
  	// Begin storing values - 
  	Contract.storing();
  	// Update number of tokens _spender can spend on _sender's behalf
  	Contract.increase(
  	  Token.allowed(Contract.sender(), _spender)
  	).by(_amt);
  	// Finish storing, and begin logging events - 
    Contract.emitting();
    // Log approval event
  	Contract.log(
  	  INCREASE_APPROVAL(Contract.sender(), _spender), bytes32(_amt)
  	);	
  }

  // Implements logic to create the storage buffer for a Token decreaseApproval
  function decreaseApproval(address _spender, uint _amt) 
  internal view {
  	// Ensure valid input - 
  	if (_spender == address(0)) revert('invalid recipient');
  	// Begin storing values - 
  	Contract.storing();
  	// Update number of tokens _spender can spend on _sender's behalf
  	Contract.decrease(
  	  Token.allowed(Contract.sender(), _spender)
  	).byMaximum(_amt);
  	// Finish storing, and begin logging events - 
  	Contract.emitting();
    // Log approval event
    Contract.log(
  	  DECREASE_APPROVAL(Contract.sender(), _spender), bytes32(_amt)
  	);	
  }




}