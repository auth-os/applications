pragma solidity ^0.4.23;

import "../Sale.sol";
import "authos-solidity/contracts/core/Contract.sol";

library Purchase {

  using Contract for *;
  using SafeMath for uint;

  // event Purchase(address indexed buyer, uint indexed tier, uint amount)
  bytes32 internal constant BUY_SIG = keccak256('Purchase(address,uint256,uint256)');

  // Returns the event topics for a 'Purchase' event -
  function PURCHASE(address _buyer, uint _tier) private pure returns (bytes32[3] memory)
    { return [BUY_SIG, bytes32(_buyer), bytes32(_tier)]; }

  // Implements the logic to create the storage buffer for a Crowdsale Purchase
  function buy() internal view {
    uint current_tier;
    uint tokens_remaining;
    uint purchase_price;
    uint tier_ends_at;
    bool tier_is_whitelisted;
    bool updated_tier;
    // Get information on the current tier of the crowdsale
    (
      current_tier,
      tokens_remaining,
      purchase_price,
      tier_ends_at,
      tier_is_whitelisted,
      updated_tier
    ) = getCurrentTier();

    // Declare amount of wei that will be spent, and amount of tokens that will be purchased
    uint amount_spent;
    uint amount_purchased;

    if (tier_is_whitelisted) {
      // If the tier is whitelisted, and the sender has contributed, get the spend and purchase
      // amounts with '0' as the minimum token purchase amount
      if (Contract.read(Sale.hasContributed(Contract.sender())) == bytes32(1)) {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.tokenDecimals())),
          purchase_price,
          tokens_remaining,
          uint(Contract.read(Sale.whitelistMaxTok(current_tier, Contract.sender()))),
          0,
          tier_is_whitelisted
        );
      } else {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.tokenDecimals())),
          purchase_price,
          tokens_remaining,
          uint(Contract.read(Sale.whitelistMaxTok(current_tier, Contract.sender()))),
          uint(Contract.read(Sale.whitelistMinTok(current_tier, Contract.sender()))),
          tier_is_whitelisted
        );

      }
    } else {
      // If the tier is not whitelisted, and the sender has contributed, get spend and purchase
      // amounts with '0' set as maximum spend and '0' as minimum purchase size
      if (Contract.read(Sale.hasContributed(Contract.sender())) != 0) {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.tokenDecimals())),
          purchase_price,
          tokens_remaining,
          0,
          0,
          tier_is_whitelisted
        );
      } else {
        (amount_spent, amount_purchased) = getPurchaseInfo(
          uint(Contract.read(Sale.tokenDecimals())),
          purchase_price,
          tokens_remaining,
          0,
          uint(Contract.read(Sale.tierMin(current_tier))),
          tier_is_whitelisted
        );
      }
    }

    // Set up payment buffer -
    Contract.paying();
    // Forward spent wei to team wallet -
    Contract.pay(amount_spent).toAcc(address(Contract.read(Sale.wallet())));

    // Move buffer to storing values -
    Contract.storing();

    // Update purchaser's token balance -
    Contract.increase(Sale.balances(Contract.sender())).by(amount_purchased);

    // Update total tokens sold during the sale -
    Contract.increase(Sale.tokensSold()).by(amount_purchased);

    // Mint tokens (update total supply) -
    Contract.increase(Sale.tokenTotalSupply()).by(amount_purchased);

    // Update total wei raised -
    Contract.increase(Sale.totalWeiRaised()).by(amount_spent);

    // If the sender had not previously contributed to the sale,
    // increase unique contributor count and mark the sender as having contributed
    if (Contract.read(Sale.hasContributed(Contract.sender())) == 0) {
      Contract.increase(Sale.contributors()).by(1);
      Contract.set(Sale.hasContributed(Contract.sender())).to(true);
    }

    // If the tier was whitelisted, update the spender's whitelist information -
    if (tier_is_whitelisted) {
      // Set new minimum purchase size to 0
      Contract.set(
        Sale.whitelistMinTok(current_tier, Contract.sender())
      ).to(uint(0));
      // Decrease maximum spend amount remaining by amount spent
      Contract.decrease(
        Sale.whitelistMaxTok(current_tier, Contract.sender())
      ).by(amount_purchased);
    }

    // If the 'current tier' needs to be updated, set storage 'current tier' information -
    if (updated_tier) {
      Contract.set(Sale.currentTier()).to(current_tier.add(1));
      Contract.set(Sale.currentEndsAt()).to(tier_ends_at);
      Contract.set(Sale.currentTokensRemaining()).to(tokens_remaining.sub(amount_purchased));
    } else {
      Contract.decrease(Sale.currentTokensRemaining()).by(amount_purchased);
    }

    // Move buffer to logging events -
    Contract.emitting();

    // Add PURCHASE signature and topics
    Contract.log(
      PURCHASE(Contract.sender(), current_tier), bytes32(amount_purchased)
    );
  }

  // Reads from storage and returns information about the current crowdsale tier
  function getCurrentTier() private view
  returns (
    uint current_tier,
    uint tokens_remaining,
    uint purchase_price,
    uint tier_ends_at,
    bool tier_is_whitelisted,
    bool updated_tier
  ) {
    uint num_tiers = uint(Contract.read(Sale.saleTierList()));
    current_tier = uint(Contract.read(Sale.currentTier())).sub(1);
    tier_ends_at = uint(Contract.read(Sale.currentEndsAt()));
    tokens_remaining = uint(Contract.read(Sale.currentTokensRemaining()));

    // If the current tier has ended, we need to update the current tier in storage
    if (now >= tier_ends_at) {
      (
        tokens_remaining,
        purchase_price,
        tier_is_whitelisted,
        tier_ends_at,
        current_tier
      ) = updateTier(tier_ends_at, current_tier, num_tiers);
      updated_tier = true;
    } else {
      (purchase_price, tier_is_whitelisted) = getTierInfo(current_tier);
      updated_tier = false;
    }

    // Ensure current tier information is valid -
    if (
      current_tier >= num_tiers       // Invalid tier index
      || purchase_price == 0          // Invalid purchase price
      || tier_ends_at <= now          // Invalid tier end time
    ) revert('invalid index, price, or end time');

    // If the current tier does not have tokens remaining, revert
    if (tokens_remaining == 0)
      revert('tier sold out');
  }

  // Returns information about the current crowdsale tier
  function getTierInfo(uint _current_tier) private view
  returns (uint purchase_price, bool tier_is_whitelisted) {
    // Get the crowdsale purchase price
    purchase_price = uint(Contract.read(Sale.tierPrice(_current_tier)));
    // Get the current tier's whitelist status
    tier_is_whitelisted
      = Contract.read(Sale.tierWhitelisted(_current_tier)) == bytes32(1) ? true : false;
  }

  // Returns information about the current crowdsale tier by time, so that storage can be updated
  function updateTier(uint _ends_at, uint _current_tier, uint _num_tiers) private view
  returns (
    uint tokens_remaining,
    uint purchase_price,
    bool tier_is_whitelisted,
    uint tier_ends_at,
    uint current_tier
  ) {
    // While the current timestamp is beyond the current tier's end time,
    // and while the current tier's index is within a valid range:
    while (now >= _ends_at && ++_current_tier < _num_tiers) {
      // Read tier remaining tokens -
      tokens_remaining = uint(Contract.read(Sale.tierCap(_current_tier)));
      // Read tier price -
      purchase_price = uint(Contract.read(Sale.tierPrice(_current_tier)));
      // Read tier duration -
      uint tier_duration = uint(Contract.read(Sale.tierDuration(_current_tier)));
      // Read tier 'whitelisted' status -
      tier_is_whitelisted
        = Contract.read(Sale.tierWhitelisted(_current_tier)) == bytes32(1) ? true : false;
      // Ensure valid tier setup -
      if (tokens_remaining == 0 || purchase_price == 0 || tier_duration == 0)
        revert('invalid tier');

      _ends_at = _ends_at.add(tier_duration);
    }
    // If the updated current tier's index is not in the valid range, or the
    // end time is still in the past, throw
    if (now >= _ends_at || _current_tier >= _num_tiers)
      revert('crowdsale finished');

    // Set return values -
    tier_ends_at = _ends_at;
    current_tier = _current_tier;
  }

  // Calculates the amount of wei spent and number of tokens purchased from sale details
  function getPurchaseInfo(
    uint _token_decimals,
    uint _purchase_price,
    uint _tokens_remaining,
    uint _max_purchase_amount,
    uint _minimum_purchase_amount,
    bool _tier_is_whitelisted
  ) private view returns (uint amount_spent, uint amount_purchased) {
    // Get amount of wei able to be spent, given the number of tokens remaining -
    if (msg.value.mul(10 ** _token_decimals).div(_purchase_price) > _tokens_remaining)
      amount_spent = _purchase_price.mul(_tokens_remaining).div(10 ** _token_decimals);
    else
      amount_spent = msg.value;

    // Get number of tokens able to be purchased with the amount spent -
    amount_purchased = amount_spent.mul(10 ** _token_decimals).div(_purchase_price);

    // If the current tier is whitelisted -
    if (_tier_is_whitelisted && amount_purchased > _max_purchase_amount) {
      amount_purchased = _max_purchase_amount;
      amount_spent = amount_purchased.mul(_purchase_price).div(10 ** _token_decimals);
    }

    // Ensure spend amount is valid -
    if (amount_spent == 0 || amount_spent > msg.value)
      revert('invalid spend amount');

    // Ensure amount of tokens to purchase is not greater than the amount of tokens remaining in this tier -
    if (amount_purchased > _tokens_remaining || amount_purchased == 0)
      revert('invalid purchase amount');

    // Ensure amount of tokens to purchase is greater than the spender's minimum contribution cap -
    if (amount_purchased < _minimum_purchase_amount)
      revert('under min cap');
  }
}
