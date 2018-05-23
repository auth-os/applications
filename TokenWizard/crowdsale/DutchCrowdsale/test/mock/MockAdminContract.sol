pragma solidity ^0.4.23;

library Exceptions {

  /*
  Reverts state changes, but passes message back to caller

  @param _message: The message to return to the caller
  */
  function trigger(bytes32 _message) internal pure {
    assembly {
      mstore(0, _message)
      revert(0, 0x20)
    }
  }
}

library MemoryBuffers {

  using Exceptions for bytes32;

  bytes32 internal constant ERR_READ_FAILED = bytes32("StorageReadFailed"); // Read from storage address failed

  /// CALLDATA BUFFERS ///

  /*
  Creates a calldata buffer in memory with the given function selector

  @param _selector: The function selector to push to the first location in the buffer
  @return ptr: The location in memory where the length of the buffer is stored - elements stored consecutively after this location
  */
  function cdBuff(bytes4 _selector) internal pure returns (uint ptr) {
    assembly {
      // Get buffer location - free memory
      ptr := mload(0x40)
      // Place initial length (4 bytes) in buffer
      mstore(ptr, 0x04)
      // Place function selector in buffer, after length
      mstore(add(0x20, ptr), _selector)
      // Update free-memory pointer - it's important to note that this is not actually free memory, if the pointer is meant to expand
      mstore(0x40, add(0x40, ptr))
    }
  }

  /*
  Creates a new calldata buffer at the pointer with the given selector. Does not update free memory

  @param _ptr: A pointer to the buffer to overwrite - will be the pointer to the new buffer as well
  @param _selector: The function selector to place in the buffer
  */
  function cdOverwrite(uint _ptr, bytes4 _selector) internal pure {
    assembly {
      // Store initial length of buffer - 4 bytes
      mstore(_ptr, 0x04)
      // Store function selector after length
      mstore(add(0x20, _ptr), _selector)
    }
  }

  /*
  Pushes a value to the end of a calldata buffer, and updates the length

  @param _ptr: A pointer to the start of the buffer
  @param _val: The value to push to the buffer
  */
  function cdPush(uint _ptr, bytes32 _val) internal pure {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push value to end of buffer (overwrites memory - be careful!)
      mstore(add(_ptr, len), _val)
      // Increment buffer length
      mstore(_ptr, len)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x20, _ptr), len)) {
        mstore(0x40, add(add(0x2c, _ptr), len)) // Ensure free memory pointer points to the beginning of a memory slot
      }
    }
  }

  /*
  Executes a 'readMulti' function call, given a pointer to a calldata buffer

  @param _ptr: A pointer to the location in memory where the calldata for the call is stored
  @return read_values: The values read from storage
  */
  function readMulti(uint _ptr) internal view returns (bytes32[] memory read_values) {
    bool success;
    assembly {
      // Minimum length for 'readMulti' - 1 location is 0x84
      if lt(mload(_ptr), 0x84) { revert (0, 0) }
      // Read from storage
      success := staticcall(gas, caller, add(0x20, _ptr), mload(_ptr), 0, 0)
      // If call succeed, get return information
      if gt(success, 0) {
        // Ensure data will not be copied beyond the pointer
        if gt(sub(returndatasize, 0x20), mload(_ptr)) { revert (0, 0) }
        // Copy returned data to pointer, overwriting it in the process
        // Copies returndatasize, but ignores the initial read offset so that the bytes32[] returned in the read is sitting directly at the pointer
        returndatacopy(_ptr, 0x20, sub(returndatasize, 0x20))
        // Set return bytes32[] to pointer, which should now have the stored length of the returned array
        read_values := _ptr
      }
    }
    if (!success)
      ERR_READ_FAILED.trigger();
  }

  /*
  Executes a 'read' function call, given a pointer to a calldata buffer

  @param _ptr: A pointer to the location in memory where the calldata for the call is stored
  @return read_value: The value read from storage
  */
  function readSingle(uint _ptr) internal view returns (bytes32 read_value) {
    bool success;
    assembly {
      // Length for 'read' buffer must be 0x44
      if iszero(eq(mload(_ptr), 0x44)) { revert (0, 0) }
      // Read from storage, and store return to pointer
      success := staticcall(gas, caller, add(0x20, _ptr), mload(_ptr), _ptr, 0x20)
      // If call succeeded, store return at pointer
      if gt(success, 0) { read_value := mload(_ptr) }
    }
    if (!success)
      ERR_READ_FAILED.trigger();
  }
}

library ArrayUtils {

  function toUintArr(bytes32[] memory arr) internal pure returns (uint[] memory converted) {
    assembly {
      converted := arr
    }
  }

  function toIntArr(bytes32[] memory arr) internal pure returns (int[] memory converted) {
    assembly {
      converted := arr
    }
  }

  function toAddressArr(bytes32[] memory arr) internal pure returns (address[] memory converted) {
    assembly {
      converted := arr
    }
  }
}

library LibStorage {

  // ACTION REQUESTORS //

  bytes4 internal constant STORES = bytes4(keccak256('stores:'));

  // Set up a STORES action request buffer
  function stores(uint _ptr) internal pure {
    bytes4 action_req = STORES;
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push requestor to the of buffer
      mstore(add(_ptr, len), action_req)
      // Push '0' to the end of the 4 bytes just pushed - this will be the length of the STORES action
      mstore(add(_ptr, add(0x04, len)), 0)
      // Increment buffer length
      mstore(_ptr, add(0x04, len))
      // Set a pointer to STORES action length in the free slot before _ptr
      mstore(sub(_ptr, 0x20), add(_ptr, add(0x04, len)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x44, _ptr), len)) {
        mstore(0x40, add(add(0x44, _ptr), len))
      }
    }
  }

  function store(uint _ptr, bytes32 _val) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push value to the end of the buffer
      mstore(add(_ptr, len), _val)
      // Increment buffer length
      mstore(_ptr, len)
      // Increment STORES action length (pointer to length stored before _ptr)
      let _len_ptr := mload(sub(_ptr, 0x20))
      mstore(_len_ptr, add(1, mload(_len_ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len))
      }
    }
    return _ptr;
  }

  function store(uint _ptr, address _val) internal pure returns (uint) {
    return store(_ptr, bytes32(_val));
  }

  function store(uint _ptr, uint _val) internal pure returns (uint) {
    return store(_ptr, bytes32(_val));
  }

  function store(uint _ptr, bool _val) internal pure returns (uint) {
    return store(
      _ptr,
      _val ? bytes32(1) : bytes32(0)
    );
  }

  function at(uint _ptr, bytes32 _loc) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push storage location to the end of the buffer
      mstore(add(_ptr, len), _loc)
      // Increment buffer length
      mstore(_ptr, len)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len))
      }
    }
    return _ptr;
  }

  function storeBytesAt(uint _ptr, bytes memory _arr, bytes32 _base_location) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Loop over bytes array, and push each value and incremented storage location to storage buffer
      let offset := 0x0
      for { } lt(offset, add(0x20, mload(_arr))) { offset := add(0x20, offset) } {
        // Push incremented location to buffer
        mstore(add(add(add(0x20, len), mul(2, offset)), _ptr), add(offset, _base_location))
        // Push bytes array chunk to buffer
        mstore(add(add(len, mul(2, offset)), _ptr), mload(add(offset, _arr)))
      }
      // Increment buffer length
      mstore(_ptr, add(mul(2, offset), mload(_ptr)))
      // Increment STORES length
      let _len_ptr := mload(sub(_ptr, 0x20))
      len := add(div(offset, 0x20), mload(_len_ptr))
      mstore(_len_ptr, len)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), mload(_ptr))) {
        mstore(0x40, add(add(0x40, _ptr), mload(_ptr)))
      }
    }
    return _ptr;
  }
}

library Pointers {

  function getBuffer(uint _ptr) internal pure returns (bytes memory buffer) {
    assembly {
      buffer := _ptr
    }
  }

  function toPointer(bytes memory _buffer) internal pure returns (uint _ptr) {
    assembly {
      _ptr := _buffer
    }
  }

  function clear(uint _ptr) internal pure returns (uint) {
    assembly {
      _ptr := add(0x20, msize)
      mstore(_ptr, 0)
      mstore(0x40, add(0x20, _ptr))
    }
    return _ptr;
  }

  function end(uint _ptr) internal pure returns (uint buffer_end) {
    assembly {
      let len := mload(_ptr)
      buffer_end := add(0x20, add(len, _ptr))
    }
  }
}

library LibEvents {

  // ACTION REQUESTORS //

  bytes4 internal constant EMITS = bytes4(keccak256('emits:'));

  // Takes an existing or empty buffer stored at the buffer and adds an EMITS
  // requestor to the end
  function emits(uint _ptr) internal pure {
    bytes4 action_req = EMITS;
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push requestor to the of buffer
      mstore(add(_ptr, len), action_req)
      // Push '0' to the end of the 4 bytes just pushed - this will be the length of the EMITS action
      mstore(add(_ptr, add(0x04, len)), 0)
      // Increment buffer length
      mstore(_ptr, add(0x04, len))
      // Set a pointer to EMITS action length in the free slot before _ptr
      mstore(sub(_ptr, 0x20), add(_ptr, add(0x04, len)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x44, _ptr), len)) {
        mstore(0x40, add(add(0x44, _ptr), len))
      }
    }
  }

  function topics(uint _ptr) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push 0 to the end of the buffer - event will have no topics
      mstore(add(_ptr, len), 0)
      // Increment buffer length
      mstore(_ptr, len)
      // Increment EMITS action length (pointer to length stored before _ptr)
      let _len_ptr := mload(sub(_ptr, 0x20))
      mstore(_len_ptr, add(1, mload(_len_ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len))
      }
    }
    return _ptr;
  }

  function topics(uint _ptr, bytes32[1] memory _topics) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push 1 to the end of the buffer - event will have 1 topics
      mstore(add(_ptr, len), 1)
      // Push topic to end of buffer
      mstore(add(_ptr, add(0x20, len)), mload(_topics))
      // Increment buffer length
      mstore(_ptr, add(0x20, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x60, _ptr), len)) {
        mstore(0x40, add(add(0x60, _ptr), len))
      }
      // Increment EMITS action length (pointer to length stored before _ptr)
      len := mload(sub(_ptr, 0x20))
      mstore(len, add(1, mload(len)))
    }
    return _ptr;
  }

  function topics(uint _ptr, bytes32[2] memory _topics) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push 2 to the end of the buffer - event will have 2 topics
      mstore(add(_ptr, len), 2)
      // Push topics to end of buffer
      mstore(add(_ptr, add(0x20, len)), mload(_topics))
      mstore(add(_ptr, add(0x40, len)), mload(add(0x20, _topics)))
      // Increment buffer length
      mstore(_ptr, add(0x40, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x80, _ptr), len)) {
        mstore(0x40, add(add(0x80, _ptr), len))
      }
      // Increment EMITS action length (pointer to length stored before _ptr)
      len := mload(sub(_ptr, 0x20))
      mstore(len, add(1, mload(len)))
    }
    return _ptr;
  }

  function topics(uint _ptr, bytes32[3] memory _topics) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push 3 to the end of the buffer - event will have 3 topics
      mstore(add(_ptr, len), 3)
      // Push topics to end of buffer
      mstore(add(_ptr, add(0x20, len)), mload(_topics))
      mstore(add(_ptr, add(0x40, len)), mload(add(0x20, _topics)))
      mstore(add(_ptr, add(0x60, len)), mload(add(0x40, _topics)))
      // Increment buffer length
      mstore(_ptr, add(0x60, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0xa0, _ptr), len)) {
        mstore(0x40, add(add(0xa0, _ptr), len))
      }
      // Increment EMITS action length (pointer to length stored before _ptr)
      len := mload(sub(_ptr, 0x20))
      mstore(len, add(1, mload(len)))
    }
    return _ptr;
  }

  function topics(uint _ptr, bytes32[4] memory _topics) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push 4 to the end of the buffer - event will have 4 topics
      mstore(add(_ptr, len), 4)
      // Push topics to end of buffer
      mstore(add(_ptr, add(0x20, len)), mload(_topics))
      mstore(add(_ptr, add(0x40, len)), mload(add(0x20, _topics)))
      mstore(add(_ptr, add(0x60, len)), mload(add(0x40, _topics)))
      mstore(add(_ptr, add(0x80, len)), mload(add(0x60, _topics)))
      // Increment buffer length
      mstore(_ptr, add(0x80, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0xc0, _ptr), len)) {
        mstore(0x40, add(add(0xc0, _ptr), len))
      }
      // Increment EMITS action length (pointer to length stored before _ptr)
      len := mload(sub(_ptr, 0x20))
      mstore(len, add(1, mload(len)))
    }
    return _ptr;
  }

  function data(uint _ptr, bytes memory _data) internal pure returns (uint) {
    assembly {
      // Loop over bytes array, and push each value to storage buffer
      let offset := 0x0
      for { } lt(offset, add(0x20, mload(_data))) { offset := add(0x20, offset) } {
        // Push bytes array chunk to buffer
        mstore(add(add(add(0x20, mload(_ptr)), offset), _ptr), mload(add(offset, _data)))
      }
      // Increment buffer length
      mstore(_ptr, add(offset, mload(_ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), mload(_ptr))) {
        mstore(0x40, add(add(0x40, _ptr), mload(_ptr)))
      }
    }
    return _ptr;
  }

  function data(uint _ptr) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push data size (0 bytes) to end of buffer
      mstore(add(_ptr, len), 0)
      // Increment buffer length
      mstore(_ptr, len)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len))
      }
    }
    return _ptr;
  }

  function data(uint _ptr, bytes32 _data) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push data size (32 bytes) to end of buffer
      mstore(add(_ptr, len), 0x20)
      // Push value to the end of the buffer
      mstore(add(_ptr, add(0x20, len)), _data)
      // Increment buffer length
      mstore(_ptr, add(0x20, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x60, _ptr), len)) {
        mstore(0x40, add(add(0x60, _ptr), len))
      }
    }
    return _ptr;
  }

  function data(uint _ptr, uint _data) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push data size (32 bytes) to end of buffer
      mstore(add(_ptr, len), 0x20)
      // Push value to the end of the buffer
      mstore(add(_ptr, add(0x20, len)), _data)
      // Increment buffer length
      mstore(_ptr, add(0x20, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x60, _ptr), len)) {
        mstore(0x40, add(add(0x60, _ptr), len))
      }
    }
    return _ptr;
  }

  function data(uint _ptr, address _data) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push data size (32 bytes) to end of buffer
      mstore(add(_ptr, len), 0x20)
      // Push value to the end of the buffer
      mstore(add(_ptr, add(0x20, len)), _data)
      // Increment buffer length
      mstore(_ptr, add(0x20, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x60, _ptr), len)) {
        mstore(0x40, add(add(0x60, _ptr), len))
      }
    }
    return _ptr;
  }

  function data(uint _ptr, bool _data) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push data size (32 bytes) to end of buffer
      mstore(add(_ptr, len), 0x20)
      // Push value to the end of the buffer
      mstore(add(_ptr, add(0x20, len)), _data)
      // Increment buffer length
      mstore(_ptr, add(0x20, len))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x60, _ptr), len)) {
        mstore(0x40, add(add(0x60, _ptr), len))
      }
    }
    return _ptr;
  }
}

contract MockAdminContract {

  using MemoryBuffers for uint;
  using ArrayUtils for bytes32[];
  using Exceptions for bytes32;
  using LibStorage for uint;
  using LibEvents for uint;
  using Pointers for *;

  // Storage location of the minimum amount of tokens allowed to be purchased
  bytes32 internal constant CROWDSALE_MINIMUM_CONTRIBUTION = keccak256("crowdsale_min_cap");

  // Storage location for the amount of tokens still available for purchase in this crowdsale
  bytes32 internal constant TOKENS_REMAINING = keccak256("crowdsale_tokens_remaining");

  // Whether or not the crowdsale is whitelist-enabled
  bytes32 internal constant SALE_IS_WHITELISTED = keccak256("crowdsale_is_whitelisted");

  // Storage location of the token/wei rate at the beginning of the sale
  bytes32 internal constant STARTING_SALE_RATE = keccak256("crowdsale_start_rate");

  // Storage location of the token/wei rate at the beginning of the sale
  bytes32 internal constant ENDING_SALE_RATE = keccak256("crowdsale_end_rate");

  // MOCK FUNCTION - used to set the remaining tokens for sale
  function setTokensRemaining(uint _val) public pure returns (bytes memory) {
    // Create memory buffer for return data
    uint ptr = ptr.clear();

    ptr.stores();

    ptr.store(_val).at(TOKENS_REMAINING);

    return ptr.getBuffer();
  }

  // MOCK FUNCTION - used to update the global minimum contribution of a sale
  function updateGlobalMin(uint _new_min_contribution) public pure returns (bytes memory) {
    // Create memory buffer for return data
    uint ptr = ptr.clear();

    ptr.stores();

    ptr.store(_new_min_contribution).at(CROWDSALE_MINIMUM_CONTRIBUTION);

    return ptr.getBuffer();
  }

  // MOCK FUNCTION - used to set whether or not the sale is whitelisted
  function setSaleIsWhitelisted(bool _is_whitelisted) public pure returns (bytes memory) {
    // Create memory buffer for return data
    uint ptr = ptr.clear();

    ptr.stores();

    ptr.store(_is_whitelisted).at(SALE_IS_WHITELISTED);

    return ptr.getBuffer();
  }

  // MOCK FUNCTION - used to update the sale's prices
  function setStartAndEndPrices(uint _start, uint _end) public pure returns (bytes memory) {
    // Create memory buffer for return data
    uint ptr = ptr.clear();

    ptr.stores();

    ptr.store(_start).at(STARTING_SALE_RATE);
    ptr.store(_end).at(ENDING_SALE_RATE);

    return ptr.getBuffer();
  }
}
