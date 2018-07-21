pragma solidity ^0.4.23;

import "../../../auth_os/core/Contract.sol";
import "./features/ManageTest.sol";
import "./features/Question.sol";
import "./features/AnswerKey.sol"; 

///FIXME Eventually take the preconditions out of the features and refactor to the class level
library Admin {

  using Contract for *;

  /// Storage Seeds ///

  /// ManageTest ///

  /// FIXME Obviously this will need to be updated

  function admin() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'admin');
  }

  function finalized() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'finalized');
  }

  /// Questions ///

  function questions() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'questions');
  }

  function questionAt(uint index) internal pure returns (bytes32 location) {
    location = keccak256(index, questions());
  }

  /// AnswerKey ///

  // Storage seed for the number of answers 
  function answers() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'answers');
  }

  function answerAt(uint index) internal pure returns (bytes32 location) {
    location = keccak256(index, answers());
  }

  /// Preconditions ///

  function first() private pure {

  }

  /// Postconditions ///

  function last() private pure {

  }

  /// ManageTest Functions ///

  ///FIXME Need to add init changing functions

  function finalizeTest() external view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    ManageTest.finalizeTest();
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  /// Question Functions ///

  /**
   * @dev This function allows the admin of the contract to add a question and a hash of the correct answer to the question
   * @param question The question to add
   * @param answer The answer of the question being added
   */
  function addQuestion(bytes question, bytes32 answer) external view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    Question.addQuestion(question, answer);
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  function changeQuestion(uint questionNumber, bytes newQuestion, bytes32 newAnswer) external view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    Question.changeQuestion(questionNumber, newQuestion, newAnswer);
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  function removeQuestion(uint questionNumber) external view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    Question.removeQuestion(questionNumber);
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  /// Answer Key Functions ///

  function changeAnswerKey(uint questionNumber, bytes32 newAnswer) external view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    AnswerKey.changeAnswerKey(questionNumber, newAnswer);
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }


}
