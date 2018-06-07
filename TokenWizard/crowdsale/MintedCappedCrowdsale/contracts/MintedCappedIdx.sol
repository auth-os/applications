pragma solidity ^0.4.23;

import './auth-os/Contract.sol';
import './auth-os/GetterInterface.sol';
import './auth-os/ArrayUtils.sol';

library MintedCappedIdx {

  using Contract for *;
  using SafeMath for uint;
  using ArrayUtils for bytes32[];

  bytes32 internal constant EXEC_PERMISSIONS = keccak256('sricpt_exec_permissions');

  // Returns the storage location of a script execution address's permissions -
  function execPermissions(address _exec) internal pure returns (bytes32 location) {
    location = keccak256(_exec, EXEC_PERMISSIONS);
  }

  /*
  Creates a crowdsale with initial conditions. The admin should now initialize the crowdsale's token, as well
  as any additional tiers of the crowdsale that will exist, followed by finalizing the initialization of the crowdsale.
  @param _team_wallet: The team funds wallet, where crowdsale purchases are forwarded
  @param _start_time: The start time of the initial tier of the crowdsale
  @param _initial_tier_name: The name of the initial tier of the crowdsale
  @param _initial_tier_price: The price of each token purchased in wei, for the initial crowdsale tier
  @param _initial_tier_duration: The duration of the initial tier of the crowdsale
  @param _initial_tier_token_sell_cap: The maximum number of tokens that can be sold during the initial tier
  @param _initial_tier_is_whitelisted: Whether the initial tier of the crowdsale requires an address be whitelisted for successful purchase
  @param _initial_tier_duration_is_modifiable: Whether the initial tier of the crowdsale has a modifiable duration
  @param _admin: A privileged address which is able to complete the crowdsale initialization process
  @return bytes: A formatted bytes array that will be parsed by storage to emit events, forward payment, and store data
  */
  function init(
    address _team_wallet,
    uint _start_time,
    bytes32 _initial_tier_name,
    uint _initial_tier_price,
    uint _initial_tier_duration,
    uint _initial_tier_token_sell_cap,
    bool _initial_tier_is_whitelisted,
    bool _initial_tier_duration_is_modifiable,
    address _admin
  ) public view returns (bytes memory) {
    // Begin execution - we are initializing an instance of this application
    Contract.initialize();

    // Ensure valid input
    if (
      _team_wallet == address(0)
      || _initial_tier_price == 0
      || _start_time < now
      || _start_time + _initial_tier_duration <= _start_time
      || _initial_tier_token_sell_cap == 0
      || _admin == address(0)
    ) revert('improper initialization');

    // Set up STORES action requests -
    Contract.storing();
    // Authorize sender as an executor for this instance -
    Contract.set(execPermissions(msg.sender)).to(true);
    // Store admin address, team wallet, initial tier duration, and sale start time
    Contract.set(admin()).to(_admin);
    Contract.set(wallet()).to(_team_wallet);
    Contract.set(
      total_duration()
    ).to(_initial_tier_duration);
    Contract.set(
      start_time()
    ).to(_start_time);
    // Store initial crowdsale tier list length and initial tier information
    Contract.set(
      crowdsale_tiers()
    ).to(uint(1));
    // Tier name
    Contract.set(
      bytes32(32 + uint(crowdsale_tiers()))
    ).to(_initial_tier_name);
    // Tier token sell cap
    Contract.set(
      bytes32(64 + uint(crowdsale_tiers()))
    ).to(_initial_tier_token_sell_cap);
    // Tier purchase price
    Contract.set(
      bytes32(96 + uint(crowdsale_tiers()))
    ).to(_initial_tier_price);
    // Tier active duration
    Contract.set(
      bytes32(128 + uint(crowdsale_tiers()))
    ).to(_initial_tier_duration);
    // Whether this tier's duration is modifiable prior to its start time
    Contract.set(
      bytes32(160 + uint(crowdsale_tiers()))
    ).to(_initial_tier_duration_is_modifiable);
    // Whether this tier requires an address be whitelisted to complete token purchase
    Contract.set(
      bytes32(192 + uint(crowdsale_tiers()))
    ).to(_initial_tier_is_whitelisted);

    // Store current crowdsale tier (offset by 1)
    Contract.set(current_tier()).to(uint(1));
    // Store current tier end time
    Contract.set(
      ends_at()
    ).to(_initial_tier_duration.add(_start_time));
    // Store current tier tokens remaining
    Contract.set(
      tokens_remaining()
    ).to(_initial_tier_token_sell_cap);

    Contract.commit();
  }
  /// CROWDSALE STORAGE ///

  // Storage location of crowdsale admin address
  function admin() internal pure returns (bytes32 location) {
    location = keccak256('admin');
  }

  // Whether the crowdsale and token are initialized, and the sale is ready to run
  function is_init() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_init");
  }

  // Whether or not the crowdsale is post-purchase
  function is_final() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_finalized");
  }

  // Storage location of the crowdsale's start time
  function start_time() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_start_time");
  }

  // Storage location of the amount of time the crowdsale will take, accounting for all tiers
  function total_duration() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_total_duration");
  }

  // Storage location of the amount of tokens sold in the crowdsale so far. Does not include reserved tokens
  function tokens_sold() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tokens_sold");
  }

  // Storage location of the minimum amount of tokens allowed to be purchased
  function min_cap() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_min_cap");
  }

  // Maps addresses to a boolean indicating whether or not this address has contributed
  // At its base location, stores the amount of unique contributors so far in this crowdsale
  function unique_contributors() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_contributors");
  }

  // Storage location of a list of the tiers the crowdsale will have
  function crowdsale_tiers() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_list");
  }

  // Storage location of the crowdsale_tiers() index (-1) of the current tier. If zero, no tier is currently active
  function current_tier() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_current_tier");
  }

  // Storage location of the end time of the current tier. Purchase attempts beyond this time will update the current tier (if another is available)
  function ends_at() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_ends_at");
  }

  // Storage location of the total number of tokens remaining for purchase in the current tier
  function tokens_remaining() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_tokens_remaining");
  }

  // Storage location of team funds wallet
  function wallet() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wallet");
  }

  // Storage location of amount of wei raised during the crowdsale, total
  function wei_raised() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wei_raised");
  }

  // Storage seed for crowdsale whitelist mappings - maps each tier's index to a mapping of addresses to whtielist information
  function sale_whitelist() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_purchase_whitelist");
  }

  /// TOKEN STORAGE ///

  // Storage location for token name
  function token_name() internal pure returns (bytes32 location) {
    location = keccak256("token_name");
  }

  // Storage location for token ticker symbol
  function token_symbol() internal pure returns (bytes32 location) {
    location = keccak256("token_symbol");
  }

  // Storage location for token decimals
  function token_decimals() internal pure returns (bytes32 location) {
    location = keccak256("token_decimals");
  }

  // Storage location for token totalSupply
  function total_supply() internal pure returns (bytes32 location) {
    location = keccak256("token_total_supply");
  }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address owner) internal pure returns (bytes32 location) {
    location = keccak256(keccak256(owner), TOKEN_BALANCES);
  }

  // Storage seed for user allowances mapping
  bytes32 internal constant TOKEN_ALLOWANCES = keccak256("token_allowances");

  function allowances(address owner, address spender) internal pure returns (bytes32 location) {
    location = keccak256(keccak256(spender), keccak256(keccak256(owner), TOKEN_ALLOWANCES));
  }

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  function transfer_agent(address agent) internal pure returns (bytes32 location) {
    location = keccak256(keccak256(agent), TOKEN_TRANSFER_AGENTS);
  }

  // Whether or not the token is unlocked for transfers
  function tokens_unlocked() internal pure returns (bytes32 location) {
    location = keccak256('crowdsale_tokens_unlocked');
  }

  /// Storage location for an array of addresses with some form of reserved tokens
  function reserved_destinations() internal pure returns (bytes32 location) {
    location = keccak256("token_reserved_dest_list");
  }

  // Storage seed for reserved token information for a given address
  // Maps an address for which tokens are reserved to a struct:
  // ReservedInfo { uint destination_list_index; uint num_tokens; uint num_percent; uint percent_decimals; }
  // destination_list_index is the address's index in TOKEN_RESERVED_DESTINATIONS, plus 1. 0 means the address is not in the list
  bytes32 internal constant TOKEN_RESERVED_ADDR_INFO = keccak256("token_reserved_addr_info");

  function reserved_info(address destination) internal pure returns (bytes32 location) {
    location = keccak256(keccak256(destination), TOKEN_RESERVED_ADDR_INFO);
  }

  /*
  Returns the address of the admin of the crowdsale
  @param _storage: The application's storage address
  @param exec_id: The execution id to pull the admin address from
  @return admin: The address of the admin of the crowdsale
  */
  function getAdmin(address _storage, bytes32 exec_id) external view returns (address _admin) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage and get return value
    _admin = address(target.read(exec_id, admin()));
  }

  /// CROWDSALE GETTERS ///

  /*
  Returns sale information on a crowdsale
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return wei_raised: The amount of wei raised in the crowdsale so far
  @return team_wallet: The address to which funds are forwarded during this crowdsale
  @return minimum_contribution: The minimum amount of tokens that must be purchased
  @return is_initialized: Whether or not the crowdsale has been completely initialized by the admin
  @return is_finalized: Whether or not the crowdsale has been completely finalized by the admin
  */
  function getCrowdsaleInfo(address _storage, bytes32 exec_id) public view
  returns (uint _wei_raised, address team_wallet, uint minimum_contribution, bool is_initialized, bool is_finalized) {

    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](5);

    arr_indices[0] = wei_raised();
    arr_indices[1] = wallet();
    arr_indices[2] = min_cap();
    arr_indices[3] = is_init();
    arr_indices[4] = is_final();

    bytes32[] memory read_values = target.readMulti(exec_id, arr_indices);

    // Get returned data -
    _wei_raised = uint(read_values[0]);
    team_wallet = address(read_values[1]);
    minimum_contribution = uint(read_values[2]);
    is_initialized = (read_values[3] == 0 ? false : true);
    is_finalized = (read_values[4] == 0 ? false : true);
  }

  /*
  Returns true if all tiers have been completely sold out
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return is_crowdsale_full: Whether or not the total number of tokens to sell in the crowdsale has been reached
  @return max_sellable: The total number of tokens that can be sold in the crowdsale
  */
  function isCrowdsaleFull(address _storage, bytes32 exec_id) public view returns (bool is_crowdsale_full, uint max_sellable) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory initial_arr = new bytes32[](2);
    // Push crowdsale tier list length and total tokens sold storage locations to buffer
    initial_arr[0] = crowdsale_tiers();
    initial_arr[1] = tokens_sold();
    // Read from storage
    uint[] memory read_values = target.readMulti(exec_id, initial_arr).toUintArr();

    // Get number of tiers and tokens sold
    uint num_tiers = read_values[0];
    uint _tokens_sold = read_values[1];

    bytes32[] memory arr_indices = new bytes32[](num_tiers);
    // Loop through tier cap locations, and add each to the calldata buffer
    for (uint i = 0; i < num_tiers; i++)
      arr_indices[i] = bytes32(64 + (192 * i) + uint(crowdsale_tiers()));

    // Read from storage
    read_values = target.readMulti(exec_id, arr_indices).toUintArr();
    // Ensure correct return length
    assert(read_values.length == num_tiers);

    // Loop through returned values, and get the sum of all tier token sell caps
    for (i = 0; i < read_values.length; i++)
      max_sellable += read_values[i];

    // Get return value
    is_crowdsale_full = (_tokens_sold >= max_sellable ? true : false);
  }

  /*
  Returns the number of unique contributors to a crowdsale
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return num_unique: The number of unique contributors in a crowdsale so far
  */
  function getCrowdsaleUniqueBuyers(address _storage, bytes32 exec_id) public view returns (uint num_unique) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage and return
    num_unique = uint(target.read(exec_id, unique_contributors()));
  }

  /*
  Returns the start and end time of the crowdsale
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return start_time: The start time of the first tier of a crowdsale
  @return end_time: The time at which the crowdsale ends
  */
  function getCrowdsaleStartAndEndTimes(address _storage, bytes32 exec_id) public view returns (uint _start_time, uint _end_time) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](2);
    arr_indices[0] = start_time();
    arr_indices[1] = total_duration();
    // Read from storage
    uint[] memory read_values = target.readMulti(exec_id, arr_indices).toUintArr();
    // Ensure correct return length
    assert(read_values.length == 2);

    // Get return values
    _start_time = read_values[0];
    _end_time = _start_time + read_values[1];
  }

  /*
  Returns information on the current crowdsale tier
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return tier_name: The name of the current tier
  @return tier_index: The current tier's index in the crowdsale_tiers() list
  @return tier_ends_at: The time at which purcahses for the current tier are forcibly locked
  @return tier_tokens_remaining: The amount of tokens remaining to be purchased in the current tier
  @return tier_price: The price of each token purchased this tier, in wei
  @return duration_is_modifiable: Whether the crowdsale admin can update the duration of this tier before it starts
  @return whitelist_enabled: Whether an address must be whitelisted to participate in this tier
  */
  function getCurrentTierInfo(address _storage, bytes32 exec_id) public view
  returns (bytes32 tier_name, uint tier_index, uint tier_ends_at, uint tier_tokens_remaining, uint tier_price, bool duration_is_modifiable, bool whitelist_enabled) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory initial_arr = new bytes32[](3);
    // Push current tier expiration time, current tier index, and current tier tokens remaining storage locations to calldata buffer
    initial_arr[0] = ends_at();
    initial_arr[1] = current_tier();
    initial_arr[2] = tokens_remaining();
    // Read from storage and store return in buffer
    uint[] memory read_values = target.readMulti(exec_id, initial_arr).toUintArr();
    // Ensure correct return length
    assert(read_values.length == 3);

    // If the returned index was 0, current tier does not exist: return now
    if (read_values[1] == 0)
      return;

    // Get returned values -
    tier_ends_at = read_values[0];
    // Indices are stored as 1 + (actual index), to avoid conflicts with a default 0 value
    tier_index = read_values[1] - 1;
    tier_tokens_remaining = read_values[2];

    bytes32[] memory arr_indices = new bytes32[](4);
    // Push tier name, tier token price, modifiable status, and tier whitelist status storage locations to buffer
    uint name_storage_offset = 32 + (192 * tier_index) + uint(crowdsale_tiers());
    arr_indices[0] = bytes32(name_storage_offset);
    arr_indices[1] = bytes32(64 + name_storage_offset);
    arr_indices[2] = bytes32(128 + name_storage_offset);
    arr_indices[3] = bytes32(160 + name_storage_offset);

    // Read from storage and get return values
    read_values = target.readMulti(exec_id, arr_indices).toUintArr();

    // Ensure correct return length
    assert(read_values.length == 4);

    tier_name = bytes32(read_values[0]);
    tier_price = read_values[1];
    duration_is_modifiable = (read_values[2] == 0 ? false : true);
    whitelist_enabled = (read_values[3] == 0 ? false : true);
  }

  /*
  Returns information on a given tier
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @param _index: The index of the tier in the crowdsale tier list. Input index should be like a normal array index (lowest index: 0)
  @return tier_name: The name of the returned tier
  @return tier_sell_cap: The amount of tokens designated to be sold during this tier
  @return tier_price: The price of each token in wei for this tier
  @return tier_duration: The duration of the given tier
  @return duration_is_modifiable: Whether the crowdsale admin can change the duration of this tier prior to its start time
  @return whitelist_enabled: Whether an address must be whitelisted to participate in this tier
  */
  function getCrowdsaleTier(address _storage, bytes32 exec_id, uint _index) public view
  returns (bytes32 tier_name, uint tier_sell_cap, uint tier_price, uint tier_duration, bool duration_is_modifiable, bool whitelist_enabled) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](6);
    // Get tier offset storage location
    uint tier_info_location = 32 + (192 * _index) + uint(crowdsale_tiers());
    // Push tier name, sell cap, duration, and modifiable status storage locations to buffer
    arr_indices[0] = bytes32(tier_info_location);
    arr_indices[1] = bytes32(32 + tier_info_location);
    arr_indices[2] = bytes32(64 + tier_info_location);
    arr_indices[3] = bytes32(96 + tier_info_location);
    arr_indices[4] = bytes32(128 + tier_info_location);
    arr_indices[5] = bytes32(160 + tier_info_location);
    // Read from storage and store return in buffer
    bytes32[] memory read_values = target.readMulti(exec_id, arr_indices);
    // Ensure correct return length
    assert(read_values.length == 6);

    // Get returned values -
    tier_name = read_values[0];
    tier_sell_cap = uint(read_values[1]);
    tier_price = uint(read_values[2]);
    tier_duration = uint(read_values[3]);
    duration_is_modifiable = (read_values[4] == 0 ? false : true);
    whitelist_enabled = (read_values[5] == 0 ? false : true);
  }

  /*
  Returns the maximum amount of wei to raise, as well as the total amount of tokens that can be sold
  @param _storage: The storage address of the crowdsale application
  @param exec_id: The execution id of the application
  @return wei_raise_cap: The maximum amount of wei to raise
  @return total_sell_cap: The maximum amount of tokens to sell
  */
  function getCrowdsaleMaxRaise(address _storage, bytes32 exec_id) public view returns (uint wei_raise_cap, uint total_sell_cap) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](3);
    // Push crowdsale tier list length, token decimals, and token name storage locations to buffer
    arr_indices[0] = crowdsale_tiers();
    arr_indices[1] = token_decimals();
    arr_indices[2] = token_name();

    // Read from storage
    uint[] memory read_values = target.readMulti(exec_id, arr_indices).toUintArr();
    // Ensure correct return length
    assert(read_values.length == 3);

    // Get number of crowdsale tiers
    uint num_tiers = read_values[0];
    // Get number of token decimals
    uint num_decimals = read_values[1];

    // If the token has not been set, return
    if (read_values[2] == 0)
      return (0, 0);

    // Overwrite previous buffer - push exec id, data read offset, and read size to buffer
    bytes32[] memory last_arr = new bytes32[](2 * num_tiers);
    // Loop through tiers and get sell cap and purchase price for each tier
    for (uint i = 0; i < 2 * num_tiers; i+=2) {
      last_arr[i] = bytes32(64 + (192 * (i / 2)) + uint(crowdsale_tiers()));
      last_arr[i + 1] = bytes32(96 + (192 * (i / 2)) + uint(crowdsale_tiers()));
    }

    // Read from storage
    read_values = target.readMulti(exec_id, last_arr).toUintArr();
    // Ensure correct return length
    assert(read_values.length == 2 * num_tiers);

    // Loop through and get wei raise cap and token sell cap
    for (i = 0; i < read_values.length; i+=2) {
      total_sell_cap += read_values[i];
      // Increase maximum wei able to be raised - (tier token sell cap) * (tier price in wei) / (10 ^ decimals)
      wei_raise_cap += (read_values[i] * read_values[i + 1]) / (10 ** num_decimals);
    }
  }

  /*
  Returns a list of the named tiers of the crowdsale
  @param _storage: The storage address of the crowdsale application
  @param exec_id: The execution id of the application
  @return crowdsale_tiers: A list of each tier of the crowdsale
  */
  function getCrowdsaleTierList(address _storage, bytes32 exec_id) public view returns (bytes32[] memory _crowdsale_tiers) {
    GetterInterface target = GetterInterface(_storage);
    // Read from storage and get list length
    uint list_length = uint(target.read(exec_id, crowdsale_tiers()));

    bytes32[] memory arr_indices = new bytes32[](list_length);
    // Loop over each tier name list location and add to buffer
    for (uint i = 0; i < list_length; i++)
      arr_indices[i] = bytes32(32 + (192 * i) + uint(crowdsale_tiers()));

    // Read from storage and return
    _crowdsale_tiers = target.readMulti(exec_id, arr_indices);
    // Ensure correct return length
    assert(_crowdsale_tiers.length == list_length);
  }

  /*
  Loops through all tiers and their durations, and returns the passed-in index's start and end dates
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @param _index: The index of the tier in the crowdsale tier list. Input index should be like a normal array index (lowest index: 0)
  @return tier_start: The time when the given tier starts
  @return tier_end: The time at which the given tier ends
  */
  function getTierStartAndEndDates(address _storage, bytes32 exec_id, uint _index) public view returns (uint tier_start, uint tier_end) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](3 + _index);

    // Add crowdsale tier list length and crowdsale start time to buffer
    arr_indices[0] = crowdsale_tiers();
    arr_indices[1] = start_time();
    // Get storage read offset for initial tier duration, then loop over each tier until _index and add their duration storage locations to the read buffer
    bytes32 duration_offset = bytes32(128 + uint(crowdsale_tiers()));

    for (uint i = 0; i <= _index; i++) {
      arr_indices[2 + i] = duration_offset;
      // Increment the duration offset to the next index in the array
      duration_offset = bytes32(192 + uint(duration_offset));
    }

    // Read from storage and store return in buffer
    uint[] memory read_values = target.readMulti(exec_id, arr_indices).toUintArr();
    // Ensure correct return length
    assert(read_values.length == 3 + _index);

    // Check that the passed-in index is within the range of the tier list
    if (read_values[0] <= _index)
      return (0, 0);

    // Get returned start time, then loop through each returned duration and get the start time for the tier
    tier_start = read_values[1];
    for (i = 0; i < _index; i++)
      tier_start += read_values[2 + i];

    // Get the tier end time - start time plus the duration of the tier, the last read value in the list
    tier_end = tier_start + read_values[read_values.length - 1];
  }

  /*
  Returns the number of tokens sold so far this crowdsale
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return tokens_sold: The number of tokens sold this crowdsale so far
  */
  function getTokensSold(address _storage, bytes32 exec_id) public view
  returns (uint _tokens_sold) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage and return
    _tokens_sold = uint(target.read(exec_id, tokens_sold()));
  }

  /*
  Returns whitelist information for a given buyer
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @param _tier_index: The index of the tier about which the whitelist information will be pulled
  @param _buyer: The address of the user whose whitelist status will be returned
  @return minimum_contribution: The minimum ammount of tokens the buyer must purchase during this tier
  @return max_spend_remaining: The maximum amount of wei able to be spent by the buyer during this tier
  */
  function getWhitelistStatus(address _storage, bytes32 exec_id, uint _tier_index, address _buyer) public view
  returns (uint minimum_contribution, uint max_spend_remaining) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](2);
    // Get buyer whitelist location for the tier -
    bytes32 location = keccak256(keccak256(_buyer), keccak256(_tier_index, sale_whitelist()));
    // Push whitelist minimum contribution location to buffer
    arr_indices[0] = location;
    // Push whitlist maximum spend amount remaining location to buffer
    arr_indices[1] = bytes32(32 + uint(location));

    // Read from storage and return
    uint[] memory read_values = target.readMulti(exec_id, arr_indices).toUintArr();
    // Ensure correct return length
    assert(read_values.length == 2);

    minimum_contribution = read_values[0];
    max_spend_remaining = read_values[1];
  }

  /*
  Returns the list of whitelisted buyers for a given tier
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @param _tier_index: The index of the tier about which the whitelist information will be pulled
  @return num_whitelisted: The length of the tier's whitelist array
  @return whitelist: The tier's whitelisted addresses
  */
  function getTierWhitelist(address _storage, bytes32 exec_id, uint _tier_index) public view returns (uint num_whitelisted, address[] memory whitelist) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage and get returned tier whitelist length
    num_whitelisted = uint(target.read(exec_id, keccak256(_tier_index, sale_whitelist())));

    // If there are no whitelisted addresses, return
    if (num_whitelisted == 0)
      return;

    bytes32[] memory arr_indices = new bytes32[](num_whitelisted);
    // Loop through the number of whitelisted addresses, and push each to the calldata buffer to be read from storage
    for (uint i = 0; i < num_whitelisted; i++)
      arr_indices[i] = bytes32(32 + (32 * i) + uint(keccak256(_tier_index, sale_whitelist())));

    // Read from storage and return
    whitelist = target.readMulti(exec_id, arr_indices).toAddressArr();
    // Ensure correct return length
    assert(whitelist.length == num_whitelisted);
  }

  /// TOKEN GETTERS ///

  /*
  Returns the balance of an address
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @param _owner: The address to look up the balance of
  @return owner_balance: The token balance of the owner
  */
  function balanceOf(address _storage, bytes32 exec_id, address _owner) public view
  returns (uint owner_balance) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    owner_balance = uint(target.read(exec_id, balances(_owner)));
  }

  /*
  Returns the amount of tokens a spender may spend on an owner's behalf
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @param _owner: The address allowing spends from a spender
  @param _spender: The address allowed tokens by the owner
  @return allowed: The amount of tokens that can be transferred from the owner to a location of the spender's choosing
  */
  function allowance(address _storage, bytes32 exec_id, address _owner, address _spender) public view
  returns (uint allowed) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    allowed = uint(target.read(exec_id, allowances(_owner, _spender)));
  }

  /*
  Returns the number of display decimals for a token
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return token_decimals: The number of decimals associated with token balances
  */
  function decimals(address _storage, bytes32 exec_id) public view
  returns (uint _token_decimals) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    _token_decimals = uint(target.read(exec_id, token_decimals()));
  }

  /*
  Returns the total token supply of a given token app instance
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return total_supply: The total token supply
  */
  function totalSupply(address _storage, bytes32 exec_id) public view
  returns (uint _total_supply) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    _total_supply = uint(target.read(exec_id, total_supply()));
  }

  /*
  Returns the name field of a given token app instance
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return token_name: The name of the token
  */
  function name(address _storage, bytes32 exec_id) public view returns (bytes32 _token_name) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    _token_name = target.read(exec_id, token_name());
  }

  /*
  Returns the ticker symbol of a given token app instance
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return token_symbol: The token's ticker symbol
  */
  function symbol(address _storage, bytes32 exec_id) public view returns (bytes32 _token_symbol) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    _token_symbol = target.read(exec_id, token_symbol());
  }

  /*
  Returns general information on a token - name, symbol, decimals, and total supply
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under which storage for this instance is located
  @return token_name: The name of the token
  @return token_symbol: The token ticker symbol
  @return token_decimals: The display decimals for the token
  @return total_supply: The total supply of the token
  */
  function getTokenInfo(address _storage, bytes32 exec_id) public view
  returns (bytes32 _token_name, bytes32 _token_symbol, uint _token_decimals, uint _total_supply) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](4);
    // Place token name, symbol, decimals, and total supply storage locations in buffer
    arr_indices[0] = token_name();
    arr_indices[1] = token_symbol();
    arr_indices[2] = token_decimals();
    arr_indices[3] = total_supply();

    // Read from storage
    bytes32[] memory read_values = target.readMulti(exec_id, arr_indices);
    // Ensure correct return length
    assert(read_values.length == 4);

    // Get return values -
    _token_name = read_values[0];
    _token_symbol = read_values[1];
    _token_decimals = uint(read_values[2]);
    _total_supply = uint(read_values[3]);
  }

  /*
  Returns whether or not an address is a transfer agent, meaning they can transfer tokens before the crowdsale is finalized
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under storage for this app instance is located
  @param _agent: The address about which to look up information
  @return is_transfer_agent: Whether the passed-in address is a transfer agent
  */
  function getTransferAgentStatus(address _storage, bytes32 exec_id, address _agent) public view
  returns (bool is_transfer_agent) {
    GetterInterface target = GetterInterface(_storage);

    // Read from storage
    is_transfer_agent = (target.read(exec_id, transfer_agent(_agent)) == 0 ? false : true);
  }

  /*
  Returns information on a reserved token address (the crowdsale admin can set reserved tokens for addresses before initializing the crowdsale)
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under storage for this app instance is located
  @return num_destinations: The length of the crowdsale's reserved token destination array
  @return reserved_destinations: A list of the addresses which have reserved tokens or percents
  */
  function getReservedTokenDestinationList(address _storage, bytes32 exec_id) public view
  returns (uint num_destinations, address[] memory _reserved_destinations) {
    GetterInterface target = GetterInterface(_storage);

    // Read reserved destination list length from storage
    num_destinations = uint(target.read(exec_id, reserved_destinations()));

    // If num_destinations is 0, return now
    if (num_destinations == 0)
      return (0, _reserved_destinations);

    /// Loop through each list in storage, and get each address -

    bytes32[] memory arr_indices = new bytes32[](num_destinations);
    // Add each destination index location to calldata
    for (uint i = 1; i <= num_destinations; i++)
      arr_indices[i - 1] = (bytes32((32 * i) + uint(reserved_destinations())));

    // Read from storage, and return data to buffer
    _reserved_destinations = target.readMulti(exec_id, arr_indices).toAddressArr();
    // Ensure correct return length
    assert(_reserved_destinations.length == num_destinations);
  }

  /*
  Returns information on a reserved token address (the crowdsale admin can set reserved tokens for addresses before initializing the crowdsale)
  @param _storage: The address where application storage is located
  @param exec_id: The application execution id under storage for this app instance is located
  @param _destination: The address about which reserved token information will be pulled
  @return destination_list_index: The index in the reserved token destination list where this address is found, plus 1. If zero, destination has no reserved tokens
  @return num_tokens: The number of tokens reserved for this address
  @return num_percent: The percent of tokens sold during the crowdsale reserved for this address
  @return percent_decimals: The number of decimals in the above percent reserved - used to calculate with precision
  */
  function getReservedDestinationInfo(address _storage, bytes32 exec_id, address _destination) public view
  returns (uint destination_list_index, uint num_tokens, uint num_percent, uint percent_decimals) {
    GetterInterface target = GetterInterface(_storage);

    bytes32[] memory arr_indices = new bytes32[](4);
    // Push reserved destination information storage locations to buffer -
    uint base_loc = uint(reserved_info(_destination));
    arr_indices[0] = bytes32(base_loc);
    arr_indices[1] = bytes32(32 + base_loc);
    arr_indices[2] = bytes32(64 + base_loc);
    arr_indices[3] = bytes32(96 + base_loc);

    // Read from storage, and return data to buffer
    bytes32[] memory read_values = target.readMulti(exec_id, arr_indices);
    // Ensure correct return length
    assert(read_values.length == 4);

    // Get returned values -
    destination_list_index = uint(read_values[0]);
    // If the returned list index for the destination is 0, destination is not in list
    if (destination_list_index == 0)
      return;
    destination_list_index--;
    num_tokens = uint(read_values[1]);
    num_percent = uint(read_values[2]);
    percent_decimals = uint(read_values[3]);
  }
}
