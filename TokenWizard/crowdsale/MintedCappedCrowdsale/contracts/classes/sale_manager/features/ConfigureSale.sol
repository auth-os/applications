pragma solidity ^0.4.23;

import "../SaleManager.sol";
import "../../../auth-os/Contract.sol";

library ConfigureSale {

  using Contract for *;
  using SafeMath for uint;

  // event GlobalMinUpdate(bytes32 indexed exec_id, uint current_token_purchase_min)
  bytes32 private constant GLOBAL_MIN_UPDATE = keccak256("GlobalMinUpdate(bytes32,uint256)");

  // event CrowdsaleTiersAdded(bytes32 indexed exec_id, uint current_tier_list_len)
  bytes32 private constant CROWDSALE_TIERS_ADDED = keccak256("CrowdsaleTiersAdded(bytes32,uint256)");

  function MIN_UPDATE(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [GLOBAL_MIN_UPDATE, exec_id];
  }

  function ADD_TIERS(bytes32 exec_id) private pure returns (bytes32[2] memory) {
    return [CROWDSALE_TIERS_ADDED, exec_id];
  }

  // Checks input and then creates storage buffer to update minimum
  function updateGlobalMinContribution(uint _new_minimum) internal pure {
    // Set up STORES action requests -
    Contract.storing();

    // Store new crowdsale minimum token purchase amount
    Contract.set(SaleManager.min_contrib()).to(_new_minimum);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add GLOBAL_MIN_UPDATE signature and topics
    Contract.log(
      MIN_UPDATE(Contract.execID()), bytes32(_new_minimum)
    );
  }

  // Checks input and then creates storage buffer to create sale tiers
  function createCrowdsaleTiers(
    bytes32[] _tier_names, uint[] _tier_durations, uint[] _tier_prices, uint[] _tier_caps,
    bool[] _tier_modifiable, bool[] _tier_whitelisted
  ) internal view {
    // Ensure valid input
    if (
      _tier_names.length != _tier_durations.length
      || _tier_names.length != _tier_prices.length
      || _tier_names.length != _tier_caps.length
      || _tier_names.length != _tier_modifiable.length
      || _tier_names.length != _tier_whitelisted.length
      || _tier_names.length == 0
    ) revert("array length mismatch");

    uint total_duration = uint(Contract.read(SaleManager.total_duration()));
    uint num_tiers = uint(Contract.read(SaleManager.crowdsale_tiers()));
    uint base_storage = 0;

    Contract.storing();

    // Store new tier list length
    Contract.set(
      SaleManager.crowdsale_tiers()
    ).to(num_tiers.add(_tier_names.length));

    // Place crowdsale tier storage base location in tiers struct
    base_storage = 32 + (192 * num_tiers) + uint(SaleManager.crowdsale_tiers());
    // Loop over each new tier, and add to storage buffer. Keep track of the added duration
    for (uint i = 0; i < _tier_names.length; i++) {
      // Ensure valid input -
      if (
        _tier_caps[i] == 0
        || total_duration + _tier_durations[i] <= total_duration
        || _tier_prices[i] == 0
      ) revert("invalid tier vals");

      // Increment total duration of the crowdsale
      total_duration = total_duration.add(_tier_durations[i]);
      // Store tier information
      Contract.set(
        bytes32(base_storage)
      ).to(_tier_names[i]);

      Contract.set(
        bytes32(32 + base_storage)
      ).to(_tier_caps[i]);

      Contract.set(
        bytes32(64 + base_storage)
      ).to(_tier_prices[i]);

      Contract.set(
        bytes32(96 + base_storage)
      ).to(_tier_durations[i]);

      Contract.set(
        bytes32(128 + base_storage)
      ).to(_tier_modifiable[i]);

      Contract.set(
        bytes32(160 + base_storage)
      ).to(_tier_whitelisted[i]);

      // Increment base storage location -
      base_storage += 192;
    }
    // Store new total crowdsale duration
    Contract.set(
      SaleManager.total_duration()
    ).to(total_duration);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add CROWDSALE_TIERS_ADDED signature and topics
    Contract.log(
      ADD_TIERS(Contract.execID()), bytes32(num_tiers.add(_tier_names.length))
    );
  }

  // Checks input and then creates storage buffer to whitelist addresses
  function whitelistMultiForTier(
    uint _tier_index, address[] _to_whitelist, uint[] _min_token_purchase, uint[] _max_wei_spend
  ) internal view {
    // Ensure valid input
    if (
      _to_whitelist.length != _min_token_purchase.length
      || _to_whitelist.length != _max_wei_spend.length
      || _to_whitelist.length == 0
    ) revert("mismatched input lengths");

    // Get tier whitelist length
    uint tier_whitelist_length = uint(Contract.read(SaleManager.whitelist(_tier_index)));

    // Set up STORES action requests -
    Contract.storing();

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < _to_whitelist.length; i++) {
      // Get storage location for address whitelist struct
      bytes32 whitelist_status_loc = SaleManager.address_whitelist(_to_whitelist[i], _tier_index);
      // Store user's minimum token purchase amount and maximum wei spend amount
      Contract.set(
        whitelist_status_loc
      ).to(_min_token_purchase[i]);
      Contract.set(
        bytes32(32 + uint(whitelist_status_loc))
      ).to(_max_wei_spend[i]);

      // Push whitelisted address to end of tier whitelist array, unless the values being pushed are zero
      if (_min_token_purchase[i] != 0 || _max_wei_spend[i] != 0) {
        Contract.set(
          bytes32(32 + (32 * tier_whitelist_length) + uint(SaleManager.whitelist(_tier_index)))
        ).to(_to_whitelist[i]);
        // Increment tier whitelist
        tier_whitelist_length++;
      }
    }

    // Store new tier whitelist length
    Contract.set(
      SaleManager.whitelist(_tier_index)
    ).to(tier_whitelist_length);
  }

  // Checks input and then creates storage buffer to update a tier's duration
  function updateTierDuration(uint _tier_index, uint _new_duration) internal view {
    // Ensure valid input
    if (_new_duration == 0)
      revert('invalid duration');

    uint starts_at = uint(Contract.read(SaleManager.start_time()));
    uint current_tier = uint(Contract.read(SaleManager.current_tier()));
    uint total_duration = uint(Contract.read(SaleManager.total_duration()));
    uint ends_at = uint(Contract.read(SaleManager.ends_at()));
    uint previous_duration = uint(Contract.read(
      bytes32(128 + (192 * _tier_index) + uint(SaleManager.crowdsale_tiers())))
    );


    // Ensure an update is being performed
    if (previous_duration == _new_duration)
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
      uint(Contract.read(SaleManager.crowdsale_tiers())) <= _tier_index
      || current_tier > _tier_index
      || (current_tier == _tier_index && _tier_index != 0)
      || Contract.read(bytes32(160 + (192 * _tier_index) + uint(SaleManager.crowdsale_tiers()))) == 0
    ) revert("invalid crowdsale status");

    if (_tier_index == 0 && current_tier == 0) {
      if (now >= starts_at)
        revert("cannot modify current tier");

      // Store current tier end time
      Contract.set(
        SaleManager.ends_at()
      ).to(_new_duration.add(starts_at));

    } else if (_tier_index > current_tier && now >= ends_at) {
      if (_tier_index - current_tier == 1)
        revert("cannot modify current tier");

      for (uint i = current_tier; i < _tier_index; i++)
        ends_at = ends_at.add(uint(Contract.read(bytes32(128 + (192 * i) + uint(SaleManager.crowdsale_tiers())))));

      if (now <= ends_at)
        revert("cannot modify current tier");

    } else if (_tier_index <= current_tier || now >= ends_at) {
      // Not a valid state to update - throw
      revert('invalid state');
    }

    // Get new overall crowdsale duration -
    if (previous_duration > _new_duration) // Subtracting from total_duration
      total_duration = total_duration.sub(previous_duration - _new_duration);
    else // Adding to total_duration
      total_duration = total_duration.add(_new_duration - previous_duration);

    // Store updated tier duration
    Contract.set(
      bytes32(128 + (192 * _tier_index) + uint(SaleManager.crowdsale_tiers()))
    ).to(_new_duration);

    // Update total crowdsale duration
    Contract.set(
      SaleManager.total_duration()
    ).to(total_duration);
  }
}
