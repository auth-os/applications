pragma solidity ^0.4.23;

contract CrowdsaleConsoleUtils {

  function initCrowdsaleToken(
    bytes32, bytes32, uint, bytes memory
  ) public pure returns (bytes memory) { return msg.data; }

  function updateGlobalMinContribution(uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function whitelistMulti(
    address[] memory, uint[] memory, uint[] memory, bytes memory
  ) public pure returns (bytes memory) { return msg.data; }

  function setCrowdsaleStartAndDuration(uint, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function initializeCrowdsale(bytes memory) public pure returns (bytes memory) { return msg.data; }

  function finalizeCrowdsale(bytes memory) public pure returns (bytes memory) { return msg.data; }
}
