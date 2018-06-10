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

  function MIN_UPDATE(bytes32 _exec_id) private pure returns (bytes32[2] memory)
    { return [GLOBAL_MIN_UPDATE, _exec_id]; }

  function ADD_TIERS(bytes32 _exec_id) private pure returns (bytes32[2] memory)
    { return [CROWDSALE_TIERS_ADDED, _exec_id]; }

  // Checks input and then creates storage buffer to update minimum
  function updateGlobalMinContribution(uint _new_minimum) internal pure {
    // Set up STORES action requests -
    Contract.storing();

    // Store new crowdsale minimum token purchase amount
    Contract.set(SaleManager.globalMinPurchaseAmt()).to(_new_minimum);

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

    uint durations_sum = uint(Contract.read(SaleManager.totalDuration()));
    uint num_tiers = uint(Contract.read(SaleManager.saleTierList()));

    // Begin storing values in buffer
    Contract.storing();

    // Store new tier list length
    Contract.increase(SaleManager.saleTierList()).by(_tier_names.length);

    // Loop over each new tier, and add to storage buffer. Keep track of the added duration
    for (uint i = 0; i < _tier_names.length; i++) {
      // Ensure valid input -
      if (
        _tier_caps[i] == 0 || _tier_prices[i] == 0 || _tier_durations[i] == 0
      ) revert("invalid tier vals");

      // Increment total duration of the crowdsale
      durations_sum = durations_sum.add(_tier_durations[i]);

      // Store tier information -
      // Tier name
      Contract.set(SaleManager.tierName(num_tiers + i)).to(_tier_names[i]);
      // Tier maximum token sell cap
      Contract.set(SaleManager.tierCap(num_tiers + i)).to(_tier_caps[i]);
      // Tier purchase price (in wei/10^decimals units)
      Contract.set(SaleManager.tierPrice(num_tiers + i)).to(_tier_prices[i]);
      // Tier duration
      Contract.set(SaleManager.tierDuration(num_tiers + i)).to(_tier_durations[i]);
      // Tier duration modifiability status
      Contract.set(SaleManager.tierModifiable(num_tiers + i)).to(_tier_modifiable[i]);
      // Whether tier is whitelisted
      Contract.set(SaleManager.tierWhitelisted(num_tiers + i)).to(_tier_whitelisted[i]);
    }
    // Store new total crowdsale duration
    Contract.increase(SaleManager.totalDuration()).by(durations_sum);

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
    uint tier_whitelist_length = uint(Contract.read(SaleManager.tierWhitelist(_tier_index)));

    // Set up STORES action requests -
    Contract.storing();

    // Loop over input and add whitelist storage information to buffer
    for (uint i = 0; i < _to_whitelist.length; i++) {
      // Store user's minimum token purchase amount
      Contract.set(
        SaleManager.whitelistMinTok(_tier_index, _to_whitelist[i])
      ).to(_min_token_purchase[i]);
      // Store user maximum wei spend amount
      Contract.set(
        SaleManager.whitelistMaxWei(_tier_index, _to_whitelist[i])
      ).to(_max_wei_spend[i]);

      // If the user does not currently have whitelist information in storage,
      // push them to the sale's whitelist array
      if (
        Contract.read(SaleManager.whitelistMinTok(_tier_index, _to_whitelist[i])) == 0 &&
        Contract.read(SaleManager.whitelistMaxWei(_tier_index, _to_whitelist[i])) == 0
      ) {
        Contract.set(
          bytes32(32 + (32 * tier_whitelist_length) + uint(SaleManager.tierWhitelist(_tier_index)))
        ).to(_to_whitelist[i]);
        // Increment tier whitelist length
        tier_whitelist_length++;
      }
    }

    // Store new tier whitelist length
    Contract.set(SaleManager.tierWhitelist(_tier_index)).to(tier_whitelist_length);
  }

  // Checks input and then creates storage buffer to update a tier's duration
  function updateTierDuration(uint _tier_index, uint _new_duration) internal view {
    // Ensure valid input
    if (_new_duration == 0)
      revert('invalid duration');

    // Get sale start time -
    uint starts_at = uint(Contract.read(SaleManager.startTime()));
    // Get current tier in storage -
    uint current_tier = uint(Contract.read(SaleManager.currentTier()));
    // Get total sale duration -
    uint total_duration = uint(Contract.read(SaleManager.totalDuration()));
    // Get the time at which the current tier will end -
    uint cur_ends_at = uint(Contract.read(SaleManager.currentEndsAt()));
    // Get the current duration of the tier marked for update -
    uint previous_duration
      = uint(Contract.read(SaleManager.tierDuration(_tier_index)));

    // Normalize returned current tier index
    current_tier = current_tier.sub(1);

    // Ensure an update is being performed
    if (previous_duration == _new_duration)
      revert("duration unchanged");
    // Total crowdsale duration should always be minimum the previous duration for the tier to update
    if (total_duration < previous_duration)
      revert("total duration invalid");
    // Ensure tier to update is within range of existing tiers -
    if (uint(Contract.read(SaleManager.saleTierList())) <= _tier_index)
      revert("tier does not exist");
    // Ensure tier to update has not already passed -
    if (current_tier > _tier_index)
      revert("tier has already completed");
    // Ensure the tier targeted was marked as 'modifiable' -
    if (Contract.read(SaleManager.tierModifiable(_tier_index)) == 0)
      revert("tier duration not modifiable");

    Contract.storing();

    // If the tier to update is tier 0, the sale should not have started yet -
    if (_tier_index == 0) {
      if (now >= starts_at)
        revert("cannot modify current tier");

      // Store current tier end time
      Contract.set(SaleManager.currentEndsAt()).to(_new_duration.add(starts_at));
    } else if (_tier_index > current_tier) {
      // If the end time has passed, and we are trying to update the next tier, the tier
      // is already in progress and cannot be updated
      if (_tier_index - current_tier == 1 && now >= cur_ends_at)
        revert("cannot modify current tier");

      // Loop over tiers in storage and increment end time -
      for (uint i = current_tier; i < _tier_index; i++)
        cur_ends_at = cur_ends_at.add(uint(Contract.read(SaleManager.tierDuration(i))));

      if (cur_ends_at >= now)
        revert("cannot modify current tier");
    } else {
      // Not a valid state to update - throw
      revert('cannot update tier');
    }

    // Get new overall crowdsale duration -
    if (previous_duration > _new_duration) // Subtracting from total_duration
      total_duration = total_duration.sub(previous_duration - _new_duration);
    else // Adding to total_duration
      total_duration = total_duration.add(_new_duration - previous_duration);

    // Store updated tier duration
    Contract.set(SaleManager.tierDuration(_tier_index)).to(_new_duration);

    // Update total crowdsale duration
    Contract.set(SaleManager.totalDuration()).to(total_duration);
  }
}
