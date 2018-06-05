pragma solidity ^0.4.23;

import "../../MintedCapped.sol";
import "../../lib/Contract.sol";

library Token {

  using Contract for *;

  // Token fields -

  // Returns the storage location of the token's name
  function name() internal pure returns (bytes32 location) {
    location = keccak256('token_name');
  }

  // Returns the storage location of the token's symbol
  function symbol() internal pure returns (bytes32 location) {
    location = keccak256('token_symbol');
  }

  // Returns the storage location of the token's totalSupply
  function totalSupply() internal pure returns (bytes32 location) {
    location = keccak256('token_supply');
  }

  bytes32 private constant BALANCE_SEED = keccak256('token_balances');

  // Returns the storage location of an owner's token balance
  function balances(address _owner) internal pure returns (bytes32 location) {
    location = keccak256(_owner, BALANCE_SEED);
  }

  bytes32 private constant ALLOWANCE_SEED = keccak256('token_allowed');

  // Returns the storage location of a spender's token allowance from the owner
  function allowed(address _owner, address _spender) internal pure returns (bytes32 location) {
    location = keccak256(_spender, keccak256(_owner, ALLOWANCE_SEED));
  }

  bytes32 private constant TRANSFER_AGENT_SEED = keccak256('transfer_agents');

  // Returns the storage location of an Agent's transfer agent status
  function transferAgent(address agent) internal pure returns (bytes32 location) {
    location = keccak256(agent, TRANSFER_AGENT_SEED);
  }

  // Returns the storage location for the unlock status of the token
  function tokensUnlocked() internal pure returns(bytes32 location) {
    location = keccak256('tokens_unlocked');
  }

  // Token function selectors -
  bytes4 private constant TRANSFER_SEL = bytes4(keccak256('transfer(address,uint256)'));
  bytes4 private constant TRANSFER_FROM_SEL = bytes4(keccak256('transferFrom(address,address,uint256)'));
  bytes4 private constant APPROVE_SEL = bytes4(keccak256('approve(address,uint256)'));
  bytes4 private constant INCR_APPR_SEL = bytes4(keccak256('increaseApproval(address,uint256)'));
  bytes4 private constant DECR_APPR_SEL = bytes4(keccak256('decreaseApproval(address,uint256)'));

  // Token pre/post conditions for execution -

  // Before each Transfer and Approve Feature executes, check that the token is initialized -
  function first() internal view {
    if (Contract.read(name()) == bytes32(0))
      revert('Token not initialized');

    if (msg.value != 0)
      revert('Token is not payable');

    // Check msg.sig, and check the appropriate preconditions -
    if (msg.sig == TRANSFER_SEL || msg.sig == TRANSFER_FROM_SEL)
      Contract.checks(transfer_first);
    else if (msg.sig == APPROVE_SEL || msg.sig == INCR_APPR_SEL || msg.sig == DECR_APPR_SEL)
      Contract.checks(empty);
    else
      revert('Invalid function selector');
  }

  function empty() internal pure {

  }

  // After each Transfer and Approve Feature executes, ensure that the result will
  // both emit an event and store values in storage -
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('Invalid state change');
  }

  // event Approval(address indexed owner, address indexed spender, uint tokens)
  bytes32 internal constant APPROVAL_SIG = keccak256('Approval(address,address,uint256)');


  // Returns the events and data for an 'Approval' event -
  function APPROVAL (address _owner, address _spender) private pure
  returns (bytes32[3] memory) {
    return [APPROVAL_SIG, bytes32(_owner), bytes32(_spender)];
  }


  // Implements the logic to create the storage buffer for a Token Approval
  function approve(address _spender, uint _amt) internal pure {
    // Begin storing values -
    Contract.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    Contract.set(
      allowed(Contract.sender(), _spender)
    ).to(_amt);
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function increaseApproval(address _spender, uint _amt) internal view {
    // Begin storing values -
    Contract.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    Contract.increase(
      allowed(Contract.sender(), _spender)
    ).by(_amt);
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function decreaseApproval(address _spender, uint _amt) internal view {
    // Begin storing values -
    Contract.storing();
    // Decrease the spender's approval by _amt to a minimum of 0 -
    Contract.decrease(
      allowed(Contract.sender(), _spender)
    ).byMaximum(_amt);
    
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }

  // 'Transfer' event topic signature
  bytes32 private constant TRANSFER_SIG = keccak256('Transfer(address,address,uint256)');

  // Returns the topics for a Transfer event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }


  // Preconditions for Transfer - none
  function transfer_first() internal view {
    if (msg.sig == TRANSFER_FROM_SEL) 
      Contract.checks(isTransferAgent);
  }


  // Implements the logic for a token transfer -
  function transfer(address _dest, uint _amt)
  internal view {
    // Ensure valid input -
    if (_dest == address(0))
      revert('invalid recipient');

    // Begin updating balances -
    Contract.storing();
    // Update sender token balance - reverts in case of underflow
    Contract.decrease(
      balances(Contract.sender())
    ).by(_amt);
    // Update recipient token balance - reverts in case of overflow
    Contract.increase(
      balances(_dest)
    ).by(_amt);

    // Finish updating balances: log event -
    Contract.emitting();
    // Log 'Transfer' event
    Contract.log(
      TRANSFER(Contract.sender(), _dest), bytes32(_amt)
    );
  }

  // Implements the logic for a token transferFrom -
  function transferFrom(address _owner, address _dest, uint _amt)
  internal view {
    // Ensure valid input -
    if (_dest == address(0))
      revert('invalid recipient');
    if (_owner == address(0))
      revert('invalid owner');

    // Begin updating balances -
    Contract.storing();
    // Update spender token allowance - reverts in case of underflow
    Contract.decrease(
      allowed(_owner, Contract.sender())
    ).by(_amt);
    // Update owner token balance - reverts in case of underflow
    Contract.decrease(
      balances(Contract.sender())
    ).by(_amt);
    // Update recipient token balance - reverts in case of overflow
    Contract.increase(
      balances(_dest)
    ).by(_amt);

    // Finish updating balances: log event -
    Contract.emitting();
    // Log 'Transfer' event
    Contract.log(
      TRANSFER(_owner, _dest), bytes32(_amt)
    );
  }

  // Precondition for transferFrom
  function isTransferAgent() internal view {
    if (
      uint(Contract.read(transferAgent(Contract.sender()))) == 0
      && uint(Contract.read(tokensUnlocked())) == 0
    ) revert('transfers are locked');
  }

}
