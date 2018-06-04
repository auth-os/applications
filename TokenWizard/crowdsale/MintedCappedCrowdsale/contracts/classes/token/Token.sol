pragma solidity ^0.4.23;

import "../MintedCapped.sol";
import "./features/Transfer.sol";
/* import "./features/Approve.sol"; */

library Token {

  // TODO implement transferAgent requirements!

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
      Contract.checks(Transfer.first);
    else if (msg.sig == APPROVE_SEL || msg.sig == INCR_APPR_SEL || msg.sig == DECR_APPR_SEL)
      Contract.checks(Approve.first);
    else
      revert('Invalid function selector');
  }

  // After each Transfer and Approve Feature executes, ensure that the result will
  // both emit an event and store values in storage -
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('Invalid state change');
  }
}
