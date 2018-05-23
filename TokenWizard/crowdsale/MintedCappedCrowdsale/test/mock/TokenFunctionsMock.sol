pragma solidity ^0.4.23;

import "../auth_os/lib/LibStorage.sol";
import "../auth_os/lib/Pointers.sol";

library TokenFunctionsMock {

  using LibStorage for uint;
  using Pointers for *;
  /// CROWDSALE STORAGE ///

  // Storage location for token totalSupply
  bytes32 internal constant TOKEN_TOTAL_SUPPLY = keccak256("token_total_supply");

  // Storage location of the amount of tokens sold in the crowdsale so far. Does not include reserved tokens
  bytes32 internal constant CROWDSALE_TOKENS_SOLD = keccak256("crowdsale_tokens_sold");

  /// TOKEN STORAGE ///

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  // Whether or not the token is unlocked for transfers
  bytes32 internal constant TOKENS_ARE_UNLOCKED = keccak256("tokens_are_unlocked");

  // MOCK FUNCTION - sets the total number of tokens sold in the crowdsale
  function setTotalSold(uint _amt) public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();
    // Set up STORES action requests -
    ptr.stores();
    ptr.store(_amt).at(TOKEN_TOTAL_SUPPLY);
    ptr.store(_amt).at(CROWDSALE_TOKENS_SOLD);

    return ptr.getBuffer();
  }

  // MOCK FUNCTION - sets the transfer agent status of the passed in address
  function setTransferAgentStatus(address _agent, bool _is_transfer_agent) public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();
    // Set up STORES action requests -
    ptr.stores();
    ptr.store(_is_transfer_agent).at(keccak256(keccak256(_agent), TOKEN_TRANSFER_AGENTS));

    return ptr.getBuffer();
  }

  // MOCK FUNCTION - unlocks the token for transfer
  function unlockToken() public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();
    // Set up STORES action requests -
    ptr.stores();
    ptr.store(true).at(TOKENS_ARE_UNLOCKED);

    return ptr.getBuffer();
  }

  // MOCK FUNCTION - sets the target's token balance
  function setBalance(address _target, uint _amt) public pure returns (bytes memory) {
    // Get pointer to free memory
    uint ptr = ptr.clear();
    // Set up STORES action requests -
    ptr.stores();
    ptr.store(_amt).at(keccak256(keccak256(_target), TOKEN_BALANCES));

    return ptr.getBuffer();
  }
}
