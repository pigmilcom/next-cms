'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSettings } from '@/context/providers';
import {
    createWallet,
    getTokenBalance,
    getTxStatus,
    sendTransaction as sendWeb3Transaction
} from '@/lib/server/web3.js';

export const useWeb3 = () => {
    const { siteSettings } = useSettings();
    const [web3Config, setWeb3Config] = useState(null);
    const [userWallet, setUserWallet] = useState(null);
    const [balance, setBalance] = useState('0');
    const [isLoading, setIsLoading] = useState(true);
    const [isWeb3Enabled, setIsWeb3Enabled] = useState(false);

    // Get Web3 configuration from settings context
    const fetchWeb3Config = useCallback(() => {
        if (!siteSettings) return null;

        const config = {
            WEB3_ACTIVE: siteSettings.web3Active || false,
            WEB3_CONTRACT_ADDRESS: siteSettings.web3ContractAddress || '',
            WEB3_CONTRACT_SYMBOL: siteSettings.web3ContractSymbol || '',
            WEB3_CHAIN_SYMBOL: siteSettings.web3ChainSymbol || '',
            WEB3_INFURA_RPC: siteSettings.web3InfuraRpc || '',
            WEB3_CHAIN_ID: siteSettings.web3ChainId || 1,
            WEB3_NETWORK_NAME: siteSettings.web3NetworkName || 'Ethereum Mainnet'
        };

        setWeb3Config(config);
        setIsWeb3Enabled(config.WEB3_ACTIVE);
        return config;
    }, [siteSettings]);

    // Get or create user wallet
    const initializeWallet = useCallback(async () => {
        try {
            // Check if user has stored wallet data
            const storedWallet = localStorage.getItem('user_wallet');
            if (storedWallet) {
                const wallet = JSON.parse(storedWallet);
                setUserWallet(wallet);
                await fetchBalance(wallet.address);
                return wallet;
            }

            // If no wallet exists, create one
            const result = await createWallet();

            if (result.success) {
                const newWallet = {
                    address: result.address,
                    privateKey: result.privateKey
                };
                // Store wallet securely (in production, you'd want better security)
                localStorage.setItem('user_wallet', JSON.stringify(newWallet));
                setUserWallet(newWallet);
                await fetchBalance(newWallet.address);
                return newWallet;
            } else {
                console.error('Failed to create wallet:', result.error);
                toast.error('Failed to create Web3 wallet');
            }
        } catch (error) {
            console.error('Failed to initialize wallet:', error);
            toast.error('Failed to initialize Web3 wallet');
        }
        return null;
    }, []);

    // Fetch wallet balance
    const fetchBalance = useCallback(async (address) => {
        if (!address) return '0';

        try {
            const result = await getTokenBalance(address, false);
            if (result.success) {
                const balanceStr = result.balance.toString();
                setBalance(balanceStr);
                return balanceStr;
            } else {
                console.error('Failed to fetch balance:', result.error);
                // Don't show toast for balance errors as they happen frequently
                setBalance('0');
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            setBalance('0');
        }
        return '0';
    }, []);

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        if (userWallet?.address) {
            await fetchBalance(userWallet.address);
        }
    }, [userWallet?.address, fetchBalance]);

    // Send transaction
    const sendTransaction = useCallback(
        async (toAddress, amount, note = '') => {
            if (!userWallet) {
                toast.error('No wallet available');
                return null;
            }

            try {
                const result = await sendWeb3Transaction(
                    parseFloat(amount),
                    toAddress,
                    userWallet.address,
                    userWallet.privateKey,
                    false,
                    'transfer'
                );

                if (result.success) {
                    if (!result.tx_hash) {
                        toast.error('Transaction failed - no transaction hash received');
                        return null;
                    }

                    // Save transaction record to database
                    try {
                        const dbResponse = await fetch('/api/query/transactions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                hash: result.tx_hash,
                                type: 'sent',
                                amount: amount.toString(),
                                toAddress: toAddress,
                                fromAddress: userWallet.address,
                                status: 'pending',
                                note: note,
                                gasUsed: result.gasUsed?.toString() || '21000',
                                gasPrice: '0' // Will be updated when transaction is confirmed
                            })
                        });

                        if (!dbResponse.ok) {
                            const dbError = await dbResponse.json();
                            console.error('Failed to save transaction record:', dbError.error);
                        }
                    } catch (dbError) {
                        console.error('Failed to save transaction record:', dbError);
                        // Don't fail the transaction if DB save fails
                    }

                    // Refresh balance after transaction
                    setTimeout(() => refreshBalance(), 2000);
                    return result;
                } else {
                    toast.error(result.error || 'Transaction failed');
                    return null;
                }
            } catch (error) {
                console.error('Transaction failed:', error);
                toast.error('Transaction failed');
                return null;
            }
        },
        [userWallet, refreshBalance]
    );

    // Get transaction status
    const getTransactionStatus = useCallback(async (txHash) => {
        try {
            const result = await getTxStatus(txHash);
            if (result.success) {
                return result;
            } else {
                console.error('Failed to get transaction status:', result.error);
            }
        } catch (error) {
            console.error('Failed to get transaction status:', error);
        }
        return null;
    }, []);

    // Fetch transaction history
    const fetchTransactionHistory = useCallback(async (page = 1, limit = 50) => {
        try {
            const response = await fetch(`/api/query/transactions?page=${page}&limit=${limit}`);
            if (response.ok) {
                const result = await response.json();
                return result.data || [];
            }
        } catch (error) {
            console.error('Failed to fetch transaction history:', error);
        }
        return [];
    }, []);

    // Update transaction status
    const updateTransactionStatus = useCallback(async (hash, status) => {
        try {
            const response = await fetch('/api/query/transactions', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hash: hash,
                    status: status
                })
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to update transaction status:', error);
            return false;
        }
    }, []);

    // Copy address to clipboard
    const copyAddress = useCallback(async () => {
        if (userWallet?.address) {
            try {
                await navigator.clipboard.writeText(userWallet.address);
                toast.success('Address copied to clipboard');
            } catch (_error) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = userWallet.address;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    toast.success('Address copied to clipboard');
                } catch (_err) {
                    toast.error('Failed to copy address');
                }
                document.body.removeChild(textArea);
            }
        }
    }, [userWallet?.address]);

    // Format balance for display
    const formatBalance = useCallback(
        (balanceValue = balance) => {
            const num = parseFloat(balanceValue);
            if (num >= 1000000) {
                return `${(num / 1000000).toFixed(2)}M`;
            } else if (num >= 1000) {
                return `${(num / 1000).toFixed(2)}K`;
            } else if (num >= 1) {
                return num.toFixed(4);
            } else {
                return num.toFixed(6);
            }
        },
        [balance]
    );

    // Format address for display
    const formatAddress = useCallback(
        (address = userWallet?.address) => {
            if (!address) return '';
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        },
        [userWallet?.address]
    );

    // Initialize Web3 when component mounts
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            const config = fetchWeb3Config();

            if (config?.WEB3_ACTIVE) {
                await initializeWallet();
            }

            setIsLoading(false);
        };

        if (siteSettings) {
            initialize();
        }
    }, [siteSettings, fetchWeb3Config, initializeWallet]);

    return {
        // State
        web3Config,
        userWallet,
        balance,
        isLoading,
        isWeb3Enabled,

        // Methods
        fetchBalance,
        refreshBalance,
        sendTransaction,
        getTransactionStatus,
        fetchTransactionHistory,
        updateTransactionStatus,
        copyAddress,
        formatBalance,
        formatAddress,

        // Computed values
        formattedBalance: formatBalance(),
        formattedAddress: formatAddress()
    };
};

// Hook for Web3 settings only (lighter weight)
export const useWeb3Settings = () => {
    const { siteSettings } = useSettings();
    const [isWeb3Enabled, setIsWeb3Enabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (siteSettings) {
            setIsWeb3Enabled(siteSettings.web3Active || false);
            setIsLoading(false);
        }
    }, [siteSettings]);

    return {
        isWeb3Enabled,
        isLoading
    };
};
