pragma solidity ^0.4.23;

import "../../../../auth_os/core/Contract.sol";
import "../Admin.sol";

/// TESTME
library Question {

  using Contract for *;

  /// Events ///

  // Event: Emitted when a question is added -- AddQuestion(bytes32 indexed exec_id, uint indexed questionNumber) 
  bytes32 internal constant ADD_Q = keccak256('AddQuestion(bytes32,uint)');
  // Event: Emitted when a question is changed -- ChangeQuestion(bytes32 indexed exec_id, uint indexed questionNumber, bool indexed updateAnswer)
  bytes32 internal constant CHANGE_Q = keccak256('ChangeQuestion(bytes32,bytes32,uint)');
  // Event: Emitted when a question is removed -- RemoveQuestion(bytes32 indexed exec_id, uint indexed questionNumber) 
  bytes32 internal constant REMOVE_Q = keccak256('RemoveQuestion(bytes32,uint)');

  function ADD_QUESTION(uint questionNumber) internal pure returns (bytes32[3] memory) {
    return [ADD_Q, Contract.execID(), bytes32(questionNumber)];
  }

  function CHANGE_QUESTION(uint questionNumber, bool updateAnswer) internal pure returns (bytes32[4] memory) {
    return [CHANGE_Q, Contract.execID(), bytes32(questionNumber), updateAnswer ? bytes32(1) : bytes32(0)];
  }

  function REMOVE_QUESTION(uint questionNumber) internal pure returns (bytes32[3] memory) {
    return [REMOVE_Q, Contract.execID(), bytes32(questionNumber)];
  }

  // Allows the admin to add a question to the end of the test before the test is finalized
  // @param - question: The bytes array that represents the question to be asked 
  // @param - answer: The answer choice number that correctly answers this question 
  function addQuestion(bytes memory question, bytes32 answer) internal view {
    // Revert if the sender is not the admin 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('Sender is not admin');
    // Revert if the test is already finalized
    if (Contract.read(Admin.finalized()) != bytes32(0))
      revert('Test is already finalized');
    // Revert if question is empty
    if (question.length == 0)
      revert('Invalid question');

    
    // Add the Store action request to the storage buffer
    Contract.storing();

    // Get the number of questions in the test
    uint numQuestions = uint(Contract.read(Admin.questions()));

    // Safely increment the number of questions in storage
    Contract.increase(
      Admin.questions()
    ).by(1);

    // Store the question at the correct index in storage
    Contract.set(
      Admin.questionAt(numQuestions + 1)
    ).to(question);

    // Store the correct answer at this question's index in storage
    Contract.set(
      Admin.answerAt(numQuestions + 1) 
    ).to(answer);

    // Add the Emit action request to the storage buffer
    Contract.emitting();

    // Emit an AddQuestion event
    Contract.log(
      ADD_QUESTION(numQuestions + 1), bytes32(0)
    );

  }

  /**
   * COMMENTME
   */
  function changeQuestion(uint questionNumber, bytes memory newQuestion, bytes32 newAnswer) internal view {
    // Revert if the sender is not the admin 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('Sender is not admin');
    // Revert if the test is already finalized
    if (Contract.read(Admin.finalized()) != bytes32(0))
      revert('Test is already finalized');
    // Revert if the question index is invalid
    if (uint(Contract.read(Admin.questions())) < questionNumber || questionNumber == 0)
      revert('Invalid question index');
    // Revert if the replacement question is invalid
    if (newQuestion.length == 0) 
      revert('Invalid replacement question');

    // Add the Store action request to the storage buffer
    Contract.storing();

    // Store the replacement question at the correct index
    Contract.set(
      Admin.questionAt(questionNumber)
    ).to(newQuestion);

    // If the replacement answer choice is nonzero, update the answer key and set updateAnswer to true
    bool updateAnswer;
    if (newAnswer != 0) {
      updateAnswer = true;
      Contract.set(
        Admin.answerAt(questionNumber)
      ).to(newAnswer); 
    }

    // Add the Emit action request to the storage buffer
    Contract.emitting();

    // Emit a ChangeQuestion event
    Contract.log(
      CHANGE_QUESTION(questionNumber, updateAnswer), bytes32(0)
    );

  }

  // Allows the admin to remove a question before the test is finalized
  // @param - questionNumber: The index of the question to be removed
  function removeQuestion(uint questionNumber) internal view {
    // Revert if the sender is not the admin 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('Sender is not admin');
    // Revert if the test is already finalized
    if (Contract.read(Admin.finalized()) != bytes32(0))
      revert('Test is already finalized');
    // Revert if the question index is invalid
    if (uint(Contract.read(Admin.questions())) < questionNumber || questionNumber == 0)
      revert('Invalid question index');

    // Add the Store action request to the storage buffer
    Contract.storing();

    // Get the number of created questions from storage
    uint num_questions = uint(Contract.read(Admin.questions()));

    // Safely decrement the number of questions in storage
    Contract.decrease(
      Admin.questions()
    ).by(1);

    // If the number of questions is greater than 1 and the question being removed is not the last question, replace the removed question with the last question
    if (num_questions > 1 || num_questions == questionNumber) {
      Contract.set(
        Admin.questionAt(questionNumber)
      ).to(readBytes(Admin.questionAt(num_questions)));

      Contract.set(
        Admin.answerAt(questionNumber)
      ).to(Contract.read(Admin.answerAt(num_questions)));
    }

    // Add the Emit action request to the storage buffer
    Contract.emitting();

    // Emit a RemoveQuestion event
    Contract.log(
      REMOVE_QUESTION(questionNumber), bytes32(0)
    );
  }

  // FIXME This may need to be refactored if we change the way that questions are stored in storage
  // TESTME This may not be correct
  function readBytes(bytes32 base_seed) internal view returns (bytes memory) {
    uint length = uint(Contract.read(base_seed));
    uint toAdd = length % 32 > 0 ? 1 : 0;
    uint arr_length = toAdd + length / 32;

    bytes32[] memory read_values = new bytes32[](arr_length);

    for (uint i = 0; i < arr_length; i++) {
      read_values[i] = Contract.read(bytes32(uint(base_seed) + 32 * (i + 1))); 
    }

    bytes memory _ptr;

    assembly {
      _ptr := read_values
      mstore(_ptr, length)
    }
    
    return _ptr;
  }

}
