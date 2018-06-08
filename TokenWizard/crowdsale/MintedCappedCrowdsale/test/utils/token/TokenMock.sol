pragma solidity ^0.4.23;

import "../../auth-os/core/Contract.sol";

library TokenMock {

  using Contract for *;

  bytes32 private constant BALANCE_SEED = keccak256('token_balances');

  // Returns the storage location of an owner's token balance
  function balances(address _owner) internal pure returns (bytes32 location) {
    location = keccak256(_owner, BALANCE_SEED);
  }

  bytes32 private constant TRANSFER_AGENT_SEED = keccak256('transfer_agents');

  // Returns the storage location of an Agent's transfer agent status
  function transferAgent(address agent) internal pure returns (bytes32 location) {
    location = keccak256(agent, TRANSFER_AGENT_SEED);
  }

  // Returns the storage location of the number of tokens sold
  function tokens_sold() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tokens_sold");
  }

  // Returns the storage location for the unlock status of the token
  function tokensUnlocked() internal pure returns(bytes32 location) {
    location = keccak256('tokens_unlocked');
  }

  function setBalance(address _acc, uint _amt) external view {
    Contract.authorize(msg.sender);
    Contract.storing();
    Contract.set(balances(_acc)).to(_amt);
    Contract.commit();
  }

  function unlockToken() external view {
    Contract.authorize(msg.sender);
    Contract.storing();
    Contract.set(tokensUnlocked()).to(true);
    Contract.commit();
  }

  function setTransferAgent(address _agent, bool _stat) external view {
    Contract.authorize(msg.sender);
    Contract.storing();
    Contract.set(transferAgent(_agent)).to(_stat);
    Contract.commit();
  }

  function setTotalSold(uint _sold) external view {
    Contract.authorize(msg.sender);
    Contract.storing();
    Contract.set(tokens_sold()).to(_sold);
    Contract.commit();
  }
}
