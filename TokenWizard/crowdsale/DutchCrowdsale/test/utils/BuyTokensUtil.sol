pragma solidity ^0.4.23;

contract BuyTokensUtil {

  function buy(bytes memory) public pure returns (bytes memory) { return msg.data; }

  function setSaleIsWhitelisted(bool) public pure returns (bytes memory) { return msg.data; }

  function setTokensRemaining(uint) public pure returns (bytes memory) { return msg.data; }

  function updateGlobalMin(uint) public pure returns (bytes memory) { return msg.data; }
}
