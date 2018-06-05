pragma solidity ^0.4.23;

import "../Sale.sol";
import "../../../lib/Contract.sol";
import "../../token/Token.sol";

library Purchase {
  
  using Contract for *;

  // 'Buy' event selector
  bytes32 private constant BUY_SIG = keccak256('buy(bytes)');

  bytes4 internal constant BUY_SEL = bytes4(keccak256('buy(bytes)'));

  // Returns the events and data for a 'Buy' event -
  function BUY (address _buyer, uint wei_spent) private pure 
  returns (bytes32[3]) {
  	return [BUY_SIG, bytes32(_buyer), bytes32(wei_spent)];
  }

  // Preconditions for Purchase - none
  function first() internal pure { }
  
  // Postconditions for Purchase - none
  function last() internal pure { }

  function buy() internal view {
    // declare only the most necessary variables
    bytes32 sale_is_whitelisted = Contract.read(Sale.isWhitelisted());
    bytes32 sender_has_contributed = Contract.read(Sale.hasContributed(Contract.sender()));
  	// Get current sale rate, first arg is crowdsale start time and last arg is crowdsale duration:
  	uint curr_rate;
  	curr_rate = getCurrentRate( 
  	  uint(Contract.read(Sale.startTime())), 
  	  uint(Contract.read(Sale.startRate())), 
  	  uint(Contract.read(Sale.endRate())), 
  	  uint(Contract.read(Sale.duration()))
  	);

  	// If sender has already purchased tokens then change minimum contribution amount to 0;
  	uint min_contribution;
  	if (sender_has_contributed == bytes32(0)) {
  	  min_contribution = 0;
  	} else {
  	  min_contribution = uint(Contract.read(Sale.minContribution()));
  	}
  	

  	/// Get total amount of wei that can be spend, given the amount sent and the number of tokens remaining - 
  	uint spend_amount;
  	uint spend_amount_remaining;
  	uint tokens_purchased;
  	// set spend_amount, spend_amount_remaining, tokens_purchased
  	(spend_amount, spend_amount_remaining, tokens_purchased) = getPurchaseInfo(
  	  uint(Contract.read(Sale.decimals())),
  	  curr_rate, 
  	  msg.value,
  	  uint(Contract.read(Sale.tokensRemaining())), 
  	  sale_is_whitelisted,
  	  uint(Contract.read(Sale.whitelistSpendRemaining(Contract.sender()))),
  	  min_contribution
  	);

  	// Begin paying
  	Contract.paying();
  	// Send amount_spent in spend_stat to wallet
  	Contract.pay(
  	  spend_amount
  	).toAcc(address(Contract.read(Sale.wallet())));

  	// Begin storing values
  	Contract.storing();

  	// Store new token balance for buyer
  	Contract.increase(
  	  Token.balances(Contract.sender())
  	).by(tokens_purchased);

  	// Update tokens remaining for Crowdsale
  	Contract.decrease(
  	  Sale.tokensRemaining()
  	).by(tokens_purchased);

  	// Store updated total wei raised 
  	Contract.increase(
  	  Sale.weiRaised()
  	).by(spend_amount);

  	if (sender_has_contributed == bytes32(0)) {
  	  Contract.increase(
  	    Sale.uniqueContributors()
  	  ).by(1);
  	  Contract.set(
  	    Sale.hasContributed(Contract.sender())
  	  ).to(true);
  	}

	if (sale_is_whitelisted == bytes32(1)) {
	  Contract.set(
        Sale.whitelistMinContrib(Contract.sender())
      ).to(uint(0));
      Contract.set(
        Sale.whitelistSpendRemaining(Contract.sender())
      ).to(spend_amount_remaining);
	}

  	Contract.emitting();

  	// Add purchase signature and topics
  	Contract.log(
  	  BUY(Contract.sender(), spend_amount), bytes32(tokens_purchased)
  	);
  }

  function getCurrentRate(
  	uint _start_time, 
  	uint _start_rate, 
  	uint _end_rate, 
  	uint _duration) 
  internal view returns (uint _current_rate) {
  	// If the sale has not yet started, set current rate to 0
  	if (now < _start_time) {
  	  _current_rate = 0;
  	  return;
  	}

  	uint elapsed = now - _start_time;
  	// If the sale duration is up, set current rate to 0
  	if (elapsed >= _duration) {
  	  _current_rate = 0;
  	  return;
  	}

  	// Add precision to the time elapsed - 
  	require(elapsed * (10 ** 18) >= elapsed);
  	elapsed *= 10 ** 18;

  	// Check that crowdsale had valid setup 
  	uint temp_rate = 
  	  ((_start_rate - _end_rate) * elapsed) / _duration;

  	temp_rate /= (10 ** 18);

  	// assert that we obtained a valid temp rate
  	if (temp_rate <= _start_rate)
  	  revert("miscalculation of current rate");
  	// Current rate is start rate minus temp rate
  	_current_rate = _start_rate - temp_rate;
  }


  function getPurchaseInfo(
  	uint token_decimals, 
  	uint current_rate, 
  	uint _wei_sent, 
  	uint tokens_remaining, 
  	bytes32 sale_is_whitelisted,
  	uint spend_amount_remaining,
  	uint minimum_contribution_amount) 
  internal pure returns (
  	uint spend_amount, 
  	uint spend_amount_rem, 
  	uint tokens_purchased) {
  	// Get amount of wei able to be spent, given the number of tokens remaining -
    if ((_wei_sent * (10 ** token_decimals) / current_rate) > tokens_remaining) {
      // The amount that can be purchased is more than the number of tokens remaining:
      spend_amount =
        (current_rate * tokens_remaining) / (10 ** token_decimals);
    } else {
      // All of the wei sent can be used to purchase -
      spend_amount = _wei_sent;
    }

    spend_amount_rem = 0;
    // If the sale is whitelisted, ensure the sender is not going over their spend cap -
    if (sale_is_whitelisted == bytes32(1)) {
      if (spend_amount > spend_amount_remaining)
        spend_amount = spend_amount_remaining;

      // Decrease sender's spend amount remaining
      if (spend_amount_remaining < spend_amount)
        revert("Invalid spend amount");
      spend_amount_rem = spend_amount_remaining - spend_amount;
    }

    // Ensure spend amount is valid -
    if (spend_amount == 0 || spend_amount > _wei_sent)
      revert("Invalid spend amount");

    // Get number of tokens able to be purchased with the amount spent -
    tokens_purchased =
      (spend_amount * (10 ** token_decimals)) / current_rate;

    // Ensure amount of tokens to purchase is not greater than the amount of tokens remaining in the sale -
    if (tokens_purchased > tokens_remaining || tokens_purchased == 0)
      revert("Invalid purchase amount"); 

    // Ensure the number of tokens purchased meets the sender's minimum contribution requirement
    if (tokens_purchased < minimum_contribution_amount)
      revert("Purchase is under minimum contribution amount");

  }

}