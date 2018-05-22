pragma solidity ^0.4.23;

import "../auth_os/lib/LibStorage.sol";
import "../auth_os/lib/Pointers.sol";

library TokenFunctionsMock {

  using LibStorage for uint;
  using Pointers for *;

  /// CROWDSALE STORAGE ///

  // Whether or not the crowdsale is post-purchase
  bytes32 internal constant CROWDSALE_IS_FINALIZED = keccak256("crowdsale_is_finalized");

  /// TOKEN STORAGE ///

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  // MOCK FUNCTION - sets the transfer agent status of the passed in address
  function setTransferAgentStatus(address _agent, bool _is_transfer_agent) public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();
    ptr.store(_is_transfer_agent).at(
      keccak256(keccak256(_agent), TOKEN_TRANSFER_AGENTS)
    );

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  // MOCK FUNCTION - unlocks the token for transfer
  function unlockToken() public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();
    ptr.store(true).at(CROWDSALE_IS_FINALIZED);

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }

  // MOCK FUNCTION - sets the target's token balance
  function setBalance(address _target, uint _amt) public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();

    // Set up STORES action requests -
    ptr.stores();
    ptr.store(_amt).at(keccak256(keccak256(_target), TOKEN_BALANCES));

    // Return formatted action requests to storage
    return ptr.getBuffer();
  }
}
