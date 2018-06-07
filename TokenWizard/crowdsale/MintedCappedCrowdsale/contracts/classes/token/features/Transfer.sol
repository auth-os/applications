pragma solidity ^0.4.23;

import "../../../auth-os/Contract.sol";
import "../Token.sol";

library Transfer {

  using Contract for *;

  // 'Transfer' event topic signature
  bytes32 private constant TRANSFER_SIG = keccak256('Transfer(address,address,uint256)');

  // Returns the topics for a Transfer event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }

  // Ensures the sender is a transfer agent, or that the tokens are unlocked
  function canTransfer() internal view {
    if (
      Contract.read(Token.transferAgent(Contract.sender())) == 0 &&
      Contract.read(Token.tokensUnlocked()) == 0
    ) revert('transfers are locked');
  }

  // Implements the logic for a token transfer -
  function transfer(address _dest, uint _amt)
  internal view {
    // Ensure valid input -
    if (_dest == address(0))
      revert('invalid recipient');

    // Ensure the sender can currently transfer tokens
    Contract.checks(canTransfer);

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

    // Owner must be able to transfer tokens -
    if (
      Contract.read(Token.transferAgent(_owner)) == 0 &&
      Contract.read(Token.tokensUnlocked()) == 0
    ) revert('transfers are locked');

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
