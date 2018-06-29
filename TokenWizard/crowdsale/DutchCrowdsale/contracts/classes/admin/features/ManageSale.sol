pragma solidity ^0.4.23;

import "../Admin.sol";
import "authos-solidity/contracts/core/Contract.sol";

library ManageSale {

  using Contract for *;
  using SafeMath for uint;

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
  	bytes32 token_name = Contract.read(Admin.tokenName());
    uint start_time = uint(Contract.read(Admin.startTime()));

  	// Check to make sure that the token name is not zero and that the start time has not passed
    if (start_time < now)
      revert('crowdsale already started');
    if (token_name == 0)
      revert('token not init');

  	// Begin storing values
  	Contract.storing();
    // Store updated crowdsale configuration status
    Contract.set(Admin.isConfigured()).to(true);

    // Set up EMITS action requests -
    Contract.emitting();
    // Add CROWDSALE_INITIALIZED signature and topics
    Contract.log(CONFIGURE(Contract.execID(), token_name), bytes32(start_time));
  }

  // Checks input and then creates storage buffer for sale finalization
  function finalizeCrowdsale() internal view {
    // Ensure sale has been configured -
    if (Contract.read(Admin.isConfigured()) == 0)
      revert('crowdsale has not been configured');

    // Get team wallet and unsold tokens remaining -
    address team_wallet = address(Contract.read(Admin.wallet()));
    uint num_remaining = uint(Contract.read(Admin.tokensRemaining()));

    Contract.storing();

    // Store updated crowdsale finalization status
    Contract.set(Admin.isFinished()).to(true);

    // If the unsold tokens are to be burnt, decrease the tokens remaining and total supply
    // Otherwise, send the unsold tokens to the team wallet
    if (Contract.read(Admin.burnExcess()) == 0)
      Contract.increase(Admin.balances(team_wallet)).by(num_remaining); // sent to team
    else
      Contract.decrease(Admin.tokenTotalSupply()).by(num_remaining); // burn unsold

    // Set tokens remaining to 0
    Contract.decrease(Admin.tokensRemaining()).by(num_remaining);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_FINALIZED signature and topics
    Contract.log(FINALIZE(Contract.execID()), bytes32(0));
  }
}
