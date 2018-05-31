pragma solidity ^0.4.23;

import "../MintedCapped.sol";
import "./features/Transfer.sol";
import "./features/Approve.sol";

library Token {
  // TODO implement transferAgent requirements!
  using Token for Abstract.Class;
  using Abstract for Abstract.Class;

  // Token field storage seeds -
  bytes32 internal constant TOKEN_NAME = keccak256('token_name');
  bytes32 internal constant TOKEN_SYMBOL = keccak256('token_symbol');
  bytes32 internal constant TOKEN_SUPPLY = keccak256('token_supply');
  bytes32 internal constant TOKEN_BALANCES = keccak256('token_balances');
  bytes32 internal constant TOKEN_ALLOWANCES = keccak256('token_allowances');

  // Valid selectors TODO
  bytes4 internal constant TRANSFER_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant TRANSFERFROM_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant APPROVE_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant INCR_APPR_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));
  bytes4 internal constant DEC_APPR_SEL = bytes4(keccak256('transfer(address,uint256,bytes)'));

  // Before each Transfer and Approve Feature executes, check that the token is initialized -
  function validInitialState(Abstract.Class memory _token) internal view {
    if (_token.name() == bytes32(0))
      _token.throws('not initialized');

    if (msg.value != 0)
      _token.throws('function is not payable');
  }

  // After each Transfer and Approve Feature executes, ensure that the result will
  // both emit an event and store values in storage -
  function shouldEmitAndStore(Abstract.Class memory _token) internal pure {
    if (_token.emitted() == false || _token.stored() == false)
      _token.throws('invalid state change');
  }

  // Invoked by the Contract after initialization. Sets a precondition and postcondition,
  // and routes invocation toward the correct Feature
  function _class(Abstract.Class memory _token) internal view {
    // Set error context for Token -
    _token.setRef('Token');

    // Check precondition for Token class -
    _token._before(validInitialState);

    // Resolve Feature by function selector, and call -
    if (msg.sig == TRANSFER_SEL || msg.sig == TRANSFERFROM_SEL)
      _token.invoke(Transfer._feature);
    else if
      (
        msg.sig == APPROVE_SEL ||
        msg.sig == INCR_APPR_SEL ||
        msg.sig == DEC_APPR_SEL
      ) _token.invoke(Approve._feature);
    else
      _token.throws('invalid function selector');

    // Check postcondition for Token class -
    _token._after(shouldEmitAndStore);
  }

  // Referencing the execution id held by the passed-in class, returns the token name -
  function name(Abstract.Class memory _token) internal pure returns (bytes32) {
    return _token.read(TOKEN_NAME);
  }

  // Returns the relative storage location of the passed in owner's balance
  function balances(address _owner) internal pure returns (bytes32) {
    return keccak256(_owner, TOKEN_BALANCES);
  }

  // Returns the relative storage location of the spender's allowed amount from the owner
  function allowed(address _owner, address _spender) internal pure returns (bytes32) {
    return keccak256(_spender, keccak256(_owner, TOKEN_ALLOWANCES));
  }
}
