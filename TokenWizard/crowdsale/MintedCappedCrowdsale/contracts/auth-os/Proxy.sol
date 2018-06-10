pragma solidity ^0.4.23;

import "./StorageInterface.sol";

contract Proxy {

  // Registry storage
  address public proxy_admin;
  StorageInterface public app_storage;
  bytes32 public registry_exec_id;
  address public provider;
  bytes32 public app_name;

  // App storage
  bytes32 public app_version;
  bytes32 public app_exec_id;
  address public app_index;

  function () external payable { }

  constructor (address _storage, bytes32 _registry_exec_id, address _provider, bytes32 _app_name) public {
    proxy_admin = msg.sender;
    app_storage = StorageInterface(_storage);
    registry_exec_id = _registry_exec_id;
    provider = _provider;
    app_name = _app_name;
  }
}
