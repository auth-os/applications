pragma solidity ^0.4.23;

import "../../../auth_os/core/Contract.sol";
import "./features/Answer.sol";
import "./features/Submission.sol";

library Submit {

  using Contract for *;

  /// Preconditions ///

  function first() private pure {

  }

  /// Postconditions ///

  function last() private pure {

  }

  /// Answer Functions ///

  function answerQuestion(uint questionNumber, uint answer) internal view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    Answer.answerQuestion(questionNumber, answer);
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  /// FIXME Is this function necessary, or should answerQuestion encapsulate its functionality? 
  function changeAnswer(uint questionNumber, uint answer) internal view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    Answer.changeAnswer(questionNumber, answer);
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  /// Submission Functions ///

  function submitTest() internal view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    Submission.submitTest();
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

}
