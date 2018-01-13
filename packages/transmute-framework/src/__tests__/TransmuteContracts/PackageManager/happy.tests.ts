import * as TransmuteCrypto from "transmute-crypto";
import {
  W3,
  Relic,
  Utils,
  Store,
  EventStoreAdapter,
  PackageManager,
  InternalEventTypes,
  EventTransformer,
  IFSA
} from "../../../transmute-framework";

const RPC_HOST = "http://localhost:8545";

const generateTestWallets = async (num: number) => {
  const sodium = await TransmuteCrypto.getSodium();
  let testWallets: any = [];
  for (let i = 0; i < num; i++) {
    const alice = sodium.crypto_box_keypair();
    const unPrefixedPrivateKeyHexString = sodium.to_hex(alice.privateKey);
    let address = Utils.privateKeyHexToAddress("0x" + unPrefixedPrivateKeyHexString);
    testWallets.push({
      address: "0x" + sodium.to_hex(address),
      privateKey: "0x" + unPrefixedPrivateKeyHexString
    });
  }
  return testWallets;
};

const sleep = (seconds: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, seconds * 1000);
  });
};

const Storage = require("node-storage");

const bs58 = require("bs58");

const ipfsAdapter = require("transmute-adapter-ipfs");
const nodeStorageAdapter = require("transmute-adapter-node-storage");

let ipfs = ipfsAdapter.getStorage();

const db = new Storage("./read_model_storage");
const nodeStorageDB = nodeStorageAdapter.getStorage();

const readModelAdapter = {
  getItem: id => {
    return JSON.parse(db.get(id));
  },
  setItem: (id, value) => {
    return db.put(id, JSON.stringify(value));
  }
};

const eventStoreAdapter = new EventStoreAdapter({
  I: {
    keyName: "multihash",
    adapter: ipfsAdapter,
    db: ipfs,
    readIDFromBytes32: bytes32 => {
      return bs58.encode(new Buffer("1220" + bytes32.slice(2), "hex"));
    },
    writeIDToBytes32: id => {
      return "0x" + new Buffer(bs58.decode(id).slice(2)).toString("hex");
    }
  }
});

/**
 * PackageManager spec
 */
describe("PackageManager", () => {
  const allWalletBalancesAre = async (relic, testWallets, expectedBalanceWei: number) => {
    testWallets.forEach(async wallet => {
      let bal = await relic.getBalance(wallet.address);
      expect(bal).toBe(expectedBalanceWei);
    });
  };
  const fundWallets = async (relic, defaultAccount, testWallets, amountWei: number) => {
    testWallets.forEach(async wallet => {
      let txhash = await relic.sendWei(defaultAccount, wallet.address, amountWei);
      expect(txhash).toBeDefined();
    });
  };

  test("happy path", async () => {
    let relic = new Relic({
      providerUrl: RPC_HOST
    });
    // create and fund some local wallets
    let defaultAccount = (await relic.getAccounts())[0];
    let testWallets = await generateTestWallets(3);
    await allWalletBalancesAre(relic, testWallets, 0);
    await fundWallets(relic, defaultAccount, testWallets, 150000000000000000);
    await sleep(2);
    await allWalletBalancesAre(relic, testWallets, 150000000000000000);
    let firstWallet = testWallets[0].privateKey.replace("0x", "");
    const wallet = TransmuteCrypto.getWalletFromPrivateKey(firstWallet);

    // initialize relic with a local (funded) wallet
    relic = new Relic({
      providerUrl: RPC_HOST,
      wallet
    });
    let accounts = await relic.getAccounts();
    expect(accounts.length).toBe(1);
    W3.Default = relic.web3;

    // create a new package manager contract
    let newPM = await PackageManager.New(W3.TC.txParamsDefaultDeploy(testWallets[0].address), {
      _multisig: testWallets[0].address
    });

    // ensure the wallet is the owner of the contract
    let pmOwner = await newPM.owner();
    expect(pmOwner).toBe(testWallets[0].address);

    let localWallets = testWallets.map(wallet => {
      return wallet.address;
    });

    // set the package manager whitelist
    let reciept = await newPM.setWhitelist(
      localWallets,
      W3.TC.txParamsDefaultDeploy(testWallets[0].address)
    );
    let events = EventTransformer.getFSAsFromReceipt(reciept);
    // console.log(reciept)
    // console.log(events)

    // the white list has been set to the local wallets.
    let pmWhitelist = await newPM.getWhitelist();
    expect(pmWhitelist).toEqual(localWallets);
    // console.log(pmWhitelist)
    // console.log("newPM: ", newPM);

    // a white listed wallet can write a publish event
    let event = await Store.writeFSA(newPM, eventStoreAdapter, relic.web3, pmOwner, {
      type: "PACKAGE_PUBLISHED",
      payload: {
        name: "foo",
        version: "0.0.1",
        hash: ""
      },
      meta: {
        adapter: "I"
      }
    });
    // console.log('what is event: ', event)



  });
});
