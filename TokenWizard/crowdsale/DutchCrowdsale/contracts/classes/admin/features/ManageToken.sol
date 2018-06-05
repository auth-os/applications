pragma solidity ^0.4.23;

import "../Admin.sol";
import "../../../lib/Contract.sol";
import "../../token/Token.sol";

library ManageToken {
  
  using Contract for *;

  // Function selectors
  bytes4 internal constant SET_TRANSFER_AGENT_SIG = bytes4(keccak256("setTransferAgentStatus(address,bool)"));

  // Event selectors
  bytes32 internal constant SET_TRANSFER_AGENT_SEL = keccak256("setTransferAgentStatus(address,bool)");

  function SET_TRANSFER_AGENT(bytes32 exec_id) private pure
  returns (bytes32[2]) {
    return [SET_TRANSFER_AGENT_SEL, exec_id];
  }

  function first() internal  view {
    // Checks to see if sender is admin of crowdsale
  	if (bytes32(Contract.sender()) != Contract.read(Admin.admin()))
      revert("Sender is not Admin");

    //Check function selector again 
    if (msg.sig != SET_TRANSFER_AGENT_SIG) revert("invalid function selector");
  }

  function setTransferAgentStatus( 
    address _agent, 
    bool is_transfer_agent) 
  internal pure {
  	//Ensure valid input
  	if(_agent == address(0)) revert("Invalid Transfer Agent");

  	//Begin storing
  	Contract.storing();
  	// Store new transfer agent status
  	Contract.set(
  	  Admin.transferAgentStatus(_agent)
  	).to(is_transfer_agent);
  	//Finish storing and begin logging events
  	Contract.emitting();
  	// Log setTransferAgentStatus event 
  	Contract.log(
  	  SET_TRANSFER_AGENT(Contract.execID()), bytes32(_agent) 
  	);
  }



}