pragma solidity ^0.4.23;

import "../Admin.sol";
import "../../../lib/Contract.sol";
import "../../token/Token.sol";

library ManageSale {
  
  using Contract for *;

  // Function selectors
  bytes4 internal constant INIT_SEL = bytes4(keccak256("init(address,uint,uint,uint,uint,uint,uint,bool,address)"));
  bytes4 internal constant INITIALIZE_CROWDSALE_SEL = bytes4(keccak256("initializeCrowdsale()")); 
  bytes4 internal constant FINALIZE_CROWDSALE_SEL = bytes4(keccak256("finalizeCrowdsale()")); 
  
  // Event selectors
  bytes32 internal constant INIT_SIG = keccak256("init(address,uint,uint,uint,uint,uint,uint,bool,address)");
  bytes32 internal constant INITIALIZE_CROWDSALE_SIG = keccak256("initializeCrowdsale()");
  bytes32 internal constant FINALIZE_CROWDSALE_SIG = keccak256("finalizeCrowdsale()");


  function INITIALIZE_CROWDSALE(bytes32 exec_id) private pure
  returns (bytes32[2]) {
  	return [INITIALIZE_CROWDSALE_SIG, exec_id];

  }

  //function that checks preconditions - TODO
  function first() internal pure {
  	if (
  	  msg.sig != INITIALIZE_CROWDSALE_SEL &&
  	  msg.sig != FINALIZE_CROWDSALE_SEL
  	) revert("invalid function selector"); 

  }
  
  //function that checks for valid postcoditions - none
  //function after() internal view { }


  function initializeCrowdsale() internal view {
  	// declare token_name to prevent redundant call later
  	bytes32 token_name = Contract.read(Admin.tokenName());

  	//Check to make sure that the token name is not zero and that the start time has not passed
  	if (token_name == bytes32(0) ||
  	  Contract.read(Admin.startTime()) > bytes32(now)
  	) revert("Crowdsale already started or Token not init");
  	
  	// Begin storing values
  	Contract.storing();
  	// Store true at Crowdsale_is_init 
  	Contract.set(Admin.isInit()).to(true);
  	// Finish storing and being loggin events
  	Contract.emitting();
  	// Log initializeCrowdsale Event
  	Contract.log(
  	  INITIALIZE_CROWDSALE(Contract.execID()), bytes32(token_name)
  	);

  }

  function finalizeCrowdsale() internal view {
	//Check to make sure that the message was sent by the admin and that the crowdsale is initialized but not finalized
  	if (Contract.read(Admin.admin()) != bytes32(Contract.sender())) revert("Not Admin");
  	
  	if (
  	  Contract.read(Admin.isInit()) == bytes32(0) ||
  	  Contract.read(Admin.isFinalized()) == bytes32(1)
  	) revert("Status Invalid");

  	// Begin storing values
  	Contract.storing();
  	// Store true at Crowdsale_is_finalized
  	Contract.set(Admin.isFinalized()).to(true);
  	// Finish storing and begin loggin events
  	Contract.emitting();
  	// Log initializeCrowdsale Event
  	Contract.log(
  	  Contract.execID()
  	);
  }
}