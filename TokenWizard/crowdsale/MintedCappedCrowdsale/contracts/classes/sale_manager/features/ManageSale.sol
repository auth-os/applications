pragma solidity ^0.4.23;

import "../SaleManager.sol";
import "../../../auth-os/Contract.sol";

library ManageSale {

  using Contract for *;

  // event CrowdsaleInitialized(bytes32 indexed exec_id, bytes32 indexed token_name, uint start_time);
  bytes32 internal constant CROWDSALE_INITIALIZED = keccak256("CrowdsaleInitialized(bytes32,bytes32,uint256)");
  // event CrowdsaleFinalized(bytes32 indexed exec_id);
  bytes32 internal constant CROWDSALE_FINALIZED = keccak256("CrowdsaleFinalized(bytes32)");

  // Returns the topics for a crowdsale initialization event
  function INITIALIZE(bytes32 exec_id, bytes32 name) private pure returns (bytes32[3] memory) {
    return [CROWDSALE_INITIALIZED, exec_id, name];
  }

  // Returns the topics for a crowdsale finalization event
  function FINALIZE(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [CROWDSALE_FINALIZED, exec_id];
  }

  // Checks input and then creates storage buffer for sale initialization
  function initializeCrowdsale() internal view {
    uint start_time = uint(Contract.read(SaleManager.start_time()));
    bytes32 token_name = Contract.read(SaleManager.name());

    if (start_time < now)
      revert('crowdsale already started');

    if (token_name == 0)
      revert('token not init');

    Contract.storing();

    // Store updated crowdsale initialization status
    Contract.set(SaleManager.is_init()).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_INITIALIZED signature and topics
    Contract.log(
      INITIALIZE(Contract.execID(), token_name), bytes32(start_time)
    );
  }

  // Checks input and then creates storage buffer for sale finalization
  function finalizeCrowdsale() internal view {
    if (Contract.read(SaleManager.is_init()) == 0)
      revert('crowdsale has not been initialized');

    Contract.storing();

    // Store updated crowdsale finalization status
    Contract.set(SaleManager.is_final()).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_FINALIZED signature and topics
    Contract.log(
      FINALIZE(Contract.execID()), bytes32(0)
    );
  }
}
