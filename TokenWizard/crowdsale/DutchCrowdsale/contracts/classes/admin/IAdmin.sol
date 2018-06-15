pragma solidity ^0.4.23;

interface IAdmin {
  function getCrowdsaleInfo() external view returns (uint, address, uint, bool, bool);
  function isCrowdsaleFull() external view returns (bool, uint);
  function getCrowdsaleStartAndEndTimes() external view returns (uint, uint);
  function getCrowdsaleStatus() external view returns (uint, uint, uint, uint, uint, uint);
  function getWhitelistStatus(address) external view returns (uint, uint);
}

interface AdminIdx {
  function getCrowdsaleInfo(address, bytes32) external view returns (uint, address, uint, bool, bool);
  function isCrowdsaleFull(address, bytes32) external view returns (bool, uint);
  function getCrowdsaleStartAndEndTimes(address, bytes32) external view returns (uint, uint);
  function getCrowdsaleStatus(address, bytes32) external view returns (uint, uint, uint, uint, uint, uint);
  function getWhitelistStatus(address, bytes32, address) external view returns (uint, uint);
}
