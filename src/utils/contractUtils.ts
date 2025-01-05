import Web3 from 'web3';

const MASTER_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "getAssetCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_assetType", "type": "string"}],
    "name": "createAsset",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const MASTER_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual contract address

export const initializeMasterContract = async (web3: Web3) => {
  try {
    const contract = new web3.eth.Contract(MASTER_CONTRACT_ABI as any, MASTER_CONTRACT_ADDRESS);
    const assetCount = await contract.methods.getAssetCount().call();
    console.log('Current asset count:', assetCount);
    return contract;
  } catch (error) {
    console.error('Error initializing master contract:', error);
    return null;
  }
};

export const createNewAsset = async (contract: any, assetType: string, account: string) => {
  try {
    const result = await contract.methods.createAsset(assetType).send({ from: account });
    console.log('Asset created:', result);
    return result;
  } catch (error) {
    console.error('Error creating asset:', error);
    return null;
  }
};