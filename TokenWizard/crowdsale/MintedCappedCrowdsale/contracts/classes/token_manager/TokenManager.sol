pragma solidity ^0.4.23;

import "./features/ManageTokens.sol";
import "authos-solidity/contracts/core/Contract.sol";

library TokenManager {

  using Contract for *;

  /// SALE ///

  // Storage location of crowdsale admin address
  function admin() internal pure returns (bytes32)
    { return keccak256('sale_admin'); }

  // Whether the crowdsale and token are configured, and the sale is ready to run
  function isConfigured() internal pure returns (bytes32)
    { return keccak256("sale_is_configured"); }

  // Whether or not the crowdsale is post-purchase
  function isFinished() internal pure returns (bytes32)
    { return keccak256("sale_is_completed"); }

  // Storage location of the amount of tokens sold in the crowdsale so far. Does not include reserved tokens
  function tokensSold() internal pure returns (bytes32)
    { return keccak256("sale_tokens_sold"); }

  /// TOKEN ///

  // Storage location for token name
  function tokenName() internal pure returns (bytes32)
    { return keccak256("token_name"); }

  // Storage location for token ticker symbol
  function tokenSymbol() internal pure returns (bytes32)
    { return keccak256("token_symbol"); }

  // Storage location for token decimals
  function tokenDecimals() internal pure returns (bytes32)
    { return keccak256("token_decimals"); }

  // Storage location for token totalSupply
  function tokenTotalSupply() internal pure returns (bytes32)
    { return keccak256("token_total_supply"); }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address _owner) internal pure returns (bytes32)
    { return keccak256(_owner, TOKEN_BALANCES); }

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  function transferAgents(address _agent) internal pure returns (bytes32)
    { return keccak256(_agent, TOKEN_TRANSFER_AGENTS); }

  // Whether or not the token is unlocked for transfers
  function tokensUnlocked() internal pure returns (bytes32)
    { return keccak256('sale_tokens_unlocked'); }

  /// RESERVED TOKENS ///

  // Stores the number of addresses for which tokens are reserved
  function reservedDestinations() internal pure returns (bytes32)
    { return keccak256("reserved_token_dest_list"); }

  // Stores the index of an address in the reservedDestinations list (1-indexed)
  function destIndex(address _destination) internal pure returns (bytes32)
    { return keccak256(_destination, "index", reservedDestinations()); }

  // Stores the number of tokens reserved for a destination
  function destTokens(address _destination) internal pure returns (bytes32)
    { return keccak256(_destination, "numtokens", reservedDestinations()); }

  // Stores the number of percent of tokens sold reserved for a destination
  function destPercent(address _destination) internal pure returns (bytes32)
    { return keccak256(_destination, "numpercent", reservedDestinations()); }

  // Stores the number of decimals in the previous percentage (2 are added by default)
  function destPrecision(address _destination) internal pure returns (bytes32)
    { return keccak256(_destination, "precision", reservedDestinations()); }

  /// CHECKS ///

  // Ensures the sale is finalized
  function saleFinalized() internal view {
    if (Contract.read(isFinished()) == 0)
      revert('sale must be finalized');
  }

  // Ensures that the sender is the admin address
  function onlyAdmin() internal view {
    if (address(Contract.read(admin())) != Contract.sender())
      revert('sender is not admin');
  }

  // Ensures that the sender is the admin address, and the sale is not initialized
  function onlyAdminAndNotInit() internal view {
    if (address(Contract.read(admin())) != Contract.sender())
      revert('sender is not admin');

    if (Contract.read(isConfigured()) != 0)
      revert('sale has already been initialized');
  }

  // Ensures both storage and events have been pushed to the buffer
  function emitAndStore() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  // Ensures the pending state change will only store
  function onlyStores() internal pure {
    if (Contract.paid() != 0 || Contract.emitted() != 0)
      revert('expected only storage');

    if (Contract.stored() == 0)
      revert('expected storage');
  }

  // Ensures the sender is the admin, the sale is initialized, and the sale is not finalized
  function senderAdminAndSaleNotFinal() internal view {
    if (Contract.sender() != address(Contract.read(admin())))
      revert('sender is not admin');

    if (Contract.read(isConfigured()) == 0 || Contract.read(isFinished()) != 0)
      revert('invalid sale state');
  }

  /// FUNCTIONS ///

  /*
  Initializes the token to be sold during the crowdsale -
  @param _name: The name of the token to be sold
  @param _symbol: The symbol of the token to be sold
  @param _decimals: The number of decimals the token will have
  */
  function initCrowdsaleToken(bytes32 _name, bytes32 _symbol, uint _decimals) external view {
    // Begin execution - reads execution id and original sender address from storage
    // and authorizes the sender as script exec
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and the sale is not initialized -
    Contract.checks(onlyAdminAndNotInit);
    // Execute token initialization function -
    ManageTokens.initCrowdsaleToken(_name, _symbol, _decimals);
    // Ensures state change will only affect storage and events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Sets the status of an account as a transfer agent. Transfer agents are allowed to transfer tokens at any time
  @param _agent: The address whose status will be updated
  @param _is_agent: Whether or not the agent is a transfer agent
  */
  function setTransferAgentStatus(address _agent, bool _is_agent) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin -
    Contract.checks(onlyAdmin);
    // Execute function -
    ManageTokens.setTransferAgentStatus(_agent, _is_agent);
    // Ensures state change will only affect storage and log events -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Updates multiple reserved token listings
  @param _destinations: The addresses for which listings will be updated
  @param _num_tokens: The number of tokens each destination will have reserved
  @param _num_percents: The decimal number of percents of total tokens sold each destination will be reserved
  @param _percent_decimals: The number of decimals in each of the percent figures
  */
  function updateMultipleReservedTokens(
    address[] _destinations,
    uint[] _num_tokens,
    uint[] _num_percents,
    uint[] _percent_decimals
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and the sale is not initialized -
    Contract.checks(onlyAdminAndNotInit);
    // Execute function -
    ManageTokens.updateMultipleReservedTokens(_destinations, _num_tokens, _num_percents, _percent_decimals);
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Removes a reserved token listing
  @param _destination: The addresses for which listings will be removed
  */
  function removeReservedTokens(address _destination) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the sale admin and the sale is not initialized -
    Contract.checks(onlyAdminAndNotInit);
    // Execute function -
    ManageTokens.removeReservedTokens(_destination);
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }

  /*
  Allows anyone to distribute reserved tokens, assuming the sale is finalized
  @param _num_destinations: The number of reserved destinations to distribute for
  */
  function distributeReservedTokens(uint _num_destinations) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Checks that the sale is finalized -
    Contract.checks(saleFinalized);
    // Execute approval function -
    ManageTokens.distributeReservedTokens(_num_destinations);
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }

  // Allows the admin to finalize the crowdsale, distribute reserved tokens, and unlock the token for transfer
  function finalizeCrowdsaleAndToken() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check that the sender is the admin, the sale is initialized, and the sale is not finalized -
    Contract.checks(senderAdminAndSaleNotFinal);
    // Execute approval function -
    ManageTokens.finalizeCrowdsaleAndToken();
    // Ensures state change will only affect storage -
    Contract.checks(emitAndStore);
    // Commit state changes to storage -
    Contract.commit();
  }

  // Allows anyone to unlock token transfers and distribute reserved tokens, as long as the sale is finalized
  function finalizeAndDistributeToken() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Ensure the sale is finalized
    Contract.checks(saleFinalized);
    // Execute approval function -
    ManageTokens.finalizeAndDistributeToken();
    // Ensures state change will only affect storage -
    Contract.checks(onlyStores);
    // Commit state changes to storage -
    Contract.commit();
  }
}
