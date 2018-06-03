pragma solidity ^0.4.23;

import "../Contract.sol";
import "../Token.sol";

library Transfer {

  using Contract for *;

  // 'Transfer' event topic signature
  bytes32 private constant TRANSFER_SIG = keccak256('Transfer(address,address,uint256)');

  // Returns the topics for a Transfer event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }

  // Preconditions for Transfer - none
  function first(Contract.Process memory) internal pure { }

  // Postconditions for Transfer - none
  function last(Contract.Process memory) internal pure { }

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
      Token.balances(Contract.sender())
    ).by(_amt);
    // Update recipient token balance - reverts in case of overflow
    Contract.increase(
      Token.balances(_dest)
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
      Token.allowed(_owner, Contract.sender())
    ).by(_amt);
    // Update owner token balance - reverts in case of underflow
    Contract.decrease(
      Token.balances(Contract.sender())
    ).by(_amt);
    // Update recipient token balance - reverts in case of overflow
    Contract.increase(
      Token.balances(_dest)
    ).by(_amt);

    // Finish updating balances: log event -
    Contract.emitting();
    // Log 'Transfer' event
    Contract.log(
      TRANSFER(_owner, _dest), bytes32(_amt)
    );
  }
}
