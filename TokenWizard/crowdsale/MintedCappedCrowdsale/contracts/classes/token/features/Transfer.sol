pragma solidity ^0.4.23;

import "./Token.sol";

library Transfer {

  using Abstract for Abstract.Contract;
  using Abstract for Abstract.Feature;

  // 'Transfer' event selector
  bytes32 private constant TRANSFER_SIG = keccak256('transfer(address,uint256,bytes)');

  bytes4 internal constant TRANSFER_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant TRANSFERFROM_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));

  // Returns the events and data for a 'Transfer' event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }

  // Calls the function determined by the external call selector, then check the
  // Transfer postcondition
  function _feature(Abstract.Feature memory _transfer) internal pure {
    _transfer.setRef('Transfer');
    // No precondition -
    _transfer._before(0);

    // Invariant -
    if (
      msg.sig != TRANSFER_SEL &&
      msg.sig != TRANSFERFROM_SEL
    ) _transfer.throws('invalid function selector');

    // No postcondition -
    _transfer._after(0);
  }

  // Implements the logic to create the storage buffer for a Token Transfer
  function transfer(Abstract.Contract memory _context, address _dest, uint _amt)
  internal view {
    _context.setRef('transfer');
    // Ensure valid input -
    if (_dest == address(0)) _context.throws('invalid recipient');
    // Begin storing values -
    _context.storing();
    // Update sender token balance -
    _context.decrease(
      Token.balances(_context.sender())
    ).by(_amt);
    // Update recipient token balance -
    _context.increase(
      Token.balances(_dest)
    ).by(_amt);
    // Finish storing, and begin logging events -
    _context.emitting();
    // Log 'Transfer' event
    _context.log(
      TRANSFER(_context.sender(), _dest), bytes32(_amt)
    );
    // Finish emitting and finalize buffer -
    _context.finish();
  }

  // Implements the logic to create the storage buffer for a Token TransferFrom
  function transferFrom(Abstract.Contract memory _context, address _owner, address _dest, uint _amt)
  internal view {
    _context.setRef('transferFrom');
    // Ensure valid input -
    if (_dest == address(0)) _context.throws('invalid recipient');
    // Begin storing values -
    _context.storing();
    // Update spender token allowance -
    _context.decrease(
      Token.allowed(_owner, _context.sender())
    ).by(_amt);
    // Update sender token balance -
    _context.decrease(
      Token.balances(_context.sender())
    ).by(_amt);
    // Update recipient token balance -
    _context.increase(
      Token.balances(_dest)
    ).by(_amt);
    // Finish storing, and begin logging events -
    _context.emitting();
    // Log 'Transfer' event
    _context.log(
      TRANSFER(_owner, _dest), bytes32(_amt)
    );
    // Finish emitting and finalize buffer -
    _context.finish();
  }
}
