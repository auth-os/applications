pragma solidity ^0.4.23;

import "../lib/MemoryBuffers.sol";
import "../lib/ArrayUtils.sol";
import "../lib/LibStorage.sol";
import "../lib/LibEvents.sol";
import "../lib/SafeMath.sol";
import "../lib/Pointers.sol";

library TokenTransferFrom {

  using MemoryBuffers for uint;
  using ArrayUtils for bytes32[];
  using Exceptions for bytes32;
  using LibStorage for uint;
  using LibEvents for uint;
  using SafeMath for uint;
  using Pointers for *;

  /// CROWDSALE STORAGE ///

  // Whether or not the crowdsale is post-purchase
  bytes32 internal constant CROWDSALE_IS_FINALIZED = keccak256("crowdsale_is_finalized");

  /// TOKEN STORAGE ///

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  // Storage seed for user allowances mapping
  bytes32 internal constant TOKEN_ALLOWANCES = keccak256("token_allowances");

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  /// EVENTS ///

  // event Transfer(address indexed from, address indexed to, uint tokens)
  bytes32 internal constant TRANSFER = keccak256('Transfer(address,address,uint256)');

  /// FUNCTION SELECTORS ///

  // Function selector for storage 'readMulti'
  // readMulti(bytes32 exec_id, bytes32[] locations)
  bytes4 internal constant RD_MULTI = bytes4(keccak256("readMulti(bytes32,bytes32[])"));

  /*
  Transfers tokens from an owner's balance to a recipient, provided the sender has suffcient allowance

  @param _from: The address from which tokens will be sent
  @param _to: The destination address, to which tokens will be sent
  @param _amt: The amount of tokens to send
  @param _context: The execution context for this application - a 96-byte array containing (in order):
    1. Application execution id
    2. Original script sender (address, padded to 32 bytes)
    3. Wei amount sent with transaction to storage
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function transferFrom(address _from, address _to, uint _amt, bytes memory _context) public view
  returns (bytes memory) {
    // Ensure valid inputs
    if (_to == address(0) || _from == address(0))
      bytes32("InvalidSenderOrRecipient").trigger();

    address sender;
    bytes32 exec_id;
    // Parse context array and get sender address and execution id
    (exec_id, sender, ) = parse(_context);

    // Create 'readMulti' calldata buffer in memory
    uint ptr = MemoryBuffers.cdBuff(RD_MULTI);
    // Place exec id, data read offset, and read size to calldata
    ptr.cdPush(exec_id);
    ptr.cdPush(0x40);
    ptr.cdPush(bytes32(5));
    // Place owner and recipient balance locations, and sender allowance location in calldata buffer
    ptr.cdPush(keccak256(keccak256(_from), TOKEN_BALANCES));
    ptr.cdPush(keccak256(keccak256(_to), TOKEN_BALANCES));
    ptr.cdPush(keccak256(keccak256(sender), keccak256(keccak256(_from), TOKEN_ALLOWANCES)));
    // Place crowdsale finalization status and owner transfer agent status storage locations in calldata buffer
    ptr.cdPush(CROWDSALE_IS_FINALIZED);
    ptr.cdPush(keccak256(keccak256(_from), TOKEN_TRANSFER_AGENTS));
    // Read from storage
    uint[] memory read_values = ptr.readMulti().toUintArr();
    // Ensure length of returned data is correct
    assert(read_values.length == 5);

    // If the crowdsale is not finalized, and the token owner is not a transfer agent, throw exception
    if (read_values[3] == 0 && read_values[4] == 0)
      bytes32("TransfersLocked").trigger();

    // Read returned balances and allowance -
    uint owner_bal = read_values[0];
    uint recipient_bal = read_values[1];
    uint sender_allowance = read_values[2];

    // Get pointer to free memory
    ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();

    // Store new balances
    ptr.store(owner_bal.sub(_amt)).at(keccak256(keccak256(_from), TOKEN_BALANCES));
    ptr.store(recipient_bal.add(_amt)).at(keccak256(keccak256(_to), TOKEN_BALANCES));

    // Store new allowance
    ptr.store(sender_allowance.sub(_amt)).at(
      keccak256(keccak256(sender), keccak256(keccak256(_from), TOKEN_ALLOWANCES))
    );

    // Set up EMITS action requests -
    ptr.emits();

    // Add TRANSFER signature and topics
    ptr.topics(
      [TRANSFER, bytes32(_from), bytes32(_to)]
    );
    ptr.data(_amt);

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
