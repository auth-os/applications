pragma solidity ^0.4.23;

import "../Token.sol";
import "../../../auth-os/Contract.sol";

library Approve {

  using Contract for *;

  // event Approval(address indexed owner, address indexed spender, uint tokens)
  bytes32 internal constant APPROVAL_SIG = keccak256('Approval(address,address,uint256)');

  // Returns the events and data for an 'Approval' event -
  function APPROVAL (address _owner, address _spender) private pure returns (bytes32[3] memory)
    { return [APPROVAL_SIG, bytes32(_owner), bytes32(_spender)]; }

  // Implements the logic to create the storage buffer for a Token Approval
  function approve(address _spender, uint _amt) internal pure {
    // Begin storing values -
    Contract.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    Contract.set(Token.allowed(Contract.sender(), _spender)).to(_amt);
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
    Contract.increase(Token.allowed(Contract.sender(), _spender)).by(_amt);
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
    Contract.decrease(Token.allowed(Contract.sender(), _spender)).byMaximum(_amt);
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }
}
