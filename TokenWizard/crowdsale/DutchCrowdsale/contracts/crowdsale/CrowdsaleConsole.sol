pragma solidity ^0.4.23;

import "../lib/MemoryBuffers.sol";
import "../lib/ArrayUtils.sol";
import "../lib/LibStorage.sol";
import "../lib/LibEvents.sol";
import "../lib/Pointers.sol";

library CrowdsaleConsole {

  using MemoryBuffers for uint;
  using ArrayUtils for bytes32[];
  using Exceptions for bytes32;
  using LibStorage for uint;
  using LibEvents for uint;
  using Pointers for *;

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

  /// EVENTS ///

  // event CrowdsaleTokenInit(bytes32 indexed exec_id, bytes32 indexed name, bytes32 indexed symbol, uint decimals)
  bytes32 internal constant CROWDSALE_TOKEN_INIT = keccak256("CrowdsaleTokenInit(bytes32,bytes32,bytes32,uint256)");

  // event GlobalMinUpdate(bytes32 indexed exec_id, uint current_token_purchase_min)
  bytes32 internal constant GLOBAL_MIN_UPDATE = keccak256("GlobalMinUpdate(bytes32,uint256)");

  // event CrowdsaleTimeUpdated(bytes32 indexed exec_id)
  bytes32 internal constant CROWDSALE_TIME_UPDATED = keccak256("CrowdsaleTimeUpdated(bytes32)");

  // event CrowdsaleInitialized(bytes32 indexed exec_id, bytes32 indexed token_name, uint start_time);
  bytes32 internal constant CROWDSALE_INITIALIZED = keccak256("CrowdsaleInitialized(bytes32,bytes32,uint256)");

  // event CrowdsaleFinalized(bytes32 indexed exec_id);
  bytes32 internal constant CROWDSALE_FINALIZED = keccak256("CrowdsaleFinalized(bytes32)");

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
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function initCrowdsaleToken(bytes32 _name, bytes32 _symbol, uint _decimals, bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes memory) {
    // Ensure valid input
    if (
      _name == 0
      || _symbol == 0
      || _decimals > 18
    ) bytes32("ImproperInitialization").trigger();

    bytes32 exec_id;
    (exec_id, , ) = parse(_context);

    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Store token name, symbol, and decimals
    ptr.store(_name).at(TOKEN_NAME);
    ptr.store(_symbol).at(TOKEN_SYMBOL);
    ptr.store(_decimals).at(TOKEN_DECIMALS);

    // Set up EMITS action requests -
    ptr.emits();

    // Add CROWDSALE_TOKEN_INIT signature and topics
    ptr.topics(
      [CROWDSALE_TOKEN_INIT, exec_id, _name, _symbol]
    );
    ptr.data(_decimals);

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to update the global minimum contribution amount in tokens for a crowdsale prior to its start

  @param _new_min_contribution: The new minimum amount of tokens that must be bought for the crowdsale
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function updateGlobalMinContribution(uint _new_min_contribution, bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes memory) {
    bytes32 exec_id;
    (exec_id, , ) = parse(_context);

    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Store new crowdsale minimum token purchase amount
    ptr.store(_new_min_contribution).at(CROWDSALE_MINIMUM_CONTRIBUTION);

    // Set up EMITS action requests -
    ptr.emits();

    // Add GLOBAL_MIN_UPDATE signature and topics
    ptr.topics(
      [GLOBAL_MIN_UPDATE, exec_id]
    ).data(_new_min_contribution);

    // Return formatted action requests to storage
    return ptr.getBuffer();
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
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function whitelistMulti(
    address[] memory _to_update,
    uint[] memory _minimum_contribution,
    uint[] memory _max_spend_amt,
    bytes memory _context
  ) public view returns (bytes memory) {
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

    // Get pointer to free memory
    ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < _to_update.length; i++) {
      // Get storage location for address whitelist struct
      bytes32 whitelist_status_loc = keccak256(keccak256(_to_update[i]), SALE_WHITELIST);
      ptr.store(_minimum_contribution[i]).at(whitelist_status_loc);
      ptr.store(_max_spend_amt[i]).at(bytes32(32 + uint(whitelist_status_loc)));

      // Push whitelisted address to end of whitelist array, unless the values being pushed are zero
      if (_minimum_contribution[i] != 0 || _max_spend_amt[i] != 0) {
        ptr.store(_to_update[i]).at(
          bytes32(32 + (32 * whitelist_length) + uint(SALE_WHITELIST))
        );
        // Increment whitelist length
        whitelist_length++;
      }
    }
    // Store new tier whitelist length
    ptr.store(whitelist_length).at(SALE_WHITELIST);

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to revise crowdsale start time duration, provided the crowdsale is not already initialized

  @param _start_time: The new start time of the crowdsale
  @param _duration: The new amount of time the crowdsale is open
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function setCrowdsaleStartAndDuration(uint _start_time, uint _duration, bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes memory) {
    // Ensure valid input
    if (_start_time <= now && _duration == 0)
      bytes32("InvalidStartTimeAndDuration").trigger();

    bytes32 exec_id;
    (exec_id, , ) = parse(_context);

    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Push crowdsale start time and duration storage locations and new values to buffer
    // If either value is zero, do not update that value
    if (_start_time > now)
      ptr.store(_start_time).at(CROWDSALE_STARTS_AT);
    if (_duration != 0)
      ptr.store(_duration).at(CROWDSALE_DURATION);

    // Set up EMITS action requests -
    ptr.emits();

    // Add CROWDSALE_TIME_UPDATED signature and topics
    ptr.topics(
      [CROWDSALE_TIME_UPDATED, exec_id]
    ).data();

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Allows the admin of a crowdsale to finalize the initialization process for this crowdsale, locking its details

  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function initializeCrowdsale(bytes memory _context) public onlyAdminAndNotInit(_context) view
  returns (bytes memory) {
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
      read_values[0] < bytes32(now)            // Crowdsale already started
      || read_values[1] == 0                   // Token not initialized
    ) bytes32("CrowdsaleStartedOrTokenNotInit").trigger();

    // Get pointer to free memory
    ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();
    // Store updated crowdsale initialization status
    ptr.store(true).at(CROWDSALE_IS_INIT);

    // Set up EMITS action requests -
    ptr.emits();

    // Add CROWDSALE_INITIALIZED signature and topics
    ptr.topics(
      [CROWDSALE_INITIALIZED, exec_id, read_values[1]]
    ).data(read_values[0]);

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Allows the crowdsale admin to finalize a crowdsale, provided it is fully initialized, and not already finalized

  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function finalizeCrowdsale(bytes memory _context) public view returns (bytes memory) {
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

    // Get pointer to free memory
    ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();
    // Store updated crowdsale initialization status
    ptr.store(true).at(CROWDSALE_IS_FINALIZED);

    // Set up EMITS action requests -
    ptr.emits();

    // Add CROWDSALE_INITIALIZED signature and topics
    ptr.topics(
      [CROWDSALE_FINALIZED, exec_id]
    ).data();

    // Return formatted action requests to storage
    return ptr.getBuffer();
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
