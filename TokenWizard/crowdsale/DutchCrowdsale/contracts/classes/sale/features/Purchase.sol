pragma solidity ^0.4.23;

import "../Sale.sol";
import "authos-solidity/contracts/core/Contract.sol";

library Purchase {

  using Contract for *;
  using SafeMath for uint;

  // event Purchase(bytes32 indexed exec_id, uint256 indexed current_rate, uint256 indexed current_time, uint256 tokens)
  bytes32 internal constant BUY_SIG = keccak256('Purchase(bytes32,uint256,uint256,uint256)');

  // Returns the event topics for a 'Purchase' event -
  function PURCHASE(bytes32 _exec_id, uint _current_rate) private view returns (bytes32[4] memory)
    { return [BUY_SIG, _exec_id, bytes32(_current_rate), bytes32(now)]; }

  // Implements the logic to create the storage buffer for a Crowdsale Purchase
  function buy() internal view {
    bool sale_is_whitelisted = Contract.read(Sale.isWhitelisted()) != 0 ? true : false;
    bool sender_has_contributed = Contract.read(Sale.hasContributed(Contract.sender())) != 0 ? true : false;

    // Calculate current sale rate from start time, start and end rates, and duration
  	uint current_rate = getCurrentRate(
  	  uint(Contract.read(Sale.startTime())),
  	  uint(Contract.read(Sale.startRate())),
  	  uint(Contract.read(Sale.endRate())),
  	  uint(Contract.read(Sale.totalDuration()))
  	);

  	// If sender has already purchased tokens then change minimum contribution amount to 0;
  	uint min_contribution;
    // If the sale is whitelisted -
    if (sale_is_whitelisted && !sender_has_contributed)
      min_contribution = uint(Contract.read(Sale.whitelistMinTok(Contract.sender())));
    else if (!sale_is_whitelisted && !sender_has_contributed)
      min_contribution = uint(Contract.read(Sale.globalMinPurchaseAmt()));

  	// Get total amount of wei that can be spent and number of tokens purchased
  	uint spend_amount;
  	uint tokens_purchased;
  	(spend_amount, tokens_purchased) = getPurchaseInfo(
  	  uint(Contract.read(Sale.tokenDecimals())),
  	  current_rate,
  	  uint(Contract.read(Sale.tokensRemaining())),
  	  sale_is_whitelisted,
  	  uint(Contract.read(Sale.whitelistMaxWei(Contract.sender()))),
  	  min_contribution
  	);
    // Sanity checks -
    assert(spend_amount != 0 && spend_amount <= msg.value && tokens_purchased != 0);

    // Set up payment buffer -
    Contract.paying();
    // Forward spent wei to team wallet -
    Contract.pay(spend_amount).toAcc(address(Contract.read(Sale.wallet())));

    // Move buffer to storing values -
    Contract.storing();

  	// Update purchaser's token balance -
  	Contract.increase(Sale.balances(Contract.sender())).by(tokens_purchased);

  	// Update tokens remaining in sale -
  	Contract.decrease(Sale.tokensRemaining()).by(tokens_purchased);

    // Update total tokens sold -
    Contract.increase(Sale.tokensSold()).by(tokens_purchased);

  	// Update total wei raised -
  	Contract.increase(Sale.totalWeiRaised()).by(spend_amount);

    // If the sender had not previously contributed to the sale,
    // increase unique contributor count and mark the sender as having contributed
  	if (sender_has_contributed == false) {
  	  Contract.increase(Sale.contributors()).by(1);
  	  Contract.set(Sale.hasContributed(Contract.sender())).to(true);
  	}

    // If the sale is whitelisted, update the spender's whitelist information -
	  if (sale_is_whitelisted) {
	    Contract.set(Sale.whitelistMinTok(Contract.sender())).to(uint(0));
      Contract.decrease(Sale.whitelistMaxWei(Contract.sender())).by(spend_amount);
	  }

  	Contract.emitting();

  	// Add purchase signature and topics
  	Contract.log(
  	  PURCHASE(Contract.execID(), current_rate), bytes32(tokens_purchased)
  	);
  }

  // Calculate current purchase rate
  function getCurrentRate(uint _start_time,	uint _start_rate,	uint _end_rate,	uint _duration) internal view
  returns (uint current_rate) {
  	// If the sale has not yet started, set current rate to 0
  	if (now < _start_time) {
  	  current_rate = 0;
  	  return;
  	}

  	uint elapsed = now.sub(_start_time);
  	// If the sale duration is up, set current rate to 0
  	if (elapsed >= _duration) {
  	  current_rate = 0;
  	  return;
  	}

  	// Add precision to the time elapsed -
  	elapsed = elapsed.mul(10 ** 18);

  	// Temporary variable
  	uint temp_rate = _start_rate.sub(_end_rate).mul(elapsed).div(_duration);

    // Remove precision
  	temp_rate = temp_rate.div(10 ** 18);

  	// Current rate is start rate minus temp rate
  	current_rate = _start_rate.sub(temp_rate);
  }

  // Calculates amount to spend, amount left able to be spent, and number of tokens purchased
  function getPurchaseInfo(
  	uint _decimals, uint _current_rate, uint _tokens_remaining,
  	bool _sale_whitelisted,	uint _wei_spend_remaining, uint _min_purchase_amount
  ) internal view returns (uint spend_amount, uint tokens_purchased) {
  	// Get amount of wei able to be spent, given the number of tokens remaining -
    if (msg.value.mul(10 ** _decimals).div(_current_rate) > _tokens_remaining)
      spend_amount = _current_rate.mul(_tokens_remaining).div(10 ** _decimals);
    else
      spend_amount = msg.value;

    // If the sale is whitelisted, ensure the sender is not going over their spend cap -
    if (_sale_whitelisted && spend_amount > _wei_spend_remaining)
      spend_amount = _wei_spend_remaining;

    // Ensure spend amount is valid -
    if (spend_amount == 0 || spend_amount > msg.value)
      revert("Invalid spend amount");

    // Get number of tokens able to be purchased with the amount spent -
    tokens_purchased = spend_amount.mul(10 ** _decimals).div(_current_rate);

    // Ensure amount of tokens to purchase is not greater than the amount of tokens remaining in the sale -
    if (tokens_purchased > _tokens_remaining || tokens_purchased == 0)
      revert("Invalid purchase amount");

    // Ensure the number of tokens purchased meets the sender's minimum contribution requirement
    if (tokens_purchased < _min_purchase_amount)
      revert("Purchase is under minimum contribution amount");
  }
}
