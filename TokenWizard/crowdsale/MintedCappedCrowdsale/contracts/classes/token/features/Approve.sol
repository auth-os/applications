pragma solidity ^0.4.23;

import "./Token.sol";

library Approve {

  using Abstract for Abstract.Contract;
  using Abstract for Abstract.Feature;

  // event Approval(address indexed owner, address indexed spender, uint tokens)
  bytes32 internal constant APPROVAL_SIG = keccak256('Approval(address,address,uint256)');

  bytes4 internal constant APPROVE_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant INCR_APPR_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant DEC_APPR_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));

  // Returns the events and data for an 'Approval' event -
  function APPROVAL (address _owner, address _spender) private pure
  returns (bytes32[3] memory) {
    return [APPROVAL_SIG, bytes32(_owner), bytes32(_spender)];
  }

  // Calls the function determined by the external function selector
  function _feature(Abstract.Feature memory _approval) internal pure {
    _approval.setRef('Approve');
    // No precondition -
    _approval._before(0);

    // Invariant -
    if (
      msg.sig != APPROVE_SEL &&
      msg.sig != INCR_APPR_SEL &&
      msg.sig != DEC_APPR_SEL
    ) _approval.throws('invalid function selector');

    // No postcondition -
    _approval._after(0);
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function approve(Abstract.Contract memory _context, address _spender, uint _amt) internal view {
    _context.setRef('approve');
    // Begin storing values -
    _context.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    _context.set(
      Token.allowed(_context.sender(), _spender)
    ).to(_amt);
    // Finish storing, and begin logging events -
    _context.emitting();
    // Log 'Approval' event -
    _context.log(
      APPROVAL(_context.sender(), _spender), bytes32(_amt)
    );
    // Finish emitting and finalize buffer -
    _context.finish();
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function increaseApproval(Abstract.Contract memory _context, address _spender, uint _amt) internal view {
    _context.setRef('increaseApproval');
    // Begin storing values -
    _context.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    _context.increase(
      Token.allowed(_context.sender(), _spender)
    ).by(_amt);
    // Finish storing, and begin logging events -
    _context.emitting();
    // Log 'Approval' event -
    _context.log(
      APPROVAL(_context.sender(), _spender), bytes32(_amt)
    );
    // Finish emitting and finalize buffer -
    _context.finish();
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function decreaseApproval(Abstract.Contract memory _context, address _spender, uint _amt) internal view {
    _context.setRef('decreaseApproval');
    // Begin storing values -
    _context.storing();
    // Decrease the spender's approval by _amt to a minimum of 0 -
    _context.decrease(
      Token.allowed(_context.sender(), _spender)
    ).byMaximum(_amt);
    // Finish storing, and begin logging events -
    _context.emitting();
    // Log 'Approval' event -
    _context.log(
      APPROVAL(_context.sender(), _spender), bytes32(_amt)
    );
    // Finish emitting and finalize buffer -
    _context.finish();
  }
}
