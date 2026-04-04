'use client';

import {
    ArrowUpDown,
    CheckCircle,
    Clock,
    Copy,
    Download,
    ExternalLink,
    RefreshCw,
    Send,
    TrendingDown,
    TrendingUp,
    Wallet,
    XCircle,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { useLayout } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useWeb3 } from '@/hooks/useWeb3';

export default function TransactionsPage() {
    const { user } = useLayout();
    const {
        web3Config,
        userWallet,
        balance,
        formattedBalance,
        formattedAddress,
        copyAddress,
        sendTransaction,
        getTransactionStatus,
        fetchTransactionHistory,
        refreshBalance,
        isLoading: web3Loading,
        isWeb3Enabled
    } = useWeb3();

    const [activeTab, setActiveTab] = useState('overview');
    const [isSending, setIsSending] = useState(false);
    const [_isReceiving, _setIsReceiving] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [gasPrice, setGasPrice] = useState('0');

    // Send form state
    const [sendForm, setSendForm] = useState({
        toAddress: '',
        amount: '',
        note: ''
    });

    // Receive form state
    const [receiveAmount, setReceiveAmount] = useState('');

    // Fetch gas price
    const fetchGasPrice = async () => {
        try {
            const response = await fetch('/api/web3?action=gas_price');
            if (response.ok) {
                const price = await response.json();
                setGasPrice(price.toString());
            } else {
                const error = await response.json();
                console.error('Failed to fetch gas price:', error.error);
                setGasPrice('0');
            }
        } catch (error) {
            console.error('Failed to fetch gas price:', error);
            setGasPrice('0');
        }
    };

    // Fetch transaction history
    const fetchTransactions = async () => {
        setTransactionsLoading(true);
        try {
            const transactionData = await fetchTransactionHistory();
            setTransactions(transactionData);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transaction history');
        } finally {
            setTransactionsLoading(false);
        }
    };

    // Handle send transaction
    const handleSendTransaction = async (e) => {
        e.preventDefault();

        if (!sendForm.toAddress || !sendForm.amount) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (parseFloat(sendForm.amount) <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        const numericAmount = parseFloat(sendForm.amount);
        const numericBalance = parseFloat(balance);

        if (numericAmount > numericBalance) {
            toast.error(
                `Insufficient balance. Available: ${numericBalance.toFixed(6)} ${web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}`
            );
            return;
        }

        // Validate address format
        if (!sendForm.toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            toast.error('Invalid recipient address format');
            return;
        }

        setIsSending(true);
        try {
            const result = await sendTransaction(sendForm.toAddress, sendForm.amount, sendForm.note);

            if (result?.tx_hash) {
                toast.success(
                    <div>
                        <div>Transaction sent successfully!</div>
                        <div className="mt-1 font-mono text-xs">{result.tx_hash}</div>
                    </div>
                );
                setSendForm({ toAddress: '', amount: '', note: '' });
                // Refresh transaction history
                setTimeout(() => {
                    fetchTransactions();
                }, 2000);
            } else {
                toast.error('Transaction failed - no transaction hash received');
            }
        } catch (error) {
            console.error('Send transaction error:', error);
            toast.error('Failed to send transaction');
        } finally {
            setIsSending(false);
        }
    };

    // Handle refresh
    const handleRefresh = async () => {
        await Promise.all([refreshBalance(), fetchTransactions(), fetchGasPrice()]);
        toast.success('Data refreshed');
    };

    // Format transaction hash for display
    const formatHash = (hash) => {
        if (!hash) return '';
        return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    };

    // Format address for display
    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 8)}...${address.slice(-6)}`;
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'confirmed':
                return (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Confirmed
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        <XCircle className="mr-1 h-3 w-3" />
                        Failed
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Initialize data
    useEffect(() => {
        if (isWeb3Enabled && !web3Loading && userWallet) {
            fetchTransactions();
            fetchGasPrice();
        }
    }, [isWeb3Enabled, web3Loading, userWallet]);

    // Show loading or not enabled states
    if (web3Loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-3xl">Transactions</h1>
                        <p className="text-muted-foreground">Loading Web3 wallet...</p>
                    </div>
                </div>
                <div className="grid gap-6">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!isWeb3Enabled) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-3xl">Transactions</h1>
                        <p className="text-muted-foreground">Web3 functionality is not enabled</p>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Web3 Not Enabled</CardTitle>
                        <CardDescription>
                            Web3 functionality is currently disabled. Please enable it in System Settings to use wallet
                            features.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (!userWallet) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-3xl">Transactions</h1>
                        <p className="text-muted-foreground">No wallet available</p>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Wallet Not Available</CardTitle>
                        <CardDescription>
                            Unable to load or create wallet. Please try refreshing the page.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="space-y-6">
                <AdminHeader title="Transactions" description="Manage your cryptocurrency transactions">
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </AdminHeader>

                {/* Wallet Overview */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Wallet Balance</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">
                                {formattedBalance} {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                            </div>
                            <p className="mt-1 text-muted-foreground text-xs">
                                Address: {formattedAddress}
                                <button onClick={copyAddress} className="ml-2 hover:text-foreground">
                                    <Copy className="inline h-3 w-3" />
                                </button>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Network</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{web3Config?.WEB3_NETWORK_NAME}</div>
                            <p className="mt-1 text-muted-foreground text-xs">Gas Price: {gasPrice} Gwei</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Total Transactions</CardTitle>
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{transactions.length}</div>
                            <p className="mt-1 text-muted-foreground text-xs">
                                {transactions.filter((tx) => tx.status === 'pending').length} pending
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="send" className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Send
                        </TabsTrigger>
                        <TabsTrigger value="receive" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Receive
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>View all your cryptocurrency transactions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {transactionsLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-16" />
                                        ))}
                                    </div>
                                ) : transactions.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Hash</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Address</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((tx) => (
                                                <TableRow key={tx.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {tx.type === 'sent' ? (
                                                                <TrendingUp className="h-4 w-4 text-red-500" />
                                                            ) : (
                                                                <TrendingDown className="h-4 w-4 text-green-500" />
                                                            )}
                                                            <span className="capitalize">{tx.type}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="rounded bg-muted px-2 py-1 text-xs">
                                                            {formatHash(tx.hash)}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={
                                                                tx.type === 'sent' ? 'text-red-500' : 'text-green-500'
                                                            }>
                                                            {tx.type === 'sent' ? '-' : '+'}
                                                            {tx.amount} {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs">
                                                            {formatAddress(
                                                                tx.type === 'sent' ? tx.toAddress : tx.fromAddress
                                                            )}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {formatTimestamp(tx.timestamp)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                window.open(
                                                                    `https://etherscan.io/tx/${tx.hash}`,
                                                                    '_blank'
                                                                )
                                                            }>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="py-8 text-center text-muted-foreground">No transactions found</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="send" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Send Cryptocurrency</CardTitle>
                                <CardDescription>
                                    Send {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'} to another wallet address
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendTransaction} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="toAddress">Recipient Address *</Label>
                                        <Input
                                            id="toAddress"
                                            placeholder="0x..."
                                            value={sendForm.toAddress}
                                            onChange={(e) =>
                                                setSendForm((prev) => ({ ...prev, toAddress: e.target.value }))
                                            }
                                            required
                                            disabled={isSending}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount *</Label>
                                        <div className="relative">
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.000001"
                                                placeholder="0.0"
                                                value={sendForm.amount}
                                                onChange={(e) =>
                                                    setSendForm((prev) => ({ ...prev, amount: e.target.value }))
                                                }
                                                required
                                                disabled={isSending}
                                            />
                                            <div className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground text-sm">
                                                {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground text-xs">
                                            <span>
                                                Available: {formattedBalance}{' '}
                                                {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                            </span>
                                            {sendForm.amount && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSendForm((prev) => ({ ...prev, amount: balance }))
                                                    }
                                                    className="text-primary hover:underline">
                                                    Max
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="note">Note (Optional)</Label>
                                        <Textarea
                                            id="note"
                                            placeholder="Add a note for this transaction..."
                                            value={sendForm.note}
                                            onChange={(e) => setSendForm((prev) => ({ ...prev, note: e.target.value }))}
                                            disabled={isSending}
                                            rows={3}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between text-sm">
                                        <span>Estimated Gas Fee:</span>
                                        <span>{gasPrice} Gwei</span>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSending || !sendForm.toAddress || !sendForm.amount}>
                                        {isSending ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2"></div>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Send Transaction
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="receive" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Receive Cryptocurrency</CardTitle>
                                <CardDescription>Share your wallet address to receive payments</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Your Wallet Address</Label>
                                    <div className="flex gap-2">
                                        <Input value={userWallet.address} readOnly className="font-mono text-sm" />
                                        <Button onClick={copyAddress} variant="outline" size="sm">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="receiveAmount">Expected Amount (Optional)</Label>
                                    <div className="relative">
                                        <Input
                                            id="receiveAmount"
                                            type="number"
                                            step="0.000001"
                                            placeholder="0.0"
                                            value={receiveAmount}
                                            onChange={(e) => setReceiveAmount(e.target.value)}
                                        />
                                        <div className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground text-sm">
                                            {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-muted p-4">
                                    <h4 className="mb-2 font-medium">Payment Instructions</h4>
                                    <ul className="space-y-1 text-muted-foreground text-sm">
                                        <li>• Send {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'} to the address above</li>
                                        <li>• Make sure to use the correct network: {web3Config?.WEB3_NETWORK_NAME}</li>
                                        <li>• Transactions are usually confirmed within a few minutes</li>
                                        {receiveAmount && (
                                            <li>
                                                • Expected amount: {receiveAmount}{' '}
                                                {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </ScrollArea>
    );
}
