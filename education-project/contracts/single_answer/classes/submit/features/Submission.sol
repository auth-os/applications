pragma solidity ^0.4.23;

import "../../../../auth_os/core/Contract.sol";
import "../Submit.sol";

library Submission {

  using Contract for *;

  /// FIXME Should they be able to submit an incomplete test
  /// FIXME I should have a feature that determines whether or not this address can still take the test
  function submitTest() internal view {

  }

}
