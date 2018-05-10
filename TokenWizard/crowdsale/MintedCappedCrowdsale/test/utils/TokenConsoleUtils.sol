pragma solidity ^0.4.23;

contract TokenConsoleUtils {

  function setTransferAgentStatus(address, bool,  bytes memory) public pure returns (bytes memory) {
    return msg.data;
  }

  function updateMultipleReservedTokens(
    address[] memory, uint[] memory, uint[] memory,
    uint[] memory, bytes memory
  ) public pure returns (bytes memory) {
    return msg.data;
  }

  function removeReservedTokens(address, bytes memory) public pure returns (bytes memory) {
    return msg.data;
  }

  function distributeReservedTokens(uint, bytes memory) public pure returns (bytes memory) {
    return msg.data;
  }

  function finalizeCrowdsaleAndToken(bytes memory) public pure returns (bytes memory) {
    return msg.data;
  }

  function finalizeAndDistributeToken(bytes memory) public pure returns (bytes memory) {
    return msg.data;
  }

  function setTotalSold(uint) public pure returns (bytes memory) {
    return msg.data;
  }
}
