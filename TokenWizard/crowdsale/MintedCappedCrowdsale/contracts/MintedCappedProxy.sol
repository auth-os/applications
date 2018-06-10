pragma solidity ^0.4.23;

import "./auth-os/Proxy.sol";
import "./auth-os/StringUtils.sol";
import "./IMintedCapped.sol";

contract SaleProxy is ISale, Proxy {

  // Allows a sender to purchase tokens from the active sale
  function buy() public payable {
    app_storage.exec.value(msg.value)(msg.sender, app_exec_id, msg.data);
  }
}

contract SaleManagerProxy is ISaleManager, SaleProxy {

  /*
  Returns information about the ongoing sale -

  @return uint: The total number of wei raised during the sale
  @return address: The team funds wallet
  @return uint: The minimum number of tokens a purchaser must buy
  @return bool: Whether the sale is finished configuring
  @return bool: Whether the sale has completed
  */
  function getCrowdsaleInfo() external view returns (uint, address, uint, bool, bool) {
    return SaleManagerIdx(app_index).getCrowdsaleInfo(app_storage, app_exec_id);
  }

  /*
  Returns whether or not the sale is full, as well as the maximum number of sellable tokens

  @return bool: Whether or not the sale is sold out
  @return uint: The total number of tokens for sale
  */
  function isCrowdsaleFull() external view returns (bool, uint) {
    return SaleManagerIdx(app_index).isCrowdsaleFull(app_storage, app_exec_id);
  }

  /*
  Returns the start and end times of the sale

  @return uint: The time at which the sale will begin
  @return uint: The time at which the sale will end
  */
  function getCrowdsaleStartAndEndTimes() external view returns (uint, uint) {
    return SaleManagerIdx(app_index).getCrowdsaleStartAndEndTimes(app_storage, app_exec_id);
  }

  /*
  Returns information about the current sale tier

  @return bytes32: The tier's name
  @return uint: The index of the tier
  @return uint: The time at which the tier will end
  @return uint: The number of tokens remaining for sale during this tier
  @return uint: The price of 1 token (10^decimals units) in wei
  @return bool: Whether the tier's duration can be modified by the sale admin, prior to it beginning
  @return bool: Whether the tier is whitelisted
  */
  function getCurrentTierInfo() external view returns (bytes32, uint, uint, uint, uint, bool, bool) {
    return SaleManagerIdx(app_index).getCurrentTierInfo(app_storage, app_exec_id);
  }

  /*
  Returns information about the tier represented by the given index

  @param _idx: The index of the tier about which information will be returned
  @return bytes32: The tier's name
  @return uint: The number of tokens available for sale during this tier, in total
  @return uint: The price of 1 token (10^decimals units) in wei
  @return uint: The duration the tier lasts
  @return bool: Whether the tier's duration can be modified by the sale admin, prior to it beginning
  @return bool: Whether the tier is whitelisted
  */
  function getCrowdsaleTier(uint _idx) external view returns (bytes32, uint, uint, uint, bool, bool) {
    return SaleManagerIdx(app_index).getCrowdsaleTier(app_storage, app_exec_id, _idx);
  }

  /*
  Returns the maximum amount of wei that can be raised, as well as the total number of tokens that can be sold

  @return uint: The maximum amount of wei that can be raised
  @return uint: The total number of tokens that can be sold
  */
  function getCrowdsaleMaxRaise() external view returns (uint, uint) {
    return SaleManagerIdx(app_index).getCrowdsaleMaxRaise(app_storage, app_exec_id);
  }

  /*
  Returns a list of the sale's tier names

  @return bytes32[]: A list of the names of each of the tiers of the sale (names may not be unique)
  */
  function getCrowdsaleTierList() external view returns (bytes32[]) {
    return SaleManagerIdx(app_index).getCrowdsaleTierList(app_storage, app_exec_id);
  }

  /*
  Returns the start and end time of the given tier

  @param _idx: The index of the tier about which information will be returned
  @return uint: The time at which the tier will begin
  @return uint: The time at which the tier will end
  */
  function getTierStartAndEndDates(uint _idx) external view returns (uint, uint) {
    return SaleManagerIdx(app_index).getTierStartAndEndDates(app_storage, app_exec_id, _idx);
  }

  /*
  Returns the total number of tokens sold during the sale

  @return uint: The total number of tokens sold during the sale
  */
  function getTokensSold() external view returns (uint) {
    return SaleManagerIdx(app_index).getTokensSold(app_storage, app_exec_id);
  }

  /*
  Returns whitelist information for a buyer during a given tier

  @param _tier: The index of the tier whose whitelist will be queried
  @param _buyer: The address about which the whitelist information will be retrieved
  @return uint: The minimum number of tokens the buyer must make during the sale
  @return uint: The maximum amount of wei allowed to be spent by the buyer
  */
  function getWhitelistStatus(uint _tier, address _buyer) external view returns (uint, uint) {
    return SaleManagerIdx(app_index).getWhitelistStatus(app_storage, app_exec_id, _tier, _buyer);
  }
}

contract TokenProxy is IToken, SaleManagerProxy {

  using StringUtils for bytes32;

  // Returns the name of the token
  function name() public view returns (string) {
    return TokenIdx(app_index).name(app_storage, app_exec_id).toStr();
  }

  // Returns the symbol of the token
  function symbol() public view returns (string) {
    return TokenIdx(app_index).symbol(app_storage, app_exec_id).toStr();
  }

  // Returns the number of decimals the token has
  function decimals() public view returns (uint8) {
    return TokenIdx(app_index).decimals(app_storage, app_exec_id);
  }

  // Returns the total supply of the token
  function totalSupply() public view returns (uint) {
    return TokenIdx(app_index).totalSupply(app_storage, app_exec_id);
  }

  // Returns the token balance of the owner
  function balanceOf(address _owner) public view returns (uint) {
    return TokenIdx(app_index).balanceOf(app_storage, app_exec_id, _owner);
  }

  // Returns the number of tokens allowed by the owner to be spent by the spender
  function allowance(address _owner, address _spender) public view returns (uint) {
    return TokenIdx(app_index).allowance(app_storage, app_exec_id, _owner, _spender);
  }

  // Executes a transfer, sending tokens to the recipient
  function transfer(address _to, uint _amt) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    emit Transfer(msg.sender, _to, _amt);
    return true;
  }

  // Executes a transferFrom, transferring tokens from the _from account by using an allowed amount
  function transferFrom(address _from, address _to, uint _amt) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    emit Transfer(_from, _to, _amt);
    return true;
  }

  // Approve a spender for a given amount
  function approve(address _spender, uint _amt) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    emit Approval(msg.sender, _spender, _amt);
    return true;
  }

  // Increase the amount approved for the spender
  function increaseApproval(address _spender, uint _amt) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    emit Approval(msg.sender, _spender, _amt);
    return true;
  }

  // Decrease the amount approved for the spender, to a minimum of 0
  function decreaseApproval(address _spender, uint _amt) public returns (bool) {
    app_storage.exec(msg.sender, app_exec_id, msg.data);
    emit Approval(msg.sender, _spender, _amt);
    return true;
  }
}

contract MintedCappedProxy is IMintedCapped, TokenProxy {

  // Constructor - sets storage address, registry id, provider, and app name
  constructor (address _storage, bytes32 _registry_exec_id, address _provider, bytes32 _app_name) public
    Proxy(_storage, _registry_exec_id, _provider, _app_name) { }

  // Constructor - creates a new instance of the application in storage, and sets this proxy's exec id
  function init(address, uint, bytes32, uint, uint, uint, bool, bool, address) public {
    require(msg.sender == proxy_admin && app_exec_id == 0 && app_name != 0);
    (app_exec_id, app_version) = app_storage.createInstance(
      msg.sender, app_name, provider, registry_exec_id, msg.data
    );
    app_index = app_storage.getIndex(app_exec_id);
  }

  // Executes an arbitrary function in this application
  function exec(bytes32 _exec_id, bytes _calldata) external payable returns (bool success) {
    // Call 'exec' in AbstractStorage, passing in the sender's address, the app exec id, and the calldata to forward -
    app_storage.exec.value(msg.value)(msg.sender, _exec_id, _calldata);

    // Get returned data
    success = checkReturn();
    // If execution failed, revert -
    require(success, 'Execution failed');

    // Transfer any returned wei back to the sender
    address(msg.sender).transfer(address(this).balance);
  }

  // Checks data returned by an application and returns whether or not the execution changed state
  function checkReturn() internal pure returns (bool success) {
    success = false;
    assembly {
      // returndata size must be 0x60 bytes
      if eq(returndatasize, 0x60) {
        // Copy returned data to pointer and check that at least one value is nonzero
        let ptr := mload(0x40)
        returndatacopy(ptr, 0, returndatasize)
        if iszero(iszero(mload(ptr))) { success := 1 }
        if iszero(iszero(mload(add(0x20, ptr)))) { success := 1 }
        if iszero(iszero(mload(add(0x40, ptr)))) { success := 1 }
      }
    }
    return success;
  }
}
