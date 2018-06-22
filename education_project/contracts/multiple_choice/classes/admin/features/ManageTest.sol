pragma solidity ^0.4.23;

import "../../../../auth_os/core/Contract.sol";
import "../Admin.sol";

///FIXME There need to be functions to change initial values
library ManageTest {

  using Contract for *;

  /// Events ///

  // Event: Emitted when the test is finalized -- FinalizeTest(bytes32 indexed)
  bytes32 internal constant FINALIZED = keccak256('FinalizeTest(bytes32)');

  function FINALIZE() internal pure returns (bytes32[2] memory) {
    return [FINALIZED, Contract.execID()];
  }

  // Allows the test admin to finalize the test
  function finalizeTest() internal view {
    // Revert if the sender is not the admin 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('Sender is not admin');
    // Revert if the test is already finalized
    if (Contract.read(Admin.finalized()) != bytes32(0))
      revert('Test is already finalized');

    // Add the Store action request to the storage buffer
    Contract.storing();

    // Update the finalized value to true in storage
    Contract.set(Admin.finalized()).to(true);

    // Add the Emit action request to the storage buffer
    Contract.emitting();

    Contract.log(
      FINALIZE(), bytes32(0)
    );

  }

}
