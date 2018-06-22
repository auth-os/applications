pragma solidity ^0.4.23;

import "../../../../auth_os/core/Contract.sol";
import "../Admin.sol";

library AnswerKey {

  using Contract for *;

  /// Events ///
  
  // Event: Emitted when the answer key is changed -- ChangeAnswerKey(bytes32 indexed exec_id, uint indexed questionNumber)
  bytes32 internal constant CHANGE_ANS = keccak256('ChangeAnswerKey(bytes32,uint)');

  function CHANGE_ANSWER(uint questionNumber) internal pure returns (bytes32[3] memory) {
    return [CHANGE_ANS, Contract.execID(), bytes32(questionNumber)];
  }
  
  // Allows the test admin to add additional answer choices before the test is finalized
  function addAnswerChoice() internal view {
    // Revert if the sender is not the admin 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('Sender is not admin');
    // Revert if the test is already finalized
    if (Contract.read(Admin.finalized()) != bytes32(0))
      revert('Test is already finalized');
    
    // Add the Store action request to the storage buffer
    Contract.storing();

    // Safely increment the number of answer choices
    Contract.increase(
      Admin.answerChoices()
    ).by(uint(1));

    // Add the Emit action request to the storage buffer
    Contract.emitting();
     
  }

  // Allows to admin to change the answer key before the test is finalized
  // @param - questionNumber: The question index of the change 
  // @param - newAnswer: The replacement answer
  function changeAnswerKey(uint questionNumber, uint newAnswer) internal view {
    // Revert if the sender is not the admin 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('Sender is not admin');
    // Revert if the test is already finalized
    if (Contract.read(Admin.finalized()) != bytes32(0))
      revert('Test is already finalized');
    // Revert if the question index is invalid
    if (uint(Contract.read(Admin.questions())) < questionNumber || questionNumber == 0)
      revert('Invalid question index');
    // Revert if the replacement answer is invalid
    if (uint(Contract.read(Admin.answerChoices())) < newAnswer || newAnswer == 0)
      revert('Invalid replacement answer');

    // Add the Store action request to the storage buffer
    Contract.storing();

    // Replace the answer at the question index
    Contract.set(
      Admin.questionAt(questionNumber)
    ).to(newAnswer);

    // Add the Emit action request to the storage buffer
    Contract.emitting();

    // Emit a ChangeAnswerKey event
    Contract.log(
      CHANGE_ANSWER(questionNumber), bytes32(0)
    );
  }

}
