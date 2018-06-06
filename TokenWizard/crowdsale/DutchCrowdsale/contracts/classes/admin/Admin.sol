pragma solidity ^0.4.23;

import "../../DutchCrowdsale.sol";
import "../../lib/Contract.sol";
import "./features/ConfigureSale.sol";
import "./features/ManageSale.sol";
import "./features/ManageToken.sol";

library Admin {

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

  // Returns the storage location of crowdsale's max number of tokens to sell
  function maxSellCap() internal pure returns (bytes32 location) {
    location = keccak256("token_sell_cap");
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

  // Returns the storage location of the token's name
  function tokenName() internal pure returns (bytes32 location) {
    location = keccak256('token_name');
  }

  // Returns the storage location of the token's symbol
  function tokenSymbol() internal pure returns (bytes32 location) {
    location = keccak256('token_symbol');
  }

  // Returns the storage location of the token's totalSupply
  function tokenTotalSupply() internal pure returns (bytes32 location) {
    location = keccak256('token_supply');
  }

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

  // Storage seed of token_transfer_agent status
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  function transferAgentStatus(address _sender) internal pure returns (bytes32 location) {
  	location = keccak256(keccak256(_sender), TOKEN_TRANSFER_AGENTS); 
  }

  /// Function selectors ///
  //bytes4 internal constant INIT_SEL = bytes4(keccak256("init(address,uint,uint,uint,uint,uint,uint,bool,address,bytes)"));
  bytes4 internal constant INIT_CROWDSALE_TOK_SEL = bytes4(keccak256("initCrowdsaleToken(bytes32,bytes32,uint)")); 
  bytes4 internal constant UPDATE_GLOBAL_MIN_CONTRIB_SEL = bytes4(keccak256("updateGlobalMinContribution(uint)")); 
  bytes4 internal constant WHITELIST_MULTI_SEL = bytes4(keccak256("whitelistMulti(address[],uint[],uint[])")); 
  bytes4 internal constant SET_CROWDSALE_START_DURATION_SEL= bytes4(keccak256("setCrowdsaleStartandDuration(uint,uint)")); 
  bytes4 internal constant INITIALIZE_CROWDSALE_SEL = bytes4(keccak256("initializeCrowdsale()")); 
  bytes4 internal constant FINALIZE_CROWDSALE_SEL = bytes4(keccak256("finalizeCrowdsale()")); 
  bytes4 internal constant SET_TRANSFER_AGENT_SEL = bytes4(keccak256("setTransferAgentStatus(address,bool)"));

  //Before each ManageSale, ConfigureSale, or ManageTokens feature executes, check this conditions- 
  function first() internal view {
  	if(bytes32(Contract.sender()) != Contract.read(admin())) 
  	  revert("Sender is not admin"); 

  	if (
  	  msg.sig == INIT_CROWDSALE_TOK_SEL ||
  	  msg.sig == UPDATE_GLOBAL_MIN_CONTRIB_SEL ||
  	  msg.sig == WHITELIST_MULTI_SEL ||
  	  msg.sig == SET_CROWDSALE_START_DURATION_SEL
  	) Contract.checks(ConfigureSale.first);
  	else if (
  	  msg.sig == INITIALIZE_CROWDSALE_SEL ||
  	  msg.sig == FINALIZE_CROWDSALE_SEL
  	) Contract.checks(ManageSale.first);
  	else if (
  	  msg.sig == SET_TRANSFER_AGENT_SEL
  	) Contract.checks(ManageToken.first);
  	else {
  	  revert('invalid function selector');	
  	} 
  }

  // After each ManageSale, ConfigureSale, or ManageToken Feature executes, ensure that the result will
  // both emit an event and store values in storage -
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  //// CLASS - Admin: ////

  /// Feature - ConfigureSale: ///
  function updateGlobalMinContribution(uint new_min_contribution)
  external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ConfigureSale.updateGlobalMinContribution(new_min_contribution);
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }
  function whitelistMulti(
    address[] to_update, uint[] min_contribution, uint[] max_spend_amt
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ConfigureSale.whitelistMulti(to_update, min_contribution, max_spend_amt);
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }
  function initCrowdsaleToken(bytes32 name, bytes32 symbol, uint decimals)
  external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ConfigureSale.initCrowdsaleToken(name, symbol, decimals);
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }
  function setCrowdsaleStartandDuration(uint start_time, uint duration)
  external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ConfigureSale.setCrowdsaleStartandDuration(start_time, duration);
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }

  //Feature - ManageSale
  function initializeCrowdsale() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ManageSale.initializeCrowdsale();
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }
  function finalizeCrowdsale() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ManageSale.finalizeCrowdsale();
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  } 

  // Feature - ManageTokens: ///
  function setTransferAgentStatus(address agent, bool is_agent) external view { 
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(first);
    // Execute decreaseApproval function -
    ManageToken.setTransferAgentStatus(agent, is_agent);
    // Check postconditions for execution -
    Contract.checks(last);
    // Commit state changes to storage -
    Contract.commit();
  }    
	
}