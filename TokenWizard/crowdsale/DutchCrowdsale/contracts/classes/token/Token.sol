pragma solidity ^0.4.23;

import "./features/Transfer.sol";
import "./features/Approve.sol";
import "authos-solidity/contracts/core/Contract.sol";

library Token {

  using Contract for *;

  /// SALE ///

  // Whether or not the crowdsale is post-purchase
  function isFinished() internal pure returns (bytes32)
    { return keccak256("sale_is_completed"); }

  /// TOKEN ///

  // Storage location for token name
  function tokenName() internal pure returns (bytes32)
    { return keccak256("token_name"); }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address _owner) internal pure returns (bytes32)
    { return keccak256(_owner, TOKEN_BALANCES); }

  // Storage seed for user allowances mapping
  bytes32 internal constant TOKEN_ALLOWANCES = keccak256("token_allowances");

  function allowed(address _owner, address _spender) internal pure returns (bytes32)
    { return keccak256(_spender, keccak256(_owner, TOKEN_ALLOWANCES)); }

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  function transferAgents(address _agent) internal pure returns (bytes32)
    { return keccak256(_agent, TOKEN_TRANSFER_AGENTS); }

  /// CHECKS ///

  // Ensures the sale's token has been initialized
  function tokenInit() internal view {
    if (Contract.read(tokenName()) == 0)
      revert('token not initialized');
  }

  // Ensures both storage and events have been pushed to the buffer
  function emitAndStore() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  /// FUNCTIONS ///

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
