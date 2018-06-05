pragma solidity ^0.4.23;

import "../Token.sol";
import "../../../lib/Contract.sol";


library Transfer {

  using Contract for *;

  // Transfer function selectors
  bytes4 private constant TRANSFER_SEL = bytes4(keccak256('transfer(address,uint256)'));
  bytes4 private constant TRANSFER_FROM_SEL = bytes4(keccak256('transferFrom(address,address,uint256)'));

  // 'Transfer' event topic signature
  bytes32 private constant TRANSFER_SIG = keccak256('transfer(address,uint256)');
  bytes32 private constant TRANSFER_FROM_SIG = keccak256('transferFrom(address,address,uint256)');

  // Returns the topics for a Transfer event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }

  //Returns the topics for a transferFrom event - 
  function TRANSFER_FROM (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_FROM_SIG, bytes32(_owner), bytes32(_dest)];
  }

  // Preconditions for Transfer
  function first() internal pure {
    if (msg.sig != TRANSFER_SEL && msg.sig != TRANSFER_FROM_SEL) 
      revert("Invalid function selector");
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

    //Check to see if transaction is possible 
    if (
      Contract.read(Token.transferAgentStatus(Contract.sender())) == bytes32(0) ||
      uint(Contract.read(Token.allowed(_owner, Contract.sender()))) < _amt
    ) revert("Sender cannot transfer requested funds");

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
      TRANSFER_FROM(_owner, _dest), bytes32(_amt)
    );
  }
}