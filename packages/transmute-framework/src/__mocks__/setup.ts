import { getDefaultRelic } from './getRelic'

import {
  W3,
  Relic,
  TransmuteContracts,
  EventStoreAdapter,
  Factory,
  Store,
  EventStore,
  EventStoreFactory
} from '../transmute-framework'

const bs58 = require('bs58')
const util = require('ethereumjs-util')

let ipfsAdapter = require('../../../transmute-adapter-ipfs')
let nodeStorageAdapter = require('../../../transmute-adapter-node-storage')

let nodeStorageDB = nodeStorageAdapter.getStorage()
let ipfs = ipfsAdapter.getStorage()

const Storage = require('node-storage')

const db = new Storage('./read_model_storage')

const nodeStorageReadModelAdapter: any = {
  getItem: (id: string) => {
    return JSON.parse(db.get(id))
  },
  setItem: (id: string, value: any) => {
    return db.put(id, JSON.stringify(value))
  }
}

const eventStoreAdapter = new EventStoreAdapter({
  I: {
    keyName: 'multihash',
    adapter: ipfsAdapter,
    db: ipfs,
    readIDFromBytes32: (bytes32: string) => {
      return bs58.encode(new Buffer('1220' + bytes32.slice(2), 'hex'))
    },
    writeIDToBytes32: (id: string) => {
      return '0x' + new Buffer(bs58.decode(id).slice(2)).toString('hex')
    }
  },
  N: {
    keyName: 'sha1',
    adapter: nodeStorageAdapter,
    db: nodeStorageDB,
    readIDFromBytes32: (bytes32: string) => {
      return util.toAscii(bytes32).replace(/\u0000/g, '')
    },
    writeIDToBytes32: (id: string) => {
      return id
    }
  }
})

export const getSetupAsync = async () => {
  const { relic } = getDefaultRelic()

  const accounts = await relic.getAccounts()

  let factoryInstances = {
    default: await Factory.create(relic.web3, accounts[0])
  }

  let storeInstances = {
    default: await Factory.createStore(
      factoryInstances.default,
      accounts.slice(0, 5),
      eventStoreAdapter,
      relic.web3,
      accounts[0]
    )
  }

  return {
    relic,
    eventStoreAdapter,
    accounts,
    store: storeInstances.default,
    factory: factoryInstances.default,
    nodeStorageReadModelAdapter
  }
}
