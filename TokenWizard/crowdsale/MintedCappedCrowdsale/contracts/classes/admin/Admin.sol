pragma solidity ^0.4.23;

import "../../MintedCapped.sol";
import "../../lib/Contract.sol";

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

  function TOKEN_INIT(bytes32 exec_id, bytes32 name, bytes32 symbol) private pure returns (bytes32[4] memory) {
    return [CROWDSALE_TOKEN_INIT, exec_id, name, symbol];
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


    uint total_duration = uint(Contract.read(total_duration()));
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
        || total_duration + tier_durations[i] <= total_duration
        || tier_prices[i] == 0
      ) revert("invalid tier vals");

      // Increment total duration of the crowdsale
      total_duration = total_duration.add(tier_durations[i]);
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
    ).to(total_duration);

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
    uint current_tier = uint(Contract.read(current_tier()));
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
    if (current_tier == 0)
      revert("invalid crowdsale setup");

    Contract.storing();

    // Normalize returned current tier index
    current_tier--;

    // Check returned values for valid crowdsale and tier status -
    if (
      address(Contract.read(admin())) != Contract.sender()
      || Contract.read(is_final()) == bytes32(1)                  
      || uint(Contract.read(crowdsale_tiers())) <= tier_index 
      || current_tier > tier_index 
      || (current_tier == tier_index 
         && tier_index != 0)
      || Contract.read(bytes32(160 + (192 * tier_index) + uint(crowdsale_tiers()))) == 0
    ) revert("invalid crowdsale status");

    if (tier_index == 0 && current_tier == 0) {
      if (now >= starts_at) 
        revert("cannot modify current tier");

      // Store current tier end time
      Contract.set(
        ends_at()
      ).to(new_duration.add(starts_at));

    } else if (tier_index > current_tier && now >= _ends_at) {
      if (tier_index - current_tier == 1)
        revert("cannot modify current tier");

      for (uint i = current_tier; i < tier_index; i++)
        _ends_at = _ends_at.add(uint(Contract.read(bytes32(128 + (192 * i) + uint(crowdsale_tiers())))));

      if (now <= _ends_at)
        revert("cannot modify current tier");


    } else if (tier_index <= current_tier || now >= _ends_at) {
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

  function INITIALIZE(bytes32 exec_id, bytes32 name) private pure returns (bytes32[3] memory) {
    return [CROWDSALE_INITIALIZED, exec_id, name];
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

