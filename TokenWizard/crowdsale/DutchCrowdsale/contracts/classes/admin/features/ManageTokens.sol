pragma solidity ^0.4.23;

import "../Admin.sol";
import "authos-solidity/contracts/core/Contract.sol";

library ManageTokens {

  using Contract for *;
  using SafeMath for uint;

  // event TransferAgentStatusUpdate(bytes32 indexed exec_id, address indexed agent, bool current_status)
  bytes32 internal constant TRANSFER_AGENT_STATUS = keccak256('TransferAgentStatusUpdate(bytes32,address,bool)');

  // Returns the topics for a transfer agent status update event -
  function AGENT_STATUS(bytes32 _exec_id, address _agent) private pure returns (bytes32[3] memory)
    { return [TRANSFER_AGENT_STATUS, _exec_id, bytes32(_agent)]; }

  // Checks input and then creates storage buffer for transfer agent updating
  function setTransferAgentStatus(address _agent, bool _is_agent) internal pure {
    // Ensure valid input
    if (_agent == 0)
      revert('invalid transfer agent');

    Contract.storing();

    // Store new transfer agent status
    Contract.set(Admin.transferAgents(_agent)).to(_is_agent);
  	// Finish storing and begin logging events
  	Contract.emitting();
    // Add TransferAgentStatusUpdate signature and topics
    Contract.log(
      AGENT_STATUS(Contract.execID(), _agent), _is_agent ? bytes32(1) : bytes32(0)
    );
  }
}
