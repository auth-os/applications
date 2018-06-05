// initializeCrowdsale and finalizeCrowdsale

pragma solidity ^0.4.23;

import "../MockAdmin.sol";
import "../../../MockMintedCapped.sol";
import "../../../Contract.sol";

library MockManageSale {

  using Contract for *;

  // Event
  // event CrowdsaleInitialized(bytes32 indexed exec_id, bytes32 indexed token_name, uint start_time);
  bytes32 internal constant CROWDSALE_INITIALIZED = keccak256("CrowdsaleInitialized(bytes32,bytes32,uint256)");

  // event CrowdsaleFinalized(bytes32 indexed exec_id);
  bytes32 internal constant CROWDSALE_FINALIZED = keccak256("CrowdsaleFinalized(bytes32)");

  function INITIALIZE(bytes32 exec_id, bytes32 name) private pure returns (bytes32[3] memory) {
    return [CROWDSALE_INITIALIZED, exec_id, name];
  }

  function FINALIZE(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [CROWDSALE_FINALIZED, exec_id];
  }

  function first() internal view {
    if (address(Contract.read(MockAdmin.admin())) != Contract.sender())
      revert('sender is not admin');
  }

  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('Invalid state change');
  } 


  function initializeCrowdsale() internal view { 

    uint start_time = uint(Contract.read(MockAdmin.start_time()));
    bytes32 token_name = Contract.read(MockAdmin.name());

    if (start_time < now) 
      revert('crowdsale already started');

    if (token_name == bytes32(0))
      revert('token not init');

    Contract.storing();

    // Store updated crowdsale initialization status
    Contract.set(
      MockAdmin.is_init()
    ).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_INITIALIZED signature and topics
    Contract.log(
      INITIALIZE(Contract.execID(), token_name), bytes32(start_time)
    );

  }

  function finalizeCrowdsale() internal view { 

    if (Contract.read(MockAdmin.is_init()) == bytes32(0))
      revert('crowdsale has not been initialized');

    if (Contract.read(MockAdmin.is_final()) == bytes32(1))
      revert('crowdsale already finalized');

    Contract.storing();

    // Store updated crowdsale finalization status
    Contract.set(
      MockAdmin.is_final()
    ).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_FINALIZED signature and topics
    Contract.log(
      FINALIZE(Contract.execID()), bytes32(0)
    );

  } 

} 

