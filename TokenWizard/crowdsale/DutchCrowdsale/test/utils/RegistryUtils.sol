pragma solidity ^0.4.23;

contract RegistryUtils {

  function getContext(bytes32 _exec_id, address _sender, uint _msg_value) public pure returns (bytes memory context) {
    context = new bytes(96);
    assembly {
      mstore(add(0x20, context), _exec_id)
      mstore(add(0x40, context), _sender)
      mstore(add(0x60, context), _msg_value)
    }
  }

  function getProviderHash(address _in) public pure returns (bytes32 provider) {
    provider = keccak256(bytes32(_in));
  }

  function registerApp(bytes32, address, bytes memory, bytes memory)
  public pure returns (bytes memory) {
    return msg.data;
  }

  function registerVersion(bytes32, bytes32, address, bytes memory, bytes memory)
  public pure returns (bytes memory) {
    return msg.data;
  }

  function addFunctions(bytes32, bytes32, bytes4[] memory, address[] memory, bytes memory)
  public pure returns (bytes memory) {
    return msg.data;
  }

  function finalizeVersion(bytes32, bytes32, address, bytes4, bytes, bytes)
  public pure returns (bytes memory) {
    return msg.data;
  }

  function init(
    address, uint, uint, uint, uint, uint, uint, bool, address
  ) public pure returns (bytes memory) {
    return msg.data;
  }

}
