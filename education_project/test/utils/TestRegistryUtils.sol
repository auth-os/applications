pragma solidity ^0.4.23;

// FIXME
contract TestRegistryUtils {

  function init() public pure returns (bytes memory) {
    return msg.data;
  }

  function getSelectors() public pure returns (bytes4[] memory selectors) {
    selectors = new bytes4[](4);

    selectors[0] = this.registerTest.selector;
    selectors[1] = this.registerVersion.selector;
    selectors[2] = this.updateTestCompletion.selector;
    selectors[3] = this.updateVersionCompletion.selector;
  }

  // Selectors
  function registerTest(bytes32, address, bytes memory) public pure returns (bytes) { return msg.data; } 
  function registerVersion(bytes32, address, bytes memory) public pure returns (bytes) { return msg.data; } 
  function updateTestCompletion(address, bytes32) public pure returns (bytes) { return msg.data; } 
  function updateVersionCompletion(address, address, bytes32) public pure returns (bytes) { return msg.data; } 

}
