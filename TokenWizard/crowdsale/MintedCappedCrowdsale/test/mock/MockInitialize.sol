pragma solidity ^0.4.23;

import "./MockMintedCapped.sol";

library MockInitialize {

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

