pragma solidity ^0.4.23;

import "../../MockMintedCapped.sol";
import "../../Contract.sol";
import "./features/MockConfigureSale.sol";
import "./features/MockManageSale.sol";
import "./features/MockManageTokens.sol";

library MockAdmin {

  using Contract for *;

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
    ) Contract.checks(MockConfigureSale.first);
    else if (
      msg.sig == INIT_SALE_SEL ||
      msg.sig == FINAL_SALE_SEL
    ) Contract.checks(MockManageSale.first);
    else  if (
      msg.sig == SET_AGENT_SEL ||
      msg.sig == UPDATE_RESER_SEL ||
      msg.sig == REMOVE_RESER_SEL ||
      msg.sig == DISTRIBUTE_RESER_SEL ||
      msg.sig == FINAL_SALE_TOKENS_SEL ||
      msg.sig == DISTRIB_UNLOCK_SEL ||
      msg.sig == FINAL_DISTIBUTE_SEL
    ) Contract.checks(MockManageTokens.first);
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
    ) Contract.checks(MockConfigureSale.last);
    else if (
      msg.sig == INIT_SALE_SEL ||
      msg.sig == FINAL_SALE_SEL
    ) Contract.checks(MockManageSale.last);
    else  if (
      msg.sig == SET_AGENT_SEL ||
      msg.sig == UPDATE_RESER_SEL ||
      msg.sig == REMOVE_RESER_SEL ||
      msg.sig == DISTRIBUTE_RESER_SEL ||
      msg.sig == FINAL_SALE_TOKENS_SEL ||
      msg.sig == DISTRIB_UNLOCK_SEL ||
      msg.sig == FINAL_DISTIBUTE_SEL
    ) Contract.checks(MockManageTokens.last);
    else
      revert('invalid function selector');

  }

}


