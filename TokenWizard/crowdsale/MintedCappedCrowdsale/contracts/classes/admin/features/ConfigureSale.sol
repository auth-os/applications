pragma solidity ^0.4.23;

import "../Admin.sol";
import "../../../lib/Contract.sol";

library ConfigureSale {

  using Contract for *;
  using SafeMath for uint;

  function first() internal view {
    if (address(Contract.read(Admin.admin())) != Contract.sender())
      revert('sender is not admin');
  }

  function last() internal pure {
    if (Contract.emitted() == 0 || Contract.stored() == 0)
      revert('invalid state change');
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

    if (Contract.read(Admin.is_init()) == bytes32(1))
      revert('crowdsale is not initialized');

    // Set up STORES action requests -
    Contract.storing();

    // Store new crowdsale minimum token purchase amount
    Contract.set(
      Admin.min_contrib() 
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


    uint total_duration = uint(Contract.read(Admin.total_duration()));
    uint num_tiers = uint(Contract.read(Admin.crowdsale_tiers()));
    uint base_storage = 0;

    // Check that the sender is the crowdsale admin, and that the crowdsale is not initialized
    if (Contract.read(Admin.is_init()) == bytes32(1))
      revert('crowdsale is not initialized');
    if (address(Contract.read(Admin.admin())) != Contract.sender())
      revert("not admin or sale is init");

    Contract.storing();

    // Store new tier list length
    Contract.set(
     Admin.crowdsale_tiers() 
    ).to(num_tiers.add(tier_names.length));

    // Place crowdsale tier storage base location in tiers struct
    base_storage = 32 + (192 * num_tiers) + uint(Admin.crowdsale_tiers());
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
      Admin.total_duration()
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
    if (address(Contract.read(Admin.admin())) != Contract.sender())
      revert("sender is not admin");

    // Get tier whitelist length
    uint tier_whitelist_length = uint(Contract.read(Admin.whitelist(tier_index)));

    // Set up STORES action requests -
    Contract.storing();

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < to_whitelist.length; i++) {
      // Get storage location for address whitelist struct
      bytes32 whitelist_status_loc = Admin.address_whitelist(to_whitelist[i], tier_index);
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
          bytes32(32 + (32 * tier_whitelist_length) + uint(Admin.whitelist(tier_index)))
        ).to(to_whitelist[i]);
        // Increment tier whitelist
        tier_whitelist_length++;
      }
    }

    // Store new tier whitelist length
    Contract.set(
      Admin.whitelist(tier_index)
    ).to(tier_whitelist_length);


    Contract.emitting();

    Contract.log(
      UPDATE_WHITE(Contract.execID(), tier_index, tier_whitelist_length), bytes32(0)
    );
    
  }

  function initCrowdsaleToken(bytes32 name, bytes32 symbol, uint decimals)
  internal pure { 
   // Ensure valid input
    if (
      name == 0
      || symbol == 0
      || decimals > 18
    ) revert('improper initialization');

    // Set up STORES action requests -
    Contract.storing();

    // Store token name, symbol, and decimals
    Contract.set(Admin.name()).to(name);
    Contract.set(Admin.symbol()).to(symbol);
    Contract.set(Admin.decimals()).to(decimals);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_TOKEN_INIT signature and topics
    Contract.log(
      TOKEN_INIT(Contract.execID(), name, symbol), bytes32(decimals)
    );

  }

  function updateTierDuration(uint tier_index, uint new_duration)
  internal view { 

    // Ensure valid input
    if (new_duration == 0)
      revert('invalid duration');

    uint starts_at = uint(Contract.read(Admin.start_time()));
    uint current_tier = uint(Contract.read(Admin.current_tier()));
    uint total_duration = uint(Contract.read(Admin.total_duration()));
    uint ends_at = uint(Contract.read(Admin.ends_at()));
    uint previous_duration = uint(Contract.read(
      bytes32(128 + (192 * tier_index) + uint(Admin.crowdsale_tiers())))
    );


    // Ensure an update is being performed
    if (previous_duration == new_duration)
      revert("duration unchanged");
    // Total crowdsale duration should always be minimum the previous duration for the tier to update
    if (total_duration < previous_duration)
      revert("total duration invalid");
    // Indices are off-by-one in storage - so the stored current tier index should never be 0
    if (current_tier == 0)
      revert("invalid crowdsale setup");

    Contract.storing();

    // Normalize returned current tier index
    current_tier--;

    // Check returned values for valid crowdsale and tier status -
    if (
      address(Contract.read(Admin.admin())) != Contract.sender()
      || Contract.read(Admin.is_final()) == bytes32(1)                  
      || uint(Contract.read(Admin.crowdsale_tiers())) <= tier_index 
      || current_tier > tier_index 
      || (current_tier == tier_index 
         && tier_index != 0)
      || Contract.read(bytes32(160 + (192 * tier_index) + uint(Admin.crowdsale_tiers()))) == 0
    ) revert("invalid crowdsale status");

    if (tier_index == 0 && current_tier == 0) {
      if (now >= starts_at) 
        revert("cannot modify current tier");

      // Store current tier end time
      Contract.set(
        Admin.ends_at()
      ).to(new_duration.add(starts_at));

    } else if (tier_index > current_tier && now >= ends_at) {
      if (tier_index - current_tier == 1)
        revert("cannot modify current tier");

      for (uint i = current_tier; i < tier_index; i++)
        ends_at = ends_at.add(uint(Contract.read(bytes32(128 + (192 * i) + uint(Admin.crowdsale_tiers())))));

      if (now <= ends_at)
        revert("cannot modify current tier");


    } else if (tier_index <= current_tier || now >= ends_at) {
      // Not a valid state to update - throw
      revert('invalid state');
    }

    // Get new overall crowdsale duration -
    if (previous_duration > new_duration) // Subtracting from total_duration
      total_duration = total_duration.sub(previous_duration - new_duration);
    else // Adding to total_duration
      total_duration = total_duration.add(new_duration - previous_duration);

    // Store updated tier duration
    Contract.set(
      bytes32(128 + (192 * tier_index) + uint(Admin.crowdsale_tiers()))
    ).to(new_duration);

    // Update total crowdsale duration
    Contract.set(
      Admin.total_duration()
    ).to(total_duration);

    Contract.emitting();

    Contract.log(
      UPDATE_DURATION(Contract.execID(), new_duration), bytes32(0)
    );

  } 
  
}
