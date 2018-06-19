pragma solidity ^0.4.23;

// Import Contract from Auth-os
import "../../auth_os/core/Contract.sol";
// Import Version_Interface
import "./interfaces/Version_Interface.sol";

library Completion {
  
  using Contract for *;

  /// Events ///

  // Event: Emitted when a test's completion mapping is updated: UpdateTest(bytes32 indexed execID, bytes32 indexed test, address indexed user) 
  bytes32 private constant TEST_UPDATE = keccak256('UpdateTest(bytes32,bytes32,address)');
  // Event: Emitted when a version's completion mapping is updated: UpdateVersion(bytes32 indexed execID, bytes32 indexed test, address indexed version, address user)
  bytes32 private constant VERSION_UPDATE = keccak256('UpdateVersion(bytes32,bytes32,address,address)');

  function UPDATE_TEST(bytes32 test, address user) private pure returns (bytes32[4] memory) {
    return [TEST_UPDATE, Contract.execID(), test, bytes32(user)];
  }

  function UPDATE_VERSION(bytes32 test, address version) private pure returns (bytes32[4] memory) {
    return [VERSION_UPDATE, Contract.execID(), test, bytes32(version)];
  }

  /// Tests registered ///

  function registeredTests() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'registered test');
  }

  /// Test Bases ///

  function testAdmin(bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256('admin', testBase(test));
  }
  
  function testBase(bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), keccak256('test base', test));
  }

  function testDescription(bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256('description', testBase(test));
  }

  function testVersions(bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256('test versions', testBase(test));
  }

  /// Version Bases ///

  function versionBase(bytes32 test, address version) internal pure returns (bytes32 location) {
    location = keccak256('version base', keccak256(Contract.execID(), keccak256(version, test))); 
  }

  function versionDescription(bytes32 test, address version) internal pure returns (bytes32 location) {
    location = keccak256('description', versionBase(test, version));
  }

  function versionIndex(bytes32 test, address version) internal pure returns (bytes32 location) {
    location = keccak256('index', versionBase(test, version));
  }
  
  /// Completion ///

  // Storage location for a mapping that reflects the most recent version of the test that this user has passed.
  function testCompletion(address user, bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256('test completion', keccak256(Contract.execID(), keccak256(user, test))); 
  }

  // Stroage location for a mapping that reflects whether or not the user has passed this verision of the test.
  function versionCompletion(address user, address version, bytes32 test) internal pure returns (bytes32 location) {
    location = keccak256('version completion', keccak256(Contract.execID(), keccak256(user, keccak256(version, test))));
  }

  /// Update functions ///

  // TESTME
  function updateTestCompletion(address user, bytes32 test) internal view {
    Contract.authorize(msg.sender);

    if (user == address(0))
      revert('invalid user address');

    if (Contract.read(testBase(test)) == bytes32(0)) 
      revert('test not registered');

    Contract.storing();

    uint last_version = uint(Contract.read(testVersions(test)));  
    bool updated;

    // Starting from the last version registered, go through the list of versions. This process stops 
    // when a version that the user passed is found
    for (uint i = last_version; i > 0; i--) {
      address version = address(Contract.read(bytes32(32 * i + uint(testVersions(test))))); 
      Version_Interface versionInstance = Version_Interface(version);
      if (versionInstance.totalCompletion(user)) {
        updated = true;
        Contract.set(
          testCompletion(user, test)
        ).to(i);
        break;
      }
    }

    if (updated) {
      Contract.emitting();

      Contract.log(
        UPDATE_TEST(test, user), bytes32(0)
      );
    }

    Contract.commit();
  }

  function updateVersionCompletion(address user, address version, bytes32 test) internal view {
    Contract.authorize(msg.sender);

    if (user == address(0))
      revert('invalid user address');

    if (version == address(0)) 
      revert('invalid version address');

    uint version_index = uint(Contract.read(versionIndex(test, version)));

    if (version_index == 0)
      revert('unregistered version');

    if (Contract.read(versionCompletion(user, version, test)) == bytes32(1))
      revert('user has passed -- mapping already updated');

    Contract.storing();

    bool updated;

    Version_Interface versionInstance = Version_Interface(version);

    bool passed = versionInstance.totalCompletion(user);

    if (passed) {
      Contract.set(versionCompletion(user, version, test)).to(true);
      if (uint(Contract.read(testCompletion(user, test))) < version_index) {
        updated = true;
        Contract.set(testCompletion(user, test)).to(version_index);
      }  
    }

    if (passed) {

      Contract.emitting();
      
      Contract.log(
        UPDATE_VERSION(test, version), bytes32(user)
      );

      if (updated) {
        Contract.log(
          UPDATE_TEST(test, user), bytes32(0)
        );
      }
    }

    Contract.commit();
  }

}
