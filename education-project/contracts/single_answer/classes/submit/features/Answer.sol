pragma solidity ^0.4.23;

import "../../../../auth_os/core/Contract.sol";

library Answer {

  using Contract for *;

  function answerQuestion(uint questionNumber, uint answer) internal view {
    questionNumber;
    answer;
  }

  /// FIXME This function should be here, but it will be interesting to see how it needs to be implemented
  /// I think that I'll need a storage seed for this address's answer to every question
  function changeAnswer(uint questionNumber, uint answer) internal view {
    questionNumber;
    answer;
  }

}
