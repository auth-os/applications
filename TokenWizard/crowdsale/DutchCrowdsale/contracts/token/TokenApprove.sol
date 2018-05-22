pragma solidity ^0.4.23;

import "../lib/MemoryBuffers.sol";
import "../lib/ArrayUtils.sol";
import "../lib/LibStorage.sol";
import "../lib/LibEvents.sol";
import "../lib/SafeMath.sol";
import "../lib/Pointers.sol";

library TokenApprove {

  using MemoryBuffers for uint;
  using ArrayUtils for bytes32[];
  using Exceptions for bytes32;
  using LibStorage for uint;
  using LibEvents for uint;
  using SafeMath for uint;
  using Pointers for *;

  /// TOKEN STORAGE ///

  // Storage seed for user allowances mapping
  bytes32 internal constant TOKEN_ALLOWANCES = keccak256("token_allowances");

  /// EVENTS ///

  // event Approval(address indexed owner, address indexed spender, uint tokens)
  bytes32 internal constant APPROVAL = keccak256('Approval(address,address,uint256)');

  /// FUNCTION SELECTORS ///

  // Function selector for storage "read"
  // read(bytes32 _exec_id, bytes32 _location) view returns (bytes32 data_read);
  bytes4 internal constant RD_SING = bytes4(keccak256("read(bytes32,bytes32)"));

  /*
  Approves another address to spend tokens on the sender's behalf

  @param _spender: The address for which the amount will be approved
  @param _amt: The amount of tokens to approve for spending
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function approve(address _spender, uint _amt, bytes memory _context) public pure
  returns (bytes memory) {

    address sender;
    bytes32 exec_id;
    // Parse context array and get sender address and execution id
    (exec_id, sender, ) = parse(_context);

    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Get spender allowance storage location
    bytes32 spender_allowance =
      keccak256(keccak256(_spender), keccak256(keccak256(sender), TOKEN_ALLOWANCES));
    // Store new spender allowance
    ptr.store(_amt).at(spender_allowance);

    // Set up EMITS action requests -
    ptr.emits();

    // Add APPROVAL event topics and data
    ptr.topics(
      [APPROVAL, bytes32(sender), bytes32(_spender)]
    ).data(_amt);

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Increases the spending approval amount set by the sender for the _spender

  @param _spender: The address for which the allowance will be increased
  @param _amt: The amount to increase the allowance by
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function increaseApproval(address _spender, uint _amt, bytes memory _context) public view
  returns (bytes memory) {

    address sender;
    bytes32 exec_id;
    // Parse context array and get sender address and execution id
    (exec_id, sender, ) = parse(_context);

    // Create 'read' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_SING);
    // Push exec id and spender allowance location to buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(keccak256(keccak256(_spender), keccak256(keccak256(sender), TOKEN_ALLOWANCES)));

    // Read spender allowance from storage
    uint spender_allowance = uint(ptr.readSingle());

    // Get pointer to free memory
    ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Get spender allowance storage location
    bytes32 allowance_location =
      keccak256(keccak256(_spender), keccak256(keccak256(sender), TOKEN_ALLOWANCES));
    // Store new spender allowance
    ptr.store(spender_allowance.add(_amt)).at(allowance_location);

    // Set up EMITS action requests -
    ptr.emits();

    // Add APPROVAL event topics and data
    ptr.topics(
      [APPROVAL, bytes32(sender), bytes32(_spender)]
    ).data(spender_allowance.add(_amt));

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  /*
  Decreases the spending approval amount set by the sender for the _spender

  @param _spender: The address for which the allowance will be increased
  @param _amt: The amount to decrease the allowance by
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function decreaseApproval(address _spender, uint _amt, bytes memory _context) public view
  returns (bytes memory) {

    address sender;
    bytes32 exec_id;
    // Parse context array and get sender address and execution id
    (exec_id, sender, ) = parse(_context);

    // Create 'read' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_SING);
    // Push exec id and spender allowance location to buffer
    ptr.cdPush(exec_id);
    ptr.cdPush(keccak256(keccak256(_spender), keccak256(keccak256(sender), TOKEN_ALLOWANCES)));

    // Read spender allowance from storage
    uint spender_allowance = uint(ptr.readSingle());
    // Safely decrease the spender's balance -
    spender_allowance = (_amt > spender_allowance ? 0 : spender_allowance - _amt);

    // Get pointer to free memory
    ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Get spender allowance storage location
    bytes32 allowance_location =
      keccak256(keccak256(_spender), keccak256(keccak256(sender), TOKEN_ALLOWANCES));
    // Store new spender allowance
    ptr.store(spender_allowance).at(allowance_location);

    // Set up EMITS action requests -
    ptr.emits();

    // Add APPROVAL event topics and data
    ptr.topics(
      [APPROVAL, bytes32(sender), bytes32(_spender)]
    ).data(spender_allowance);

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
