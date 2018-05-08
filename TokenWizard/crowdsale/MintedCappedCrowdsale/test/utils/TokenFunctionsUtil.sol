pragma solidity ^0.4.23;

contract TokenFunctionsUtil {

  function transfer(address, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function transferFrom(address, address, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function approve(address, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function increaseApproval(address, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function decreaseApproval(address, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  /// MOCK ///

  function setTransferAgentStatus(address, bool) public pure returns (bytes memory) { return msg.data; }

  function unlockToken() public pure returns (bytes memory) { return msg.data; }

  function setBalance(address, uint) public pure returns (bytes memory) { return msg.data; }
}
