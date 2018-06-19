pragma solidity ^0.4.23;

import "../auth_os/core/Proxy.sol";
import "../auth_os/lib/StringUtils.sol";
import "./ITestRegistry.sol";

contract TestRegistryProxy is ITestRegistry, Proxy {

  // Constructor - sets storage address, registry id, provider, app name
  constructor(address _storage, bytes32 _registry_exec_id, address _provider, bytes32 _app_name) public
    Proxy(_storage, _registry_exec_id, _provider, _app_name) { }

  // Constructor - creates a new instance of the application in storage, and sets this proxy's exec id
  function init() public {
    require(msg.sender == proxy_admin && app_exec_id == 0 && app_name != 0);
    (app_exec_id, app_version) = app_storage.createInstance(
      msg.sender, app_name, provider, registry_exec_id, msg.data
    );
    app_index = app_storage.getIndex(app_exec_id);
  }

  /// REGISTRY FUNCTIONS ///

  // FIXME - May not want the Registry admin to be the proxy_admin
  function registerTest(bytes32, address, bytes memory) public returns (bool) {
    require(msg.sender == proxy_admin, 'sender is not admin');
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    //FIXME should emit the event right here
    return true;
  }

  // FIXME - May not want the Registry admin to be the proxy_admin
  function registerVersion(bytes32, address, bytes memory) public returns (bool)  {
    require(msg.sender == proxy_admin, 'sender is not admin');
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    //FIXME should emit the event right here
    return true;
  }

  /// COMPLETION FUNCTIONS ///

  function updateTestCompletion(address, bytes32) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    // FIXME Add the event right here
    return true;
  }

  function updateVersionCompletion(address, address, bytes32) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    // FIXME add the event
    return true;
  }

  function exec(bytes _calldata) external payable returns (bool success) {
    require(app_exec_id != 0 && _calldata.length >= 4);
    // Call 'exec' in AbstractStorage, passing in the sender's address, the app exec id, and the calldata to forward -
    app_storage.exec.value(msg.value)(msg.sender, app_exec_id, _calldata);

    // Get returned data
    success = checkReturn();
    // If execution failed, emit errors -
    if (!success) checkErrors();

    // Transfer any returned wei back to the sender
    address(msg.sender).transfer(address(this).balance);
  }

  // Checks data returned by an application and returns whether or not the execution changed state
  function checkReturn() internal pure returns (bool success) {
    success = false;
    assembly {
      // returndata size must be 0x60 bytes
      if eq(returndatasize, 0x60) {
        // Copy returned data to pointer and check that at least one value is nonzero
        let ptr := mload(0x40)
        returndatacopy(ptr, 0, returndatasize)
        if iszero(iszero(mload(ptr))) { success := 1 }
        if iszero(iszero(mload(add(0x20, ptr)))) { success := 1 }
        if iszero(iszero(mload(add(0x40, ptr)))) { success := 1 }
      }
    }
    return success;
  }

}
