pragma solidity ^0.4.23;

import "../SaleManager.sol";
import "../../../auth-os/Contract.sol";

library ManageSale {

  using Contract for *;

  // event CrowdsaleConfigured(bytes32 indexed exec_id, bytes32 indexed token_name, uint start_time);
  bytes32 internal constant CROWDSALE_CONFIGURED = keccak256("CrowdsaleConfigured(bytes32,bytes32,uint256)");

  // event CrowdsaleFinalized(bytes32 indexed exec_id);
  bytes32 internal constant CROWDSALE_FINALIZED = keccak256("CrowdsaleFinalized(bytes32)");

  // Returns the topics for a crowdsale configuration event
  function CONFIGURE(bytes32 _exec_id, bytes32 _name) private pure returns (bytes32[3] memory)
    { return [CROWDSALE_CONFIGURED, _exec_id, _name]; }

  // Returns the topics for a crowdsale finalization event
  function FINALIZE(bytes32 _exec_id) private pure returns (bytes32[2] memory)
    { return [CROWDSALE_FINALIZED, _exec_id]; }

  // Checks input and then creates storage buffer for sale initialization
  function initializeCrowdsale() internal view {
    uint start_time = uint(Contract.read(SaleManager.startTime()));
    bytes32 token_name = Contract.read(SaleManager.tokenName());

    // Ensure the sale has already started, and the token has been initialized
    if (start_time < now)
      revert('crowdsale already started');
    if (token_name == 0)
      revert('token not init');

    Contract.storing();

    // Store updated crowdsale configuration status
    Contract.set(SaleManager.isConfigured()).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_INITIALIZED signature and topics
    Contract.log(CONFIGURE(Contract.execID(), token_name), bytes32(start_time));
  }

  // Checks input and then creates storage buffer for sale finalization
  function finalizeCrowdsale() internal view {
    // Ensure sale has been configured -
    if (Contract.read(SaleManager.isConfigured()) == 0)
      revert('crowdsale has not been configured');

    Contract.storing();

    // Store updated crowdsale finalization status
    Contract.set(SaleManager.isFinished()).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_FINALIZED signature and topics
    Contract.log(FINALIZE(Contract.execID()), bytes32(0));
  }
}
