pragma solidity ^0.4.23;

// Import Contract from Auth-os
import "../../auth_os/core/Contract.sol";

library Registration {
  
  using Contract for *;

  // Events
  
  // Event - Emitted when a test is registered: RegisterTest(bytes32 indexed exec_id, bytes32 indexed name, address indexed initial)
  bytes32 private constant REGISTER_TEST = keccak256('RegisterTest(bytes32,bytes32,address)');
  // Event - Emitted when a version is registered: RegisterVersion(bytes32 indexed exec_id, bytes32 indexed test, address indexed version. uint index)
  bytes32 private constant REGISTER_VERSION = keccak256('RegisterVersion(bytes32,bytes32,address)');

  function TEST_REGISTER(bytes32 name, address initial) private pure returns (bytes32[4] memory) {
    return [REGISTER_TEST, Contract.execID(), name, bytes32(initial)]; 
  }

  function VERSION_REGISTER(bytes32 test, address version) private pure returns (bytes32[4] memory) {
    return [REGISTER_VERSION, Contract.execID(), test, bytes32(version)];
  }

  // Tests registered

  function registeredTests() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'registered test');
  }

  // Test Bases
  
  function testBase(bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), keccak256('test base', test));
  }

  function testVersions(bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256('test versions', testBase(test));
  }

  // Version Bases

  function versionBase(bytes32 test, address version) internal pure returns (bytes32 location) {
    location = keccak256('version base', keccak256(Contract.execID(), keccak256(version, test))); 
  }

  function versionIndex(bytes32 test, address version) internal pure returns (bytes32 location) {
    location = keccak256('index', versionBase(test, version));
  }
  
  function previousVersion(bytes32 test, address version) internal pure returns (bytes32 location) {
    location = keccak256('previous version', versionBase(test, version));
  }

  // Registration 

  // FIXME Add the ability to add a fee for the registry  
  // Register a test version if a test under this name does not already exist. Set the sender as the admin. 
  // Then create an initial version of this test. 
  // @param - name: The name of the test to be registered.
  // @param - initial: The address of the initial version to be deployed.
  function registerTest(bytes32 name, address initial) internal view {

    // Check that name is a valid test name
    if (name == bytes32(0))
      revert('invalid test name');

    if (initial == address(0)) 
      revert('invalid initial address');

    // Throw if the test has already been registered
    if (Contract.read(testBase(name)) != bytes32(0)) 
      revert('test has already been registered');
   
    // Initiate a storage action
    Contract.storing();

    // Get the number of registered tests 
    uint registered = uint(Contract.read(registeredTests()));

    // Increment the number of registered tests by one
    Contract.increase(
      registeredTests()
    ).by(uint(1));

    // Store the test at the appropriate location in the registered tests list
    Contract.set(
      bytes32(32 * (registered + 1) + uint(registeredTests()))
    ).to(name);

    // Store the test name at the test base storage location
    Contract.set(
      testBase(name)
    ).to(name);


    // Store 1 at the testVersions storage location -- the new length
    Contract.set(
      testVersions(name)
    ).to(uint(1));

    // Set up the initial version
    Contract.set(
      bytes32(32 + uint(testVersions(name)))
    ).to(initial);

    Contract.set(
      versionBase(name, initial) 
    ).to(initial);

    Contract.set(
      versionIndex(name, initial)
    ).to(uint(1));

    // Start an event action request
    Contract.emitting();

    Contract.log(
      TEST_REGISTER(name, initial), bytes32(0)
    );

    Contract.log(
      VERSION_REGISTER(name, initial), bytes32(1)
    );

  }

  // FIXME Add version names
  // Allows the test admin to register a new version for the specified test.
  // @param - test: The test to update
  // @param - version: The address for the updated version
  function registerVersion(bytes32 test, address version) internal view {

    if (Contract.read(testBase(test)) == bytes32(0)) 
      revert('test is not registered');
    
    if (version == address(0)) 
      revert('invalid version address');

    Contract.storing();
    
    uint version_index = uint(Contract.read(testVersions(test)));

    // Increment the length of test's version list
    Contract.increase(testVersions(test)).by(uint(1));

    Contract.set(
      bytes32(32 * (version_index + 1) + uint(testVersions(test)))
    ).to(version);

    Contract.set(
      versionBase(test, version)
    ).to(version);

    Contract.set(
      versionIndex(test, version)
    ).to(version_index + 1);

    
    Contract.emitting();

    Contract.log(
      VERSION_REGISTER(test, version), bytes32(version_index + 1)
    );

  }

}
