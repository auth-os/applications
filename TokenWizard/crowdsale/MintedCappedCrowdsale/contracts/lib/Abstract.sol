pragma solidity ^0.4.23;

library Abstract {

  struct Contract { uint _; }
  struct Class { uint _; }
  struct Feature { uint _; }

  function contractAt() internal pure returns (Abstract.Contract memory) { }
  function invoke(Contract memory, function (Class memory) pure) internal pure { }
  function finalize(Contract memory) internal pure { }
  function setRef(Contract memory, string memory) internal pure { }
  function throws(Contract memory, string memory) internal pure { }
  function storing(Contract memory) internal pure { }
  function decrease(Contract memory, bytes32) internal pure returns (Contract memory) { }
  function sender(Contract memory) internal pure returns (address) { }
  function by(Contract memory, uint) internal pure { }
  function increase(Contract memory, bytes32) internal pure returns (Contract memory) { }
  function emitting(Contract memory) internal pure { }
  function log(Contract memory, bytes32[3] memory, bytes32) internal pure { }
  function byMaximum(Contract memory, uint) internal pure { }
  function finish(Contract memory) internal pure { }
  function set(Contract memory, bytes32) internal pure returns (Contract memory) { }
  function to(Contract memory, uint) internal pure { }
  function stored(Class memory) internal pure returns (bool) { }
  function emitted(Class memory) internal pure returns (bool) { }
  function read(Class memory, bytes32) internal pure returns (bytes32) { }
  function throws(Class memory, string memory) internal pure { }
  function setRef(Class memory, string memory) internal pure { }
  function _before(Class memory, function (Class memory) pure) internal pure { }
  function invoke(Class memory, function (Feature memory) pure) internal pure { }
  function _after(Class memory, function (Class memory) pure) internal pure { }
  function executeFromMain(Feature memory) internal pure { }
  function setRef(Feature memory, string memory) internal pure { }
  function throws(Feature memory, string memory) internal pure { }
}
