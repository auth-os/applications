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

library LibPayments {

  // ACTION REQUESTORS //

  bytes4 internal constant PAYS = bytes4(keccak256('pays:'));

  // Set up a PAYS action request buffer
  function pays(uint _ptr) internal pure {
    bytes4 action_req = PAYS;
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push requestor to the of buffer
      mstore(add(_ptr, len), action_req)
      // Push '0' to the end of the 4 bytes just pushed - this will be the length of the PAYS action
      mstore(add(_ptr, add(0x04, len)), 0)
      // Increment buffer length
      mstore(_ptr, add(0x04, len))
      // Set a pointer to PAYS action length in the free slot before _ptr
      mstore(sub(_ptr, 0x20), add(_ptr, add(0x04, len)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x44, _ptr), len)) {
        mstore(0x40, add(add(0x44, _ptr), len))
      }
    }
  }

  function pay(uint _ptr, uint _amt) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push amount to the end of the buffer
      mstore(add(_ptr, len), _amt)
      // Increment buffer length
      mstore(_ptr, len)
      // Increment PAYS action length (pointer to length stored before _ptr)
      let _len_ptr := mload(sub(_ptr, 0x20))
      mstore(_len_ptr, add(1, mload(_len_ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len))
      }
    }
    return _ptr;
  }

  function to(uint _ptr, address _destination) internal pure returns (uint) {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push payee address to the end of the buffer
      mstore(add(_ptr, len), _destination)
      // Increment buffer length
      mstore(_ptr, len)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x40, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len))
      }
    }
    return _ptr;
  }
}

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    if (a == 0) {
      return 0;
    }
    c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    return a / b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    assert(c >= a);
    return c;
  }
}

contract CrowdsaleBuyTokensMock {

  using MemoryBuffers for uint;
  using ArrayUtils for bytes32[];
  using Exceptions for bytes32;
  using LibStorage for uint;
  using LibEvents for uint;
  using LibPayments for uint;
  using SafeMath for uint;
  using Pointers for *;

  uint public set_time;

  function setTime(uint _to) public {
    set_time = _to;
  }

  function getTime() public view returns (uint time) {
    return (set_time == 0 ? now : set_time);
  }

  function resetTime() public {
    set_time = 0;
  }

  /// CROWDSALE STORAGE ///

  // Whether the crowdsale and token are initialized, and the application is ready to run
  bytes32 internal constant CROWDSALE_IS_INIT = keccak256("crowdsale_is_init");

  // Whether or not the crowdsale is post-purchase
  bytes32 internal constant CROWDSALE_IS_FINALIZED = keccak256("crowdsale_is_finalized");

  // Storage location for the amount of tokens still available for purchase in this crowdsale
  bytes32 internal constant TOKENS_REMAINING = keccak256("crowdsale_tokens_remaining");

  // Storage location of the minimum amount of tokens allowed to be purchased
  bytes32 internal constant CROWDSALE_MINIMUM_CONTRIBUTION = keccak256("crowdsale_min_cap");

  // Maps addresses to a boolean indicating whether or not this address has contributed
  // At its base location, stores the amount of unique contributors so far in this crowdsale
  bytes32 internal constant CROWDSALE_UNIQUE_CONTRIBUTORS = keccak256("crowdsale_contributors");

  // Storage location of crowdsale start time
  bytes32 internal constant CROWDSALE_STARTS_AT = keccak256("crowdsale_starts_at");

  // Storage location of duration of crowdsale
  bytes32 internal constant CROWDSALE_DURATION = keccak256("crowdsale_duration");

  // Storage location of the token/wei rate at the beginning of the sale
  bytes32 internal constant STARTING_SALE_RATE = keccak256("crowdsale_start_rate");

  // Storage location of the token/wei rate at the beginning of the sale
  bytes32 internal constant ENDING_SALE_RATE = keccak256("crowdsale_end_rate");

  // Storage location of team funds wallet
  bytes32 internal constant WALLET = keccak256("crowdsale_wallet");

  // Storage location of amount of wei raised during the crowdsale, total
  bytes32 internal constant WEI_RAISED = keccak256("crowdsale_wei_raised");

  // Whether or not the crowdsale is whitelist-enabled
  bytes32 internal constant SALE_IS_WHITELISTED = keccak256("crowdsale_is_whitelisted");

  // Storage seed for crowdsale whitelist mappings - maps each tier's index to a mapping of addresses to whtielist information
  /* Each whitelist entry mimics this struct:
  struct WhitelistListing {
    uint minimum_contribution;
    uint max_contribution;
  }
  */
  bytes32 internal constant SALE_WHITELIST = keccak256("crowdsale_purchase_whitelist");

  /// TOKEN STORAGE ///

  // Storage location for token decimals
  bytes32 internal constant TOKEN_DECIMALS = keccak256("token_decimals");

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  /// EVENTS ///

  // event Purchase(bytes32 indexed exec_id, uint256 indexed current_rate, uint256 indexed current_time, uint256 tokens)
  bytes32 internal constant PURCHASE = keccak256('Purchase(bytes32,uint256,uint256,uint256)');

  /// FUNCTION SELECTORS ///

  // Function selector for storage 'readMulti'
  // readMulti(bytes32 exec_id, bytes32[] locations)
  bytes4 internal constant RD_MULTI = bytes4(keccak256("readMulti(bytes32,bytes32[])"));

  struct CrowdsaleInfo {
    address team_wallet;
    uint wei_raised;
    uint tokens_remaining;
    uint token_decimals;
    uint start_time;
    uint start_rate;
    uint end_rate;
    uint sale_duration;
    bool sale_is_whitelisted;
  }

  struct SpendInfo {
    uint spender_token_balance;
    uint spend_amount;
    uint tokens_purchased;
    uint current_rate;
    bool sender_has_contributed;
    uint num_contributors;
    uint minimum_contribution_amount;
    uint spend_amount_remaining;
  }

  /*
  Allows the sender to purchase tokens from the crowdsale, if it is active

  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function buy(bytes memory _context) public view returns (bytes memory) {
    // Get original sender address, execution id, and wei sent from context array
    address sender;
    bytes32 exec_id;
    uint wei_sent;
    (exec_id, sender, wei_sent) = parse(_context);
    // Ensure nonzero amount of wei sent
    if (wei_sent == 0)
      bytes32("NoWeiSent").trigger();

    /// Get crowdsale information and place in CrowdsaleInfo struct
    CrowdsaleInfo memory sale_stat = getCrowdsaleInfo(exec_id);
    /// Get sender and spend information and place in SpendInfo struct
    SpendInfo memory spend_stat = getSpendInfo(sender, exec_id, sale_stat.sale_is_whitelisted);

    /// Crowdsale is in a valid purchase satte - get current sale rate:
    getCurrentRate(sale_stat, spend_stat);

    // Sanity check - current rate should be between the starting and ending rates
    assert(sale_stat.start_rate >= spend_stat.current_rate && spend_stat.current_rate >= sale_stat.end_rate);

    /// Get total amount of wei that can be spent, given the amount sent and the number of tokens remaining -
    getPurchaseInfo(wei_sent, sale_stat, spend_stat);

    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up PAYS action requests -
    ptr.pays();
    // Designate amount spent for forwarding to the team wallet
    ptr.pay(spend_stat.spend_amount).to(sale_stat.team_wallet);

    // Set up STORES action requests -
    ptr.stores();

    // Store updated spender token balance
    ptr.store(
      spend_stat.tokens_purchased.add(spend_stat.spender_token_balance)
    ).at(keccak256(keccak256(sender), TOKEN_BALANCES));

    // Store updated remaining tokens in the sale
    ptr.store(
      sale_stat.tokens_remaining.sub(spend_stat.tokens_purchased)
    ).at(TOKENS_REMAINING);

    // Store updated total wei raised
    ptr.store(spend_stat.spend_amount.add(sale_stat.wei_raised)).at(WEI_RAISED);

    // If the sender has not previously contributed, store them as a unique contributor
    if (spend_stat.sender_has_contributed == false) {
      ptr.store(spend_stat.num_contributors.add(1)).at(CROWDSALE_UNIQUE_CONTRIBUTORS);
      ptr.store(true).at(keccak256(keccak256(sender), CROWDSALE_UNIQUE_CONTRIBUTORS));
    }

    // If the sale is whitelisted, update the spender's minimum token purchase amount,
    // as well as their maximum wei contribution amount
    if (sale_stat.sale_is_whitelisted) {
      ptr.store(uint(0)).at(
        keccak256(keccak256(sender), SALE_WHITELIST)
      );
      ptr.store(spend_stat.spend_amount_remaining).at(
        bytes32(32 + uint(keccak256(keccak256(sender), SALE_WHITELIST)))
      );
    }

    // Set up EMITS action requests -
    ptr.emits();

    // Add PURCHASE signature and topics
    ptr.topics(
      [PURCHASE, exec_id, bytes32(spend_stat.current_rate), bytes32(getTime())]
    ).data(spend_stat.tokens_purchased);

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Given information about a crowdsale, loads information about purchase amounts into SpendInfo

  @param _wei_sent: The amount of wei sent to purchase with
  @param _sale_stat: A CrowdsaleInfo struct holding various information about the ongoing crowdsale
  @param _spend_stat: A SpendInfo struct holding information about the sender
  */
  function getPurchaseInfo(
    uint _wei_sent,
    CrowdsaleInfo memory _sale_stat,
    SpendInfo memory _spend_stat
  ) internal pure {
    // Get amount of wei able to be spent, given the number of tokens remaining -
    if ((_wei_sent * (10 ** _sale_stat.token_decimals) / _spend_stat.current_rate) > _sale_stat.tokens_remaining) {
      // The amount that can be purchased is more than the number of tokens remaining:
      _spend_stat.spend_amount =
        (_spend_stat.current_rate * _sale_stat.tokens_remaining) / (10 ** _sale_stat.token_decimals);
    } else {
      // All of the wei sent can be used to purchase -
      _spend_stat.spend_amount = _wei_sent;
    }

    // If the sale is whitelisted, ensure the sender is not going over their spend cap -
    if (_sale_stat.sale_is_whitelisted) {
      if (_spend_stat.spend_amount > _spend_stat.spend_amount_remaining)
        _spend_stat.spend_amount = _spend_stat.spend_amount_remaining;

      // Decrease sender's spend amount remaining
      assert(_spend_stat.spend_amount_remaining >= _spend_stat.spend_amount);
      _spend_stat.spend_amount_remaining -= _spend_stat.spend_amount;
    }

    // Ensure spend amount is valid -
    if (_spend_stat.spend_amount == 0 || _spend_stat.spend_amount > _wei_sent)
      bytes32("InvalidSpendAmount").trigger();

    // Get number of tokens able to be purchased with the amount spent -
    _spend_stat.tokens_purchased =
      (_spend_stat.spend_amount * (10 ** _sale_stat.token_decimals)) / _spend_stat.current_rate;

    // Ensure amount of tokens to purchase is not greater than the amount of tokens remaining in the sale -
    if (_spend_stat.tokens_purchased > _sale_stat.tokens_remaining || _spend_stat.tokens_purchased == 0)
      bytes32("InvalidPurchaseAmount").trigger();

    // Ensure the number of tokens purchased meets the sender's minimum contribution requirement
    if (_spend_stat.tokens_purchased < _spend_stat.minimum_contribution_amount)
      bytes32("UnderMinCap").trigger();
  }

  /*
  Returns general information on the ongoing crowdsale and stores it in a CrowdsaleInfo struct

  @param _exec_id: The execution id under which the crowdsale is registered
  @return sale_stat: A struct containing information about the ongoing crowdsale
  */
  function getCrowdsaleInfo(bytes32 _exec_id) internal view returns (CrowdsaleInfo memory sale_stat) {
    // Create 'readMulti' calldata buffer in memory -
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to buffer
    ptr.cdPush(_exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(11));
    // Push team wallet, wei raised, tokens remaining, token decimals, and crowdsale start time to buffer
    ptr.cdPush(WALLET);
    ptr.cdPush(WEI_RAISED);
    ptr.cdPush(TOKENS_REMAINING);
    ptr.cdPush(TOKEN_DECIMALS);
    ptr.cdPush(CROWDSALE_STARTS_AT);
    // Push crowdsale start rate, end rate, sale duration, and whitelist status to buffer
    ptr.cdPush(STARTING_SALE_RATE);
    ptr.cdPush(ENDING_SALE_RATE);
    ptr.cdPush(CROWDSALE_DURATION);
    ptr.cdPush(SALE_IS_WHITELISTED);
    // Push crowdsale initialization and finalization status locations to buffer
    ptr.cdPush(CROWDSALE_IS_INIT);
    ptr.cdPush(CROWDSALE_IS_FINALIZED);
    // Read from storage
    uint[] memory crowdsale_info = ptr.readMulti().toUintArr();
    // Ensure valid read size
    assert(crowdsale_info.length == 11);

    /// Assign members to struct -
    sale_stat = CrowdsaleInfo({
      team_wallet: address(crowdsale_info[0]),
      wei_raised: crowdsale_info[1],
      tokens_remaining: crowdsale_info[2],
      token_decimals: crowdsale_info[3],
      start_time: crowdsale_info[4],
      start_rate: crowdsale_info[5],
      end_rate: crowdsale_info[6],
      sale_duration: crowdsale_info[7],
      sale_is_whitelisted: crowdsale_info[8] == 0 ? false : true
    });

    // Ensure valid crowdsale setup -
    if (
      sale_stat.team_wallet == address(0)                        // Invalid team wallet address
      || sale_stat.token_decimals > 18                           // Invalid token decimal amount
      || sale_stat.start_time == 0                               // Invalid crowdsale start time
      || sale_stat.end_rate == 0                                 // Invalid crowdsale ending rate
      || sale_stat.start_rate <= sale_stat.end_rate              // State rate must be larger than end rate
      || sale_stat.sale_duration == 0                            // Invalid crowdsale duration
    ) bytes32("InvalidCrowdsaleSetup").trigger();

    // Ensure crowdsale is in a purchasable state -
    if (getTime() < sale_stat.start_time)
      bytes32("BeforeStartTime").trigger();
    if (
      sale_stat.tokens_remaining == 0                            // No tokens remaining for purchase
      || getTime() >= sale_stat.start_time + sale_stat.sale_duration   // Crowddsale has already ended
      || crowdsale_info[9] == 0                                  // Crowdsale is not initialized
      || crowdsale_info[10] != 0                                 // Crowdsale is already finalized
    ) bytes32("CrowdsaleFinished").trigger();
  }

  /*
  Gets information about the sender, crowdsale whitelist, and contributor count and stores it in a SpendInfo struct

  @param _sender: The original script executor
  @param _exec_id: The execution id under which the crowdsale is registered
  @param _sale_is_whitelisted: Whether or not the crowdsale is whitelisted
  @return spend_stat: A struct holding information about the sender
  */
  function getSpendInfo(address _sender, bytes32 _exec_id, bool _sale_is_whitelisted) internal view
  returns (SpendInfo memory spend_stat) {
    // Create 'readMulti' calldata buffer in memory -
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to buffer
    ptr.cdPush(_exec_id);
    ptr.cdPush(0x40);
    // If the sale is whitelisted, read size is one more than if it is not
    if (_sale_is_whitelisted) {
      ptr.cdPush(bytes32(5));
    } else {
      ptr.cdPush(bytes32(4));
    }
    // Push sender token balance, sender unique contribution location, and number of unique contributors to buffer
    ptr.cdPush(keccak256(keccak256(_sender), TOKEN_BALANCES));
    ptr.cdPush(keccak256(keccak256(_sender), CROWDSALE_UNIQUE_CONTRIBUTORS));
    ptr.cdPush(CROWDSALE_UNIQUE_CONTRIBUTORS);
    // If the crowdsale is whitelisted, push whitelist information locations for the sender to the buffer
    if (_sale_is_whitelisted) {
      ptr.cdPush(keccak256(keccak256(_sender), SALE_WHITELIST));
      ptr.cdPush(bytes32(32 + uint(keccak256(keccak256(_sender), SALE_WHITELIST))));
    } else {
      // If the sale is not whitelisted, push the sale global minimum purchase amount cap to the buffer
      ptr.cdPush(CROWDSALE_MINIMUM_CONTRIBUTION);
    }
    // Read from storage
    uint[] memory spend_info = ptr.readMulti().toUintArr();
    // Ensure valid read size
    assert(_sale_is_whitelisted ? spend_info.length == 5 : spend_info.length == 4);

    /// Assign members to struct -
    spend_stat = SpendInfo({
      spender_token_balance: spend_info[0],
      spend_amount: 0,
      tokens_purchased: 0,
      current_rate: 0,
      sender_has_contributed: (spend_info[1] == 0 ? false : true),
      num_contributors: spend_info[2],
      minimum_contribution_amount: spend_info[3],
      spend_amount_remaining: (_sale_is_whitelisted ? spend_info[4] : 0)
    });

    // If the sender has already purchased tokens, they no longer have a minimum cap
    if (spend_stat.sender_has_contributed)
      spend_stat.minimum_contribution_amount = 0;

    // If the crowdsale is whitelisted and the sender has no remaining spend amount, revert
    if (_sale_is_whitelisted && spend_stat.spend_amount_remaining == 0)
      bytes32("SpendAmountExceeded").trigger();
  }

  /*
  Gets the current sale rate and places it in _sale_stat.current_rate

  @param _sale_stat: A CrowdsaleInfo struct holding various information about the ongoing crowdsale
  @param _spend_stat: A SpendInfo struct holding information about the sender
  */
  function getCurrentRate(CrowdsaleInfo memory _sale_stat, SpendInfo memory _spend_stat) internal view {
    // If the sale has not started, set current rate to 0
    if (getTime() < _sale_stat.start_time) {
      _spend_stat.current_rate = 0;
      return;
    }

    // Get amount of time elapsed
    uint elapsed = getTime() - _sale_stat.start_time;
    // If the sale has ended, set current rate to 0
    if (elapsed >= _sale_stat.sale_duration) {
      _spend_stat.current_rate = 0;
      return;
    }

    // Add precision to time elapsed -
    require(elapsed * (10 ** 18) >= elapsed);
    elapsed *= (10 ** 18);

    // Crowdsale is active - calculate current rate, adding decimals for precision
    assert(_sale_stat.start_rate > _sale_stat.end_rate);
    uint temp_rate =
        ((_sale_stat.start_rate - _sale_stat.end_rate) * elapsed)
          / _sale_stat.sale_duration;

    temp_rate /= (10 ** 18);

    assert(temp_rate <= _sale_stat.start_rate);
    // Current rate is start rate minus temp rate
    _spend_stat.current_rate = _sale_stat.start_rate - temp_rate;
  }

  // Parses context array and returns execution id, sender address, and sent wei amount
  function parse(bytes memory _context) internal pure returns (bytes32 exec_id, address from, uint wei_sent) {
    if (_context.length != 96)
      bytes32("UnknownExecutionContext").trigger();

    assembly {
      exec_id := mload(add(0x20, _context))
      from := mload(add(0x40, _context))
      wei_sent := mload(add(0x60, _context))
    }

    // Ensure sender and exec id are valid
    if (from == address(0) || exec_id == 0)
      bytes32("UnknownExecutionContext").trigger();
  }
}
