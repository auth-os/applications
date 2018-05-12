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

  /// STORAGE BUFFERS ///

  /*
  Creates a buffer for return data storage. Buffer pointer stores the lngth of the buffer

  @param _spend_destination: The destination to which _wei_amount will be forwarded
  @param _wei_amount: The amount of wei to send to the destination
  @return ptr: The location in memory where the length of the buffer is stored - elements stored consecutively after this location
  */
  function stBuff(address _spend_destination, uint _wei_amount) internal pure returns (uint ptr) {
    assembly {
      // Get buffer location - free memory
      ptr := mload(0x40)
      // Store initial buffer length
      mstore(ptr, 0x40)
      // Push spend destination and wei amount to buffer
      mstore(add(0x20, ptr), _spend_destination)
      mstore(add(0x40, ptr), _wei_amount)
      // Update free-memory pointer to point beyond the buffer
      mstore(0x40, add(0x60, ptr))
    }
  }

  /*
  Creates a new return data storage buffer at the position given by the pointer. Does not update free memory

  @param _ptr: A pointer to the location where the buffer will be created
  @param _spend_destination: The destination to which _wei_amount will be forwarded
  @param _wei_amount: The amount of wei to send to the destination
  */
  function stOverwrite(uint _ptr, address _spend_destination, uint _wei_amount) internal pure {
    assembly {
      // Set initial length
      mstore(_ptr, 0x40)
      // Push spend destination and wei amount to buffer
      mstore(add(0x20, _ptr), _spend_destination)
      mstore(add(0x40, _ptr), _wei_amount)
      // Update free-memory pointer to point beyond the buffer
      mstore(0x40, msize)
    }
  }

  /*
  Pushes a storage location and value to the end of the storage buffer, and updates the buffer length

  @param _ptr: A pointer to the start of the buffer
  @param _location: The location to which the value will be written
  @param _val: The value to push to the buffer
  */
  function stPush(uint _ptr, bytes32 _location, bytes32 _val) internal pure {
    assembly {
      // Get end of buffer - 32 bytes plus the length stored at the pointer
      let len := add(0x20, mload(_ptr))
      // Push location and value to end of buffer
      mstore(add(_ptr, len), _location)
      len := add(0x20, len)
      mstore(add(_ptr, len), _val)
      // Increment buffer length
      mstore(_ptr, len)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(add(0x20, _ptr), len)) {
        mstore(0x40, add(add(0x40, _ptr), len)) // Ensure free memory pointer points to the beginning of a memory slot
      }
    }
  }

  /*
  Returns the bytes32[] stored at the buffer

  @param _ptr: A pointer to the location in memory where the calldata for the call is stored
  @return store_data: The return values, which will be stored
  */
  function getBuffer(uint _ptr) internal pure returns (bytes32[] memory store_data) {
    assembly {
      // If the size stored at the pointer is not evenly divislble into 32-byte segments, this was improperly constructed
      if gt(mod(mload(_ptr), 0x20), 0) { revert (0, 0) }
      mstore(_ptr, div(mload(_ptr), 0x20))
      store_data := _ptr
    }
  }
}

contract CrowdsaleConsoleMock {

  using MemoryBuffers for uint;
  using ArrayUtils for bytes32[];
  using Exceptions for bytes32;

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

  // Storage location of crowdsale admin address
  bytes32 internal constant ADMIN = keccak256("admin");

  // Whether the crowdsale and token are initialized, and the application is ready to run
  bytes32 internal constant CROWDSALE_IS_INIT = keccak256("crowdsale_is_init");

  // Whether or not the crowdsale is post-purchase
  bytes32 internal constant CROWDSALE_IS_FINALIZED = keccak256("crowdsale_is_finalized");

  // Storage location of crowdsale start time
  bytes32 internal constant CROWDSALE_STARTS_AT = keccak256("crowdsale_starts_at");

  // Storage location of duration of crowdsale
  bytes32 internal constant CROWDSALE_DURATION = keccak256("crowdsale_duration");

  // Storage location of the minimum amount of tokens allowed to be purchased
  bytes32 internal constant CROWDSALE_MINIMUM_CONTRIBUTION = keccak256("crowdsale_min_cap");

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

  // Storage location for token name
  bytes32 internal constant TOKEN_NAME = keccak256("token_name");

  // Storage location for token ticker symbol
  bytes32 internal constant TOKEN_SYMBOL = keccak256("token_symbol");

  // Storage location for token decimals
  bytes32 internal constant TOKEN_DECIMALS = keccak256("token_decimals");

  /// FUNCTION SELECTORS ///

  // Function selector for storage 'readMulti'
  // readMulti(bytes32 exec_id, bytes32[] locations)
  bytes4 internal constant RD_MULTI = bytes4(keccak256("readMulti(bytes32,bytes32[])"));

  // Modifier - will only allow access to a crowdsale's admin address
  // Additionally, crowdsale must not be initialized
  modifier onlyAdminAndNotInit(bytes memory _context) {
    // Get sender and exec id for this instance
    address sender;
    bytes32 exec_id;
    (exec_id, sender, ) = parse(_context);

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Place exec id, data read offset, and read size in buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(2));
    // Place admin storage location and crowdsale status storage location in calldata
    ptr.cdPush(ADMIN);
    ptr.cdPush(CROWDSALE_IS_INIT);
    // Read from storage, and store return to buffer
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 2);

    // Check that the sender is the admin address and that the crowdsale is not yet initialized
    if (read_values[0] != bytes32(sender) || read_values[1] != 0)
      bytes32("NotAdminOrSaleIsInit").trigger();

    // All checks passed - sender is crowdsale admin, and crowdsale is not initialized
    _;
  }

  /*
  Allows the admin of a crowdsale to add token information, prior to crowdsale initialization completion

  @param _name: The name of the token to initialize
  @param _symbol: The ticker symbol of the token to initialize
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function initCrowdsaleToken(bytes32 _name, bytes32 _symbol, uint _decimals, bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes32[] memory store_data) {
    // Ensure valid input
    if (
      _name == 0
      || _symbol == 0
      || _decimals > 18
    ) bytes32("ImproperInitialization").trigger();

    // Create memory buffer for return data
    uint ptr = MemoryBuffers.stBuff(0, 0);

    // Place token name, symbol, and decimals in return data buffer
    ptr.stPush(TOKEN_NAME, _name);
    ptr.stPush(TOKEN_SYMBOL, _symbol);
    ptr.stPush(TOKEN_DECIMALS, bytes32(_decimals));

    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to update the global minimum contribution amount in tokens for a crowdsale prior to its start

  @param _new_min_contribution: The new minimum amount of tokens that must be bought for the crowdsale
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function updateGlobalMinContribution(uint _new_min_contribution, bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes32[] memory store_data) {
    // Create memory buffer for return data
    uint ptr = MemoryBuffers.stBuff(0, 0);

    // Place new crowdsale minimum wei contribution cap and min cap storage location in buffer
    ptr.stPush(CROWDSALE_MINIMUM_CONTRIBUTION, bytes32(_new_min_contribution));

    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to update the whitelist status for several addresses

  @param _to_update: An array of addresses for which whitelist status will be updated
  @param _minimum_contribution: The minimum contribution amount for the given address
  @param _max_spend_amt: The maximum amount of wei able to be spent for the address during the sale
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function whitelistMulti(
    address[] memory _to_update,
    uint[] memory _minimum_contribution,
    uint[] memory _max_spend_amt,
    bytes memory _context
  ) public view returns (bytes32[] memory store_data) {
    // Ensure valid input
    if (
      _to_update.length != _minimum_contribution.length
      || _to_update.length != _max_spend_amt.length
      || _to_update.length == 0
    ) bytes32("MismatchedInputLengths").trigger();

    // Get sender and exec id from context
    address sender;
    bytes32 exec_id;
    (exec_id, sender, ) = parse(_context);

    /// Read crowdsale admin address and whitelist length from storage -

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(2));
    // Push admin address storage location to buffer
    ptr.cdPush(ADMIN);
    // Push whitelist array length storage location to buffer
    ptr.cdPush(SALE_WHITELIST);
    // Read from storage
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 2);

    // If the first returned value is not equal to the sender's address, sender is not the crowdsale admin
    if (read_values[0] != bytes32(sender))
      bytes32("SenderIsNotAdmin").trigger();

    // Get whitelist length
    uint whitelist_length = uint(read_values[1]);

    /// Sender is crowdsale admin - create storage return request and append whitelist updates

    // Overwrite previous buffer with storage buffer
    ptr.stOverwrite(0, 0);

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < _to_update.length; i++) {
      // Get storage location for address whitelist struct
      bytes32 whitelist_status_loc = keccak256(keccak256(_to_update[i]), SALE_WHITELIST);
      ptr.stPush(whitelist_status_loc, bytes32(_minimum_contribution[i]));
      ptr.stPush(bytes32(32 + uint(whitelist_status_loc)), bytes32(_max_spend_amt[i]));

      // Push whitelisted address to end of whitelist array, unless the values being pushed are zero
      if (_minimum_contribution[i] != 0 || _max_spend_amt[i] != 0) {
        ptr.stPush(
          bytes32(32 + (32 * whitelist_length) + uint(SALE_WHITELIST)),
          bytes32(_to_update[i])
        );
        // Increment whitelist length
        whitelist_length++;
      }
    }

    // Store new tier whitelist length
    ptr.stPush(SALE_WHITELIST, bytes32(whitelist_length));
    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to revise crowdsale start time duration, provided the crowdsale is not already initialized

  @param _start_time: The new start time of the crowdsale
  @param _duration: The new amount of time the crowdsale is open
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function setCrowdsaleStartAndDuration(uint _start_time, uint _duration, bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes32[] memory store_data) {
    // Ensure valid input
    if (_start_time <= getTime() && _duration == 0)
      bytes32("InvalidStartTimeAndDuration").trigger();

    // Create memory buffer for return data
    uint ptr = MemoryBuffers.stBuff(0, 0);
    // Push crowdsale start time and duration storage locations and new values to buffer
    // If either value is zero, do not update that value
    if (_start_time > getTime())
      ptr.stPush(CROWDSALE_STARTS_AT, bytes32(_start_time));
    if (_duration != 0)
      ptr.stPush(CROWDSALE_DURATION, bytes32(_duration));

    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to finalize the initialization process for this crowdsale, locking its details

  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function initializeCrowdsale(bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes32[] memory store_data) {
    // Get execuion id from _context
    bytes32 exec_id;
    (exec_id, , ) = parse(_context);

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);

    // Place exec id, data read offset, and read size in buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(2));
    // Push crowdsale start time and token name read locations to buffer
    ptr.cdPush(CROWDSALE_STARTS_AT);
    ptr.cdPush(TOKEN_NAME);

    // Read from storage and check that the token name is nonzero and the start time has not passed yet
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 2);

    if (
      read_values[0] < bytes32(getTime())            // Crowdsale already started
      || read_values[1] == 0                   // Token not initialized
    ) bytes32("CrowdsaleStartedOrTokenNotInit").trigger();

    // Overwrite read buffer with storage buffer
    ptr.stOverwrite(0, 0);
    // Push crowdsale initialization status location to buffer
    ptr.stPush(CROWDSALE_IS_INIT, bytes32(1));
    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  /*
  Allows the crowdsale admin to finalize a crowdsale, provided it is fully initialized, and not already finalized

  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function finalizeCrowdsale(bytes memory _context) public view returns (bytes32[] memory store_data) {
    // Get sender and exec id for this app instance
    address sender;
    bytes32 exec_id;
    (exec_id, sender, ) = parse(_context);

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to calldata buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(3));
    // Push admin address, crowdsale init status, and crowdsale finalization status in calldata
    ptr.cdPush(ADMIN);
    ptr.cdPush(CROWDSALE_IS_INIT);
    ptr.cdPush(CROWDSALE_IS_FINALIZED);
    // Read from storage, and store returned data in buffer
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 3);

    // Check that the sender is the admin address, and that the crowdsale is initialized, but not finalized
    if (
      read_values[0] != bytes32(sender)
      || read_values[1] == 0                          // Crowdsale init status is false
      || read_values[2] == bytes32(1)                 // Crowdsale finalization status is true
    ) bytes32("NotAdminOrStatusInvalid").trigger();

    // Create storage buffer, overwriting the previous read buffer
    ptr.stOverwrite(0, 0);
    // Push crowdsale finalization status to buffer
    ptr.stPush(CROWDSALE_IS_FINALIZED, bytes32(1));

    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
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
