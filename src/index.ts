'use strict'

// Import the Bloomfilter
var { BloomFilter } = require('bloomfilter')

// Imports the Google Cloud client library
var Datastore = require('@google-cloud/datastore')

// How many confirmations does it take to confirm? (default: 12)
var confirmations = process.env.CONFIRMATIONS || 12

async function main() {

  // Initialize the Bloomfilter for a 1*10^-6 error rate for 1 million entries)
  var bloom = new BloomFilter(4096 * 4096 * 2, 20)

  // Your Google Cloud Platform project ID
  var projectId = 'YOUR_PROJECT_ID'

  // Instantiates a client
  var datastore = Datastore({
    projectId: 'crowdstart-us',
    namespace: '_blockchains'
  })

  // Determine ethereum network
  var network = (process.env.ENVIRONMENT == 'production') ? 'ethereum' : 'ethereum-ropsten'

  // Determine geth/parity node URI
  var nodeURI = (process.env.ENVIRONMENT == 'production') ? 'http://35.202.166.74:80' : 'http://35.192.74.139:80'

  console.log(`Starting Reader For '${ network }' Using Node '${ nodeURI }'`)

  console.log('Initializing Bloom Filter')

  await updateBloom(bloom, datastore, network)

  // Import Web3
  var Web3 = require('web3')

  console.log('Connecting to', nodeURI)

  var web3 = new Web3(new Web3.providers.HttpProvider(nodeURI, 10000))

  // Ensure a connection was actually established
  if (!web3.isConnected()) {
    console.log('Could Not Connected')
    console.log(`Are you running 'sudo geth --cache=1024 --rpc --rpcaddr 0.0.0.0 --rpcport 80 --syncmode=fast --rpccorsdomain "*" in your geth node?'`)
    return
  }

  console.log('Connected')

  // Report current full block
  console.log('Current FullBlock Is', web3.eth.blockNumber)

  // Report Syncing Status
  var lastBlockData = {}
  web3.eth.isSyncing((isSynced, blockData) => {
    if (isSynced) {
      console.log('Syncing Complete')
      return
    }
    if (lastBlockData.currentBlock != blockData.currentBlock) {
      console.log(`Currently @ ${ blockData.currentBlock }, Syncing From ${ blockData.startingBlock } To ${ blockData.highestBlock }`)
      lastBlockData = blockData
    }
  })

  var lastBlock = undefined

  // Query to find the latest block read
  var query = datastore.createQuery('block').filter('Type', '=', network).order('EthereumBlockNumber', { descending: true }).limit(1)

  console.log('Finding Block To Resume At')

  // Get all the results
  var [results, qInfo] = (await datastore.runQuery(query))

  if (results[0]) {
    // console.log(JSON.stringify(results[0]))
    lastBlock = results[0].EthereumBlockNumber
    console.log(`Resuming From Block #${ lastBlock }`)
  } else {
    lastBlock = 'latest'
    console.log(`Resuming From 'latest'`)
  }
  console.log('Additional Query Info:\n', JSON.stringify(qInfo))

  console.log('Start Watching For New Blocks')

  // Start watching for new blocks
  var filter = web3.eth.filter({
    // 1892728
    fromBlock: lastBlock,
    toBlock:   'latest', //1892800,
  })

  var lastNumber = lastBlock == 'latest' ? web3.eth.blockNumber : lastBlock - 1

  filter.watch(async function(error, result) {
    if (error) {
      console.log('Error While Watching Blocks:\n', error)
      return
    }

    // Get currentBlockNumber
    var blockNumber = result.blockNumber

    // Cache the blockNumber
    if (lastNumber == blockNumber) {
      return
    }

    console.log(`Fetching Blocks #${ lastNumber + 1 }-#${ blockNumber }`)

    // Get all the sequential blocks because for some reason replay doesn't
    // return sequential blocks...
    for (var number = lastNumber + 1; number <= blockNumber; number++) {
      console.log(`Fetching New Block #${ number }`)

      web3.eth.getBlock(number, true, async function(error, result) {
        if (error) {
          console.log(`Error Fetching Block #${ number }:\n`, error)
          return
        }

        var [_, data, readingBlockPromise] = saveReadingBlock(datastore, network, result)

        // Iterate through transactions looking for ones we care about
        for(var transaction of result.transactions) {
          console.log(`Processing Block Transaction ${ transaction.hash }`)

          await updateBloom(bloom, datastore, network)

          var address: string
          var usage: string

          var toAddress   = transaction.to
          var fromAddress = transaction.from

          console.log(`Checking Addresses\nTo: ${ toAddress }\nFrom: ${ fromAddress }`)

          if (bloom.test(toAddress)) {
            console.log(`Sender Address ${ toAddress }`)
            address = toAddress
            usage   = 'receiver'
          } else if (bloom.test(fromAddress)) {
            console.log(`Receiver Address ${ fromAddress }`)
            address = fromAddress
            usage   = 'sender'
          } else {
            console.log(`No Watched Addresses Detected`)
            continue
          }

          // Disabled to save calls
          // Do the actual query and fetch
          // savePendingBlockTransaction(datastore, transaction, network, address, usage)
        }

        // Disabled to save calls
        // readingBlockPromise.then(()=>{
        //   return updatePendingBlock(datastore, data)
        // }).then(()=> {
        //   var confirmationBlock = result.number - confirmations
        //   return Promise.all([
        //     // getAndUpdateConfirmedBlock(
        //     //   datastore,
        //     //   network,
        //     //   confirmationBlock,
        //     //   confirmations
        //     // ),
        //     getAndUpdateConfirmedBlockTransaction(
        //       web3,
        //       datastore,
        //       network,
        //       confirmationBlock,
        //       confirmations
        //     ),
        //   ])
        // })

        // It is cheaper on calls to just update the blocktransactions instead
        readingBlockPromise.then(() => {
          var confirmationBlock = result.number - confirmations
          return getAndUpdateConfirmedBlockTransaction(
            web3,
            datastore,
            network,
            confirmationBlock,
            confirmations)
        })
      })
    }

    lastNumber = blockNumber
  })
}

main()
