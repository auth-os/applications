pragma solidity ^0.4.23;

import "../../auth-os/Contract.sol";
import "./features/Transfer.sol";
import "./features/Approve.sol";

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

  // Ensures both storage and events have been pushed to the buffer
  function emitAndStore() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  // Ensures the sale's token has been initialized
  function tokenInit() internal view {
    if (Contract.read(name()) == 0)
      revert('token not initialized');
  }

  /*
  Allows a token holder to transfer tokens to another address

  @param _to: The destination that will recieve tokens
  @param _amount: The number of tokens to transfer
  */
  function transfer(address _to, uint _amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the token is initialized -
    Contract.checks(tokenInit);
    // Execute transfer function -
    Transfer.transfer(_to, _amount);
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Allows an approved spender to transfer tokens to another address on an owner's behalf

  @param _owner: The address from which tokens will be sent
  @param _recipient: The destination to which tokens will be sent
  @param _amount: The number of tokens to transfer
  */
  function transferFrom(address _owner, address _recipient, uint _amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the token is initialized -
    Contract.checks(tokenInit);
    // Execute transfer function -
    Transfer.transferFrom(_owner, _recipient, _amount);
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Approves a spender to spend an amount of your tokens on your behalf

  @param _spender: The address allowed to spend your tokens
  @param _amount: The number of tokens that will be approved
  */
  function approve(address _spender, uint _amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the token is initialized -
    Contract.checks(tokenInit);
    // Execute approval function -
    Approve.approve(_spender, _amount);
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Increases a spender's approval amount

  @param _spender: The address allowed to spend your tokens
  @param _amount: The amount by which the spender's allowance will be increased
  */
  function increaseApproval(address _spender, uint _amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the token is initialized -
    Contract.checks(tokenInit);
    // Execute approval function -
    Approve.increaseApproval(_spender, _amount);
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Decreases a spender's approval amount

  @param _spender: The address allowed to spend your tokens
  @param _amount: The amount by which the spender's allowance will be decreased
  */
  function decreaseApproval(address _spender, uint _amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the token is initialized -
    Contract.checks(tokenInit);
    // Execute approval function -
    Approve.decreaseApproval(_spender, _amount);
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }
}
