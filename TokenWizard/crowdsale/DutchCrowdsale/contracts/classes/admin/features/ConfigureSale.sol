pragma solidity ^0.4.23;

import "../Admin.sol";
import "authos-solidity/contracts/core/Contract.sol";

library ConfigureSale {

  using Contract for *;
  using SafeMath for uint;

  // event CrowdsaleTokenInit(bytes32 indexed exec_id, bytes32 indexed name, bytes32 indexed symbol, uint decimals)
  bytes32 private constant INIT_CROWDSALE_TOK_SIG = keccak256("CrowdsaleTokenInit(bytes32,bytes32,bytes32,uint256)");

  // event GlobalMinUpdate(bytes32 indexed exec_id, uint current_token_purchase_min)
  bytes32 private constant GLOBAL_MIN_UPDATE = keccak256("GlobalMinUpdate(bytes32,uint256)");

  // event CrowdsaleTimeUpdated(bytes32 indexed exec_id)
  bytes32 internal constant CROWDSALE_TIME_UPDATED = keccak256("CrowdsaleTimeUpdated(bytes32)");

  function TOKEN_INIT(bytes32 _exec_id, bytes32 _name, bytes32 _symbol) private pure returns (bytes32[4] memory)
    { return [INIT_CROWDSALE_TOK_SIG, _exec_id, _name, _symbol]; }

  function MIN_UPDATE(bytes32 _exec_id) private pure returns (bytes32[2] memory)
    { return [GLOBAL_MIN_UPDATE, _exec_id]; }

  function TIME_UPDATE(bytes32 _exec_id) private pure returns (bytes32[2] memory)
    { return [CROWDSALE_TIME_UPDATED, _exec_id]; }

  // Checks input and then creates storage buffer to configure sale token
  function initCrowdsaleToken(bytes32 _name, bytes32 _symbol, uint _decimals) internal pure {
  	// Ensure valid input
    if (_name == 0 || _symbol == 0 || _decimals > 18)
      revert("Improper token initialization");

    // Begin storing values
    Contract.storing();
    // Store token name, symbol, and decimals
    Contract.set(Admin.tokenName()).to(_name);
    Contract.set(Admin.tokenSymbol()).to(_symbol);
    Contract.set(Admin.tokenDecimals()).to(_decimals);
    // Finish storing and being logging events
    Contract.emitting();
    // Log initCrowdsaleToken event
    Contract.log(
      TOKEN_INIT(Contract.execID(), _name, _symbol), bytes32(_decimals)
    );
  }

  // Checks input and then creates storage buffer to update minimum
  function updateGlobalMinContribution(uint _new_min) internal pure {
  	//Begin storing value
  	Contract.storing();
  	// Store new minimum
  	Contract.set(Admin.globalMinPurchaseAmt()).to(_new_min);
  	// Finish storing begin logging event
  	Contract.emitting();
  	// Log updateGlobalMinContribution event
  	Contract.log(
  	  MIN_UPDATE(Contract.execID()), bytes32(_new_min)
  	);
  }

  // Checks input and creates storage buffer to update sale whitelist
  function whitelistMulti(
    address[] _to_whitelist, uint[] _min_token_purchase, uint[] _max_wei_spend
  ) internal view {
    //Ensure valid input
    if (
      _to_whitelist.length != _min_token_purchase.length ||
      _to_whitelist.length != _max_wei_spend.length ||
      _to_whitelist.length == 0
    ) revert("Mismatched input lengths");

    // Get whitelist length
    uint sale_whitelist_len = uint(Contract.read(Admin.saleWhitelist()));

    // Begin storing values
    Contract.storing();
    // For loop to update all inputted address in whitelist
    for (uint i = 0; i < _to_whitelist.length; i++) {
      // Get storage location for address[i]
      Contract.set(Admin.whitelistMinTok(_to_whitelist[i])).to(_min_token_purchase[i]);
      Contract.set(Admin.whitelistMaxWei(_to_whitelist[i])).to(_max_wei_spend[i]);

      // If the whitelist address does not currently exist in storage, push them to the
      // sale's whitelist array
      if (
        Contract.read(Admin.whitelistMinTok(_to_whitelist[i])) == 0 &&
        Contract.read(Admin.whitelistMaxWei(_to_whitelist[i])) == 0
      ) {
        Contract.set(
          bytes32(32 + (32 * sale_whitelist_len) + uint(Admin.saleWhitelist()))
        ).to(_to_whitelist[i]);
        // Increment whitelist length
        sale_whitelist_len++;
      }
    }
    // Store new whitelist length
    Contract.set(Admin.saleWhitelist()).to(sale_whitelist_len);
  }

  // Checks input and creates storage buffer to set crowdsale start time and duration
  function setCrowdsaleStartandDuration(uint _start_time, uint _duration) internal view {
    //Ensure valid input
    if (_start_time <= now || _duration == 0)
      revert("Invalid start time or duration");

    // Begin storing values
    Contract.storing();
    // Store new start_time
    Contract.set(Admin.startTime()).to(_start_time);
    // Store new duration
    Contract.set(Admin.totalDuration()).to(_duration);

    Contract.emitting();
    // Log CrowdsaleTimeUpdated event
    Contract.log(TIME_UPDATE(Contract.execID()), bytes32(0));
  }
}
