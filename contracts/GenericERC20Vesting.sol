// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IGenericERC20.sol";

// Contract to lock coins for a set period of time
contract GenericERC20Vesting is ReentrancyGuard {
    using SafeMath for uint256;

    // Map stakeholder to stake amount
    mapping(address => UserInfo) public userInfo;
    address public GE20;

    // Hold a list of all vesters
    address[] private _vestHolders;
    uint256 private _totalVested;

    constructor(address genericERC20Address) {
        GE20 = genericERC20Address;
    }

    struct UserInfo {
        uint256 amountVested;
        uint256 dateVestEnds;
        bool exists;
    }

    function getTotalVest() external view returns (uint256) {
        return _totalVested;
    }

    function getVesters() external view returns(uint256, address[] memory, uint256[] memory) {
        address[] memory wallets = new address[](_vestHolders.length);
        uint256[] memory allVested = new uint256[](_vestHolders.length);
        for (uint256 i = 0; i < _vestHolders.length; i++) {
            wallets[i] = _vestHolders[i];
            allVested[i] = userInfo[_vestHolders[i]].amountVested;
        }
        return (_totalVested, wallets, allVested);
    }

    function despositVest(uint256 vestAmount, uint256 expirationDate) external nonReentrant returns (uint256, uint256) {
        require(IGenericERC20(GE20).balanceOf(msg.sender) > 0, 'cannot vest without tokens');
        require(IGenericERC20(GE20).balanceOf(msg.sender) > vestAmount, 'cannot vest more than owned');
        require(expirationDate > block.timestamp, 'must vest tokens until some time in the future');
        require(IGenericERC20(GE20).transferFrom(address(msg.sender), address(this), vestAmount), 'transfer vest amount into contract');

        UserInfo storage user = userInfo[msg.sender];
        // Make sure the user doesn't try to vest a second time for an earlier date
        if (user.dateVestEnds < expirationDate) {
            user.dateVestEnds = expirationDate;
        }

        if(!user.exists && user.amountVested == 0) {
            _addVestHolder(msg.sender);  
        }

        user.amountVested = user.amountVested.add(vestAmount);
        _totalVested = IGenericERC20(GE20).balanceOf(address(this));

        emit Deposit(msg.sender, vestAmount);

        return (user.amountVested, _totalVested);
    }

    function removeVest(uint256 amount) external nonReentrant returns (uint256, uint256) {
        require(amount > 0, 'cannot unvest negative amounts');
        UserInfo storage user = userInfo[msg.sender];
        require(user.dateVestEnds < block.timestamp, 'vest removal date needs to be after date set');
        require(amount <= user.amountVested, 'cannot unvest more than vested');
        user.amountVested = user.amountVested.sub(amount);
        require(IGenericERC20(GE20).transfer(msg.sender, amount), 'transfer token out of contract');
        if(user.exists && user.amountVested == 0) {
            _removeVester(msg.sender);
        }
        _totalVested = IGenericERC20(GE20).balanceOf(address(this));

        emit Withdraw(msg.sender, amount);

        return (user.amountVested, _totalVested);
    }

    // Add a vester
    function _addVestHolder(address vestholderAddress) private {
        _vestHolders.push(vestholderAddress);
        userInfo[vestholderAddress].exists = true;
    }

    // Remove a vester
    function _removeVester(address vestholderAddress) private {
        (bool isVester, uint256 index) = _isVestHolder(vestholderAddress);
        if (isVester) {
            delete(userInfo[vestholderAddress]);
            _vestHolders[index] = _vestHolders[_vestHolders.length - 1];
            _vestHolders.pop();
        }
    }

    function _isVestHolder(address vestholderAddress) private view returns (bool exists, uint256 index) {
        exists = false;
        index = 0;
        for (uint256 i = 0; i < _vestHolders.length; i++) {
            if (vestholderAddress == _vestHolders[i]) {
                exists = true;
                index = i;
                break;
            }
        }
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
}