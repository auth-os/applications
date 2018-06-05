pragma solidity ^0.4.23;

import "../../../lib/Contract.sol";
import "../Token.sol";

library Transfer {

  using Contract for *;

  // 'Transfer' event topic signature
  bytes32 private constant TRANSFER_SIG = keccak256('Transfer(address,address,uint256)');

  // Returns the topics for a Transfer event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }

  // Function selectors
  bytes4 private constant TRANSFER_FROM_SEL = bytes4(keccak256('transferFrom(address,address,uint256)'));

  // Preconditions for Transfer - none
  function first() internal view {
    if (msg.sig == TRANSFER_FROM_SEL) 
      Contract.checks(isTransferAgent);
  }

  // Postconditions for Transfer - none
  function last() internal pure { }

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

  // Precondition for transferFrom
  function isTransferAgent() internal view {
    if (
      uint(Contract.read(Token.transferAgent(Contract.sender()))) == 0
      && uint(Contract.read(Token.tokensUnlocked())) == 0
    ) revert('transfers are locked');
  }

}
