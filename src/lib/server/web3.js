// @/lib/server/web3.js

'use server';

import Web3 from 'web3';
import DBService from '@/data/rest.db.js';

let cachedConfig = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load Web3 configuration from database
export const loadWeb3Config = async () => {
    try {
        // Check cache first
        if (cachedConfig && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
            return cachedConfig;
        }

        const settingsData = await DBService.readAll('site_settings');

        if (!settingsData || Object.keys(settingsData).length === 0) {
            console.log('No site settings found, using default Web3 config');
            cachedConfig = {
                WEB3_ACTIVE: false,
                WEB3_CONTRACT_ADDRESS: '',
                WEB3_CONTRACT_SYMBOL: '',
                WEB3_CHAIN_SYMBOL: '',
                WEB3_INFURA_RPC: '',
                WEB3_CHAIN_ID: 1,
                WEB3_NETWORK_NAME: 'Ethereum Mainnet'
            };
        } else {
            // Get the first settings record
            const settings = Object.values(settingsData)[0];
            const web3Config = settings.web3 || {};

            cachedConfig = {
                WEB3_ACTIVE: web3Config.active || false,
                WEB3_CONTRACT_ADDRESS: web3Config.contractAddress || '',
                WEB3_CONTRACT_SYMBOL: web3Config.contractSymbol || '',
                WEB3_CHAIN_SYMBOL: web3Config.chainSymbol || '',
                WEB3_INFURA_RPC: web3Config.infuraRpc || '',
                WEB3_CHAIN_ID: web3Config.chainId || 1,
                WEB3_NETWORK_NAME: web3Config.networkName || 'Ethereum Mainnet'
            };
        }

        cacheTime = Date.now();
        return cachedConfig;
    } catch (error) {
        console.error('Error loading Web3 config from database:', error);
        // Return default config on error
        return {
            WEB3_ACTIVE: false,
            WEB3_CONTRACT_ADDRESS: '',
            WEB3_CONTRACT_SYMBOL: '',
            WEB3_CHAIN_SYMBOL: '',
            WEB3_INFURA_RPC: '',
            WEB3_CHAIN_ID: 1,
            WEB3_NETWORK_NAME: 'Ethereum Mainnet'
        };
    }
};

// Clear cache when config changes
export const clearWeb3ConfigCache = async () => {
    cachedConfig = null;
    cacheTime = null;
};

// Get Web3 instance
let web3Instance = null;
const getWeb3Instance = async () => {
    const config = await loadWeb3Config();

    if (!config.WEB3_ACTIVE || !config.WEB3_INFURA_RPC) {
        return null;
    }

    if (!web3Instance || web3Instance.currentProvider.host !== config.WEB3_INFURA_RPC) {
        web3Instance = new Web3(new Web3.providers.HttpProvider(config.WEB3_INFURA_RPC));
    }

    return web3Instance;
};

const balanceOfABI = [
    {
        constant: true,
        inputs: [
            {
                name: '_owner',
                type: 'address'
            }
        ],
        name: 'balanceOf',
        outputs: [
            {
                name: 'balance',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    }
];

const transferABI = [
    {
        constant: false,
        inputs: [
            {
                name: '_to',
                type: 'address'
            },
            {
                name: '_value',
                type: 'uint256'
            }
        ],
        name: 'transfer',
        outputs: [
            {
                name: '',
                type: 'bool'
            }
        ],
        type: 'function'
    }
];

export const validateWallet = async (address) => {
    try {
        const web3 = await getWeb3Instance();
        if (!web3) {
            return { success: false, error: 'Web3 not available - please check RPC configuration' };
        }
        const isValid = web3.utils.isAddress(address);
        return { success: true, isValid };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
export const getGasPrice = async () => {
    try {
        const web3 = await getWeb3Instance();
        if (!web3) {
            return { success: false, error: 'Web3 not available - please check RPC configuration' };
        }

        const gasPrice = await web3.eth.getGasPrice();
        const gweiPrice = web3.utils.fromWei(gasPrice, 'gwei');
        return {
            success: true,
            gasPrice: parseFloat(gweiPrice).toFixed(2),
            gasPriceWei: gasPrice
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
export const createWallet = async () => {
    try {
        const web3 = await getWeb3Instance();
        if (!web3) {
            return { success: false, error: 'Web3 not available - please check RPC configuration' };
        }

        const wallet = web3.eth.accounts.create();
        return {
            success: true,
            address: wallet.address,
            privateKey: wallet.privateKey
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
export const getTxStatus = async (hash) => {
    try {
        const web3 = await getWeb3Instance();
        if (!web3) {
            return { success: false, error: 'Web3 not available - please check RPC configuration' };
        }

        // Get transaction receipt
        const receipt = await web3.eth.getTransactionReceipt(hash);

        if (receipt) {
            return {
                success: true,
                receipt,
                status: receipt.status ? 'confirmed' : 'failed',
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                transactionHash: receipt.transactionHash
            };
        } else {
            // Check if transaction exists but not mined yet
            const tx = await web3.eth.getTransaction(hash);
            if (tx) {
                return {
                    success: true,
                    status: 'pending',
                    transaction: tx
                };
            } else {
                return { success: false, error: 'Transaction not found' };
            }
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
};
export const sendTransaction = async (
    amountToSend,
    destinationAddress,
    tokenHolder,
    holderSecretKey,
    inChain = false,
    _txType = 'transfer'
) => {
    try {
        const web3 = await getWeb3Instance();
        const config = await loadWeb3Config();

        if (!web3) {
            return { success: false, error: 'Web3 not available - please check RPC configuration' };
        }

        // Validate inputs
        if (!amountToSend || !destinationAddress || !tokenHolder || !holderSecretKey) {
            return { success: false, error: 'Missing required parameters' };
        }

        const amountInWei = web3.utils.toWei(amountToSend.toString(), 'ether');
        const nonce = await web3.eth.getTransactionCount(tokenHolder);
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 200000;

        let params = {};

        if (inChain) {
            // Native currency transaction
            params = {
                to: destinationAddress,
                value: amountInWei,
                nonce: web3.utils.toHex(nonce),
                gasPrice: web3.utils.toHex(gasPrice),
                gas: web3.utils.toHex(gasLimit)
            };
        } else {
            // ERC-20 token transaction
            const tokenContract = config.WEB3_CONTRACT_ADDRESS;
            if (!tokenContract) {
                return { success: false, error: 'Token contract address not configured' };
            }

            const web3contract = new web3.eth.Contract(transferABI, tokenContract, { from: tokenHolder });

            params = {
                from: tokenHolder,
                to: tokenContract,
                nonce: web3.utils.toHex(nonce),
                value: '0x00',
                data: web3contract.methods.transfer(destinationAddress, amountInWei).encodeABI(),
                gasPrice: web3.utils.toHex(gasPrice),
                gasLimit: web3.utils.toHex(gasLimit)
            };
        }

        const signedTx = await web3.eth.accounts.signTransaction(params, holderSecretKey);

        let transactionHash = '';
        const receipt = await web3.eth
            .sendSignedTransaction(signedTx.rawTransaction)
            .once('transactionHash', async (txHash) => {
                transactionHash = txHash;
            })
            .on('error', (error) => {
                console.log('Transaction error:', error);
            });

        // Update balance after transaction
        setTimeout(() => {
            getTokenBalance(tokenHolder, inChain);
        }, 1000);

        return {
            success: true,
            tx_hash: transactionHash,
            block: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            status: receipt.status ? 'confirmed' : 'failed'
        };
    } catch (error) {
        console.error('Transaction failed:', error);
        return { success: false, error: error.message };
    }
};

export const getTokenBalance = async (tokenHolder, chain = false) => {
    try {
        const web3 = await getWeb3Instance();
        const config = await loadWeb3Config();

        if (!web3) {
            return { success: false, error: 'Web3 not available - please check RPC configuration' };
        }

        if (!tokenHolder) {
            return { success: false, error: 'Token holder address is required' };
        }

        let balance;
        let symbol;

        if (chain) {
            // Get native chain token balance (ETH, BNB, etc.)
            balance = await web3.eth.getBalance(tokenHolder);
            symbol = config.WEB3_CHAIN_SYMBOL || 'ETH';
        } else {
            // Get ERC-20 token balance
            const tokenContract = config.WEB3_CONTRACT_ADDRESS;
            if (!tokenContract) {
                return { success: false, error: 'Token contract address not configured' };
            }

            const contract = new web3.eth.Contract(balanceOfABI, tokenContract);
            balance = await contract.methods.balanceOf(tokenHolder).call();
            symbol = config.WEB3_CONTRACT_SYMBOL || 'TOKEN';
        }

        const formattedBalance = parseFloat(web3.utils.fromWei(balance, 'ether'));

        return {
            success: true,
            balance: formattedBalance.toFixed(6),
            balanceWei: balance,
            symbol: symbol,
            address: tokenHolder
        };
    } catch (error) {
        console.error('Failed to fetch balance:', error);
        return { success: false, error: error.message };
    }
};
