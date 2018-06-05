pragma solidity ^0.4.23;

import "../../DutchCrowdsale.sol";
import "../../lib/Contract.sol";
import "./features/Purchase.sol";

library Sale {
  
  using Contract for *;

  // Crowdsale fields - 

  //Returns the storage location of the admin of the crowdsale
  function admin() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_admin");
  }

  // Returns the storage location of the crowdsale_is_init variable
  function isInit() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_is_init");
  }

  // Returns the storage location of crowdsale_is_finalized variable
  function isFinalized() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_is_finalized");
  }

  // Returns the storage location of number of tokens remaining in crowdsale
  function tokensRemaining() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_tokens_remaining");
  }

  // Returns the storage location of crowdsale's minimum contribution
  function minContribution() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_min_cap");
  }  
  
  // Storage seed for crowdsale's unique contributors
  bytes32 internal constant CROWDSALE_UNIQUE_CONTRIBUTORS = keccak256("crowdsale_contributors");

  //Returns the storage location of the number of unique contributors in the crowdsale
  function uniqueContributors() internal pure returns (bytes32 location) {
  	location = CROWDSALE_UNIQUE_CONTRIBUTORS;
  }
  // Returns the storage location of whether or not _sender is a unique contributor to this crowdsale
  function hasContributed(address _sender) internal pure returns (bytes32 location) {
  	location = keccak256(keccak256(_sender), CROWDSALE_UNIQUE_CONTRIBUTORS);
  }

  // Returns the storage location of crowdsale's starting time
  function startTime() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_starts_at");
  }

  // Returns the storage location of crowdsale's duration
  function duration() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_duration");
  }

  // Returns the storage location of crowdsale's starting sale rate
  function startRate() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_start_rate");
  }

  // Returns the storage location of crowdsale's ending sale rate
  function endRate() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_end_rate");
  }

  // Returns the storage location of the crowdsale's wallet
  function wallet() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_wallet");
  }

  // Returns the storage location of crowdsale's wei raised
  function weiRaised() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_wei_raised");
  }

  // Returns the storage location of crowdsale's whitelist status
  function isWhitelisted() internal pure returns (bytes32 location) {
  	location = keccak256("crowdsale_is_whiteliste");
  }

  // Storage seed for crowdsale's whitelist 
  bytes32 internal constant SALE_WHITELIST = keccak256("crowdsale_purchase_whitelist");

  // Returns the storage location of user's minimum contribution in whitelisted crowdsale
  function whitelistMinContrib(address _spender) internal pure returns (bytes32 location) {
  	location = keccak256(keccak256(_spender), SALE_WHITELIST);
  }

  //Returns the storage location for the user's remaining spending amount in a whitelisted crowdsale
  function whitelistSpendRemaining(address _spender) internal pure returns (bytes32 location) {
  	location = bytes32(32 + uint(keccak256(keccak256(_spender), SALE_WHITELIST)));
  }

  // Returns storage location for crowdsale token's number of decimals
  function decimals() internal pure returns (bytes32 location) {
  	location = keccak256("token_decimals");
  }

  // Token fields - 

  bytes32 private constant BALANCE_SEED = keccak256('token_balances');

  // Returns the storage location of an owner's token balance
  function balances(address _owner) internal pure returns (bytes32 location) {
    location = keccak256(_owner, BALANCE_SEED);
  }

  bytes32 private constant ALLOWANCE_SEED = keccak256('token_allowed');

  // Returns the storage location of a spender's token allowance from the owner
  function allowed(address _owner, address _spender) internal pure returns (bytes32 location) {
    location = keccak256(_spender, keccak256(_owner, ALLOWANCE_SEED));
  }

  // Function selector 
  bytes4 internal constant BUY_SEL = bytes4(keccak256("buy()"));

  function first() internal view {
  	if (msg.value == 0)
  	  revert('no wei sent');

  	if (bytes32(now) < Contract.read(startTime()))
  	  revert('attempting to buy before Crowdsale start time');

  	if (Contract.read(tokensRemaining()) == bytes32(0))
  	  revert('Crowdsale is sold out');

  	if (Contract.read(wallet()) == bytes32(0))
  	  revert('invalid Crowdsale wallet');

  	if (Contract.read(decimals()) > bytes32(18))
  	  revert("too many decimals in token");

  	if (Contract.read(isInit()) == bytes32(0) || Contract.read(isFinalized()) == bytes32(1))
  	  revert("Crowdsale is in invalid state");

  	// checks if the starting sale rate is less than the ending sale rate
  	if (Contract.read(startRate()) <= Contract.read(endRate()))
  	  revert("end sale rate is greater than starting sale rate");

  	// checks if the crowdsale is over
  	if (now > uint(Contract.read(startTime())) + uint(Contract.read(duration())))
  	  revert("the crowdsale is over");

  	//Check for invalid function selector
    if (msg.sig == BUY_SEL) {
      Contract.checks(Purchase.first);
    } else {
      revert("Invalid function selector");
    }
  }

  // After each Purchase Feature executes, ensure that the result will
  // both emit an event and store values in storage -
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  //// CLASS - Sale: ////

  /// Feature - Purchase: ///
  function buy() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute buy function -
    Purchase.buy();
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }   

}