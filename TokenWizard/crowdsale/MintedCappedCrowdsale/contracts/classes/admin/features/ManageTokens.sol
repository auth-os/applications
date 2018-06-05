pragma solidity ^0.4.23;

import "../Admin.sol";
import "../../../lib/SafeMath.sol";
import "../../../lib/Contract.sol";

library ManageTokens {

  using Contract for *;
  using SafeMath for uint;

  function first() internal pure {

  }

  function last() internal pure {

  } 

  /// EVENTS ///

  // event TransferAgentStatusUpdate(bytes32 indexed exec_id, address indexed agent, bool current_status)
  bytes32 internal constant TRANSFER_AGENT_STATUS = keccak256('TransferAgentStatusUpdate(bytes32,address,bool)');
  // Event - FinalizeCrowdsale(bytes32 indexed exec_id, uint indexed now)
  bytes32 internal constant FINAL_SEL = keccak256('FinalizeCrowdsale(bytes32,uint)');
  // Event - UpdateMultipleReservedTokens(bytes32 indexed exec_id, uint indexed num_destinations)
  bytes32 internal constant UPDATE_RESERVED_SEL = keccak256('UpdateMultipleReservedTokens(bytes32,uint)');
  // Event - RemoveReservedToken(bytes32 indexed exec_id, address indexed destination)
  bytes32 internal constant REMOVE_RESERVED_SEL = keccak256('RemoveReservedToken(bytes32,uint)');
  // Event - DistributeTokens(bytes32 indexed exec_id, uint indexed num_destinations)
  bytes32 internal constant DISTRIBUTE_RESERVED_SEL = keccak256('DistributeTokens(bytes32,uint)');
  // Event - FinalizeAndDistribute(bytes32 indexed exec_id, uint indexed now)
  bytes32 internal constant FINAL_AND_DIS_SEL = keccak256('FinalizeAndDistribute(bytes32,uint)');

  function AGENT_STATUS(bytes32 exec_id, address agent) private pure 
  returns (bytes32[3] memory) {
    return [TRANSFER_AGENT_STATUS, exec_id, bytes32(agent)];
  }

  function FINALIZE(bytes32 exec_id) private view returns (bytes32[3] memory) {
    return [FINAL_SEL, exec_id, bytes32(now)];
  }

  function UPDATE_RESERVED(bytes32 exec_id, uint num_destinations) private pure returns (bytes32[3] memory) {
    return [UPDATE_RESERVED_SEL, exec_id, bytes32(num_destinations)];
  }

  function REMOVE_RESERVED(bytes32 exec_id, address destination) private pure returns (bytes32[3] memory) {
    return [REMOVE_RESERVED_SEL, exec_id, bytes32(destination)];
  }

  function DISTIBUTE_TOKENS(bytes32 exec_id, uint num_destinations) private pure returns (bytes32[3] memory) {
    return [DISTRIBUTE_RESERVED_SEL, exec_id, bytes32(num_destinations)];
  }

  function FINALIZE_AND_DIS(bytes32 exec_id) private view returns (bytes32[3] memory) {
    return [FINAL_AND_DIS_SEL, exec_id, bytes32(now)];
  }


  function setTransferAgentStatus(address agent, bool is_agent) internal view { 

    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('sender is not admin');

    // Ensure valid input
    if (agent == address(0))
      revert('invalid transfer agent');

    Contract.storing();

    // Get transfer agent status storage location
    bytes32 status_location = Admin.transfer_agent(agent);
    // Store new transfer agent status
    Contract.set(
      status_location
    ).to(is_agent);

    // Set up EMITS action requests -
    Contract.emitting();

    // Add TransferAgentStatusUpdate signature and topics
    Contract.log(
      AGENT_STATUS(Contract.execID(), agent), is_agent ? bytes32(1) : bytes32(0)
    );
                
  }

  function updateMultipleReservedTokens(address[] destinations, uint[] num_tokens, uint[] num_percents, uint[] percent_decimals) internal view { 
    // Ensure valid input
    if (
      destinations.length != num_tokens.length
      || num_tokens.length != num_percents.length
      || num_percents.length != percent_decimals.length
      || destinations.length == 0
    ) revert('invalid input arrays'); 

    // Add crowdsale destinations list length location to buffer
    uint num_destinations = uint(Contract.read(Admin.reserved_destinations()));

    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('sender is not admin');

    // Ensure sender is admin address, and crowdsale has not been initialized
    if (Contract.read(Admin.is_init()) == bytes32(0))
      revert('crowdsale is not initialized');

    Contract.storing();


    // Loop over read_values and input arrays - for each address which is unique within the passed-in destinations list,
    // place its reservation information in the storage buffer. Ignore duplicates in passed-in array.
    // For every address which is not a local duplicate, and also does not exist yet in the crowdsale storage reserved destination list,
    // push it to the end of the list and increment list length (in storage buffer)
    // Addresses with nonzero values in read_values are already a 'reserved token destination' in storage
    // First 3 indices in read_values are admin address, crowdsale init status, and crowdsale reserved destinations list length - begin
    // reading destinations address indices from read_values[3]

    for (uint i = 0; i < destinations.length; i++) {
      // If value is 0, address has not already been added to the crowdsale destinations list in storage
      address to_add = destinations[i];
      if (to_add == address(0)) 
        revert('invalid destination');

      if (Contract.read(Admin.reserved_info(destinations[i])) == bytes32(0)) {
        // Now, check the passed-in destinations list to see if this address is listed multiple times in the input, as we only want to store information on unique addresses
        for (uint j = destinations.length - 1; j > i; j--) {
          // address is not unique locally - found the same address in destinations
          if (destinations[j] == to_add) {
            to_add = address(0);
            break;
          }
        }

        // If is_unique is zero, this address is not unique within the passed-in list - skip any additions to storage buffer
        if (to_add == address(0))
          continue;

        // Increment length
        num_destinations = num_destinations.add(1);
        // Ensure reserved destination amount does not exceed 20
        if (num_destinations > 20) 
          revert('too many reserved destinations');
        // Push address to reserved destination list
        Contract.set(
          bytes32(32 * num_destinations + uint(Admin.reserved_destinations()))
        ).to(to_add);
        // Store reservation info
        Contract.set(
          Admin.reserved_info(to_add)
        ).to(num_destinations);
      }

      // Store reservation info
      Contract.set(
        bytes32(32 + uint(Admin.reserved_info(to_add)))
      ).to(num_tokens[i]);
      Contract.set(
       bytes32(64 + uint(Admin.reserved_info(to_add))) 
      ).to(num_percents[i]);
      Contract.set(
        bytes32(96 + uint(Admin.reserved_info(to_add)))
      ).to(percent_decimals[i]);
    }
    // Finally, update array length
    Contract.set(
      Admin.reserved_destinations()
    ).to(num_destinations);

    Contract.emitting();

    Contract.log(
      UPDATE_RESERVED(Contract.execID(), num_destinations), bytes32(0)
    );

  }

  function removeReservedTokens(address destination) internal view { 
    // Ensure valid input
    if (destination == address(0))
      revert('invalid destination');

    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('sender is not admin');

    if (Contract.read(Admin.is_init()) == bytes32(0))
      revert('crowdsale is not initialized');

    Contract.storing();

    // Get reservation list length
    uint reservation_len = uint(Contract.read(Admin.reserved_destinations()));
    // Get index of passed-in destination. If zero, sender is not in reserved list - revert
    uint to_remove = uint(Contract.read(Admin.reserved_info(destination)));
    // Ensure that to_remove is less than or equal to reservation list length (stored indices are offset by 1)
    if (to_remove > reservation_len || to_remove == 0)
      revert('removing too many reservations');

    if (to_remove != reservation_len) {
      // Execute read from storage, and store return in buffer
      address last_index = address(Contract.read(bytes32(32 * reservation_len + uint(Admin.reserved_destinations()))));

      // Update index
      Contract.set(
        Admin.reserved_info(last_index)
      ).to(to_remove);
      // Push last index address to correct spot in reserved_destinations() list
      Contract.set(
        bytes32((32 * to_remove) + uint(Admin.reserved_destinations()))
      ).to(last_index);
    }
    // Update destination list length
    Contract.set(
      Admin.reserved_destinations()
    ).to(reservation_len.sub(1));
    // Update removed address index
    Contract.set(
      Admin.reserved_info(destination)
    ).to(uint(0));

    Contract.emitting();

    Contract.log(
      REMOVE_RESERVED(Contract.execID(), destination), bytes32(0)
    );

  }

  function distributeReservedTokens(uint num_destinations) internal view { 
    // Ensure valid input
    if (num_destinations == 0)
      revert('invalid number of destinations');

    // If the crowdsale is not finalized, revert
    if (Contract.read(Admin.is_final()) == bytes32(0))
      revert('crowdsale is not finalized');

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(Admin.tokens_sold()));
    uint total_supply = uint(Contract.read(Admin.token_total_supply()));
    uint reserved_len = uint(Contract.read(Admin.reserved_destinations()));

    Contract.storing();

    // If no destinations remain to be distributed to, revert
    if (reserved_len == 0)
      revert('no remaining destinations');

    // If num_destinations is greater than the reserved destinations list length, set amt equal to the list length
    if (num_destinations > reserved_len)
      num_destinations = reserved_len;


    Contract.set(
      Admin.reserved_destinations()
    ).to(reserved_len.sub(num_destinations));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address addr = address(Contract.read(bytes32(32 * (num_destinations - i) + uint(Admin.reserved_destinations())))); 

      // Get percent reserved and precision
      uint to_add = uint(Contract.read(
        bytes32(
          64 + uint(Admin.reserved_info(addr))
        )
      ));

      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = 2 + uint(Contract.read(
        bytes32(
          96 + uint(Admin.reserved_info(addr))
        )
      ));

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(
        bytes32(
          32 + uint(Admin.reserved_info(addr))
        )
      )));

      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Add destination's current token balance to to_add
      to_add = to_add.add(uint(Contract.read(
        Admin.balances(addr)
      )));

      // Store reserved destination new token balance
      Contract.set(
        Admin.balances(addr)
      ).to(to_add);
    }

    // Update total supply
    Contract.set(
      Admin.token_total_supply()
    ).to(total_supply);

    Contract.emitting();

    Contract.log(
      DISTIBUTE_TOKENS(Contract.execID(), num_destinations), bytes32(0)
    );

  }

  function finalizeCrowdsaleAndToken() internal view { 
    if (Contract.sender() != address(Contract.read(Admin.admin())))
      revert('sender is not admin');

    if (Contract.read(Admin.is_init()) == bytes32(0))
      revert('crowdsale is not initialized');

    if (Contract.read(Admin.is_final()) == bytes32(1))
      revert('crowdsale is already finalized');

    // Get reserved token distribution from distributeAndUnlockTokens
    distributeAndUnlockTokens();

    // Finalize crowdsale
    Contract.set(
      Admin.is_final()
    ).to(true);

    Contract.emitting();

    // Add CrowdsaleFinalized signature and topics
    Contract.log(
      FINALIZE(Contract.execID()), bytes32(0)
    );

  }

  function distributeAndUnlockTokens() internal view { 

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(Admin.tokens_sold())); 
    uint total_supply = uint(Contract.read(Admin.token_total_supply())); 
    uint num_destinations = uint(Contract.read(Admin.reserved_destinations()));

    Contract.storing();

    // If there are no reserved destinations, simply create a storage buffer to unlock token transfers -
    if (num_destinations == 0) {
      // Unlock tokens
      Contract.set(
        Admin.tokens_unlocked()
      ).to(true);

      return;
    }

    // Set new reserved destination list length
    Contract.set(
      Admin.reserved_destinations()
    ).to(uint(0));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address reserved_address = address(Contract.read(
        bytes32(32 + (32 * i) + uint(Admin.reserved_destinations())))
      );

      // Get percent reserved and precision
      uint to_add = uint(Contract.read(
        bytes32(64 + uint(Admin.reserved_info(reserved_address)))
      ));

      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = 2 + uint(Contract.read(
        bytes32(96 + uint(Admin.reserved_info(reserved_address)))
      ));

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(
        bytes32(32 + uint(Admin.reserved_info(reserved_address)))
      )));

      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Add destination's current token balance to to_add
      to_add = to_add.add(uint(Contract.read(
        Admin.balances(reserved_address)
      )));

      // Store new token balance
      Contract.set(
        Admin.balances(reserved_address)
      ).to(to_add);
    }

    // Update total token supply
    Contract.set(
      Admin.token_total_supply()
    ).to(total_supply);

    // Unlock tokens
    Contract.set(
      Admin.tokens_unlocked()
    ).to(true);


  }

  function finalizeAndDistributeToken() internal view { 

    // Get total tokens sold, total token supply, and reserved destinations list length
    uint total_sold = uint(Contract.read(Admin.tokens_sold())); 
    uint total_supply = uint(Contract.read(Admin.token_total_supply()));
    uint num_destinations = uint(Contract.read(Admin.reserved_destinations()));

    // If the crowdsale is not finalized, revert
    if (Contract.read(Admin.is_final()) == bytes32(0))
      revert('crowdsale not finalized');

    // If there are no reserved destinations, simply create a storage buffer to unlock token transfers -
    if (num_destinations == 0) {
      // Unlock tokens
      Contract.set(
        Admin.tokens_unlocked()
      ).to(true);
    }

    // Store new reserved destination list length
    Contract.set(
      Admin.reserved_destinations()
    ).to(uint(0));

    // For each address, get their new balance and add to storage buffer
    for (uint i = 0; i < num_destinations; i++) {

      address reserved = address(Contract.read(bytes32(32 + (32 * i) + uint(Admin.reserved_destinations()))));
      // Get percent reserved and precision
      uint to_add = uint(Contract.read(
        bytes32(64 + uint(Admin.reserved_info(reserved)))
      ));
      // Two points of precision are added to ensure at least a percent out of 100
      uint precision = 2 + uint(Contract.read(
        bytes32(96 + uint(Admin.reserved_info(reserved)))
      ));

      // Get percent divisor
      precision = 10 ** precision;

      // Get number of tokens to add from total_sold and precent reserved
      to_add = total_sold.mul(to_add).div(precision);

      // Add number of tokens reserved
      to_add = to_add.add(uint(Contract.read(
        bytes32(32 + uint(Admin.reserved_info(reserved)))
      )));
      // Increment total supply
      total_supply = total_supply.add(to_add);

      // Add destination's current token balance to to_add
      to_add = to_add.add(uint(Contract.read(
        bytes32(Admin.reserved_info(reserved))
      )));
      // Store new destination token balance
      Contract.set(
        Admin.balances(reserved)
      ).to(to_add);
    }
    // Update total supply
    Contract.set(
      Admin.token_total_supply()
    ).to(total_supply);
    // Unlock tokens
    Contract.set(
      Admin.tokens_unlocked()
    ).to(true);

    Contract.emitting();

    Contract.log(
      FINALIZE_AND_DIS(Contract.execID()), bytes32(0)
    );

  } 

}

