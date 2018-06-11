pragma solidity ^0.4.23;

import "./classes/token/IToken.sol";
import "./classes/sale/ISale.sol";
import "./classes/sale_manager/ISaleManager.sol";

interface IMintedCapped {
  function init(address, uint, bytes32, uint, uint, uint, bool, bool, address) external;
}
