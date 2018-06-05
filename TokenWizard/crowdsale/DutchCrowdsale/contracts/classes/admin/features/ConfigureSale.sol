pragma solidity ^0.4.23;

import "../Admin.sol";
import "../../../lib/Contract.sol";
import "../../token/Token.sol";

library ConfigureSale {

  using Contract for *;

  // Function selectors
  bytes4 internal constant INIT_CROWDSALE_TOK_SEL = bytes4(keccak256("initCrowdsaleToken(bytes32,bytes32,uint)")); 
  bytes4 internal constant UPDATE_GLOBAL_MIN_CONTRIB_SEL = bytes4(keccak256("updateGlobalMinContribution(uint)")); 
  bytes4 internal constant WHITELIST_MULTI_SEL = bytes4(keccak256("whitelistMulti(address[],uint[],uint[])")); 
  bytes4 internal constant SET_CROWDSALE_START_DURATION_SEL= bytes4(keccak256("setCrowdsaleStartandDuration(uint,uint)")); 

  // Event selectors
  bytes32 internal constant INIT_CROWDSALE_TOK_SIG = keccak256("initCrowdsaleToken(bytes32,bytes32,uint)"); 
  bytes32 internal constant UPDATE_GLOBAL_MIN_CONTRIB_SIG = keccak256("updateGlobalMinContribution(uint)"); 
  bytes32 internal constant WHITELIST_MULTI_SIG = keccak256("whitelistMulti(address[],uint[],uint[])"); 
  bytes32 internal constant SET_CROWDSALE_START_DURATION_SIG= keccak256("setCrowdsaleStartandDuration(uint,uint)"); 
  
  // Event emitter functions
  function INIT_CROWDSALE_TOK(bytes32 exec_id, bytes32 _name, bytes32 _symbol) private pure
  returns (bytes32[4]) {
    return [INIT_CROWDSALE_TOK_SIG, exec_id, _name, _symbol];
  }

  function UPDATE_GLOBAL_MIN_CONTRIB(bytes32 exec_id) private pure
  returns (bytes32[2]) {
    return [UPDATE_GLOBAL_MIN_CONTRIB_SIG, exec_id];
  }

  function SET_CROWDSALE_START_DURATION(bytes32 exec_id, uint start_time) private pure
  returns (bytes32[3]) {
    return [SET_CROWDSALE_START_DURATION_SIG, exec_id, bytes32(start_time)];
  }

  // Function that checks preconditions - TODO
  function first() internal view {
  	// Make sure the sender is the admin of the crowdsale
  	if (Contract.sender() != address(Contract.read(Admin.admin())))
  	  revert("Only admin can ConfigureSale");

    // Check function selector for validity
    if (
      msg.sig != INIT_CROWDSALE_TOK_SEL &&
      msg.sig != UPDATE_GLOBAL_MIN_CONTRIB_SEL &&
      msg.sig != WHITELIST_MULTI_SEL &&
      msg.sig != SET_CROWDSALE_START_DURATION_SEL
    ) revert("Invalid function selector");

  }

  // Checks for valid postconditions - None 
  function last() internal pure { }


  function initCrowdsaleToken(
    bytes32 _name,
    bytes32 _symbol,
    uint _decimals
  ) internal view {
  	//Ensure that the crowdsale has not been initialized yet
  	if (Contract.read(Admin.isInit()) == bytes32(1))
  	  revert("Crowdsale is already initialized");
  	// Ensure valid input
    if (
      _name == 0
      || _symbol == 0
      || _decimals > 18
    ) revert("Improper token initialization");

    // Begin storing values 
    Contract.storing();
    // Store token _name
    Contract.set(Admin.tokenName()).to(_name);
    // Store token symbol 
    Contract.set(Admin.tokenSymbol()).to(_symbol);
    // Store token _decimals
    Contract.set(Admin.decimals()).to(_decimals);
    // Finish storing and being logging events
    Contract.emitting();
    // Log initCrowdsaleToken event 
    Contract.log(
      INIT_CROWDSALE_TOK(Contract.execID(), _name, _symbol), bytes32(_decimals)
    );
  }

  function updateGlobalMinContribution(uint new_min)
  internal view {
  	//Ensure that the crowdsale has not been initialized yet
  	if (Contract.read(Admin.isInit()) == bytes32(1))
  	  revert("Crowdsale is already initialized");
  	//Ensure valid input
  	if (new_min < 0) revert("Invalid minimum");

  	//Begin storing value
  	Contract.storing();
  	// Store new minimum
  	Contract.set(Admin.minContribution()).to(new_min);
  	// Finish storing begin logging event 
  	Contract.emitting();
  	// Log updateGlobalMinContribution event 
  	Contract.log(
  	  UPDATE_GLOBAL_MIN_CONTRIB(Contract.execID()), bytes32(new_min)
  	);
  }

  function whitelistMulti(
    address[] memory to_update,
    uint[] memory min_contributions,
    uint[] memory max_spend_amt
  ) internal pure {
    //Ensure valid input
    if (
      to_update.length != min_contributions.length ||
      to_update.length != max_spend_amt.length ||
      to_update.length == 0
    ) revert("Mismatched input lengths");

    //Begin storing values
    Contract.storing();
    // For loop to update all inputted address in whitelist
    for (uint i = 0; i < to_update.length; i++) {
      // Get storage location for address[i]
      Contract.set(Admin.whitelistMinContrib(to_update[i])).to(min_contributions[i]);
      Contract.set(Admin.whitelistSpendRemaining(to_update[i])).to(max_spend_amt[i]);
    }
  }

  function setCrowdsaleStartandDuration(uint start_time, uint duration)
  internal view {
  	//Ensure that the crowdsale has not been initialized yet
  	if (Contract.read(Admin.isInit()) == bytes32(1))
  	  revert("Crowdsale is already initialized");
    //Ensure valid input
    if (start_time <= now || duration == 0)
      revert("Invalid start time or duration");
    //Begin storing values 
    Contract.storing();
    // Store new start_time
    Contract.set(Admin.startTime()).to(start_time);
    // Store new duration 
    Contract.set(Admin.duration()).to(duration);
    // Finish storing and begin logging event
    Contract.emitting();
    // Log setCrowdsaleStartandDuration event 
    Contract.log(
      SET_CROWDSALE_START_DURATION(Contract.execID(), start_time), bytes32(duration)
    );
  }

}