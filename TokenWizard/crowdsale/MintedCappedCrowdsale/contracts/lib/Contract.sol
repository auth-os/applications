pragma solidity ^0.4.23;

library Contract {

  struct Process { uint _; }

  // Modifiers: //

  // Runs two functions before and after a function -
  modifier conditions(function () pure first, function () pure last) {
    first();
    _;
    last();
  }

  // Sets up contract execution - reads execution id and sender from storage and
  // places in memory, creating getters. Calling this function should be the first
  // action an application does as part of execution, as it sets up memory for
  // execution. Additionally, application functions in the main file should be
  // external, so that memory is not touched prior to calling this function.
  // The 3rd slot allocated will hold a pointer to a storage buffer, which will
  // be reverted to abstract storage to store data, emit events, and forward
  // wei on behalf of the application.
  function executeAs(address _script_exec) internal view {
    // No memory should have been allocated yet - expect the free memory pointer
    // to point to 0x80 - and throw if it does not
    require(freeMem() == 0x80, "Memory allocated prior to execution");
    // Next, reads the execution id and sender address from the first two slots
    // of storage, and places them in memory at 0x80 and 0xa0, respectively
    assembly {
      mstore(0x80, sload(0))
      mstore(0xa0, sload(0x20))
      mstore(0xc0, 0)
      // Update free memory pointer -
      mstore(0x40, 0xe0)
    }
    // Ensure that the sender and execution id returned from storage are nonzero -
    assert(execID() != bytes32(0) && sender() != address(0));

    // Check that the sender is the script exec contract associated with this exec id
    //TODO
  }

  // Sets up contract execution when initializing an instance of the application
  // First, reads execution id and sender from storage (execution id should be 0xDEAD),
  // then places them in memory, creating getters. Calling this function should be the first
  // action an application does as part of execution, as it sets up memory for
  // execution. Additionally, application functions in the main file should be
  // external, so that memory is not touched prior to calling this function.
  // The 3rd slot allocated will hold a pointer to a storage buffer, which will
  // be reverted to abstract storage to store data, emit events, and forward
  // wei on behalf of the application.
  function initInstance() internal view {
    // No memory should have been allocated yet - expect the free memory pointer
    // to point to 0x80 - and throw if it does not
    require(freeMem() == 0x80, "Memory allocated prior to execution");
    // Next, reads the execution id and sender address from the first two slots
    // of storage, and places them in memory at 0x80 and 0xa0, respectively
    assembly {
      mstore(0x80, sload(0))
      mstore(0xa0, sload(0x20))
      mstore(0xc0, 0)
      // Update free memory pointer -
      mstore(0x40, 0xe0)
    }
    // Ensure that the sender and execution id returned from storage are nonzero -
    assert(execID() != bytes32(0) && sender() != address(0));
  }

  // Calls the passed-in function, performing a memory state check before and after the check
  // is executed. In order to avoid allocating memory for the required Contract struct,
  // a stand-in function is initialized and given the same value as the passed-in function.
  // This function is called, and its state checks carried out
  function checks(function (Process memory) view _check) conditions(validState, validState) internal view {
    toGeneric(_check)(0x80);
  }

  // Calls the passed-in function, performing a memory state check before and after the check
  // is executed. In order to avoid allocating memory for the required Contract struct,
  // a stand-in function is initialized and given the same value as the passed-in function.
  // This function is called, and its state checks carried out
  function checks(function (Process memory) pure _check) conditions(validState, validState) internal view {
    toGeneric(_check)(0x80);
  }

  // Ensures execution completed successfully, and reverts the created storage buffer
  // back to the sender.
  function commit() conditions(validState, none) internal pure {
    // Check value of storage buffer pointer - should be greater than 0xc0
    bytes32 ptr = buffPtr();
    require(ptr >= 0xa0, "Invalid buffer pointer");

    assembly {
      // Get the size of the buffer
      let size := mload(ptr)
      mstore(sub(ptr, 0x20), 0x20) // Place ABI-dynamic data offset before buffer
      // Revert to storage
      revert(sub(ptr, 0x20), add(0x40, size))
    }
  }

  // Helpers: //

  // Checks to ensure the application was correctly executed -
  function validState() private pure {
    if (freeMem() < 0xe0)
      revert('Expected Contract.execute()');

    if (buffPtr() != 0 && buffPtr() < 0xc0)
      revert('Invalid buffer pointer');

    assert(execID() != bytes32(0) && sender() != address(0));
  }

  function buffPtr() private pure returns (bytes32 ptr) {
    assembly { ptr := mload(0xc0) }
  }

  // Returns the location pointed to by the free memory pointer -
  function freeMem() private pure returns (bytes32 ptr) {
    assembly { ptr := mload(0x40) }
  }

  // Casts a function which takes a Process struct to a function which takes
  // a uint. This avoids memory allocation when calling the function, as a uint pointer
  // can be passed-in instead with the same results.
  function toGeneric(function (Process memory) view _func) private pure returns (
    function (uint) view generic
  ) { assembly { generic := _func } }

  // Casts a function which takes a Process struct to a function which takes
  // a uint. This avoids memory allocation when calling the function, as a uint pointer
  // can be passed-in instead with the same results.
  function toGeneric(function (Process memory) pure _func) private pure returns (
    function (uint) view generic
  ) { assembly { generic := _func } }

  // Placeholder function when no pre or post condition for a function is needed
  function none() private pure { }

  // Runtime getters: //

  // Returns the execution id from memory -
  function execID() internal pure returns (bytes32 exec_id) {
    assembly { exec_id := mload(0x80) }
    require(exec_id != bytes32(0), "Execution id overwritten, or not read");
  }

  // Returns the original sender from memory -
  function sender() internal pure returns (address addr) {
    assembly { addr := mload(0xa0) }
    require(addr != address(0), "Sender address overwritten, or not read");
  }

  // Returns the original sender from memory -
  function sender(Process memory) internal pure returns (address addr) {
    assembly { addr := mload(0xa0) }
    require(addr != address(0), "Sender address overwritten, or not read");
  }

  // Reading from storage: //

  // Reads from storage, resolving the passed-in location to its true location in storage
  // by hashing with the exec id. Returns the data read from that location
  function read(Process memory, bytes32 _location) internal view returns (bytes32 data) {
    _location = keccak256(_location, execID());
    assembly { data := sload(_location) }
  }

  // Storing data, emitting events, and forwarding payments: //

  function storing() internal pure {
    // TODO
  }

  function emitting() internal pure {
    // TODO
  }

  function increase(bytes32 _field) internal view returns (uint ptr) {
    // TODO
  }

  function decrease(bytes32 _field) internal view returns (uint ptr) {
    // TODO
  }

  function by(uint _ptr, uint _amt) internal view {
    // TODO
  }

  function log(bytes32[3] memory _topics, bytes32 _data) internal view {
    // TODO
  }

  // Returns whether or not the storage buffer contains events to emit -
  // TODO
  function emitted(Process memory) internal pure returns (bool status) {
    status = true;
  }

  // Returns whether or not the storage buffer contains storage writes -
  // TODO
  function stored(Process memory) internal pure returns (bool status) {
    status = true;
  }
}
