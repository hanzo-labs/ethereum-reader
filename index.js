var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        // Import the Bloomfilter
        var { BloomFilter } = require('bloomfilter');
        // Initialize the Bloomfilter for a 1*10^-6 error rate for 1 million entries)
        var bloom = new BloomFilter(4096 * 4096 * 2, 20);
        // Imports the Google Cloud client library
        var Datastore = require('@google-cloud/datastore');
        // Your Google Cloud Platform project ID
        var projectId = 'YOUR_PROJECT_ID';
        // Instantiates a client
        var datastore = Datastore({
            projectId: 'crowdstart-us',
            namespace: '_blockchains'
        });
        process.env.ENVIRONMENT = 'production';
        // Determine ethereum network
        var network = (process.env.ENVIRONMENT == 'production') ? 'ethereum' : 'ethereum-ropsten';
        // Determine geth/parity node URI
        var nodeURI = (process.env.ENVIRONMENT == 'production') ? 'http://35.202.166.74:80' : 'http://35.192.74.139:80';
        // Query all the blockaddresses
        var query = datastore.createQuery('blockaddress').filter('Type', '=', network);
        console.log('Start Getting Block Addresses');
        // Get all the results
        var [results, qInfo] = (yield datastore.runQuery(query));
        console.log(`Found ${results.length} Block Addresses`);
        console.log('Initializing Bloom Filter');
        // Start building the bloom filter from the results
        for (var result of results) {
            console.log(`Adding BlockAddress ${JSON.stringify(result)} to Bloom Filter`);
            bloom.add(result.Address);
        }
        // Import Web3
        var Web3 = require('web3');
        console.log('Connecting to', nodeURI);
        var web3 = new Web3(new Web3.providers.HttpProvider(nodeURI, 5000));
        if (web3.isConnected()) {
            console.log('Could Not Connected');
            return;
        }
        console.log('Connected');
        console.log('Start Watching For New Blocks');
        // Start watching for new blocks
        var filter = web3.eth.filter('latest');
        filter.watch(function (error, result) {
            if (error) {
                console.log("Error While Watching Blocks", error);
                return;
            }
            console.log("New Block", JSON.stringify(result));
        });
    });
})();
//# sourceMappingURL=index.js.map