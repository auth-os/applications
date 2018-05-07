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

  // Whether the crowdsale and token are initialized, and the sale is ready to run
  bytes32 internal constant CROWDSALE_IS_INIT = keccak256("crowdsale_is_init");

  // Whether or not the crowdsale is post-purchase
  bytes32 internal constant CROWDSALE_IS_FINALIZED = keccak256("crowdsale_is_finalized");

  // Storage location of the crowdsale's start time
  bytes32 internal constant CROWDSALE_START_TIME = keccak256("crowdsale_start_time");

  // Storage location of the amount of time the crowdsale will take, accounting for all tiers
  bytes32 internal constant CROWDSALE_TOTAL_DURATION = keccak256("crowdsale_total_duration");

  // Storage location of the minimum amount of tokens allowed to be purchased
  bytes32 internal constant CROWDSALE_MINIMUM_CONTRIBUTION = keccak256("crowdsale_min_cap");

  // Storage location of a list of the tiers the crowdsale will have
  /* Each tier mimics the following struct:
  struct CrowdsaleTier {
    bytes32 _tier_name;                 // The name of the crowdsale tier
    uint _tier_token_sell_cap;          // The maximum number of tokens that will be sold during this tier
    uint _tier_purchase_price;          // The price of a token in wei for this tier
    uint _duration;                     // The amount of time this tier will be active for
    bool _tier_duration_is_modifiable;  // Whether the crowdsale admin is allowed to modify the duration of a tier before it goes live
    bool _tier_is_whitelist_enabled     // Whether this tier of the crowdsale requires users to be on a purchase whitelist
  }
  */
  bytes32 internal constant CROWDSALE_TIERS = keccak256("crowdsale_tier_list");

  // Storage location of the CROWDSALE_TIERS index of the current tier. Return value minus 1 is the actual index of the tier. 0 is an invalid return
  bytes32 internal constant CROWDSALE_CURRENT_TIER = keccak256("crowdsale_current_tier");

  // Storage location of the end time of the current tier. Purchase attempts beyond this time will update the current tier (if another is available)
  bytes32 internal constant CURRENT_TIER_ENDS_AT = keccak256("crowdsale_tier_ends_at");

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

  // Function selector for storage "read"
  // read(bytes32 _exec_id, bytes32 _location) view returns (bytes32 data_read);
  bytes4 internal constant RD_SING = bytes4(keccak256("read(bytes32,bytes32)"));

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
  Allows the admin of a crowdsale to update the whitelist status for several addresses simultaneously within a tier

  @param _tier_index: The index of the tier to update the whitelist for
  @param _to_update: An array of addresses for which whitelist status will be updated
  @param _minimum_contribution: The minimum contribution amount for the given address during the tier
  @param _max_spend_amt: The maximum amount of wei able to be spent for the address during this tier
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function whitelistMultiForTier(
    uint _tier_index,
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

    /// Read crowdsale admin address and tier whitelist array length from storage -

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(2));
    // Push admin address storage location to buffer
    ptr.cdPush(ADMIN);
    // Push tier whitelist array length storage location to buffer
    ptr.cdPush(keccak256(_tier_index, SALE_WHITELIST));
    // Read from storage
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 2);

    // If the first returned value is not equal to the sender's address, sender is not the crowdsale admin
    if (read_values[0] != bytes32(sender))
      bytes32("SenderIsNotAdmin").trigger();

    // Get tier whitelist length
    uint tier_whitelist_length = uint(read_values[1]);

    /// Sender is crowdsale admin - create storage return request and append whitelist updates

    // Overwrite previous buffer with storage buffer
    ptr.stOverwrite(0, 0);

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < _to_update.length; i++) {
      // Get storage location for address whitelist struct
      bytes32 whitelist_status_loc = keccak256(keccak256(_to_update[i]), keccak256(_tier_index, SALE_WHITELIST));
      ptr.stPush(whitelist_status_loc, bytes32(_minimum_contribution[i]));
      ptr.stPush(bytes32(32 + uint(whitelist_status_loc)), bytes32(_max_spend_amt[i]));

      // Push whitelisted address to end of tier whitelist array, unless the values being pushed are zero
      if (_minimum_contribution[i] != 0 && _max_spend_amt[i] != 0) {
        ptr.stPush(
          bytes32(32 + (32 * tier_whitelist_length) + uint(keccak256(_tier_index, SALE_WHITELIST))),
          bytes32(_to_update[i])
        );
        // Increment tier whitelist
        tier_whitelist_length++;
      }
    }

    // Store new tier whitelist length
    ptr.stPush(keccak256(_tier_index, SALE_WHITELIST), bytes32(tier_whitelist_length));
    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  struct TiersHelper {
    uint total_duration;
    uint num_tiers;
    uint base_list_storage;
  }

  /*
  Allows the admin to create new tiers for the crowdsale and append them to the end of the list of crowdsale tiers
  Each tier added will begin once the previous tier added ends

  @param _tier_names: An array of names for each tier
  @param _tier_durations: An array of durations each tier will last
  @param _tier_prices: Each tier's token purchase price, in wei
  @param _tier_caps: The maximum amount of tokens to be sold during each tier
  @param _tier_is_modifiable: Whether each tier's duration may be changed prior to its start time
  @param _tier_is_whitelisted: Whether each tier requires purchasers to be whitelisted
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function createCrowdsaleTiers(
    bytes32[] memory _tier_names,
    uint[] memory _tier_durations,
    uint[] memory _tier_prices,
    uint[] memory _tier_caps,
    bool[] memory _tier_is_modifiable,
    bool[] memory _tier_is_whitelisted,
    bytes memory _context)
    public view returns (bytes32[] memory store_data) {
    // Ensure valid input
    if (
      _tier_names.length != _tier_durations.length
      || _tier_names.length != _tier_prices.length
      || _tier_names.length != _tier_caps.length
      || _tier_names.length != _tier_is_modifiable.length
      || _tier_is_modifiable.length != _tier_is_whitelisted.length
      || _tier_names.length == 0
    ) bytes32("ArrayLenMismatch").trigger();

    // Get sender and exec id from context
    address sender;
    bytes32 exec_id;
    (exec_id, sender, ) = parse(_context);

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(4));
    // Push read locations to buffer: total duration, and tier list length
    ptr.cdPush(CROWDSALE_TOTAL_DURATION);
    ptr.cdPush(CROWDSALE_TIERS);
    // Push crowdsale initialization status and admin address storage locations to buffer
    ptr.cdPush(CROWDSALE_IS_INIT);
    ptr.cdPush(ADMIN);
    // Read from storage, and return data to buffer
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 4);

    // Get current number of tiers and total duration
    TiersHelper memory tiers = TiersHelper({
      total_duration: uint(read_values[0]),
      num_tiers: uint(read_values[1]),
      base_list_storage: 0
    });

    // Check that the sender is the crowdsale admin, and that the crowdsale is not initialized
    if (
      read_values[2] != 0
      || read_values[3] != bytes32(sender)
    ) bytes32("NotAdminOrSaleIsInit").trigger();

    // Create storage return buffer in free memory
    ptr = MemoryBuffers.stBuff(0, 0);

    // Push new tier list length to buffer
    ptr.stPush(CROWDSALE_TIERS, bytes32(tiers.num_tiers + _tier_names.length));

    // Place crowdsale tier storage base location in tiers struct
    tiers.base_list_storage = 32 + (192 * tiers.num_tiers) + uint(CROWDSALE_TIERS);
    // Loop over each new tier, and add to storage buffer. Keep track of the added duration
    for (uint i = 0; i < _tier_names.length; i++) {
      // Ensure valid input -
      if (
        _tier_caps[i] == 0
        || tiers.total_duration + _tier_durations[i] <= tiers.total_duration
        || _tier_prices[i] == 0
      ) bytes32("InvalidTierVals").trigger();

      // Increment total duration of the crowdsale
      tiers.total_duration += _tier_durations[i];
      // Push name, token sell cap, initial duration, and modifiability to storage buffer
      ptr.stPush(bytes32(tiers.base_list_storage), _tier_names[i]);
      ptr.stPush(bytes32(32 + tiers.base_list_storage), bytes32(_tier_caps[i]));
      ptr.stPush(bytes32(64 + tiers.base_list_storage), bytes32(_tier_prices[i]));
      ptr.stPush(bytes32(96 + tiers.base_list_storage), bytes32(_tier_durations[i]));
      ptr.stPush(bytes32(128 + tiers.base_list_storage), _tier_is_modifiable[i] ? bytes32(1) : bytes32(0));
      ptr.stPush(bytes32(160 + tiers.base_list_storage), _tier_is_whitelisted[i] ? bytes32(1) : bytes32(0));

      // Increment base storage location -
      tiers.base_list_storage += 192;
    }
    // Push new total crowdsale duration to storage buffer
    ptr.stPush(CROWDSALE_TOTAL_DURATION, bytes32(tiers.total_duration));

    // Get bytes32[] storage request array from buffer
    store_data = ptr.getBuffer();
  }

  struct TierUpdate {
    uint crowdsale_starts_at;
    uint total_duration;
    uint cur_tier_index;
    uint cur_tier_end_time;
    uint prev_duration;
  }

  /*
  Allows the admin of a crowdsale to update the duration of a tier, provided it has not already begun, and was marked as modifiable during the initialization process

  @param _tier_index: The index of the tier whose duration will be updated (indexes in the tier list are 1-indexed: 0 is an invalid index)
  @param _new_duration: The new duration for the tier
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return store_data: A formatted storage request - first 64 bytes designate a forwarding address (and amount) for any wei sent
  */
  function updateTierDuration(uint _tier_index, uint _new_duration, bytes memory _context) public view returns (bytes32[] memory store_data) {
    // Ensure valid input
    if (_new_duration == 0)
      bytes32("InvalidDuration").trigger();

    // Get sender address and exec id from context
    address sender;
    bytes32 exec_id;
    (exec_id, sender, ) = parse(_context);

    /// Set up read from storage - reading crowdsale status and tier info:

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Push exec id, data read offset, and read size to buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(9));
    // Push crowdsale status storage locations to buffer -
    ptr.cdPush(ADMIN);
    ptr.cdPush(CROWDSALE_IS_FINALIZED);
    ptr.cdPush(CROWDSALE_START_TIME);
    ptr.cdPush(CROWDSALE_TOTAL_DURATION);
    // Push current tier info storage locations to buffer -
    ptr.cdPush(CROWDSALE_TIERS);
    ptr.cdPush(CROWDSALE_CURRENT_TIER);
    ptr.cdPush(CURRENT_TIER_ENDS_AT);
    // Push storage locations of information of the tier to be updated (tier duration and tier modifiability status)
    ptr.cdPush(bytes32(128 + (192 * _tier_index) + uint(CROWDSALE_TIERS)));
    ptr.cdPush(bytes32(160 + (192 * _tier_index) + uint(CROWDSALE_TIERS)));
    // Read from storage, and store return to buffer
    bytes32[] memory read_values = ptr.readMulti();
    // Ensure correct return length
    assert(read_values.length == 9);

    // Get TierUpdate struct from returned data
    TierUpdate memory tier_update = TierUpdate({
      crowdsale_starts_at: uint(read_values[2]),
      total_duration: uint(read_values[3]),
      cur_tier_index: uint(read_values[5]),
      cur_tier_end_time: uint(read_values[6]),
      prev_duration: uint(read_values[7])
    });

    // Ensure an update is being performed
    if (tier_update.prev_duration == _new_duration)
      bytes32("DurationUnchanged").trigger();
    // Total crowdsale duration should always be minimum the previous duration for the tier to update
    if (tier_update.total_duration < tier_update.prev_duration)
      bytes32("TotalDurationInvalid").trigger();
    // Indices are off-by-one in storage - so the stored current tier index should never be 0
    if (tier_update.cur_tier_index == 0)
      bytes32("InvalidCrowdsaleSetup").trigger();

    // Normalize returned current tier index
    tier_update.cur_tier_index--;

    // Check returned values for valid crowdsale and tier status -
    if (
      read_values[0] != bytes32(sender)                   // Sender is not the crowdsale admin
      || read_values[1] != 0                              // Crowdsale is already finalized
      || uint(read_values[4]) <= _tier_index              // Passed-in tier index is out of range
      || tier_update.cur_tier_index > _tier_index         // Current crowdsale tier is already past requested index (trying to modify a previous tier)
      || (tier_update.cur_tier_index == _tier_index       // Trying to modify the current tier, when the current tier is not the first tier
         && _tier_index != 0)
      || read_values[8] == 0                              // Requested crowdsale tier was not set as 'modifiable'
    ) bytes32("InvalidCrowdsaleStatus").trigger();

    /// If the tier to update is tier 0, and the normalized current tier index is 0, tier can be updated iff crowdsale has not yet begun - check start time
    if (_tier_index == 0 && tier_update.cur_tier_index == 0) {
      if (getTime() >= tier_update.crowdsale_starts_at) // If the crowdsale has already begun, the first tier's duration cannot be updated
        bytes32("CannotModifyCurrentTier").trigger();

      /// Updating tier 0 - overwrite memory buffer to create storage return buffer
      ptr.stOverwrite(0, 0);
      // Push updated 'current tier ends at' value to buffer
      ptr.stPush(CURRENT_TIER_ENDS_AT, bytes32(_new_duration + tier_update.crowdsale_starts_at));

    /// If the tier to update is not the current tier, but it is beyond the end time of the current tier, current tier may need updating -
    } else if (_tier_index > tier_update.cur_tier_index && getTime() >= tier_update.cur_tier_end_time) {
      // If it is past the current stored tier's end time, and the tier to update is the tier directly after the current stored tier,
      // then the tier to update has already started and cannot be updated
      if (_tier_index - tier_update.cur_tier_index == 1)
        bytes32("CannotModifyCurrentTier").trigger();

      /// Loop through tiers between 'current tier' and _tier_index, and add their durations to a new 'readMulti' buffer - to get the requested tier to update's start time

      // Get new 'readMulti' calldata buffer - do not overwrite previous buffer
      ptr = MemoryBuffers.cdBuff(RD_MULTI);
      // Push exec id, data read offset, and read size to buffer
      ptr.cdPush(exec_id);
      ptr.cdPush(0x40);
      ptr.cdPush(bytes32(_tier_index - tier_update.cur_tier_index));

      // Loop through the difference in the returned 'current' index and the requested update index, and push the location of each in-between tier's duration to the buffer
      for (uint i = tier_update.cur_tier_index; i < _tier_index; i++)
        ptr.cdPush(bytes32(128 + (192 * i) + uint(CROWDSALE_TIERS)));

      // Read from storage, and store return to buffer
      uint[] memory read_durations = ptr.readMulti().toUintArr();
      assert(read_durations.length == _tier_index - tier_update.cur_tier_index); // Ensure valid returned array size

      // Loop through returned durations, and add each to 'cur tier end time'
      for (i = 0; i < read_durations.length; i++)
        tier_update.cur_tier_end_time += read_durations[i];

      // If 'now' is not beyond 'cur_tier_end_time', sender is attempting to modify a tier which is in progress or has already passed
      if (getTime() <= tier_update.cur_tier_end_time)
        bytes32("CannotModifyCurrentTier").trigger();

      /// Requested tier to update is valid - overwrite previous buffer to create storage return buffer
      ptr.stOverwrite(0, 0);

    /// If the tier to be updated is not the current tier, but the current tier is still in progress, update the requested tier -
    } else if (_tier_index > tier_update.cur_tier_index && getTime() < tier_update.cur_tier_end_time) {
      // Overwrite previous buffer with storage buffer
      ptr.stOverwrite(0, 0);
    } else {
      // Not a valid state to update - throw
      bytes32("InvalidState").trigger();
    }

    // Get new overall crowdsale duration -
    if (tier_update.prev_duration > _new_duration) // Subtracting from total_duration
      tier_update.total_duration -= (tier_update.prev_duration - _new_duration);
    else // Adding to total_duration
      tier_update.total_duration += (_new_duration - tier_update.prev_duration);

    // Push new tier duration to crowdsale tier list in storage buffer
    ptr.stPush(bytes32(128 + (192 * _tier_index) + uint(CROWDSALE_TIERS)), bytes32(_new_duration));
    // Push updated overall crowdsale duration to buffer
    ptr.stPush(CROWDSALE_TOTAL_DURATION, bytes32(tier_update.total_duration));
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
    ptr.cdPush(CROWDSALE_START_TIME);
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
