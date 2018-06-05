pragma solidity ^0.4.23;

import "./lib/Contract.sol";
import "./DutchCrowdsale.sol";

library Initialize {

  using Contract for *;

  bytes32 internal constant EXEC_PERMISSIONS = keccak256('script_exec_permissions');

  // Returns the storage location of a script execution address's permissions -
  function execPermissions(address _exec) internal pure returns (bytes32 location) {
    location = keccak256(_exec, EXEC_PERMISSIONS);
  }

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

  function maxTokSellCap() internal pure returns (bytes32 location) {
  	location = keccak256("token_sell_cap");
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


  //Pre/post conditions for execution

  // No preconditions for execution of this constructor
  function first() internal pure { }

  //Ensures that constructor properly stores all data
  function last() internal pure { 
    if (Contract.stored() != 12)
      revert('Invalid state change');
  }
  

  /*
  Creates a DutchCrowdsale with the specified initial conditions. The admin should now initialize the crowdsale's token, 
  as well as any additional features of the crowdsale that will exist. Then, initialize the crowdsale as a whole.
  */
  function init(
    address _wallet, uint _total_supply, uint _max_amount_to_sell, uint _starting_rate,
    uint _ending_rate, uint _duration, uint _start_time, bool _sale_is_whitelisted,
    address _admin
  ) internal view {
    //Ensure valid input
    if (
      _wallet == address(0)
      || _max_amount_to_sell == 0
      || _max_amount_to_sell > _total_supply
      || _starting_rate <= _ending_rate
      || _ending_rate == 0
      || _start_time <= now
      || _duration + _start_time <= _start_time
      || _admin == address(0)
    ) revert("Improper Initialization");

    // Begin storing values
    Contract.storing();
    //Set instance script exec address permission - 
    Contract.set(execPermissions(msg.sender)).to(true);
    // Store wallet address
    Contract.set(wallet()).to(_wallet);
    //store total supply of token
    Contract.set(tokenTotalSupply()).to(_total_supply);
    //store max amount of token to sell in tokens_remaining and max_token_sell_cap
    Contract.set(tokensRemaining()).to(_max_amount_to_sell);
    Contract.set(maxTokSellCap()).to(_max_amount_to_sell);
    //store starting rate of token
    Contract.set(startRate()).to(_starting_rate);
    //store ending rate of token
     Contract.set(endRate()).to(_ending_rate);
    //store duration of crowdsale
     Contract.set(duration()).to(_duration); 
    //store start time of crowdsale
     Contract.set(startTime()).to(_start_time);
    // store whether or not the crowdsale is whitelisted
     Contract.set(isWhitelisted()).to(_sale_is_whitelisted);
    // store the admin address
     Contract.set(admin()).to(_admin);
    //assign all excess tokens to the admin
    Contract.set(
      balances(_admin)
    ).to(_total_supply - _max_amount_to_sell);
  }

}