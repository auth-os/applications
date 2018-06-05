pragma solidity ^0.4.23;

library Admin {

  using Contract for *;
  using SafeMath for uint;

  /// CROWDSALE STORAGE ///

  // Storage location of crowdsale admin address
  function admin() internal pure returns (bytes32 location) {
    location = keccak256("admin");
  }

  // Whether the crowdsale and token are initialized, and the sale is ready to run
  function is_init() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_init");
  }

  // Whether or not the crowdsale is post-purchase
  function is_final() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_finalized");
  }

  // Storage location of the CROWDSALE_TIERS index of the current tier. Return value minus 1 is the actual index of the tier. 0 is an invalid return
  function current_tier() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_current_tier");
  }
  
  // Storage location of a list of the tiers the crowdsale will have
  function crowdsale_tiers() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_list");
  }

  // Storage location of the end time of the current tier. Purchase attempts beyond this time will update the current tier (if another is available)
  function ends_at() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_ends_at");
  }

  // Storage location of the amount of time the crowdsale will take, accounting for all tiers
  function total_duration() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_total_duration");
  }

  // Storage location of the minimum amount of tokens allowed to be purchased
  function min_contrib() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_min_cap");
  } 

  // Storage location of the crowdsale's start time
  function start_time() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_start_time");
  }

  // Storage location of the amount of tokens sold in the crowdsale so far. Does not include reserved tokens
  function tokens_sold() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tokens_sold");
  }

  // Storage location of amount of wei raised during the crowdsale, total
  function wei_raised() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wei_raised");
  }

  // Storage seed for crowdsale whitelist mappings - maps each tier's index to a mapping of addresses to whtielist information
  bytes32 internal constant SALE_WHITELIST = keccak256("crowdsale_purchase_whitelist");

  function whitelist(uint tier) internal pure returns (bytes32 location) {
    location = keccak256(tier, SALE_WHITELIST);
  }

  function address_whitelist(address to_add, uint tier) internal pure returns (bytes32 location) {
    location = keccak256(to_add, keccak256(tier, SALE_WHITELIST));
  }

  /// TOKEN STORAGE ///

  // Returns the storage location of the token's name
  function name() internal pure returns (bytes32 location) {
    location = keccak256('token_name');
  }

  // Returns the storage location of the token's symbol
  function symbol() internal pure returns (bytes32 location) {
    location = keccak256('token_symbol');
  }

  // Returns the storage location of the token's decimals 
  function decimals() internal pure returns (bytes32 location) {
    location = keccak256('token_decimals');
  }

  // Storage location for token totalSupply
  function token_total_supply() internal pure returns (bytes32 location) {
    location = keccak256("token_total_supply");
  }

  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address owner) internal pure returns (bytes32 location) {
    return keccak256(keccak256(owner), TOKEN_BALANCES);
  }

  // Storage seed for token 'transfer agent' status for any address
  // Transfer agents can transfer tokens, even if the crowdsale has not yet been finalized
  bytes32 internal constant TOKEN_TRANSFER_AGENTS = keccak256("token_transfer_agents");

  function transfer_agent(address agent) internal pure returns (bytes32 location) {
    location = keccak256(keccak256(agent), TOKEN_TRANSFER_AGENTS);
  }

  // Whether or not the token is unlocked for transfers
  function tokens_unlocked() internal pure returns (bytes32 location) {
    location = keccak256("tokens_are_unlocked");
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

  // Return storage location to reservation info
  function reserved_info(address reservee) internal pure returns (bytes32 location) {
    return keccak256(keccak256(reservee), TOKEN_RESERVED_ADDR_INFO);
  }


  // Function selectors 
  bytes4 internal constant UPDATE_MIN_SEL = bytes4(keccak256('updateGlobalMinContribution(uint)'));
  bytes4 internal constant CREATE_TIERS_SEL = bytes4(keccak256('createCrowdsaleTiers(bytes32[],uint[],uint[],uint[],bool[],bool[])'));
  bytes4 internal constant WHITELIST_MULTI_SEL = bytes4(keccak256('whitelistMultiForTier(uint,address[],uint[],uint[])'));
  bytes4 internal constant INIT_SALE_TOKEN_SEL = bytes4(keccak256('initCrowdsaleToken(bytes32,bytes32,uint)'));
  bytes4 internal constant UPDATE_TIER_SEL = bytes4(keccak256('updateTierDuration(uint,uint)'));
  bytes4 internal constant INIT_SALE_SEL = bytes4(keccak256('initializeCrowdsale()'));
  bytes4 internal constant FINAL_SALE_SEL = bytes4(keccak256('finalizeCrowdsale()'));
  bytes4 internal constant SET_AGENT_SEL = bytes4(keccak256('setTransferAgentStatus(address,bool)'));
  bytes4 internal constant UPDATE_RESER_SEL = bytes4(keccak256('updateMultipleReservedTokens(address[],uint[],uint[],uint[])'));
  bytes4 internal constant REMOVE_RESER_SEL = bytes4(keccak256('removeReservedTokens(address)'));
  bytes4 internal constant DISTRIBUTE_RESER_SEL = bytes4(keccak256('distributeReservedTokens(uint)'));
  bytes4 internal constant FINAL_SALE_TOKENS_SEL = bytes4(keccak256('finalizeCrowdsaleAndToken()'));
  bytes4 internal constant DISTRIB_UNLOCK_SEL = bytes4(keccak256('distributeAndUnlockTokens()'));
  bytes4 internal constant FINAL_DISTIBUTE_SEL = bytes4(keccak256('finalizeAndDistributeToken()'));
  
  function first() internal view {

    // Resolve Feature by function selector, and call -
    if (
      msg.sig == UPDATE_MIN_SEL ||
      msg.sig == CREATE_TIERS_SEL ||
      msg.sig == WHITELIST_MULTI_SEL ||
      msg.sig == INIT_SALE_TOKEN_SEL ||
      msg.sig == UPDATE_TIER_SEL
    ) Contract.checks(onlyAdmin);
    else if (
      msg.sig == INIT_SALE_SEL ||
      msg.sig == FINAL_SALE_SEL
    ) Contract.checks(onlyAdmin);
    else  if (
      msg.sig == SET_AGENT_SEL ||
      msg.sig == UPDATE_RESER_SEL ||
      msg.sig == REMOVE_RESER_SEL ||
      msg.sig == DISTRIBUTE_RESER_SEL ||
      msg.sig == FINAL_SALE_TOKENS_SEL ||
      msg.sig == DISTRIB_UNLOCK_SEL ||
      msg.sig == FINAL_DISTIBUTE_SEL
    ) Contract.checks(empty);
    else
      revert('invalid function selector');
  }

  function last() internal pure {

    if (
      msg.sig == UPDATE_MIN_SEL ||
      msg.sig == CREATE_TIERS_SEL ||
      msg.sig == WHITELIST_MULTI_SEL ||
      msg.sig == INIT_SALE_TOKEN_SEL ||
      msg.sig == UPDATE_TIER_SEL
    ) Contract.checks(emitAndStore);
    else if (
      msg.sig == INIT_SALE_SEL ||
      msg.sig == FINAL_SALE_SEL
    ) Contract.checks(emitAndStore);
    else  if (
      msg.sig == SET_AGENT_SEL ||
      msg.sig == UPDATE_RESER_SEL ||
      msg.sig == REMOVE_RESER_SEL ||
      msg.sig == DISTRIBUTE_RESER_SEL ||
      msg.sig == FINAL_SALE_TOKENS_SEL ||
      msg.sig == DISTRIB_UNLOCK_SEL ||
      msg.sig == FINAL_DISTIBUTE_SEL
    ) Contract.checks(emitAndStore);
    else
      revert('invalid function selector');

  }

  function onlyAdmin() internal view {
    if (address(Contract.read(admin())) != Contract.sender()) 
      revert('sender is not admin');
  }

  function emitAndStore() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
  }

  function empty() internal pure {

  }

  // Events
  // event CrowdsaleTokenInit(bytes32 indexed exec_id, bytes32 indexed name, bytes32 indexed symbol, uint decimals)
  bytes32 private constant CROWDSALE_TOKEN_INIT = keccak256("CrowdsaleTokenInit(bytes32,bytes32,bytes32,uint256)");

  // event GlobalMinUpdate(bytes32 indexed exec_id, uint current_token_purchase_min)
  bytes32 private constant GLOBAL_MIN_UPDATE = keccak256("GlobalMinUpdate(bytes32,uint256)");

  // event CrowdsaleTiersAdded(bytes32 indexed exec_id, uint current_tier_list_len)
  bytes32 private constant CROWDSALE_TIERS_ADDED = keccak256("CrowdsaleTiersAdded(bytes32,uint256)");

  // event UpdateDuration(bytes32 indexed exec_id, uint indexed new_duration)
  bytes32 private constant UPDATE_DURATION_SIG = keccak256("UpdateDuration(bytes32,uint)");

  // event UpdateWhitelist(bytes32 indexed exec_id, uint indexed tier_index, uint indexed whitelist_length)
  bytes32 private constant UPDATE_WHITE_SIG = keccak256("UpdateWhitelist(bytes32,uint,uint)");

  function UPDATE_DURATION(bytes32 exec_id, uint duration) private pure returns (bytes32[3] memory) {
    return [UPDATE_DURATION_SIG, exec_id, bytes32(duration)];
  }

  function TOKEN_INIT(bytes32 exec_id, bytes32 _name, bytes32 _symbol) private pure returns (bytes32[4] memory) {
    return [CROWDSALE_TOKEN_INIT, exec_id, _name, _symbol];
  }

  function MIN_UPDATE(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [GLOBAL_MIN_UPDATE, exec_id];
  }

  function ADD_TIERS(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [CROWDSALE_TIERS_ADDED, exec_id];
  }

  function UPDATE_WHITE(bytes32 exec_id, uint tier_index, uint whitelist_length) private pure returns (bytes32[4] memory) {
    return [UPDATE_WHITE_SIG, exec_id, bytes32(tier_index), bytes32(whitelist_length)];
  }


  function updateGlobalMinContribution(uint new_min_contribution)
  internal pure { 

    // Set up STORES action requests -
    Contract.storing();

    // Store new crowdsale minimum token purchase amount
    Contract.set(
      min_contrib() 
    ).to(new_min_contribution);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add GLOBAL_MIN_UPDATE signature and topics
    Contract.log(
      MIN_UPDATE(Contract.execID()), bytes32(new_min_contribution)
    );

  }

  function createCrowdsaleTiers(
    bytes32[] tier_names, uint[] tier_durations, uint[] tier_prices, uint[] tier_caps,
    bool[] tier_modifiable, bool[] tier_whitelisted
  ) internal view { 
    // Ensure valid input
    if (
      tier_names.length != tier_durations.length
      || tier_names.length != tier_prices.length
      || tier_names.length != tier_caps.length
      || tier_names.length != tier_modifiable.length
      || tier_modifiable.length != tier_whitelisted.length
      || tier_names.length == 0
    ) revert("array length mismatch");


    uint _total_duration = uint(Contract.read(total_duration()));
    uint num_tiers = uint(Contract.read(crowdsale_tiers()));
    uint base_storage = 0;

    // Check that the sender is the crowdsale admin, and that the crowdsale is not initialized
    if (
      Contract.read(is_init()) == bytes32(1)
      || address(Contract.read(admin())) != Contract.sender()
    ) revert("not admin or sale is init");

    Contract.storing();

    // Store new tier list length
    Contract.set(
     crowdsale_tiers() 
    ).to(num_tiers.add(tier_names.length));

    // Place crowdsale tier storage base location in tiers struct
    base_storage = 32 + (192 * num_tiers) + uint(crowdsale_tiers());
    // Loop over each new tier, and add to storage buffer. Keep track of the added duration
    for (uint i = 0; i < tier_names.length; i++) {
      // Ensure valid input -
      if (
        tier_caps[i] == 0
        || _total_duration + tier_durations[i] <= _total_duration
        || tier_prices[i] == 0
      ) revert("invalid tier vals");

      // Increment total duration of the crowdsale
      _total_duration = _total_duration.add(tier_durations[i]);
      // Store tier information
      Contract.set(
        bytes32(base_storage)
      ).to(tier_names[i]);

      Contract.set(
        bytes32(32 + base_storage)
      ).to(tier_caps[i]);

      Contract.set(
        bytes32(64 + base_storage)
      ).to(tier_prices[i]);

      Contract.set(
        bytes32(96 + base_storage)
      ).to(tier_durations[i]);

      Contract.set(
        bytes32(128 + base_storage)
      ).to(tier_modifiable[i]);

      Contract.set(
        bytes32(160 + base_storage)
      ).to(tier_whitelisted[i]);

      // Increment base storage location -
      base_storage += 192;
    }
    // Store new total crowdsale duration
    Contract.set(
      total_duration()
    ).to(_total_duration);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_TIERS_ADDED signature and topics
    Contract.log(
      ADD_TIERS(Contract.execID()), bytes32(num_tiers.add(tier_names.length))
    );

  }

  function whitelistMultiForTier(
    uint tier_index, address[] to_whitelist, uint[] min_token_purchase, uint[] max_wei_spend
  ) internal view { 
    // Ensure valid input
    if (
      to_whitelist.length != min_token_purchase.length
      || to_whitelist.length != max_wei_spend.length
      || to_whitelist.length == 0
    ) revert("mismatched input lengths");

    // If the first returned value is not equal to the sender's address, sender is not the crowdsale admin
    if (address(Contract.read(admin())) != Contract.sender())
      revert("sender is not admin");

    // Get tier whitelist length
    uint tier_whitelist_length = uint(Contract.read(whitelist(tier_index)));

    // Set up STORES action requests -
    Contract.storing();

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < to_whitelist.length; i++) {
      // Get storage location for address whitelist struct
      bytes32 whitelist_status_loc = address_whitelist(to_whitelist[i], tier_index);
      // Store user's minimum token purchase amount and maximum wei spend amount
      Contract.set(
        whitelist_status_loc
      ).to(min_token_purchase[i]);
      Contract.set(
        bytes32(32 + uint(whitelist_status_loc))
      ).to(max_wei_spend[i]);

      // Push whitelisted address to end of tier whitelist array, unless the values being pushed are zero
      if (min_token_purchase[i] != 0 || max_wei_spend[i] != 0) {
        Contract.set(
          bytes32(32 + (32 * tier_whitelist_length) + uint(whitelist(tier_index)))
        ).to(to_whitelist[i]);
        // Increment tier whitelist
        tier_whitelist_length++;
      }
    }

    // Store new tier whitelist length
    Contract.set(
      whitelist(tier_index)
    ).to(tier_whitelist_length);


    Contract.emitting();

    Contract.log(
      UPDATE_WHITE(Contract.execID(), tier_index, tier_whitelist_length), bytes32(0)
    );
    
  }

  function initCrowdsaleToken(bytes32 _name, bytes32 _symbol, uint _decimals)
  internal pure { 
   // Ensure valid input
    if (
      _name == 0
      || _symbol == 0
      || _decimals > 18
    ) revert('improper initialization');

    // Set up STORES action requests -
    Contract.storing();

    // Store token name, symbol, and decimals
    Contract.set(name()).to(_name);
    Contract.set(symbol()).to(_symbol);
    Contract.set(decimals()).to(_decimals);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_TOKEN_INIT signature and topics
    Contract.log(
      TOKEN_INIT(Contract.execID(), _name, _symbol), bytes32(_decimals)
    );

  }

  function updateTierDuration(uint tier_index, uint new_duration)
  internal view { 

    // Ensure valid input
    if (new_duration == 0)
      revert('invalid duration');

    uint starts_at = uint(Contract.read(start_time()));
    uint _current_tier = uint(Contract.read(current_tier()));
    uint _total_duration = uint(Contract.read(total_duration()));
    uint _ends_at = uint(Contract.read(ends_at()));
    uint previous_duration = uint(Contract.read(
      bytes32(128 + (192 * tier_index) + uint(crowdsale_tiers())))
    );


    // Ensure an update is being performed
    if (previous_duration == new_duration)
      revert("duration unchanged");
    // Total crowdsale duration should always be minimum the previous duration for the tier to update
    if (_total_duration < previous_duration)
      revert("total duration invalid");
    // Indices are off-by-one in storage - so the stored current tier index should never be 0
    if (_current_tier == 0)
      revert("invalid crowdsale setup");

    Contract.storing();

    // Normalize returned current tier index
    _current_tier--;

    // Check returned values for valid crowdsale and tier status -
    if (
      address(Contract.read(admin())) != Contract.sender()
      || Contract.read(is_final()) == bytes32(1)                  
      || uint(Contract.read(crowdsale_tiers())) <= tier_index 
      || _current_tier > tier_index 
      || (_current_tier == tier_index 
         && tier_index != 0)
      || Contract.read(bytes32(160 + (192 * tier_index) + uint(crowdsale_tiers()))) == 0
    ) revert("invalid crowdsale status");

    if (tier_index == 0 && _current_tier == 0) {
      if (now >= starts_at) 
        revert("cannot modify current tier");

      // Store current tier end time
      Contract.set(
        ends_at()
      ).to(new_duration.add(starts_at));

    } else if (tier_index > _current_tier && now >= _ends_at) {
      if (tier_index - _current_tier == 1)
        revert("cannot modify current tier");

      for (uint i = _current_tier; i < tier_index; i++)
        _ends_at = _ends_at.add(uint(Contract.read(bytes32(128 + (192 * i) + uint(crowdsale_tiers())))));

      if (now <= _ends_at)
        revert("cannot modify current tier");


    } else if (tier_index <= _current_tier || now >= _ends_at) {
      // Not a valid state to update - throw
      revert('invalid state');
    }

    // Get new overall crowdsale duration -
    if (previous_duration > new_duration) // Subtracting from total_duration
      _total_duration = _total_duration.sub(previous_duration - new_duration);
    else // Adding to total_duration
      _total_duration = _total_duration.add(new_duration - previous_duration);

    // Store updated tier duration
    Contract.set(
      bytes32(128 + (192 * tier_index) + uint(crowdsale_tiers()))
    ).to(new_duration);

    // Update total crowdsale duration
    Contract.set(
      total_duration()
    ).to(_total_duration);

    Contract.emitting();

    Contract.log(
      UPDATE_DURATION(Contract.execID(), new_duration), bytes32(0)
    );

  } 

  // Event
  // event CrowdsaleInitialized(bytes32 indexed exec_id, bytes32 indexed token_name, uint start_time);
  bytes32 internal constant CROWDSALE_INITIALIZED = keccak256("CrowdsaleInitialized(bytes32,bytes32,uint256)");

  // event CrowdsaleFinalized(bytes32 indexed exec_id);
  bytes32 internal constant CROWDSALE_FINALIZED = keccak256("CrowdsaleFinalized(bytes32)");

  function INITIALIZE(bytes32 exec_id, bytes32 _name) private pure returns (bytes32[3] memory) {
    return [CROWDSALE_INITIALIZED, exec_id, _name];
  }

  function FINALIZE(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [CROWDSALE_FINALIZED, exec_id];
  }

  function initializeCrowdsale() internal view { 

    uint starts_at = uint(Contract.read(start_time()));
    bytes32 token_name = Contract.read(name());

    if (starts_at < now) 
      revert('crowdsale already started');

    if (token_name == bytes32(0))
      revert('token not init');

    Contract.storing();

    // Store updated crowdsale initialization status
    Contract.set(
      is_init()
    ).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_INITIALIZED signature and topics
    Contract.log(
      INITIALIZE(Contract.execID(), token_name), bytes32(starts_at)
    );

  }

  function finalizeCrowdsale() internal view { 

    if (Contract.read(is_init()) == bytes32(0))
      revert('crowdsale has not been initialized');

    if (Contract.read(is_final()) == bytes32(1))
      revert('crowdsale already finalized');

    Contract.storing();

    // Store updated crowdsale finalization status
    Contract.set(
      is_final()
    ).to(true);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_FINALIZED signature and topics
    Contract.log(
      FINALIZE(Contract.execID()), bytes32(0)
    );

  } 

  /// EVENTS ///

  // event TransferAgentStatusUpdate(bytes32 indexed exec_id, address indexed agent, bool current_status)
  bytes32 internal constant TRANSFER_AGENT_STATUS = keccak256('TransferAgentStatusUpdate(bytes32,address,bool)');
  // Event - FinalizeCrowdsale(bytes32 indexed exec_id, uint indexed now)
  bytes32 internal constant FINAL_SEL = keccak256('FinalizeCrowdsale(bytes32,uint)');
  // Event - UpdateMultipleReservedTokens(bytes32 indexed exec_id, uint indexed num_destinations)
  bytes32 internal constant UPDATE_RESERVED_SEL = keccak256('UpdateMultipleReservedTokens(bytes32,uint)');
  // Event - RemoveReservedToken(bytes32 indexed exec_id, address indexed destination)
  bytes32 internal constant REMOVE_RESERVED_SEL = keccak256('RemoveReservedToken(bytes32,uint)');
  // Event - DistributeTokens(bytes32 indexed exec_id, uint indexed num_destinations)
  bytes32 internal constant DISTRIBUTE_RESERVED_SEL = keccak256('DistributeTokens(bytes32,uint)');
  // Event - FinalizeAndDistribute(bytes32 indexed exec_id, uint indexed now)
  bytes32 internal constant FINAL_AND_DIS_SEL = keccak256('FinalizeAndDistribute(bytes32,uint)');

  function AGENT_STATUS(bytes32 exec_id, address agent) private pure 
  returns (bytes32[3] memory) {
    return [TRANSFER_AGENT_STATUS, exec_id, bytes32(agent)];
  }

  function UPDATE_RESERVED(bytes32 exec_id, uint num_destinations) private pure returns (bytes32[3] memory) {
    return [UPDATE_RESERVED_SEL, exec_id, bytes32(num_destinations)];
  }

  function REMOVE_RESERVED(bytes32 exec_id, address destination) private pure returns (bytes32[3] memory) {
    return [REMOVE_RESERVED_SEL, exec_id, bytes32(destination)];
  }

  function DISTIBUTE_TOKENS(bytes32 exec_id, uint num_destinations) private pure returns (bytes32[3] memory) {
    return [DISTRIBUTE_RESERVED_SEL, exec_id, bytes32(num_destinations)];
  }

  function FINALIZE_AND_DIS(bytes32 exec_id) private view returns (bytes32[3] memory) {
    return [FINAL_AND_DIS_SEL, exec_id, bytes32(now)];
  }


  function setTransferAgentStatus(address agent, bool is_agent) internal view { 

    if (Contract.sender() != address(Contract.read(admin())))
      revert('sender is not admin');

    // Ensure valid input
    if (agent == address(0))
      revert('invalid transfer agent');

    Contract.storing();

    // Get transfer agent status storage location
    bytes32 status_location = transfer_agent(agent);
    // Store new transfer agent status
    Contract.set(
      status_location
    ).to(is_agent);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add TransferAgentStatusUpdate signature and topics
    Contract.log(
      AGENT_STATUS(Contract.execID(), agent), is_agent ? bytes32(1) : bytes32(0)
    );
                
  }

  function updateMultipleReservedTokens(address[] destinations, uint[] num_tokens, uint[] num_percents, uint[] percent_decimals) internal view { 
    // Ensure valid input
    if (
      destinations.length != num_tokens.length
      || num_tokens.length != num_percents.length
      || num_percents.length != percent_decimals.length
      || destinations.length == 0
    ) revert('invalid input arrays'); 

    // Add crowdsale destinations list length location to buffer
    uint num_destinations = uint(Contract.read(reserved_destinations()));

    if (Contract.sender() != address(Contract.read(admin())))
      revert('sender is not admin');

    // Ensure sender is admin address, and crowdsale has not been initialized
    if (Contract.read(is_init()) == bytes32(0))
      revert('crowdsale is not initialized');

    Contract.storing();


    // Loop over read_values and input arrays - for each address which is unique within the passed-in destinations list,
    // place its reservation information in the storage buffer. Ignore duplicates in passed-in array.
    // For every address which is not a local duplicate, and also does not exist yet in the crowdsale storage reserved destination list,
    // push it to the end of the list and increment list length (in storage buffer)
    // Addresses with nonzero values in read_values are already a 'reserved token destination' in storage
    // First 3 indices in read_values are admin address, crowdsale init status, and crowdsale reserved destinations list length - begin
    // reading destinations address indices from read_values[3]

    for (uint i = 0; i < destinations.length; i++) {
      // If value is 0, address has not already been added to the crowdsale destinations list in storage
      address to_add = destinations[i];
      if (to_add == address(0)) 
        revert('invalid destination');

      if (Contract.read(reserved_info(destinations[i])) == bytes32(0)) {
        // Now, check the passed-in destinations list to see if this address is listed multiple times in the input, as we only want to store information on unique addresses
        for (uint j = destinations.length - 1; j > i; j--) {
          // address is not unique locally - found the same address in destinations
          if (destinations[j] == to_add) {
            to_add = address(0);
            break;
          }
        }

        // If is_unique is zero, this address is not unique within the passed-in list - skip any additions to storage buffer
        if (to_add == address(0))
          continue;

        // Increment length
        num_destinations = num_destinations.add(1);
        // Ensure reserved destination amount does not exceed 20
        if (num_destinations > 20) 
          revert('too many reserved destinations');
        // Push address to reserved destination list
        Contract.set(
          bytes32(32 * num_destinations + uint(reserved_destinations()))
        ).to(to_add);
        // Store reservation info
        Contract.set(
          reserved_info(to_add)
        ).to(num_destinations);
      }

      // Store reservation info
      Contract.set(
        bytes32(32 + uint(reserved_info(to_add)))
      ).to(num_tokens[i]);
      Contract.set(
       bytes32(64 + uint(reserved_info(to_add))) 
      ).to(num_percents[i]);
      Contract.set(
        bytes32(96 + uint(reserved_info(to_add)))
      ).to(percent_decimals[i]);
    }
    // Finally, update array length
    Contract.set(
      reserved_destinations()
    ).to(num_destinations);

    Contract.emitting();

    Contract.log(
      UPDATE_RESERVED(Contract.execID(), num_destinations), bytes32(0)
    );

  }

  function removeReservedTokens(address destination) internal view { 
    // Ensure valid input
    if (destination == address(0))
      revert('invalid destination');

    if (Contract.sender() != address(Contract.read(admin())))
      revert('sender is not admin');

    if (Contract.read(is_init()) == bytes32(0))
      revert('crowdsale is not initialized');

    Contract.storing();

    // Get reservation list length
    uint reservation_len = uint(Contract.read(reserved_destinations()));
    // Get index of passed-in destination. If zero, sender is not in reserved list - revert
    uint to_remove = uint(Contract.read(reserved_info(destination)));
    // Ensure that to_remove is less than or equal to reservation list length (stored indices are offset by 1)
    if (to_remove > reservation_len || to_remove == 0)
      revert('removing too many reservations');

    if (to_remove != reservation_len) {
      // Execute read from storage, and store return in buffer
      address last_index = address(Contract.read(bytes32(32 * reservation_len + uint(reserved_destinations()))));

      // Update index
      Contract.set(
        reserved_info(last_index)
      ).to(to_remove);
      // Push last index address to correct spot in reserved_destinations() list
      Contract.set(
        bytes32((32 * to_remove) + uint(reserved_destinations()))
      ).to(last_index);
    }
    // Update destination list length
    Contract.set(
      reserved_destinations()
    ).to(reservation_len.sub(1));
    // Update removed address index
    Contract.set(
      reserved_info(destination)
    ).to(uint(0));

    Contract.emitting();

    Contract.log(
      REMOVE_RESERVED(Contract.execID(), destination), bytes32(0)
    );

  }

  function distributeReservedTokens(uint num_destinations) internal view { 
    // Ensure valid input
    if (num_destinations == 0)
      revert('invalid number of destinations');

    // If the crowdsale is not finalized, revert
    if (Contract.read(is_final()) == bytes32(0))
      revert('crowdsale is not finalized');

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(tokens_sold()));
    uint total_supply = uint(Contract.read(token_total_supply()));
    uint reserved_len = uint(Contract.read(reserved_destinations()));

    Contract.storing();

    // If no destinations remain to be distributed to, revert
    if (reserved_len == 0)
      revert('no remaining destinations');

    // If num_destinations is greater than the reserved destinations list length, set amt equal to the list length
    if (num_destinations > reserved_len)
      num_destinations = reserved_len;


    Contract.set(
      reserved_destinations()
    ).to(reserved_len.sub(num_destinations));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address addr = address(Contract.read(bytes32(32 * (num_destinations - i) + uint(reserved_destinations())))); 

      // Get percent reserved and precision
      uint to_add = uint(Contract.read(
        bytes32(
          64 + uint(reserved_info(addr))
        )
      ));

      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = 2 + uint(Contract.read(
        bytes32(
          96 + uint(reserved_info(addr))
        )
      ));

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(
        bytes32(
          32 + uint(reserved_info(addr))
        )
      )));

      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Add destination's current token balance to to_add
      to_add = to_add.add(uint(Contract.read(
        balances(addr)
      )));

      // Store reserved destination new token balance
      Contract.set(
        balances(addr)
      ).to(to_add);
    }

    // Update total supply
    Contract.set(
      token_total_supply()
    ).to(total_supply);

    Contract.emitting();

    Contract.log(
      DISTIBUTE_TOKENS(Contract.execID(), num_destinations), bytes32(0)
    );

  }

  function finalizeCrowdsaleAndToken() internal view { 
    if (Contract.sender() != address(Contract.read(admin())))
      revert('sender is not admin');

    if (Contract.read(is_init()) == bytes32(0))
      revert('crowdsale is not initialized');

    if (Contract.read(is_final()) == bytes32(1))
      revert('crowdsale is already finalized');

    // Get reserved token distribution from distributeAndUnlockTokens
    distributeAndUnlockTokens();

    // Finalize crowdsale
    Contract.set(
      is_final()
    ).to(true);

    Contract.emitting();

    // Add CrowdsaleFinalized signature and topics
    Contract.log(
      FINALIZE(Contract.execID()), bytes32(0)
    );

  }

  function distributeAndUnlockTokens() internal view { 

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(tokens_sold())); 
    uint total_supply = uint(Contract.read(token_total_supply())); 
    uint num_destinations = uint(Contract.read(reserved_destinations()));

    Contract.storing();

    // If there are no reserved destinations, simply create a storage buffer to unlock token transfers -
    if (num_destinations == 0) {
      // Unlock tokens
      Contract.set(
        tokens_unlocked()
      ).to(true);

      return;
    }

    // Set new reserved destination list length
    Contract.set(
      reserved_destinations()
    ).to(uint(0));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address reserved_address = address(Contract.read(
        bytes32(32 + (32 * i) + uint(reserved_destinations())))
      );

      // Get percent reserved and precision
      uint to_add = uint(Contract.read(
        bytes32(64 + uint(reserved_info(reserved_address)))
      ));

      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = 2 + uint(Contract.read(
        bytes32(96 + uint(reserved_info(reserved_address)))
      ));

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(
        bytes32(32 + uint(reserved_info(reserved_address)))
      )));

      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Add destination's current token balance to to_add
      to_add = to_add.add(uint(Contract.read(
        balances(reserved_address)
      )));

      // Store new token balance
      Contract.set(
        balances(reserved_address)
      ).to(to_add);
    }

    // Update total token supply
    Contract.set(
      token_total_supply()
    ).to(total_supply);

    // Unlock tokens
    Contract.set(
      tokens_unlocked()
    ).to(true);


  }

  function finalizeAndDistributeToken() internal view { 

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(tokens_sold())); 
    uint total_supply = uint(Contract.read(token_total_supply()));
    uint num_destinations = uint(Contract.read(reserved_destinations()));

    // If the crowdsale is not finalized, revert
    if (Contract.read(is_final()) == bytes32(0))
      revert('crowdsale not finalized');

    // If there are no reserved destinations, simply create a storage buffer to unlock token transfers -
    if (num_destinations == 0) {
      // Unlock tokens
      Contract.set(
        tokens_unlocked()
      ).to(true);
    }

    // Store new reserved destination list length
    Contract.set(
      reserved_destinations()
    ).to(uint(0));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address reserved = address(Contract.read(bytes32(32 + (32 * i) + uint(reserved_destinations()))));
      // Get percent reserved and precision
      uint to_add = uint(Contract.read(
        bytes32(64 + uint(reserved_info(reserved)))
      ));
      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = 2 + uint(Contract.read(
        bytes32(96 + uint(reserved_info(reserved)))
      ));

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(
        bytes32(32 + uint(reserved_info(reserved)))
      )));
      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Add destination's current token balance to to_add
      to_add = to_add.add(uint(Contract.read(
        bytes32(reserved_info(reserved))
      )));
      // Store new destination token balance
      Contract.set(
        balances(reserved)
      ).to(to_add);
    }
    // Update total supply
    Contract.set(
      token_total_supply()
    ).to(total_supply);
    // Unlock tokens
    Contract.set(
      tokens_unlocked()
    ).to(true);

    Contract.emitting();

    Contract.log(
      FINALIZE_AND_DIS(Contract.execID()), bytes32(0)
    );

  } 
}


library Token {

  using Contract for *;

  // Token fields -

  // Returns the storage location of the token's name
  function name() internal pure returns (bytes32 location) {
    location = keccak256('token_name');
  }

  // Returns the storage location of the token's symbol
  function symbol() internal pure returns (bytes32 location) {
    location = keccak256('token_symbol');
  }

  // Returns the storage location of the token's totalSupply
  function totalSupply() internal pure returns (bytes32 location) {
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

  bytes32 private constant TRANSFER_AGENT_SEED = keccak256('transfer_agents');

  // Returns the storage location of an Agent's transfer agent status
  function transferAgent(address agent) internal pure returns (bytes32 location) {
    location = keccak256(agent, TRANSFER_AGENT_SEED);
  }

  // Returns the storage location for the unlock status of the token
  function tokensUnlocked() internal pure returns(bytes32 location) {
    location = keccak256('tokens_unlocked');
  }

  // Token function selectors -
  bytes4 private constant TRANSFER_SEL = bytes4(keccak256('transfer(address,uint256)'));
  bytes4 private constant TRANSFER_FROM_SEL = bytes4(keccak256('transferFrom(address,address,uint256)'));
  bytes4 private constant APPROVE_SEL = bytes4(keccak256('approve(address,uint256)'));
  bytes4 private constant INCR_APPR_SEL = bytes4(keccak256('increaseApproval(address,uint256)'));
  bytes4 private constant DECR_APPR_SEL = bytes4(keccak256('decreaseApproval(address,uint256)'));

  // Token pre/post conditions for execution -

  // Before each Transfer and Approve Feature executes, check that the token is initialized -
  function first() internal view {
    if (Contract.read(name()) == bytes32(0))
      revert('Token not initialized');

    if (msg.value != 0)
      revert('Token is not payable');

    // Check msg.sig, and check the appropriate preconditions -
    if (msg.sig == TRANSFER_SEL || msg.sig == TRANSFER_FROM_SEL)
      Contract.checks(transfer_first);
    else if (msg.sig == APPROVE_SEL || msg.sig == INCR_APPR_SEL || msg.sig == DECR_APPR_SEL)
      Contract.checks(empty);
    else
      revert('Invalid function selector');
  }

  function empty() internal pure {

  }

  // After each Transfer and Approve Feature executes, ensure that the result will
  // both emit an event and store values in storage -
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('Invalid state change');
  }

  // event Approval(address indexed owner, address indexed spender, uint tokens)
  bytes32 internal constant APPROVAL_SIG = keccak256('Approval(address,address,uint256)');


  // Returns the events and data for an 'Approval' event -
  function APPROVAL (address _owner, address _spender) private pure
  returns (bytes32[3] memory) {
    return [APPROVAL_SIG, bytes32(_owner), bytes32(_spender)];
  }


  // Implements the logic to create the storage buffer for a Token Approval
  function approve(address _spender, uint _amt) internal pure {
    // Begin storing values -
    Contract.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    Contract.set(
      allowed(Contract.sender(), _spender)
    ).to(_amt);
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function increaseApproval(address _spender, uint _amt) internal view {
    // Begin storing values -
    Contract.storing();
    // Store the approved amount at the sender's allowance location for the _spender
    Contract.increase(
      allowed(Contract.sender(), _spender)
    ).by(_amt);
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }

  // Implements the logic to create the storage buffer for a Token Approval
  function decreaseApproval(address _spender, uint _amt) internal view {
    // Begin storing values -
    Contract.storing();
    // Decrease the spender's approval by _amt to a minimum of 0 -
    Contract.decrease(
      allowed(Contract.sender(), _spender)
    ).byMaximum(_amt);
    
    // Finish storing, and begin logging events -
    Contract.emitting();
    // Log 'Approval' event -
    Contract.log(
      APPROVAL(Contract.sender(), _spender), bytes32(_amt)
    );
  }

  // 'Transfer' event topic signature
  bytes32 private constant TRANSFER_SIG = keccak256('Transfer(address,address,uint256)');

  // Returns the topics for a Transfer event -
  function TRANSFER (address _owner, address _dest) private pure returns (bytes32[3] memory) {
    return [TRANSFER_SIG, bytes32(_owner), bytes32(_dest)];
  }


  // Preconditions for Transfer - none
  function transfer_first() internal view {
    if (msg.sig == TRANSFER_FROM_SEL) 
      Contract.checks(isTransferAgent);
  }


  // Implements the logic for a token transfer -
  function transfer(address _dest, uint _amt)
  internal view {
    // Ensure valid input -
    if (_dest == address(0))
      revert('invalid recipient');

    // Begin updating balances -
    Contract.storing();
    // Update sender token balance - reverts in case of underflow
    Contract.decrease(
      balances(Contract.sender())
    ).by(_amt);
    // Update recipient token balance - reverts in case of overflow
    Contract.increase(
      balances(_dest)
    ).by(_amt);

    // Finish updating balances: log event -
    Contract.emitting();
    // Log 'Transfer' event
    Contract.log(
      TRANSFER(Contract.sender(), _dest), bytes32(_amt)
    );
  }

  // Implements the logic for a token transferFrom -
  function transferFrom(address _owner, address _dest, uint _amt)
  internal view {
    // Ensure valid input -
    if (_dest == address(0))
      revert('invalid recipient');
    if (_owner == address(0))
      revert('invalid owner');

    // Begin updating balances -
    Contract.storing();
    // Update spender token allowance - reverts in case of underflow
    Contract.decrease(
      allowed(_owner, Contract.sender())
    ).by(_amt);
    // Update owner token balance - reverts in case of underflow
    Contract.decrease(
      balances(Contract.sender())
    ).by(_amt);
    // Update recipient token balance - reverts in case of overflow
    Contract.increase(
      balances(_dest)
    ).by(_amt);

    // Finish updating balances: log event -
    Contract.emitting();
    // Log 'Transfer' event
    Contract.log(
      TRANSFER(_owner, _dest), bytes32(_amt)
    );
  }

  // Precondition for transferFrom
  function isTransferAgent() internal view {
    if (
      uint(Contract.read(transferAgent(Contract.sender()))) == 0
      && uint(Contract.read(tokensUnlocked())) == 0
    ) revert('transfers are locked');
  }

}

library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    if (a == 0) {
      return 0;
    }
    c = a * b;
    require(c / a == b, "Overflow - Multiplication");
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    return a / b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, "Underflow - Subtraction");
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    require(c >= a, "Overflow - Addition");
    return c;
  }
}

library Contract {

  using SafeMath for uint;

  // Modifiers: //

  // Runs two functions before and after a function -
  modifier conditions(function () pure first, function () pure last) {
    first();
    _;
    last();
  }

  bytes32 internal constant EXEC_PERMISSIONS = keccak256('script_exec_permissions');

  // Sets up contract execution - reads execution id and sender from storage and
  // places in memory, creating getters. Calling this function should be the first
  // action an application does as part of execution, as it sets up memory for
  // execution. Additionally, application functions in the main file should be
  // external, so that memory is not touched prior to calling this function.
  // The 3rd slot allocated will hold a pointer to a storage buffer, which will
  // be reverted to abstract storage to store data, emit events, and forward
  // wei on behalf of the application.
  function authorize(address _script_exec) internal view {
    // No memory should have been allocated yet - expect the free memory pointer
    // to point to 0x80 - and throw if it does not
    require(freeMem() == 0x80, "Memory allocated prior to execution");
    // Next, set up memory for execution
    bytes32 perms = EXEC_PERMISSIONS;
    assembly {
      mstore(0x80, sload(0))     // Execution id, read from storage
      mstore(0xa0, sload(1))     // Original sender address, read from storage
      mstore(0xc0, 0)            // Pointer to storage buffer
      mstore(0xe0, 0)            // Bytes4 value of the current action requestor being used
      mstore(0x100, 0)           // Enum representing the next type of function to be called (when pushing to buffer)
      mstore(0x120, 0)           // Number of storage slots written to in buffer
      mstore(0x140, 0)           // Number of events pushed to buffer
      mstore(0x160, 0)           // Number of payment destinations pushed to buffer

      // Update free memory pointer -
      mstore(0x40, 0x180)
    }
    // Ensure that the sender and execution id returned from storage are nonzero -
    assert(execID() != bytes32(0) && sender() != address(0));

    // Check that the sender is authorized as a script exec contract for this exec id
    bool authorized;
    assembly {
      // Place the script exec address at 0, and the exec permissions seed after it
      mstore(0, _script_exec)
      mstore(0x20, perms)
      // Hash the resulting 0x34 bytes, and place back into memory at 0
      mstore(0, keccak256(0x0c, 0x34))
      // Place the exec id after the hash -
      mstore(0x20, mload(0x80))
      // Hash the previous hash with the execution id, and check the result
      authorized := sload(keccak256(0, 0x40))
    }
    if (!authorized)
      revert("Sender is not authorized as a script exec address");
  }

  // Sets up contract execution when initializing an instance of the application
  // First, reads execution id and sender from storage (execution id should be 0xDEAD),
  // then places them in memory, creating getters. Calling this function should be the first
  // action an application does as part of execution, as it sets up memory for
  // execution. Additionally, application functions in the main file should be
  // external, so that memory is not touched prior to calling this function.
  // The 3rd slot allocated will hold a pointer to a storage buffer, which will
  // be reverted to abstract storage to store data, emit events, and forward
  // wei on behalf of the application.
  function initialize() internal view {
    // No memory should have been allocated yet - expect the free memory pointer
    // to point to 0x80 - and throw if it does not
    require(freeMem() == 0x80, "Memory allocated prior to execution");
    // Next, set up memory for execution
    assembly {
      mstore(0x80, sload(0))     // Execution id, read from storage
      mstore(0xa0, sload(1))     // Original sender address, read from storage
      mstore(0xc0, 0)            // Pointer to storage buffer
      mstore(0xe0, 0)            // Bytes4 value of the current action requestor being used
      mstore(0x100, 0)           // Enum representing the next type of function to be called (when pushing to buffer)
      mstore(0x120, 0)           // Number of storage slots written to in buffer
      mstore(0x140, 0)           // Number of events pushed to buffer
      mstore(0x160, 0)           // Number of payment destinations pushed to buffer

      // Update free memory pointer -
      mstore(0x40, 0x180)
    }
    // Ensure that the sender and execution id returned from storage are expected values -
    assert(execID() != bytes32(0) && sender() != address(0));
  }

  // Calls the passed-in function, performing a memory state check before and after the check
  // is executed.
  function checks(function () view _check) conditions(validState, validState) internal view {
    _check();
  }

  // Calls the passed-in function, performing a memory state check before and after the check
  // is executed.
  function checks(function () pure _check) conditions(validState, validState) internal pure {
    _check();
  }

  // Ensures execution completed successfully, and reverts the created storage buffer
  // back to the sender.
  function commit() conditions(validState, none) internal pure {
    // Check value of storage buffer pointer - should be at least 0x180
    bytes32 ptr = buffPtr();
    require(ptr >= 0x180, "Invalid buffer pointer");

    assembly {
      // Get the size of the buffer
      let size := mload(add(0x20, ptr))
      mstore(ptr, 0x20) // Place dynamic data offset before buffer
      // Revert to storage
      revert(ptr, add(0x40, size))
    }
  }

  // Helpers: //

  // Checks to ensure the application was correctly executed -
  function validState() private pure {
    if (freeMem() < 0x180)
      revert('Expected Contract.execute()');

    if (buffPtr() != 0 && buffPtr() < 0x180)
      revert('Invalid buffer pointer');

    assert(execID() != bytes32(0) && sender() != address(0));
  }

  // Returns a pointer to the execution storage buffer -
  function buffPtr() private pure returns (bytes32 ptr) {
    assembly { ptr := mload(0xc0) }
  }

  // Returns the location pointed to by the free memory pointer -
  function freeMem() private pure returns (bytes32 ptr) {
    assembly { ptr := mload(0x40) }
  }

  // Returns the current storage action
  function currentAction() private pure returns (bytes4 action) {
    if (buffPtr() == bytes32(0))
      return bytes4(0);

    assembly { action := mload(0xe0) }
  }

  // If the current action is not storing, reverts
  function isStoring() private pure {
    if (currentAction() != STORES)
      revert('Invalid current action - expected STORES');
  }

  // If the current action is not emitting, reverts
  function isEmitting() private pure {
    if (currentAction() != EMITS)
      revert('Invalid current action - expected EMITS');
  }

  // If the current action is not paying, reverts
  function isPaying() private pure {
    if (currentAction() != PAYS)
      revert('Invalid current action - expected PAYS');
  }

  // Initializes a storage buffer in memory -
  function startBuffer() private pure {
    assembly {
      // Get a pointer to free memory, and place at 0xc0 (storage buffer pointer)
      let ptr := msize()
      mstore(0xc0, ptr)
      // Clear bytes at pointer -
      mstore(ptr, 0)            // temp ptr
      mstore(add(0x20, ptr), 0) // buffer length
      // Update free memory pointer -
      mstore(0x40, add(0x40, ptr))
      // Set expected next function to 'NONE' -
      mstore(0x100, 1)
    }
  }

  // Checks whether or not it is valid to create a STORES action request -
  function validStoreBuff() private pure {
    // Get pointer to current buffer - if zero, create a new buffer -
    if (buffPtr() == bytes32(0))
      startBuffer();

    // Ensure that the current action is not 'storing', and that the buffer has not already
    // completed a STORES action -
    if (stored() != 0 || currentAction() == STORES)
      revert('Duplicate request - stores');
  }

  // Checks whether or not it is valid to create an EMITS action request -
  function validEmitBuff() private pure {
    // Get pointer to current buffer - if zero, create a new buffer -
    if (buffPtr() == bytes32(0))
      startBuffer();

    // Ensure that the current action is not 'emitting', and that the buffer has not already
    // completed an EMITS action -
    if (emitted() != 0 || currentAction() == EMITS)
      revert('Duplicate request - emits');
  }

  // Checks whether or not it is valid to create a PAYS action request -
  function validPayBuff() private pure {
    // Get pointer to current buffer - if zero, create a new buffer -
    if (buffPtr() == bytes32(0))
      startBuffer();

    // Ensure that the current action is not 'paying', and that the buffer has not already
    // completed an PAYS action -
    if (paid() != 0 || currentAction() == PAYS)
      revert('Duplicate request - pays');
  }

  // Placeholder function when no pre or post condition for a function is needed
  function none() private pure { }

  // Runtime getters: //

  // Returns the execution id from memory -
  function execID() internal pure returns (bytes32 exec_id) {
    assembly { exec_id := mload(0x80) }
    require(exec_id != bytes32(0), "Execution id overwritten, or not read");
  }

  // Returns the original sender from memory -
  function sender() internal pure returns (address addr) {
    assembly { addr := mload(0xa0) }
    require(addr != address(0), "Sender address overwritten, or not read");
  }

  // Reading from storage: //

  // Reads from storage, resolving the passed-in location to its true location in storage
  // by hashing with the exec id. Returns the data read from that location
  function read(bytes32 _location) internal view returns (bytes32 data) {
    data = keccak256(_location, execID());
    assembly { data := sload(data) }
  }

  // Storing data, emitting events, and forwarding payments: //

  bytes4 internal constant EMITS = bytes4(keccak256('Emit((bytes32[],bytes)[])'));
  bytes4 internal constant STORES = bytes4(keccak256('Store(bytes32[])'));
  bytes4 internal constant PAYS = bytes4(keccak256('Pay(bytes32[])'));
  bytes4 internal constant THROWS = bytes4(keccak256('Error(string)'));

  // Function enums -
  enum NextFunction {
    INVALID, NONE, STORE_DEST, VAL_SET, VAL_INC, VAL_DEC, EMIT_LOG, PAY_DEST, PAY_AMT
  }

  // Checks that a call pushing a storage destination to the buffer is expected and valid
  function validStoreDest() private pure {
    // Ensure that the next function expected pushes a storage destination -
    if (expected() != NextFunction.STORE_DEST)
      revert('Unexpected function order - expected storage destination to be pushed');

    // Ensure that the current buffer is pushing STORES actions -
    isStoring();
  }

  // Checks that a call pushing a storage value to the buffer is expected and valid
  function validStoreVal() private pure {
    // Ensure that the next function expected pushes a storage value -
    if (
      expected() != NextFunction.VAL_SET &&
      expected() != NextFunction.VAL_INC &&
      expected() != NextFunction.VAL_DEC
    ) revert('Unexpected function order - expected storage value to be pushed');

    // Ensure that the current buffer is pushing STORES actions -
    isStoring();
  }

  // Checks that a call pushing a payment destination to the buffer is expected and valid
  function validPayDest() private pure {
    // Ensure that the next function expected pushes a payment destination -
    if (expected() != NextFunction.PAY_DEST)
      revert('Unexpected function order - expected payment destination to be pushed');

    // Ensure that the current buffer is pushing PAYS actions -
    isPaying();
  }

  // Checks that a call pushing a payment amount to the buffer is expected and valid
  function validPayAmt() private pure {
    // Ensure that the next function expected pushes a payment amount -
    if (expected() != NextFunction.PAY_AMT)
      revert('Unexpected function order - expected payment amount to be pushed');

    // Ensure that the current buffer is pushing PAYS actions -
    isPaying();
  }

  // Checks that a call pushing an event to the buffer is expected and valid
  function validEvent() private pure {
    // Ensure that the next function expected pushes an event -
    if (expected() != NextFunction.EMIT_LOG)
      revert('Unexpected function order - expected event to be pushed');

    // Ensure that the current buffer is pushing EMITS actions -
    isEmitting();
  }

  // Begins creating a storage buffer - values and locations pushed will be committed
  // to storage at the end of execution
  function storing() conditions(validStoreBuff, isStoring) internal pure {
    bytes4 action_req = STORES;
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push requestor to the end of buffer, as well as to the 'current action' slot -
      mstore(add(0x20, add(ptr, mload(ptr))), action_req)
      mstore(0xe0, action_req)
      // Push '0' to the end of the 4 bytes just pushed - this will be the length of the STORES action
      mstore(add(0x24, add(ptr, mload(ptr))), 0)
      // Increment buffer length - 0x24 plus the previous length
      mstore(ptr, add(0x24, mload(ptr)))
      // Set the current action being executed (STORES) -
      mstore(0xe0, action_req)
      // Set the expected next function - STORE_DEST
      mstore(0x100, 2)
      // Set a pointer to the length of the current request within the buffer
      mstore(sub(ptr, 0x20), add(ptr, mload(ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Sets a passed in location to a value passed in via 'to'
  function set(bytes32 _field) conditions(validStoreDest, validStoreVal) internal pure returns (bytes32) {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push storage destination to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _field)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - VAL_SET
      mstore(0x100, 3)
      // Increment STORES action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of storage slots pushed to -
      mstore(0x120, add(1, mload(0x120)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
    return _field;
  }

  // Sets a previously-passed-in destination in storage to the value
  function to(bytes32, bytes32 _val) conditions(validStoreVal, validStoreDest) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push storage value to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _val)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - STORE_DEST
      mstore(0x100, 2)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Sets a previously-passed-in destination in storage to the value
  function to(bytes32 _field, uint _val) internal pure {
    to(_field, bytes32(_val));
  }

  // Sets a previously-passed-in destination in storage to the value
  function to(bytes32 _field, address _val) internal pure {
    to(_field, bytes32(_val));
  }

  // Sets a previously-passed-in destination in storage to the value
  function to(bytes32 _field, bool _val) internal pure {
    to(
      _field,
      _val ? bytes32(1) : bytes32(0)
    );
  }

  function increase(bytes32 _field) conditions(validStoreDest, validStoreVal) internal view returns (bytes32 val) {
    // Read value stored at the location in storage -
    val = keccak256(_field, execID());
    assembly {
      val := sload(val)
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push storage destination to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _field)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - VAL_INC
      mstore(0x100, 4)
      // Increment STORES action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of storage slots pushed to -
      mstore(0x120, add(1, mload(0x120)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
    return val;
  }

  function decrease(bytes32 _field) conditions(validStoreDest, validStoreVal) internal view returns (bytes32 val) {
    // Read value stored at the location in storage -
    val = keccak256(_field, execID());
    assembly {
      val := sload(val)
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push storage destination to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _field)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - VAL_DEC
      mstore(0x100, 5)
      // Increment STORES action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of storage slots pushed to -
      mstore(0x120, add(1, mload(0x120)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
    return val;
  }

  function by(bytes32 _val, uint _amt) conditions(validStoreVal, validStoreDest) internal pure {
    // Check the expected function type - if it is VAL_INC, perform safe-add on the value
    // If it is VAL_DEC, perform safe-sub on the value
    if (expected() == NextFunction.VAL_INC)
      _amt = _amt.add(uint(_val));
    else if (expected() == NextFunction.VAL_DEC)
      _amt = uint(_val).sub(_amt);
    else
      revert('Expected VAL_INC or VAL_DEC');

    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push storage value to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _amt)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - STORE_DEST
      mstore(0x100, 2)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Decreases the value at some field by a maximum amount, and sets it to 0 if there will be underflow
  function byMaximum(bytes32 _val, uint _amt) conditions(validStoreVal, validStoreDest) internal pure {
    // Check the expected function type - if it is VAL_DEC, set the new amount to the difference of
    // _val and _amt, to a minimum of 0
    if (expected() == NextFunction.VAL_DEC) {
      if (uint(_val) > _amt)
        _amt = 0;
      else
        _amt = uint(_val).sub(_amt);
    } else {
      revert('Expected VAL_DEC');
    }

    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push storage value to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _amt)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - STORE_DEST
      mstore(0x100, 2)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Begins creating an event log buffer - topics and data pushed will be emitted by
  // storage at the end of execution
  function emitting() conditions(validEmitBuff, isEmitting) internal pure {
    bytes4 action_req = EMITS;
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push requestor to the end of buffer, as well as to the 'current action' slot -
      mstore(add(0x20, add(ptr, mload(ptr))), action_req)
      mstore(0xe0, action_req)
      // Push '0' to the end of the 4 bytes just pushed - this will be the length of the EMITS action
      mstore(add(0x24, add(ptr, mload(ptr))), 0)
      // Increment buffer length - 0x24 plus the previous length
      mstore(ptr, add(0x24, mload(ptr)))
      // Set the current action being executed (EMITS) -
      mstore(0xe0, action_req)
      // Set the expected next function - EMIT_LOG
      mstore(0x100, 6)
      // Set a pointer to the length of the current request within the buffer
      mstore(sub(ptr, 0x20), add(ptr, mload(ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  function log(bytes32 _data) conditions(validEvent, validEvent) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push 0 to the end of the buffer - event will have 0 topics
      mstore(add(0x20, add(ptr, mload(ptr))), 0)
      // If _data is zero, set data size to 0 in buffer and push -
      if eq(_data, 0) {
        mstore(add(0x40, add(ptr, mload(ptr))), 0)
        // Increment buffer length - 0x40 plus the original length
        mstore(ptr, add(0x40, mload(ptr)))
      }
      // If _data is not zero, set size to 0x20 and push to buffer -
      if iszero(eq(_data, 0)) {
        // Push data size (0x20) to the end of the buffer
        mstore(add(0x40, add(ptr, mload(ptr))), 0x20)
        // Push data to the end of the buffer
        mstore(add(0x60, add(ptr, mload(ptr))), _data)
        // Increment buffer length - 0x60 plus the original length
        mstore(ptr, add(0x60, mload(ptr)))
      }
      // Increment EMITS action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of events pushed to buffer -
      mstore(0x140, add(1, mload(0x140)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  function log(bytes32[1] memory _topics, bytes32 _data) conditions(validEvent, validEvent) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push 1 to the end of the buffer - event will have 1 topic
      mstore(add(0x20, add(ptr, mload(ptr))), 1)
      // Push topic to end of buffer
      mstore(add(0x40, add(ptr, mload(ptr))), mload(_topics))
      // If _data is zero, set data size to 0 in buffer and push -
      if eq(_data, 0) {
        mstore(add(0x60, add(ptr, mload(ptr))), 0)
        // Increment buffer length - 0x60 plus the original length
        mstore(ptr, add(0x60, mload(ptr)))
      }
      // If _data is not zero, set size to 0x20 and push to buffer -
      if iszero(eq(_data, 0)) {
        // Push data size (0x20) to the end of the buffer
        mstore(add(0x60, add(ptr, mload(ptr))), 0x20)
        // Push data to the end of the buffer
        mstore(add(0x80, add(ptr, mload(ptr))), _data)
        // Increment buffer length - 0x80 plus the original length
        mstore(ptr, add(0x80, mload(ptr)))
      }
      // Increment EMITS action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of events pushed to buffer -
      mstore(0x140, add(1, mload(0x140)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  function log(bytes32[2] memory _topics, bytes32 _data) conditions(validEvent, validEvent) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push 2 to the end of the buffer - event will have 2 topics
      mstore(add(0x20, add(ptr, mload(ptr))), 2)
      // Push topics to end of buffer
      mstore(add(0x40, add(ptr, mload(ptr))), mload(_topics))
      mstore(add(0x60, add(ptr, mload(ptr))), mload(add(0x20, _topics)))
      // If _data is zero, set data size to 0 in buffer and push -
      if eq(_data, 0) {
        mstore(add(0x80, add(ptr, mload(ptr))), 0)
        // Increment buffer length - 0x80 plus the original length
        mstore(ptr, add(0x80, mload(ptr)))
      }
      // If _data is not zero, set size to 0x20 and push to buffer -
      if iszero(eq(_data, 0)) {
        // Push data size (0x20) to the end of the buffer
        mstore(add(0x80, add(ptr, mload(ptr))), 0x20)
        // Push data to the end of the buffer
        mstore(add(0xa0, add(ptr, mload(ptr))), _data)
        // Increment buffer length - 0xa0 plus the original length
        mstore(ptr, add(0xa0, mload(ptr)))
      }
      // Increment EMITS action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of events pushed to buffer -
      mstore(0x140, add(1, mload(0x140)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  function log(bytes32[3] memory _topics, bytes32 _data) conditions(validEvent, validEvent) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push 3 to the end of the buffer - event will have 3 topics
      mstore(add(0x20, add(ptr, mload(ptr))), 3)
      // Push topics to end of buffer
      mstore(add(0x40, add(ptr, mload(ptr))), mload(_topics))
      mstore(add(0x60, add(ptr, mload(ptr))), mload(add(0x20, _topics)))
      mstore(add(0x80, add(ptr, mload(ptr))), mload(add(0x40, _topics)))
      // If _data is zero, set data size to 0 in buffer and push -
      if eq(_data, 0) {
        mstore(add(0xa0, add(ptr, mload(ptr))), 0)
        // Increment buffer length - 0xa0 plus the original length
        mstore(ptr, add(0xa0, mload(ptr)))
      }
      // If _data is not zero, set size to 0x20 and push to buffer -
      if iszero(eq(_data, 0)) {
        // Push data size (0x20) to the end of the buffer
        mstore(add(0xa0, add(ptr, mload(ptr))), 0x20)
        // Push data to the end of the buffer
        mstore(add(0xc0, add(ptr, mload(ptr))), _data)
        // Increment buffer length - 0xc0 plus the original length
        mstore(ptr, add(0xc0, mload(ptr)))
      }
      // Increment EMITS action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of events pushed to buffer -
      mstore(0x140, add(1, mload(0x140)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  function log(bytes32[4] memory _topics, bytes32 _data) conditions(validEvent, validEvent) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push 4 to the end of the buffer - event will have 4 topics
      mstore(add(0x20, add(ptr, mload(ptr))), 4)
      // Push topics to end of buffer
      mstore(add(0x40, add(ptr, mload(ptr))), mload(_topics))
      mstore(add(0x60, add(ptr, mload(ptr))), mload(add(0x20, _topics)))
      mstore(add(0x80, add(ptr, mload(ptr))), mload(add(0x40, _topics)))
      mstore(add(0xa0, add(ptr, mload(ptr))), mload(add(0x60, _topics)))
      // If _data is zero, set data size to 0 in buffer and push -
      if eq(_data, 0) {
        mstore(add(0xc0, add(ptr, mload(ptr))), 0)
        // Increment buffer length - 0xc0 plus the original length
        mstore(ptr, add(0xc0, mload(ptr)))
      }
      // If _data is not zero, set size to 0x20 and push to buffer -
      if iszero(eq(_data, 0)) {
        // Push data size (0x20) to the end of the buffer
        mstore(add(0xc0, add(ptr, mload(ptr))), 0x20)
        // Push data to the end of the buffer
        mstore(add(0xe0, add(ptr, mload(ptr))), _data)
        // Increment buffer length - 0xe0 plus the original length
        mstore(ptr, add(0xe0, mload(ptr)))
      }
      // Increment EMITS action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of events pushed to buffer -
      mstore(0x140, add(1, mload(0x140)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Begins creating a storage buffer - destinations entered will be forwarded wei
  // before the end of execution
  function paying() conditions(validPayBuff, isPaying) internal pure {
    bytes4 action_req = PAYS;
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push requestor to the end of buffer, as well as to the 'current action' slot -
      mstore(add(0x20, add(ptr, mload(ptr))), action_req)
      mstore(0xe0, action_req)
      // Push '0' to the end of the 4 bytes just pushed - this will be the length of the PAYS action
      mstore(add(0x24, add(ptr, mload(ptr))), 0)
      // Increment buffer length - 0x24 plus the previous length
      mstore(ptr, add(0x24, mload(ptr)))
      // Set the current action being executed (PAYS) -
      mstore(0xe0, action_req)
      // Set the expected next function - PAY_AMT
      mstore(0x100, 8)
      // Set a pointer to the length of the current request within the buffer
      mstore(sub(ptr, 0x20), add(ptr, mload(ptr)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Pushes an amount of wei to forward to the buffer
  function pay(uint _amount) conditions(validPayAmt, validPayDest) internal pure returns (uint) {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push payment amount to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _amount)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - PAY_DEST
      mstore(0x100, 7)
      // Increment PAYS action length -
      mstore(
        mload(sub(ptr, 0x20)),
        add(1, mload(mload(sub(ptr, 0x20))))
      )
      // Update number of payment destinations to be pushed to -
      mstore(0x160, add(1, mload(0x160)))
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
    return _amount;
  }

  // Push an address to forward wei to, to the buffer
  function toAcc(uint, address _dest) conditions(validPayDest, validPayAmt) internal pure {
    assembly {
      // Get pointer to buffer length -
      let ptr := add(0x20, mload(0xc0))
      // Push payment destination to the end of the buffer -
      mstore(add(0x20, add(ptr, mload(ptr))), _dest)
      // Increment buffer length - 0x20 plus the previous length
      mstore(ptr, add(0x20, mload(ptr)))
      // Set the expected next function - PAY_AMT
      mstore(0x100, 8)
      // If the free-memory pointer does not point beyond the buffer's current size, update it
      if lt(mload(0x40), add(0x20, add(ptr, mload(ptr)))) {
        mstore(0x40, add(0x20, add(ptr, mload(ptr))))
      }
    }
  }

  // Returns the enum representing the next expected function to be called -
  function expected() private pure returns (NextFunction next) {
    assembly { next := mload(0x100) }
  }

  // Returns the number of events pushed to the storage buffer -
  function emitted() internal pure returns (uint num_emitted) {
    if (buffPtr() == bytes32(0))
      return 0;

    // Load number emitted from buffer -
    assembly { num_emitted := mload(0x140) }
  }

  // Returns the number of storage slots pushed to the storage buffer -
  function stored() internal pure returns (uint num_stored) {
    if (buffPtr() == bytes32(0))
      return 0;

    // Load number stored from buffer -
    assembly { num_stored := mload(0x120) }
  }

  // Returns the number of payment destinations and amounts pushed to the storage buffer -
  function paid() internal pure returns (uint num_paid) {
    if (buffPtr() == bytes32(0))
      return 0;

    // Load number paid from buffer -
    assembly { num_paid := mload(0x160) }
  }
}


library Sale {

  using Contract for *;

  /// CROWDSALE STORAGE ///
  
  function ends_at() internal pure returns (bytes32 location) {
    location = keccak256('current_tier_ends_at');
  }

  function crowdsale_tiers() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_list");
  }

  // Storage location of the CROWDSALE_TIERS index (-1) of the current tier. If zero, no tier is currently active
  function cur_tier() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_current_tier");
  }

  // Storage location of the total number of tokens remaining for purchase in the current tier
  function tokens_remaining() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tier_tokens_remaining");
  }

  // Storage location for token decimals
  function decimals() internal pure returns (bytes32 location) {
    location = keccak256("token_decimals");
  }

  // Storage location of team funds wallet
  function wallet() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wallet");
  }

  // Storage location of amount of wei raised during the crowdsale, total
  function wei_raised() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_wei_raised");
  }

  // Returns the storage location of the initialization status
  function is_init() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_init");
  }

  // Returns the storage location of the finalization status
  function is_final() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_is_finalized");
  }
  // Returns the storage location of the Crowdsale's start time
  function start_time() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_start_time");
  }

  // Returns the storage location of the number of tokens sold
  function tokens_sold() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_tokens_sold");
  }

  // Returns the storage location of the total token supply
  function total_supply() internal pure returns (bytes32 location) {
    location = keccak256('tokens_total_supply');
  }

  // Returns the storage location of the minimum amount of tokens allowed to be purchased
  function min_contribution() internal pure returns (bytes32 location) {
    location = keccak256("crowdsale_min_cap");
  }

  // Storage seed for unique contributors
  bytes32 private constant UNIQUE_CONTRIB_SEED = keccak256('crowdsale_unique_contributions');

  function contributors() internal pure returns (bytes32 location) {
    location = UNIQUE_CONTRIB_SEED;
  }

  // Returns the storage location of the sender's contribution status
  function has_contributed(address sender) internal pure returns (bytes32 location) {
    location = keccak256(sender, UNIQUE_CONTRIB_SEED);
  }

  bytes32 private constant CROWDSALE_TIERS = keccak256('crowdsale_tiers');

  // Returns the storage location of the tier's token sell cap
  function tier_sell_cap(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(64 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Returns the storage location of the tier's price 
  function tier_price(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(96 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Returns the storage location of the tier's duration 
  function tier_duration(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(128 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Returns the storage location of the tier's whitelist status  
  function tier_is_whitelisted(uint tier) internal pure returns (bytes32 location) {
    location = bytes32(192 + (192 * tier) + uint(CROWDSALE_TIERS));
  }

  // Storage seed for the sale whitelist
  bytes32 internal constant SALE_WHITELIST = keccak256("crowdsale_purchase_whitelist");

  // Returns the storage location for the sender's whitelist status in the tier
  function whitelist_max_cap(address sender, uint tier) internal pure returns (bytes32 location) {
    location = keccak256(sender, keccak256(tier, SALE_WHITELIST));
  }

  // Returns the storage location for the sender's whitelist status in the tier
  function whitelist_min_cap(address sender, uint tier) internal pure returns (bytes32 location) {
    location = bytes32(32 + uint(keccak256(sender, keccak256(tier, SALE_WHITELIST))));
  }

  /// TOKEN STORAGE ///
  // Storage seed for user balances mapping
  bytes32 internal constant TOKEN_BALANCES = keccak256("token_balances");

  function balances(address owner) internal pure returns (bytes32 location) {
    location = keccak256(owner, TOKEN_BALANCES);
  }
  
  // Function selector for buy
  bytes4 internal constant BUY_SEL = bytes4(keccak256('buy()'));

  // Sale pre/post conditions for execution -

  // Check msg.sig, and check the appropriate preconditions
  function first() internal pure {
    if (msg.sig == BUY_SEL) 
      Contract.checks(empty);
    else 
      revert('Invalid function selector');
  }

  function empty() internal pure {

  }

  // After each Purchase feature executes, ensure that the result
  // will both emit an event and store values in storage
  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('Invalid state change');
  }

  // event Purchase(address indexed buyer, uint indexed tier, uint amount)
  bytes32 internal constant PURCHASE_SIG = keccak256('Purchase(address,uint256,uint256)');

  // Returns the events and data for an 'Approval' event -
  function PURCHASE(address _buyer, uint tier) private pure
  returns (bytes32[3] memory) {
    return [PURCHASE_SIG, bytes32(_buyer), bytes32(tier)];
  }


  // Implements the logic to create the storage buffer for a Crowdsale Purchase
  function buy() internal view {
    uint current_tier;
    uint _tokens_remaining;
    uint purchase_price;
    uint tier_ends_at;
    bool _tier_is_whitelisted;
    bool updated_tier;
    // Get information on the current tier of the crowdsale, and create a CrowdsaleTier struct to hold all of the information
    (
      current_tier,
      _tokens_remaining,
      purchase_price,
      tier_ends_at,
      _tier_is_whitelisted,
      updated_tier
    ) = getCurrentTier();

    if (
      uint(Contract.read(is_init())) == 0 // Crowdsale is not yet initialized
      || uint(Contract.read(is_final())) == 1         // Crowdsale is already finalized
    ) revert('crowdsale invalid state');

    // Get amount of wei able to be spent, and tokens able to be purchased
    uint amount_spent;
    uint amount_purchased;

    if (_tier_is_whitelisted) {
      if (Contract.read(has_contributed(Contract.sender())) == bytes32(1)) {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(decimals())),
          purchase_price,
          _tokens_remaining,
          uint(Contract.read(whitelist_max_cap(Contract.sender(), current_tier))),
          0,
          _tier_is_whitelisted
        );

      } else {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(decimals())),
          purchase_price,
          _tokens_remaining,
          uint(Contract.read(whitelist_max_cap(Contract.sender(), current_tier))),
          uint(Contract.read(whitelist_min_cap(Contract.sender(), current_tier))),
          _tier_is_whitelisted
        );

      }
    } else {
      if (Contract.read(has_contributed(Contract.sender())) == bytes32(1)) {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(decimals())),
          purchase_price,
          _tokens_remaining,
          0,
          0,
          _tier_is_whitelisted
        );
      } else {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(decimals())),
          purchase_price,
          _tokens_remaining,
          0,
          uint(Contract.read(min_contribution())),
          _tier_is_whitelisted
        );
      }
    }

    // Begin paying
    Contract.paying();
    // Designate amount spent for forwarding to the team wallet
    Contract.pay(amount_spent).toAcc(address(Contract.read(wallet())));

    // Begin storing values
    Contract.storing();

    // Store updated purchaser's token balance
    Contract.increase(
      balances(Contract.sender())
    ).by(amount_purchased);

    // Update tokens remaining for sale in the tier
    Contract.decrease(
      tokens_remaining()
    ).by(amount_purchased);

    // Update total tokens sold during the sale
    Contract.increase(
      tokens_sold()
    ).by(amount_purchased);

    // Update total token supply
    Contract.increase(
      total_supply()
    ).by(amount_purchased);

    // Update total wei raised
    Contract.increase(
      wei_raised()
    ).by(amount_spent);

    // If the sender had not previously contributed to the sale, push new unique contributor count and sender contributor status to buffer
    if (Contract.read(has_contributed(Contract.sender())) == bytes32(0)) {
      Contract.increase(
        contributors()
      ).by(1);
      Contract.set(
        has_contributed(Contract.sender())
      ).to(true);
    }

    // If this tier was whitelisted, update sender's whitelist spend caps
    if (_tier_is_whitelisted) {
      Contract.set(
        whitelist_max_cap(Contract.sender(), current_tier)
      ).to(uint(0));
      Contract.set(
        whitelist_min_cap(Contract.sender(), current_tier)
      ).to(Contract.read(whitelist_max_cap(Contract.sender(), current_tier)));
    }

    // If this tier was updated, set storage 'current tier' information -
    if (updated_tier) {
      Contract.increase(
        cur_tier()
      ).by(1);
      Contract.set(
        ends_at()
      ).to(tier_ends_at);
    }

    // Set up EMITS action requests -
    Contract.emitting();

    // Add PURCHASE signature and topics
    Contract.log(
      PURCHASE(Contract.sender(), current_tier), bytes32(amount_purchased)
    );

  }


  /*
  Reads from storage and returns information about the current crowdsale tier
  @param _exec_id: The execution id under which the crowdsale is registered
  @returns cur_tier: A struct representing the current tier of the crowdsale
  */
  function getCurrentTier() private view
  returns (
    uint current_tier,
    uint _tokens_remaining,
    uint purchase_price,
    uint tier_ends_at,
    bool _tier_is_whitelisted,
    bool updated_tier
  ) {
    uint num_tiers = uint(Contract.read(crowdsale_tiers()));
    current_tier = uint(Contract.read(cur_tier())) - 1;
    tier_ends_at = uint(Contract.read(ends_at()));
    _tokens_remaining = uint(Contract.read(tokens_remaining()));

    // If the current tier has ended, we need to update the current tier in storage
    if (now >= tier_ends_at) {
      (
        _tokens_remaining,
        purchase_price,
        _tier_is_whitelisted,
        tier_ends_at
      ) = updateTier(tier_ends_at, current_tier, num_tiers);
      updated_tier = true;
    }
    else {
      (purchase_price, _tier_is_whitelisted) = getTierInfo(current_tier);
      updated_tier = false;
    }

    // Ensure current tier information is valid -
    if (
      current_tier >= num_tiers     // Invalid tier index
      || purchase_price == 0          // Invalid purchase price
      || tier_ends_at <= now          // Invalid tier end time
    ) revert('invalid index, price, or end time');

    // If the current tier does not have tokens remaining, revert
    if (_tokens_remaining == 0)
      revert('tier sold out');
  }

  /*
  Loads information about the current crowdsale tier into the CrowdsaleTier struct
  @param _exec_id: The execution id under which this crowdsale application is registered
  @param _ptr: A pointer to a buffer in memory
  @param _tier_info: An array containing information about the current tier in memory
  @param _cur_tier: A struct representing information about the current crowdsale tier
  */
  function getTierInfo(uint current_tier) private view
  returns (uint purchase_price, bool _tier_is_whitelisted) {
    // Get the crowdsale purchase price
    purchase_price = uint(Contract.read(tier_price(current_tier)));
    // Get the current tier's whitelist status
    _tier_is_whitelisted = Contract.read(tier_is_whitelisted(current_tier)) == bytes32(1) ? true : false;
  }

  /*
  Takes an input CrowdsaleTier struct and updates it to reflect information about the latest tier
  @param _exec_id: The execution id under which this crowdsale application is registered
  @param _ptr: A pointer to a buffer in memory
  @param _tier_info: An array containing information about the current tier in memory
  @param _cur_tier: A struct representing information about the current crowdsale tier
  */
  function updateTier(uint _ends_at, uint current_tier, uint num_tiers) private view
  returns (uint _tokens_remaining, uint purchase_price, bool _tier_is_whitelisted, uint tier_ends_at) {
    // While the current timestamp is beyond the current tier's end time, and while the current tier's index is within a valid range:
    while (now >= _ends_at && ++current_tier < num_tiers) {
      // Push tier token sell cap storage location to buffer
      _tokens_remaining = uint(Contract.read(tier_sell_cap(current_tier)));
      // Push tier token price storage location to buffer
      purchase_price = uint(Contract.read(tier_price(current_tier)));
      // Push tier duration storage location to buffer
      uint _tier_duration = uint(Contract.read(tier_duration(current_tier)));
      // Push tier 'is-whitelisted' status storage location to buffer
      _tier_is_whitelisted = Contract.read(tier_is_whitelisted(current_tier)) == bytes32(1) ? true : false;
      // Ensure valid tier setup
      if (_tokens_remaining == 0 || purchase_price == 0 || _tier_duration == 0)
        revert('invalid tier');
      // Add returned duration to previous tier end time
      if (_ends_at + _tier_duration <= _ends_at)
        revert('tier duration overflow');

      _ends_at += _tier_duration;
    }
    // If the updated current tier's index is not in the valid range, or the end time is still in the past, throw
    if (now >= _ends_at || current_tier >= num_tiers)
      revert('crowdsale finished');

    tier_ends_at = _ends_at;

  }

  function getPurchaseInfo(
    uint token_decimals,
    uint purchase_price,
    uint _tokens_remaining,
    uint maximum_spend_amount,
    uint minimum_purchase_amount,
    bool _tier_is_whitelisted
  ) private view returns (uint amount_spent, uint amount_purchased) {
    // Get amount of wei able to be spent, given the number of tokens remaining -
    if ((msg.value * (10 ** token_decimals)) / purchase_price >= _tokens_remaining) {
      // wei sent is able to purchase more tokens than are remaining in this tier -
      amount_spent =
        (purchase_price * _tokens_remaining) / (10 ** token_decimals);
    } else {
      // All of the wei sent can be used to purchase tokens
      amount_spent = msg.value;
    }

    // If the current tier is whitelisted, the sender has a maximum wei contribution cap. If amount spent exceeds this cap, adjust amount spent -
    if (_tier_is_whitelisted) {
      if (amount_spent > maximum_spend_amount)
        amount_spent = maximum_spend_amount;
      // Decrease spender's spend amount remaining by the amount spent
      maximum_spend_amount -= amount_spent;
    }

    // Ensure spend amount is valid -
    if (amount_spent == 0 || amount_spent > msg.value)
      revert('invalid spend amount');

    // Get number of tokens able to be purchased with the amount spent -
    amount_purchased =
      (amount_spent * (10 ** token_decimals) / purchase_price);

    // Ensure amount of tokens to purchase is not greater than the amount of tokens remaining in this tier -
    if (amount_purchased > _tokens_remaining || amount_purchased == 0)
      revert('invalid purchase amount');

    // Ensure amount of tokens to purchase is greater than the spender's minimum contribution cap -
    if (amount_purchased < minimum_purchase_amount)
      revert('under min cap');
  }

}

library Initialize {

  using Contract for *;
  using SafeMath for uint;

  bytes32 internal constant EXEC_PERMISSIONS = keccak256('script_exec_permissions');

  // Returns the storage location of a script execution address's permissions -
  function execPermissions(address _exec) internal pure returns (bytes32 location) {
    location = keccak256(_exec, EXEC_PERMISSIONS);
  }

  // Returns the storage location of the sale's admin
  function admin() internal pure returns (bytes32 location) {
    location = keccak256('sale_admin');
  }

  // Returns the storage location of the sale team's wallet
  function teamWallet() internal pure returns (bytes32 location) {
    location = keccak256('sale_wallet');
  }

  // Returns the storage location of the sale's initialization status
  function saleInitialized() internal pure returns (bytes32 location) {
    location = keccak256('sale_is_init');
  }

  // Returns the storage location of the sale's total duration
  function saleDuration() internal pure returns (bytes32 location) {
    location = keccak256('sale_total_duration');
  }

  // Returns the storage location of the sale's start time
  function saleStartTime() internal pure returns (bytes32 location) {
    location = keccak256('sale_start_time');
  }

  // Returns the storage location of the current sale tier
  function currentTier() internal pure returns (bytes32 location) {
    location = keccak256('sale_current_tier');
  }

  // Returns the storage location of the number of tokens remaining for sale in the current tier
  function currentTierTokensRemaining() internal pure returns (bytes32 location) {
    location = keccak256('sale_current_tier_tokens_remaining');
  }

  // Returns the storage location of the current tier's end time
  function currentTierEndsAt() internal pure returns (bytes32 location) {
    location = keccak256('sale_current_tier_ends_at');
  }

  // Returns the storage location of the sale's tier list
  function saleTierList() internal pure returns (bytes32 location) {
    location = keccak256('sale_tier_list');
  }

  // Returns the storage location of the tier's name
  function tierName(uint _index) internal pure returns (bytes32 location) {
    location = bytes32(32 + (192 * _index) + uint(saleTierList()));
  }

  // Returns the storage location of the number of tokens for sale in the tier
  function tierSellCap(uint _index) internal pure returns (bytes32 location) {
    location = bytes32(64 + (192 * _index) + uint(saleTierList()));
  }

  // Returns the storage location of the tier's price per 10^decimals units, in wei
  function tierPrice(uint _index) internal pure returns (bytes32 location) {
    location = bytes32(96 + (192 * _index) + uint(saleTierList()));
  }

  // Returns the storage location of the tier's duration
  function tierDuration(uint _index) internal pure returns (bytes32 location) {
    location = bytes32(128 + (192 * _index) + uint(saleTierList()));
  }

  // Returns the storage location of whether or not the admin can modify the tier's duration
  // prior to the start of the tier
  function tierDurationIsModifiable(uint _index) internal pure returns (bytes32 location) {
    location = bytes32(160 + (192 * _index) + uint(saleTierList()));
  }

  // Returns the storage location of whether or not the tier is whitelisted
  function tierIsWhitelisted(uint _index) internal pure returns (bytes32 location) {
    location = bytes32(192 + (192 * _index) + uint(saleTierList()));
  }

  // Token pre/post conditions for execution -

  // No preconditions for execution of the constructor -
  function first() internal pure { }

  // Ensure that the constructor will store data -
  function last() internal pure {
    if (Contract.stored() != 15)
      revert('Invalid state change');
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
  */
  function init(
    address _team_wallet, uint _start_time, bytes32 _initial_tier_name,
    uint _initial_tier_price, uint _initial_tier_duration, uint _initial_tier_token_sell_cap,
    bool _initial_tier_is_whitelisted, bool _initial_tier_duration_is_modifiable, address _admin
  ) internal view {
    // Ensure valid input
    if (
      _team_wallet == address(0)
      || _initial_tier_price == 0
      || _start_time < now
      || _start_time + _initial_tier_duration <= _start_time
      || _initial_tier_token_sell_cap == 0
      || _admin == address(0)
    ) revert('Invalid input');

    // Begin storing init information -
    Contract.storing();

    // Set instance script exec address permission -
    Contract.set(execPermissions(msg.sender)).to(true);
    // Set sale admin -
    Contract.set(admin()).to(_admin);
    // Set team wallet -
    Contract.set(teamWallet()).to(_team_wallet);
    // Set total sale duration -
    Contract.set(saleDuration()).to(_initial_tier_duration);
    // Set sale start time -
    Contract.set(saleStartTime()).to(_start_time);
    // Store initial crowdsale tier list length -
    Contract.set(saleTierList()).to(uint(1));
    // Store initial tier name -
    Contract.set(tierName(0)).to(_initial_tier_name);
    // Store initial tier token sell cap -
    Contract.set(tierSellCap(0)).to(_initial_tier_token_sell_cap);
    // Store initial tier purchase price (in wei/(10^decimals units)) -
    Contract.set(tierPrice(0)).to(_initial_tier_price);
    // Store initial tier duration -
    Contract.set(tierDuration(0)).to(_initial_tier_duration);
    // Store initial tier duration modifiability status -
    Contract.set(tierDurationIsModifiable(0)).to(_initial_tier_duration_is_modifiable);
    // Store initial tier whitelist status -
    Contract.set(tierIsWhitelisted(0)).to(_initial_tier_is_whitelisted);
    // Set current sale tier (offset by 1 in storage) -
    Contract.set(currentTier()).to(uint(1));
    // Set current tier end time -
    Contract.set(currentTierEndsAt()).to(_initial_tier_duration.add(_start_time));
    // Set current tier tokens remaining -
    Contract.set(currentTierTokensRemaining()).to(_initial_tier_token_sell_cap);
  }
}

library MintedCappedFlat {

  using Contract for *;

  // TODO - set script exec address in constructor and check for each function

  // Initialization function - uses a new exec id to create a new instance of this application
  function init(
    address team_wallet, uint start_time, bytes32 initial_tier_name,
    uint initial_tier_price, uint initial_tier_duration, uint initial_tier_token_sell_cap,
    bool initial_tier_is_whitelisted, bool initial_tier_duration_is_modifiable, address admin
  ) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.initialize();
    // Check preconditions for execution -
    Contract.checks(Initialize.first);
    // Execute transfer function -
    Initialize.init(
      team_wallet, start_time, initial_tier_name, initial_tier_price,
      initial_tier_duration, initial_tier_token_sell_cap, initial_tier_is_whitelisted,
      initial_tier_duration_is_modifiable, admin
    );
    // Check postconditions for execution -
    Contract.checks(Initialize.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  //// CLASS - Token: ////

  /// Feature - Token: ///
  function transfer(address to, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute transfer function -
    Token.transfer(to, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function transferFrom(address owner, address recipient, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute transfer function -
    Token.transferFrom(owner, recipient, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  /// Feature - Token: ///
  function approve(address spender, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute approval function -
    Token.approve(spender, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function increaseApproval(address spender, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute approval function -
    Token.increaseApproval(spender, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  function decreaseApproval(address spender, uint amount) external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Token.first);
    // Execute approval function -
    Token.decreaseApproval(spender, amount);
    // Check postconditions for execution -
    Contract.checks(Token.last);
    // Commit state changes to storage -
    Contract.commit();
  }

  //// CLASS - Sale: ////

  /// Feature - Sale: ///
  function buy() external view {
    // Begin execution - reads execution id and original sender address from storage
    Contract.authorize(msg.sender);
    // Check preconditions for execution -
    Contract.checks(Sale.first);
    // Execute approval function -
    Sale.buy();
    // Check postconditions for execution -
    Contract.checks(Sale.last);
    // Commit state changes to storage -
    Contract.commit();
  } 

  //// CLASS - Admin: ////

//  /// Feature - Admin: ///
//  function updateGlobalMinContribution(uint new_min_contribution)
//  external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.updateGlobalMinContribution(new_min_contribution);
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function createCrowdsaleTiers(
//    bytes32[] tier_names, uint[] tier_durations, uint[] tier_prices, uint[] tier_caps,
//    bool[] tier_modifiable, bool[] tier_whitelisted
//  ) external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.createCrowdsaleTiers(
//      tier_names, tier_durations, tier_prices, tier_caps, tier_modifiable, tier_whitelisted 
//    );
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function whitelistMultiForTier(
//    uint tier_index, address[] to_whitelist, uint[] min_token_purchase, uint[] max_wei_spend
//  ) external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.whitelistMultiForTier(
//      tier_index, to_whitelist, min_token_purchase, max_wei_spend 
//    );
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function initCrowdsaleToken(bytes32 name, bytes32 symbol, uint decimals)
//  external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.initCrowdsaleToken(
//      name, symbol, decimals
//    );
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//  
//  function updateTierDuration(uint tier_index, uint new_duration)
//  external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.updateTierDuration(
//      tier_index, new_duration 
//    );
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  } 
//
//  // Feature - Admin: ///
//  function initializeCrowdsale() external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.initializeCrowdsale();
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function finalizeCrowdsale() external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.finalizeCrowdsale();
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  } 
//
//  // Feature - Admin: ///
//  function setTransferAgentStatus(address agent, bool is_agent) external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.setTransferAgentStatus(agent, is_agent);
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function updateMultipleReservedTokens(address[] destinations, uint[] num_tokens, uint[] num_percents, uint[] percent_decimals) external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.updateMultipleReservedTokens(destinations, num_tokens, num_percents, percent_decimals);
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function removeReservedTokens(address destination) external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.removeReservedTokens(destination);
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function distributeReservedTokens(uint num_destinations) external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.distributeReservedTokens(num_destinations);
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function finalizeCrowdsaleAndToken() external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.finalizeCrowdsaleAndToken();
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function distributeAndUnlockTokens() external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.distributeAndUnlockTokens();
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
//
//  function finalizeAndDistributeToken() external view { 
//    // Begin execution - reads execution id and original sender address from storage
//    Contract.authorize(msg.sender);
//    // Check preconditions for execution -
//    Contract.checks(Admin.first);
//    // Execute approval function -
//    Admin.finalizeAndDistributeToken();
//    // Check postconditions for execution -
//    Contract.checks(Admin.last);
//    // Commit state changes to storage -
//    Contract.commit();
//  }
}
