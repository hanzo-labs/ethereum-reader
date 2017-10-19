declare var axios: any;
declare var moment: any;
declare var rfc3339: string;
declare var blockAddressQueriedAt: string;
declare var ethereumWebhook: string;
declare var ethereumWebhookPassword: string;
declare function updateBloom(bloom: any, datastore: any, network: any): Promise<void>;
declare function toDatastoreArray(array: any, type: any): {
    values: any;
};
declare function saveReadingBlock(datastore: any, network: any, result: any): any[];
declare function updatePendingBlock(datastore: any, data: any): any;
declare function getAndUpdateConfirmedBlock(datastore: any, network: any, number: any, confirmations: any): any;
declare function savePendingBlockTransaction(datastore: any, transaction: any, network: any, address: any, usage: any): any;
declare function getAndUpdateConfirmedBlockTransaction(web3: any, datastore: any, network: any, number: any, confirmations: any): any;
declare var BloomFilter: any;
declare var Datastore: any;
declare var confirmations: string | number;
declare function main(): Promise<void>;
