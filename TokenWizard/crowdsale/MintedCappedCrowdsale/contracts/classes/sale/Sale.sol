pragma solidity ^0.4.23;

import "../../lib/Contract.sol";

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
