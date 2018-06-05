pragma solidity ^0.4.23;

import "../Sale.sol";
import "../../../lib/Contract.sol";

library Purchase {

  using Contract for *;

  // event Purchase(address indexed buyer, uint indexed tier, uint amount)
  bytes32 internal constant BUY_SIG = keccak256('buy()');

  // Returns the events and data for an 'Approval' event -
  function PURCHASE(address _buyer, uint tier) private pure
  returns (bytes32[3] memory) {
    return [BUY_SIG, bytes32(_buyer), bytes32(tier)];
  }


  // Implements the logic to create the storage buffer for a Crowdsale Purchase
  function buy() internal view {
    uint current_tier;
    uint tokens_remaining;
    uint purchase_price;
    uint tier_ends_at;
    bool tier_is_whitelisted;
    bool updated_tier;
    // Get information on the current tier of the crowdsale, and create a CrowdsaleTier struct to hold all of the information
    (
      current_tier,
      tokens_remaining,
      purchase_price,
      tier_ends_at,
      tier_is_whitelisted,
      updated_tier
    ) = getCurrentTier();

    if (
      uint(Contract.read(Sale.is_init())) == 0 // Crowdsale is not yet initialized
      || uint(Contract.read(Sale.is_final())) == 1         // Crowdsale is already finalized
    ) revert('crowdsale invalid state');

    // Get amount of wei able to be spent, and tokens able to be purchased
    uint amount_spent;
    uint amount_purchased;

    if (tier_is_whitelisted) {
      if (Contract.read(Sale.has_contributed(Contract.sender())) == bytes32(1)) {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.decimals())),
          purchase_price,
          tokens_remaining,
          uint(Contract.read(Sale.whitelist_max_cap(Contract.sender(), current_tier))),
          0,
          tier_is_whitelisted
        );

      } else {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.decimals())),
          purchase_price,
          tokens_remaining,
          uint(Contract.read(Sale.whitelist_max_cap(Contract.sender(), current_tier))),
          uint(Contract.read(Sale.whitelist_min_cap(Contract.sender(), current_tier))),
          tier_is_whitelisted
        );

      }
    } else {
      if (Contract.read(Sale.has_contributed(Contract.sender())) == bytes32(1)) {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.decimals())),
          purchase_price,
          tokens_remaining,
          0,
          0,
          tier_is_whitelisted
        );
      } else {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.decimals())),
          purchase_price,
          tokens_remaining,
          0,
          uint(Contract.read(Sale.min_contribution())),
          tier_is_whitelisted
        );
      }
    }

    // Begin paying
    Contract.paying();
    // Designate amount spent for forwarding to the team wallet
    Contract.pay(amount_spent).toAcc(address(Contract.read(Sale.wallet())));

    // Begin storing values
    Contract.storing();

    // Store updated purchaser's token balance
    Contract.increase(
      Sale.balances(Contract.sender())
    ).by(amount_purchased);

    // Update tokens remaining for sale in the tier
    Contract.decrease(
      Sale.tokens_remaining()
    ).by(amount_purchased);

    // Update total tokens sold during the sale
    Contract.increase(
      Sale.tokens_sold()
    ).by(amount_purchased);

    // Update total token supply
    Contract.increase(
      Sale.total_supply()
    ).by(amount_purchased);

    // Update total wei raised
    Contract.increase(
      Sale.wei_raised()
    ).by(amount_spent);

    // If the sender had not previously contributed to the sale, push new unique contributor count and sender contributor status to buffer
    if (Contract.read(Sale.has_contributed(Contract.sender())) == bytes32(0)) {
      Contract.increase(
        Sale.contributors()
      ).by(1);
      Contract.set(
        Sale.has_contributed(Contract.sender())
      ).to(true);
    }

    // If this tier was whitelisted, update sender's whitelist spend caps
    if (tier_is_whitelisted) {
      Contract.set(
        Sale.whitelist_max_cap(Contract.sender(), current_tier)
      ).to(uint(0));
      Contract.set(
        Sale.whitelist_min_cap(Contract.sender(), current_tier)
      ).to(Contract.read(Sale.whitelist_max_cap(Contract.sender(), current_tier)));
    }

    // If this tier was updated, set storage 'current tier' information -
    if (updated_tier) {
      Contract.increase(
        Sale.current_tier()
      ).by(1);
      Contract.set(
        Sale.ends_at()
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
    uint tokens_remaining,
    uint purchase_price,
    uint tier_ends_at,
    bool tier_is_whitelisted,
    bool updated_tier
  ) {
    uint num_tiers = uint(Contract.read(Sale.crowdsale_tiers()));
    current_tier = uint(Contract.read(Sale.current_tier())) - 1;
    tier_ends_at = uint(Contract.read(Sale.ends_at()));
    tokens_remaining = uint(Contract.read(Sale.tokens_remaining()));

    // If the current tier has ended, we need to update the current tier in storage
    if (now >= tier_ends_at) {
      (
        tokens_remaining,
        purchase_price,
        tier_is_whitelisted,
        tier_ends_at
      ) = updateTier(tier_ends_at, current_tier, num_tiers);
      updated_tier = true;
    }
    else {
      (purchase_price, tier_is_whitelisted) = getTierInfo(current_tier);
      updated_tier = false;
    }

    // Ensure current tier information is valid -
    if (
      current_tier >= num_tiers     // Invalid tier index
      || purchase_price == 0          // Invalid purchase price
      || tier_ends_at <= now          // Invalid tier end time
    ) revert('invalid index, price, or end time');

    // If the current tier does not have tokens remaining, revert
    if (tokens_remaining == 0)
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
  returns (uint purchase_price, bool tier_is_whitelisted) {
    // Get the crowdsale purchase price
    purchase_price = uint(Contract.read(Sale.tier_price(current_tier)));
    // Get the current tier's whitelist status
    tier_is_whitelisted = Contract.read(Sale.tier_is_whitelisted(current_tier)) == bytes32(1) ? true : false;
  }

  /*
  Takes an input CrowdsaleTier struct and updates it to reflect information about the latest tier
  @param _exec_id: The execution id under which this crowdsale application is registered
  @param _ptr: A pointer to a buffer in memory
  @param _tier_info: An array containing information about the current tier in memory
  @param _cur_tier: A struct representing information about the current crowdsale tier
  */
  function updateTier(uint ends_at, uint current_tier, uint num_tiers) private view
  returns (uint tokens_remaining, uint purchase_price, bool tier_is_whitelisted, uint tier_ends_at) {
    // While the current timestamp is beyond the current tier's end time, and while the current tier's index is within a valid range:
    while (now >= ends_at && ++current_tier < num_tiers) {
      // Push tier token sell cap storage location to buffer
      tokens_remaining = uint(Contract.read(Sale.tier_sell_cap(current_tier)));
      // Push tier token price storage location to buffer
      purchase_price = uint(Contract.read(Sale.tier_price(current_tier)));
      // Push tier duration storage location to buffer
      uint tier_duration = uint(Contract.read(Sale.tier_duration(current_tier)));
      // Push tier 'is-whitelisted' status storage location to buffer
      tier_is_whitelisted = Contract.read(Sale.tier_is_whitelisted(current_tier)) == bytes32(1) ? true : false;
      // Ensure valid tier setup
      if (tokens_remaining == 0 || purchase_price == 0 || tier_duration == 0)
        revert('invalid tier');
      // Add returned duration to previous tier end time
      if (ends_at + tier_duration <= ends_at)
        revert('tier duration overflow');

      ends_at += tier_duration;
    }
    // If the updated current tier's index is not in the valid range, or the end time is still in the past, throw
    if (now >= ends_at || current_tier >= num_tiers)
      revert('crowdsale finished');

    tier_ends_at = ends_at;

  }

  function getPurchaseInfo(
    uint token_decimals,
    uint purchase_price,
    uint tokens_remaining,
    uint maximum_spend_amount,
    uint minimum_purchase_amount,
    bool tier_is_whitelisted
  ) private view returns (uint amount_spent, uint amount_purchased) {
    // Get amount of wei able to be spent, given the number of tokens remaining -
    if ((msg.value * (10 ** token_decimals)) / purchase_price >= tokens_remaining) {
      // wei sent is able to purchase more tokens than are remaining in this tier -
      amount_spent =
        (purchase_price * tokens_remaining) / (10 ** token_decimals);
    } else {
      // All of the wei sent can be used to purchase tokens
      amount_spent = msg.value;
    }

    // If the current tier is whitelisted, the sender has a maximum wei contribution cap. If amount spent exceeds this cap, adjust amount spent -
    if (tier_is_whitelisted) {
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
    if (amount_purchased > tokens_remaining || amount_purchased == 0)
      revert('invalid purchase amount');

    // Ensure amount of tokens to purchase is greater than the spender's minimum contribution cap -
    if (amount_purchased < minimum_purchase_amount)
      revert('under min cap');
  }
}
