pragma solidity ^0.4.23;

contract CrowdsaleConsoleUtils {

  function initCrowdsaleToken(
    bytes32, bytes32, uint, bytes memory
  ) public pure returns (bytes memory) { return msg.data; }

  function updateGlobalMinContribution(uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function whitelistMultiForTier(
    uint, address[] memory, uint[] memory, uint[] memory, bytes memory
  ) public pure returns (bytes memory) { return msg.data; }

  function createCrowdsaleTiers(
    bytes32[] memory, uint[] memory, uint[] memory, uint[] memory,
    bool[] memory, bool[] memory, bytes memory
  ) public pure returns (bytes memory) { return msg.data; }

  function updateTierDuration(uint, uint, bytes memory) public pure returns (bytes memory) { return msg.data; }

  function initializeCrowdsale(bytes memory) public pure returns (bytes memory) { return msg.data; }

  function finalizeCrowdsale(bytes memory) public pure returns (bytes memory) { return msg.data; }
}
