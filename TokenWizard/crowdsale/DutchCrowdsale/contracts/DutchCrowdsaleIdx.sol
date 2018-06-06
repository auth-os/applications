pragma solidity ^0.4.23;

import "./lib/Contract.sol";
import "./interfaces/GetterInterface.sol";
import "./lib/ArrayUtils.sol";

library DutchCrowdsaleIdx {

  using Contract for *;
  using ArrayUtils for bytes32[]; 

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

  /// INIT FUNCTION ///

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
    Contract.set(maxSellCap()).to(_max_amount_to_sell);
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

    Contract.commit();
  }


  /// CROWDSALE GETTERS ///

  /*
  Returns the address of the admin of the crowdsale
  @param _storage: The application's storage address
  @param _exec_id: The execution id to pull the admin address from
  @return admin: The address of the admin of the crowdsale
  */
  function getAdmin(address _storage, bytes32 _exec_id) external view returns (address _admin) {
    // Obtain storage seed for crowdsale admin 
    bytes32 seed = admin();

    // Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return admin address
    _admin = address(target.read(_exec_id, seed));
  } 

  /*
  Returns sale information on a crowdsale
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return wei_raised: The amount of wei raised in the crowdsale so far
  @return team_wallet: The address to which funds are forwarded during this crowdsale
  @return minimum_contribution: The minimum amount of tokens that must be purchased
  @return is_initialized: Whether or not the crowdsale has been completely initialized by the admin
  @return is_finalized: Whether or not the crowdsale has been completely finalized by the admin
  */
  function getCrowdsaleInfo(address _storage, bytes32 _exec_id) external view
  returns (uint wei_raised, address team_wallet, uint minimum_contribution, bool is_initialized, bool is_finalized) {
    //Set up bytes32 array to store storage seeds 
    bytes32[] memory seed_arr = new bytes32[](5);

    //Assign each location of seed_arr to its respective seed 
    seed_arr[0] = weiRaised();
    seed_arr[1] = wallet();
    seed_arr[2] = minContribution();
    seed_arr[3] = isInit();
    seed_arr[4] = isFinalized();

    //Declare GetterInterface instance
    GetterInterface target = GetterInterface(_storage);

    //Read and return all wei_raised, wallet address, min_contribution, and init/finalization status 
    bytes32[] memory values_arr = target.readMulti(_exec_id, seed_arr);

    //Assign all return values 
    wei_raised = uint(values_arr[0]);
    team_wallet = address(values_arr[1]);
    minimum_contribution = uint(values_arr[2]);
    is_initialized = (values_arr[3] == bytes32(1) ? true : false);
    is_finalized = (values_arr[4] == bytes32(1) ? true : false);
  }

  /*
  Returns true if all tiers have been completely sold out
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return is_crowdsale_full: Whether or not the total number of tokens to sell in the crowdsale has been reached
  @return max_sellable: The total number of tokens that can be sold in the crowdsale
  */
  function isCrowdsaleFull(address _storage, bytes32 _exec_id) external view returns (bool is_crowdsale_full, uint max_sellable) {
    //Set up bytes32 array to store storage seeds
    bytes32[] memory seed_arr = new bytes32[](2);

    //Assign each location of seed_arr to its respective seed 
    seed_arr[0] = tokensRemaining();
    seed_arr[1] = maxSellCap();

    //Declare GetterInterface instance
    GetterInterface target = GetterInterface(_storage);

    //Read and return tokens remaining and max token sell cap 
    uint[] memory values_arr = target.readMulti(_exec_id, seed_arr).toUintArr();

    //Assign return values
    is_crowdsale_full = (values_arr[0] == 0 ? true : false);
    max_sellable = values_arr[1];
  }

  /*
  Returns the number of unique contributors to a crowdsale
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return num_unique: The number of unique contributors in a crowdsale so far
  */
  function getCrowdsaleUniqueBuyers(address _storage, bytes32 _exec_id) external view returns (uint num_unique) {
    //Get storage seed of num unique contributors 
    bytes32 seed = uniqueContributors();

    //Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Assign return value
    num_unique = uint(target.read(_exec_id, seed));
  }

  /*
  Returns the start and end time of the crowdsale
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return start_time: The start time of the crowdsale
  @return end_time: The time at which the crowdsale ends
  */
  function getCrowdsaleStartAndEndTimes(address _storage, bytes32 _exec_id) external view 
  returns (uint start_time, uint end_time) {
    //Set up bytes32 array to store storage seeds
    bytes32[] memory seed_arr = new bytes32[](2);

    //Assign seeds to locations of array
    seed_arr[0] = startTime();
    seed_arr[1] = duration(); 

    //Declare GetterInterface instance
    GetterInterface target = GetterInterface(_storage);

    //Read and return start time and duration 
    bytes32[] memory values_arr = target.readMulti(_exec_id, seed_arr);

    //Assign return values 
    start_time = uint(values_arr[0]);
    end_time = uint(values_arr[1]) + start_time;
  }  

  /*
  Returns information on the status of the sale
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return current_rate: The current rate at which tokens are being sold. Rate is in wei/10^18 units
  @return time_remaining: The amount of time remaining in the crowdsale
  @return tokens_remaining: The amount of tokens still available to be sold
  */
  function getCrowdsaleStatus(address _storage, bytes32 _exec_id) external view
  returns (uint start_rate, uint end_rate, uint current_rate, uint sale_duration, uint time_remaining, uint tokens_remaining) {
    //Set up bytes32 array to storage seeds
    bytes32[] memory seed_arr = new bytes32[](5);

    //Assign seeds to locations of array
    seed_arr[0] = startRate();
    seed_arr[1] = endRate();
    seed_arr[2] = startTime();
    seed_arr[3] = duration();
    seed_arr[4] = tokensRemaining();

    //Declare GetterInterface instance
    GetterInterface target = GetterInterface(_storage);

    //Read and return values 
    uint[] memory values_arr = target.readMulti(_exec_id, seed_arr).toUintArr();

    //Assign return values and intermediary values 
    start_rate = values_arr[0];
    end_rate = values_arr[1];
    uint start_time = values_arr[2];
    sale_duration = values_arr[3];
    tokens_remaining = values_arr[4];

    (current_rate, time_remaining) = 
      getRateAndTimeRemaining(start_time, sale_duration, start_rate, end_rate);
  }

  /*
  Gets the current token sale rate and time remaining, given various information
  @param _start_time: The start time of the crowdsale
  @param _duration: The duration of the crowdsale
  @param _start_rate: The amount of tokens recieved per wei at the beginning of the sale
  @param _end_rate: The amount of tokens recieved per wei at the end of the sale
  @return current_rate: The current rate of wei/10^18 token units
  @return time_remaining: The amount of time remaining in the crowdsale
  */
  function getRateAndTimeRemaining(uint _start_time, uint _duration, uint _start_rate, uint _end_rate) internal view
  returns (uint current_rate, uint time_remaining)  {
    // If the sale has not started, return 0
    if (now <= _start_time)
      return (_start_rate, (_duration + _start_time - now));

    uint time_elapsed = now - _start_time;
    // If the sale has ended, return 0
    if (time_elapsed >= _duration)
      return (0, 0);

    // Crowdsale is still active -
    time_remaining = _duration - time_elapsed;
    // Calculate current rate, adding decimals for precision -
    time_elapsed *= (10 ** 18);
    current_rate = ((_start_rate - _end_rate) * time_elapsed) / _duration;
    current_rate /= (10 ** 18); // Remove additional precision decimals
    current_rate = _start_rate - current_rate;   
  }

  /*
  Returns the number of tokens sold - maximum number to sell minus tokens remaining
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return tokens_sold: The number of tokens sold this crowdsale so far
  */
  function getTokensSold(address _storage, bytes32 _exec_id) external view returns (uint tokens_sold) {
    //Set up bytes32 array to hold storage seeds 
    bytes32[] memory seed_arr = new bytes32[](2);

    //Assign seeds to locations in array
    seed_arr[0] = maxSellCap();
    seed_arr[1] = tokensRemaining(); 

    //Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return values 
    uint[] memory values_arr = target.readMulti(_exec_id, seed_arr).toUintArr();

    //Get return value 
    tokens_sold = values_arr[0] - values_arr[1];


  }

  /*
  Returns whitelist information for a given buyer
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @param _buyer: The address of the user whose whitelist status will be returned
  @return minimum_contribution: The minimum ammount of tokens the buyer must purchase
  @return max_spend_remaining: The maximum amount of wei able to be spent
  */
  function getWhitelistStatus(address _storage, bytes32 _exec_id, address _buyer) external view
  returns (uint minimum_contribution, uint max_spend_remaining) {
    //Set up bytes32 array to hold storage seeds 
    bytes32[] memory seed_arr = new bytes32[](2);

    //Assign locations of seed_arry to respective seeds 
    seed_arr[0] = whitelistMinContrib(_buyer);
    seed_arr[1] = whitelistSpendRemaining(_buyer);

    //Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return values
    uint[] memory values_arr = target.readMulti(_exec_id, seed_arr).toUintArr();

    //Assign return values 
    minimum_contribution = values_arr[0];
    max_spend_remaining = values_arr[1];
  } 

  /*
  Returns the list of whitelisted buyers for the crowdsale
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return num_whitelisted: The length of the crowdsale's whitelist array
  @return whitelist: The crowdsale's whitelisted addresses
  */
  function getCrowdsaleWhitelist(address _storage, bytes32 _exec_id) external view
  returns (uint num_whitelisted, address[] memory whitelist) {
    //Storage seed for sale's whitelist 
    bytes32 seed = SALE_WHITELIST;

    //Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return values
    uint whitelist_length = uint(target.read(_exec_id, seed));

    if (whitelist_length == 0)
      return (whitelist_length, whitelist);

    //Set up storage seed arr fir whitelisted addresses
    bytes32[] memory seed_arr = new bytes32[](whitelist_length);

    //Assign seeds to seed array 
    for (uint i = 0; i < whitelist_length; i++) {
    	seed_arr[i] = bytes32(32 * (i + 1) + uint(SALE_WHITELIST));
    }

    //Read and assign the values 
    whitelist = target.readMulti(_exec_id, seed_arr).toAddressArr();
  }

  /// TOKEN GETTERS ///

  /*
  Returns the balance of an address
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @param _owner: The address to look up the balance of
  @return owner_balance: The token balance of the owner
  */
  function balanceOf(address _storage, bytes32 _exec_id, address _owner) external view
  returns (uint owner_balance) {
    // Get seed
  	bytes32 seed = balances(_owner);

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return value
    owner_balance = uint(target.read(_exec_id, seed));

  }

  /*
  Returns the amount of tokens a spender may spend on an owner's behalf
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @param _owner: The address allowing spends from a spender
  @param _spender: The address allowed tokens by the owner
  @return allowed: The amount of tokens that can be transferred from the owner to a location of the spender's choosing
  */
  function allowance(address _storage, bytes32 _exec_id, address _owner, address _spender) external view
  returns (uint _allowed) {
    // Get seed
  	bytes32 seed = allowed(_owner, _spender);

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return value
    _allowed = uint(target.read(_exec_id, seed));
  }

  /*
  Returns the number of display decimals for a token
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return token_decimals: The number of decimals associated with token balances
  */
  function decimals(address _storage, bytes32 _exec_id) external view
  returns (uint token_decimals) {
    // Get seed
  	bytes32 seed = decimals();

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return value
    token_decimals = uint(target.read(_exec_id, seed));
  }

  /*
  Returns the total token supply of a given token app instance
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return total_supply: The total token supply
  */
  function totalSupply(address _storage, bytes32 _exec_id) external view
  returns (uint total_supply) {
    // Get seed
  	bytes32 seed = tokenTotalSupply();

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return value
    total_supply = uint(target.read(_exec_id, seed));
  }

  /*
  Returns the name field of a given token app instance
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return token_name: The name of the token
  */
  function name(address _storage, bytes32 _exec_id) external view returns (bytes32 token_name) {
    // Get seed
  	bytes32 seed = tokenName();

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return value
    token_name = target.read(_exec_id, seed);
  }

  /*
  Returns the ticker symbol of a given token app instance
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return token_symbol: The token's ticker symbol
  */
  function symbol(address _storage, bytes32 _exec_id) external view returns (bytes32 token_symbol) {
    // Get seed
  	bytes32 seed = tokenSymbol();

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Read and return value
    token_symbol = target.read(_exec_id, seed);
  }

  /*
  Returns general information on a token - name, symbol, decimals, and total supply
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under which storage for this instance is located
  @return token_name: The name of the token
  @return token_symbol: The token ticker symbol
  @return token_decimals: The display decimals for the token
  @return total_supply: The total supply of the token
  */
  function getTokenInfo(address _storage, bytes32 _exec_id) external view
  returns (bytes32 token_name, bytes32 token_symbol, uint token_decimals, uint total_supply) {
    //Set up bytes32 array to hold storage seeds 
    bytes32[] memory seed_arr = new bytes32[](4);

    //Assign locations of array to respective seeds 
    seed_arr[0] = tokenName();
    seed_arr[1] = tokenSymbol();
    seed_arr[2] = decimals();
    seed_arr[3] = tokenTotalSupply();

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);
    
    //Read and return values from storage
    bytes32[] memory values_arr = target.readMulti(_exec_id, seed_arr);

    //Assign values to return params 
    token_name = values_arr[0];
    token_symbol = values_arr[1];
    token_decimals = uint(values_arr[2]);
    total_supply = uint(values_arr[3]);

  } 

  /*
  Returns whether or not an address is a transfer agent, meaning they can transfer tokens before the crowdsale is finalized
  @param _storage: The address where application storage is located
  @param _exec_id: The application execution id under storage for this app instance is located
  @param _agent: The address about which to look up information
  @return is_transfer_agent: Whether the passed-in address is a transfer agent
  */
  function getTransferAgentStatus(address _storage, bytes32 _exec_id, address _agent) external view
  returns (bool is_transfer_agent) {
  	//Obtain storage seed 
  	bytes32 seed = transferAgentStatus(_agent);

  	//Declare GetterInterface instance 
    GetterInterface target = GetterInterface(_storage);

    //Obtain value from storage and assign to return param 
    is_transfer_agent = (target.read(_exec_id, seed) == bytes32(1) ? true : false);

  } 
  

}