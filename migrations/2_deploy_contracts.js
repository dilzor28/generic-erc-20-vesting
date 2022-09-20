const GenericERC20=artifacts.require ("./GenericERC20.sol");
const GenericERC20Vest=artifacts.require ("./GenericERC20Vesting.sol");

module.exports = async (deployer) => {
    // Test for the staking contract
    // Change this for production to eth GE20's adddress
    await deployer.deploy(GenericERC20, 500000000);
    let tokenInstance = await GenericERC20.deployed()
    const tokenAddress = tokenInstance.address; // 0xfbd293c4a7f16821a97aae221e2895f8e0568d56
    return deployer.deploy(GenericERC20Vest, tokenAddress).then(() => {
        tokenInstance.addToWhitelist(GenericERC20Vest.address);
    });
}