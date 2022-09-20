App = {
    /**
     * When deploying to a local test network, make sure 
     * MetaMask is also connected to that network
    */
    web3Provider: null,
    contracts: {},
    account: '0x0',
    loading: false,
    totalVested: 0,
    vestedAmount: 0,
    totalSupply: 0,
    accountBalance: 0,

    init: async () => {
        return await App.initWeb3();
    },

    initWeb3: async () => {
        // Modern dapp browsers...
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                // await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        web3.eth.defaultAccount = web3.eth.accounts[0];


        return await App.initContracts();
    },

    initContracts: async () => {
        $.getJSON("GenericERC20Vesting.json", GenericERC20Vesting => {
            App.contracts.GenericERC20Vesting = TruffleContract(GenericERC20Vesting);
            App.contracts.GenericERC20Vesting.setProvider(App.web3Provider);
            App.contracts.GenericERC20Vesting.deployed()
        }).done(() => {
            $.getJSON("GenericERC20.json", GenericERC20 => {
                App.contracts.GenericERC20 = TruffleContract(GenericERC20);
                App.contracts.GenericERC20.setProvider(App.web3Provider);
                App.contracts.GenericERC20.deployed()
                return App.render();
            });
        })

    },

    render: async () => {
        if (App.loading) {
            return;
        }
        App.loading = true;

        let loader = $('#loader');
        let content = $('#content');

        loader.show();
        content.hide();

        // Get account data
        web3.eth.getCoinbase((err, account) => {
            if (err == null) {
                console.log("User Account", account);
                App.account = account;
                $('#accountAddress').html("Your account: " + account);
            }
        })
        tokenInstance = await App.contracts.GenericERC20.deployed()
        total = await tokenInstance.totalSupply();
        total = (total.toNumber() / (10 ** 18));
        App.totalSupply = total;
        $('.total-supply').html(App.totalSupply);
        balance = await tokenInstance.balanceOf(App.account);
        App.accountBalance = (balance.toNumber() / 10 ** 18);
        $('.account-value').html(App.accountBalance);
        vestedInstance = await App.contracts.GenericERC20Vesting.deployed()
        total = await vestedInstance.getTotalVest();
        App.totalVested = (total / 10 ** 18);
        $('.total-vested').html(App.totalVested);
        const userInfo = await vestedInstance.userInfo(App.account);
        vested = userInfo[0];
        App.vestedAmount = (vested / 10 ** 18);
        $('.user-vested').html(App.vestedAmount);
        const progressPercent = App.vestedAmount / App.totalVested * 100;
        $('#progress').css('width', progressPercent + '%');
        App.loading = false;
        loader.hide();
        content.show();
    },

    vestTokens: async () => {
        $('#content').hide();
        $('#loader').show();
        let numOfTokens = $('#numberOfTokens').val();
        let vestDate = $('#dateToVestUntil').val();
        vestDate = (new Date(vestDate)).getTime() / 1000;
        vestedInstance = await App.contracts.GenericERC20Vesting.deployed();
        tokenInstance = await App.contracts.GenericERC20.deployed();
        try {
            await tokenInstance.approve(vestedInstance.address, numOfTokens * (10 ** 18), { gas: 500000, from: App.account });
            await vestedInstance.despositVest(numOfTokens * (10 ** 18), vestDate, { gas: 500000, from: App.account });
        }
        catch (e) {
            console.log(e);
        }
        $('form').trigger('reset');
        $('#content').show();
        $('#loader').hide();
        return App.render();
    },

    unvestTokens: async () => {
        $('#content').hide();
        $('#loader').show();
        let numOfTokens = $('#numberOfTokens2').val();
        vestedInstance = await App.contracts.GenericERC20Vesting.deployed()
        try {
            await vestedInstance.removeVest(numOfTokens * (10 ** 18), { gas: 500000, from: App.account });
        }
        catch (e) {
            console.log(e)
        }
        $('form').trigger('reset');
        $('#content').show();
        $('#loader').hide();
        return App.render();
    }
}

$(() => {
    $(window).load(() => {
        App.init();
    })
})