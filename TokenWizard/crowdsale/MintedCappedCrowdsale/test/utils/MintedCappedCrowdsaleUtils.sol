pragma solidity ^0.4.23;

contract MintedCappedCrowdsaleUtils {

  bytes4 internal constant MINTED_CAPPED_INIT =
        bytes4(keccak256('init(address,uint256,bytes32,uint256,uint256,uint256,bool,bool,address)'));

  function getInitSelector() public pure returns (bytes4) {
    return MINTED_CAPPED_INIT;
  }

  function getInitCalldata(address, uint, bytes32, uint, uint, uint, bool, bool, address) public pure returns (bytes memory) {
    bytes memory calldata = msg.data;
    bytes4 init_selector = MINTED_CAPPED_INIT;
    assembly {
      mstore(add(0x20, calldata), init_selector)
      mstore(add(0x24, calldata), calldataload(0x04))
    }
    return calldata;
  }
}
