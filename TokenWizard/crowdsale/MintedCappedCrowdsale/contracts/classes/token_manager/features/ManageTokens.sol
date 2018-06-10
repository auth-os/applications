pragma solidity ^0.4.23;

import "../TokenManager.sol";
import "../../../auth-os/Contract.sol";

library ManageTokens {

  using Contract for *;
  using SafeMath for uint;

  /// EVENTS ///

  // event TransferAgentStatusUpdate(bytes32 indexed exec_id, address indexed agent, bool current_status)
  bytes32 internal constant TRANSFER_AGENT_STATUS = keccak256('TransferAgentStatusUpdate(bytes32,address,bool)');
  // event CrowdsaleFinalized(bytes32 indexed exec_id)
  bytes32 internal constant FINAL_SEL = keccak256('CrowdsaleFinalized(bytes32)');
  // event TokenConfigured(bytes32 indexed exec_id, bytes32 indexed name, bytes32 indexed symbol, uint decimals)
  bytes32 private constant TOKEN_CONFIGURED = keccak256("TokenConfigured(bytes32,bytes32,bytes32,uint256)");

  // Returns the topics for a transfer agent status update event -
  function AGENT_STATUS(bytes32 _exec_id, address _agent) private pure returns (bytes32[3] memory)
    { return [TRANSFER_AGENT_STATUS, _exec_id, bytes32(_agent)]; }

  // Returns the topics for a crowdsale finalization event -
  function FINALIZE(bytes32 _exec_id) private pure returns (bytes32[2] memory)
    { return [FINAL_SEL, _exec_id]; }

  // Returns the topics for a token initialization event -
  function TOKEN_INIT(bytes32 _exec_id, bytes32 _name, bytes32 _symbol) private pure returns (bytes32[4] memory)
    { return [TOKEN_CONFIGURED, _exec_id, _name, _symbol]; }

  // Checks input and then creates storage buffer for token initialization
  function initCrowdsaleToken(bytes32 _name, bytes32 _symbol, uint _decimals) internal pure {
   // Ensure valid input
    if (
      _name == 0
      || _symbol == 0
      || _decimals > 18
    ) revert('improper token initialization');

    // Set up STORES action requests -
    Contract.storing();

    // Store token name, symbol, and decimals
    Contract.set(TokenManager.tokenName()).to(_name);
    Contract.set(TokenManager.tokenSymbol()).to(_symbol);
    Contract.set(TokenManager.tokenDecimals()).to(_decimals);

    Contract.emitting();

    // Log token initialization event -
    Contract.log(
      TOKEN_INIT(Contract.execID(), _name, _symbol), bytes32(_decimals)
    );
  }

  // Checks input and then creates storage buffer for transfer agent updating
  function setTransferAgentStatus(address _agent, bool _is_agent) internal pure {
    // Ensure valid input
    if (_agent == 0)
      revert('invalid transfer agent');

    Contract.storing();

    // Store new transfer agent status
    Contract.set(TokenManager.transferAgents(_agent)).to(_is_agent);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add TransferAgentStatusUpdate signature and topics
    Contract.log(
      AGENT_STATUS(Contract.execID(), _agent), _is_agent ? bytes32(1) : bytes32(0)
    );
  }

  // Checks input and then creates storage buffer for reserved token updating
  function updateMultipleReservedTokens(
    address[] _destinations,
    uint[] _num_tokens,
    uint[] _num_percents,
    uint[] _percent_decimals
  ) internal view {
    // Ensure valid input
    if (
      _destinations.length != _num_tokens.length
      || _num_tokens.length != _num_percents.length
      || _num_percents.length != _percent_decimals.length
      || _destinations.length == 0
    ) revert('invalid input length');

    // Add crowdsale destinations list length location to buffer
    uint num_destinations = uint(Contract.read(TokenManager.reservedDestinations()));

    Contract.storing();

    // Loop over read_values and input arrays - for each address which is unique within the passed-in destinations list,
    // place its reservation information in the storage buffer. Ignore duplicates in passed-in array.
    // For every address which is not a local duplicate, and also does not exist yet in the crowdsale storage reserved destination list,
    // push it to the end of the list and increment list length (in storage buffer)

    for (uint i = 0; i < _destinations.length; i++) {
      address to_add = _destinations[i];
      if (to_add == 0)
        revert('invalid destination');

      // Check if the destination is unique in storage
      if (Contract.read(TokenManager.destIndex(_destinations[i])) == 0) {
        // Now, check the passed-in destinations list to see if this address is listed multiple times in the input, as we only want to store information on unique addresses
        for (uint j = _destinations.length - 1; j > i; j--) {
          // address is not unique locally - found the same address in destinations
          if (_destinations[j] == to_add) {
            to_add = address(0);
            break;
          }
        }

        // If to_add is zero, this address is not unique within the passed-in list - skip any additions to storage buffer
        if (to_add == 0)
          continue;

        // Increment length
        num_destinations = num_destinations.add(1);
        // Ensure reserved destination amount does not exceed 20
        if (num_destinations > 20)
          revert('too many reserved destinations');
        // Push address to reserved destination list
        Contract.set(
          bytes32(32 * num_destinations + uint(TokenManager.reservedDestinations()))
        ).to(to_add);
        // Store reservation index
        Contract.set(TokenManager.destIndex(to_add)).to(num_destinations);
      }

      // Store reservation info -
      // Number of tokens to reserve
      Contract.set(TokenManager.destTokens(to_add)).to(_num_tokens[i]);
      // Percentage of total tokens sold to reserve
      Contract.set(TokenManager.destPercent(to_add)).to(_num_percents[i]);
      // Precision of percent
      Contract.set(TokenManager.destPrecision(to_add)).to(_percent_decimals[i]);
    }
    // Finally, update array length
    Contract.set(TokenManager.reservedDestinations()).to(num_destinations);
  }

  // Checks input and then creates storage buffer for reserved token removal
  function removeReservedTokens(address _destination) internal view {
    // Ensure valid input
    if (_destination == 0)
      revert('invalid destination');

    Contract.storing();

    // Get reservation list length
    uint reservation_len = uint(Contract.read(TokenManager.reservedDestinations()));
    // Get index of passed-in destination. If zero, sender is not in reserved list - revert
    uint to_remove = uint(Contract.read(TokenManager.destIndex(_destination)));
    // Ensure that to_remove is less than or equal to reservation list length (stored indices are offset by 1)
    if (to_remove > reservation_len || to_remove == 0)
      revert('removing too many reservations');

    if (to_remove != reservation_len) {
      // Execute read from storage, and store return in buffer
      address last_index =
        address(Contract.read(
          bytes32(32 * reservation_len + uint(TokenManager.reservedDestinations()))
        ));

      // Update index
      Contract.set(TokenManager.destIndex(last_index)).to(to_remove);
      // Push last index address to correct spot in reservedDestinations() list
      Contract.set(
        bytes32((32 * to_remove) + uint(TokenManager.reservedDestinations()))
      ).to(last_index);
    }
    // Update destination list length
    Contract.decrease(TokenManager.reservedDestinations()).by(1);
    // Update removed address index
    Contract.set(TokenManager.destIndex(_destination)).to(uint(0));
  }

  // Checks input and then creates storage buffer for reserved token distribution
  function distributeReservedTokens(uint _num_destinations) internal view {
    // Ensure valid input
    if (_num_destinations == 0)
      revert('invalid number of destinations');

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(TokenManager.tokensSold()));
    uint total_supply = uint(Contract.read(TokenManager.tokenTotalSupply()));
    uint reserved_len = uint(Contract.read(TokenManager.reservedDestinations()));

    Contract.storing();

    // If no destinations remain to be distributed to, revert
    if (reserved_len == 0)
      revert('no remaining destinations');

    // If num_destinations is greater than the reserved destinations list length, set amt equal to the list length
    if (_num_destinations > reserved_len)
      _num_destinations = reserved_len;

    // Update reservedDestinations list length
    Contract.decrease(TokenManager.reservedDestinations()).by(_num_destinations);

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < _num_destinations; i++) {
      // Get the reserved destination address
      address addr =
        address(Contract.read(
          bytes32(32 * (_num_destinations - i) + uint(TokenManager.reservedDestinations()))
        ));

      // Get percent reserved and precision
      uint to_add = uint(Contract.read(TokenManager.destPercent(addr)));

      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = uint(Contract.read(TokenManager.destPrecision(addr))).add(2);

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(TokenManager.destTokens(addr))));

      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Increase destination token balance -
      Contract.increase(TokenManager.balances(addr)).by(to_add);
    }

    // Update total supply
    Contract.set(TokenManager.tokenTotalSupply()).to(total_supply);
  }

  // Checks input and then creates storage buffer for crowdsale finalization
  function finalizeCrowdsaleAndToken() internal view {
    // Get reserved token distribution from distributeAndUnlockTokens
    distributeAndUnlockTokens();

    // Finalize crowdsale
    Contract.set(TokenManager.isFinished()).to(true);

    Contract.emitting();

    // Add CrowdsaleFinalized signature and topics
    Contract.log(
      FINALIZE(Contract.execID()), bytes32(0)
    );
  }

  // Gets number of tokens to distribute -
  function distributeAndUnlockTokens() internal view {

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(TokenManager.tokensSold()));
    uint total_supply = uint(Contract.read(TokenManager.tokenTotalSupply()));
    uint num_destinations = uint(Contract.read(TokenManager.reservedDestinations()));

    Contract.storing();

    // If there are no reserved destinations, simply create a storage buffer to unlock token transfers -
    if (num_destinations == 0) {
      // Unlock tokens
      Contract.set(TokenManager.tokensUnlocked()).to(true);
      return;
    }

    // Set new reserved destination list length
    Contract.set(TokenManager.reservedDestinations()).to(uint(0));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address addr =
        address(Contract.read(
          bytes32(32 + (32 * i) + uint(TokenManager.reservedDestinations()))
        ));
      // Get percent reserved and precision
      uint to_add = uint(Contract.read(TokenManager.destPercent(addr)));
      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = uint(Contract.read(TokenManager.destPrecision(addr))).add(2);

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(TokenManager.destTokens(addr))));

      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Increase destination token balance -
      Contract.increase(TokenManager.balances(addr)).by(to_add);
    }
    // Update total supply
    Contract.set(TokenManager.tokenTotalSupply()).to(total_supply);
    // Unlock tokens
    Contract.set(TokenManager.tokensUnlocked()).to(true);
  }

  // Checks input and then creates storage buffer for token distribution
  function finalizeAndDistributeToken() internal view {
    distributeAndUnlockTokens();
  }
}
