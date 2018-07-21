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

  function answerChoices() internal pure returns (bytes32 location) {
    location = keccak256(Contract.execID(), 'answer choices');
  }
  
  /// Preconditions ///

  function first() private pure {

  }

  /// Postconditions ///

  function last() private pure {

  }

  /// ManageTest Functions ///

  ///FIXME Need to add init changing functions

  function finalizeTest() internal view {
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

  function addQuestion(bytes memory question, uint answer) internal view {
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

  function changeQuestion(uint questionNumber, bytes memory newQuestion, uint newAnswer) internal view {
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

  function removeQuestion(uint questionNumber) internal view {
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

  function addAnswerChoice() internal view {
    // Begin execution - read the executionID and the sender address from storage
    Contract.authorize(msg.sender);
    ///FIXME
    Contract.checks(first);
    // Execute add question function
    AnswerKey.addAnswerChoice();
    ///FIXME
    Contract.checks(last);
    // Commit state changes to storage
    Contract.commit();
  }

  function changeAnswerKey(uint questionNumber, uint newAnswer) internal view {
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
