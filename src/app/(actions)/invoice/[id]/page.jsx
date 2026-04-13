// @/app/(actions)/invoice/[id]/page.jsx (Public Invoice View)

import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/server/orders.js';
import { getSettings } from '@/lib/server/settings.js';

export const revalidate = 0;

export const metadata = {
    title: 'Invoice',
    description: 'Public invoice view',
    robots: {
        index: false,
        follow: false
    }
};

const decodeInvoiceId = (encodedId = '') => {
    try {
        const normalized = String(encodedId || '')
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
        return Buffer.from(padded, 'base64').toString('utf-8');
    } catch {
        return '';
    }
};

const parseJSON = (data, fallback = {}) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch {
        return fallback;
    }
};

const formatCurrency = (value, currency = 'EUR') => {
    const amount = parseFloat(value || 0) || 0;
    const locale = currency === 'EUR' ? 'fr-FR' : currency === 'USD' ? 'en-US' : 'en-GB';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: String(currency || 'EUR').toUpperCase()
    }).format(amount);
};

const formatDate = (value) => {
    if (!value) return new Date().toLocaleDateString();
    return new Date(value).toLocaleDateString();
};

const InvoicePage = async ({ params }) => {
    const { id: encodedId } = await params;

    if (!encodedId) {
        notFound();
    }

    const orderId = decodeInvoiceId(encodedId);
    if (!orderId || !orderId.startsWith('ORD')) {
        notFound();
    }

    const [orderResult, settings] = await Promise.all([getOrder(orderId), getSettings()]);

    const locale = settings?.siteSettings?.language || 'pt';
    const translations = await import(`@/locale/messages/${locale}/Invoice.json`).then((mod) => mod.default.Invoice);
    const t = (key) => {
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }
        return value;
    };

    if (!orderResult?.success || !orderResult.data) {
        notFound();
    }

    const order = orderResult.data;
    const customer = parseJSON(order.customer, {});
    const shippingAddress = parseJSON(order.shippingAddress || order.shipping_address, customer);
    const items = parseJSON(order.items, []);

    const customerName =
        `${customer.firstName || shippingAddress.firstName || ''} ${customer.lastName || shippingAddress.lastName || ''}`.trim() ||
        order.cst_name ||
        'Customer';

    const businessName = settings?.storeSettings?.businessName || settings?.siteSettings?.siteName || 'Store';
    const businessAddress = settings?.storeSettings?.address || settings?.siteSettings?.businessAddress || '';
    const businessEmail = settings?.siteSettings?.siteEmail || '';
    const businessPhone = settings?.siteSettings?.sitePhone || '';
    const currency = order.currency || settings?.storeSettings?.currency || 'EUR';

    const subtotal = parseFloat(order.subtotal || 0) || 0;
    const shippingCost = parseFloat(order.shippingCost || order.shipping || 0) || 0;
    const vatAmount = parseFloat(order.vatAmount || 0) || 0;
    const discountAmount = parseFloat(order.discountAmount || 0) || 0;
    const total = parseFloat(order.finalTotal || order.total || order.amount || 0) || 0;

    return (
        <main className='min-h-screen bg-neutral-50 py-8'>
            <div className='mx-auto w-full max-w-4xl px-4'>
                <div className='mb-4 flex items-center justify-between'>
                    <h1 className='text-2xl font-semibold text-neutral-900'>{t('invoiceTitle')}</h1>
                    <span className='rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white'>Printable View</span>
                </div>

                <section className='rounded-xl border border-neutral-200 bg-white p-6 shadow-sm'>
                    <div className='grid gap-8 md:grid-cols-2'>
                        <div>
                            <p className='text-sm text-neutral-500'>From</p>
                            <p className='mt-1 text-lg font-semibold text-neutral-900'>{businessName}</p>
                            {businessAddress ? <p className='mt-1 text-sm text-neutral-700'>{businessAddress}</p> : null}
                            {businessEmail ? <p className='text-sm text-neutral-700'>{businessEmail}</p> : null}
                            {businessPhone ? <p className='text-sm text-neutral-700'>{businessPhone}</p> : null}
                        </div>

                        <div className='text-left md:text-right'>
                            <p className='text-sm text-neutral-500'>{t('orderId')}</p>
                            <p className='mt-1 text-base font-semibold text-neutral-900'>{order.id || order.orderId || orderId}</p>
                            <p className='mt-2 text-sm text-neutral-500'>{t('invoiceDate')}</p>
                            <p className='text-sm text-neutral-700'>{formatDate(order.createdAt || order.created_at || order.orderDate)}</p>
                        </div>
                    </div>

                    <div className='mt-8 border-t border-neutral-200 pt-6'>
                        <p className='text-sm text-neutral-500'>{t('billTo')}</p>
                        <p className='mt-1 text-base font-semibold text-neutral-900'>{customerName}</p>
                        {customer.email || shippingAddress.email || order.cst_email ? (
                            <p className='text-sm text-neutral-700'>{customer.email || shippingAddress.email || order.cst_email}</p>
                        ) : null}
                        {shippingAddress.streetAddress ? <p className='text-sm text-neutral-700'>{shippingAddress.streetAddress}</p> : null}
                        {shippingAddress.city || shippingAddress.zipCode ? (
                            <p className='text-sm text-neutral-700'>
                                {shippingAddress.city || ''} {shippingAddress.zipCode || ''}
                            </p>
                        ) : null}
                        {shippingAddress.country ? <p className='text-sm text-neutral-700'>{shippingAddress.country}</p> : null}
                    </div>

                    <div className='mt-8 overflow-x-auto'>
                        <table className='w-full border-collapse text-left text-sm'>
                            <thead>
                                <tr className='border-b border-neutral-200 text-neutral-600'>
                                    <th className='py-2 font-medium'>{t('description')}</th>
                                    <th className='py-2 text-center font-medium'>{t('qty')}</th>
                                    <th className='py-2 text-right font-medium'>{t('price')}</th>
                                    <th className='py-2 text-right font-medium'>{t('total')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(items) && items.length > 0 ? (
                                    items.map((item, index) => {
                                        const qty = parseInt(item.quantity, 10) || 1;
                                        const price = parseFloat(item.price) || 0;
                                        const rowTotal = qty * price;
                                        return (
                                            <tr key={`${item.id || item.name || 'item'}-${index}`} className='border-b border-neutral-100'>
                                                <td className='py-3 text-neutral-800'>{item.name || t('item')}</td>
                                                <td className='py-3 text-center text-neutral-700'>{qty}</td>
                                                <td className='py-3 text-right text-neutral-700'>{formatCurrency(price, currency)}</td>
                                                <td className='py-3 text-right font-medium text-neutral-900'>
                                                    {formatCurrency(rowTotal, currency)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className='py-4 text-center text-neutral-500'>
                                            {t('noItemsFound')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className='mt-6 ml-auto w-full max-w-xs space-y-2 text-sm'>
                        <div className='flex items-center justify-between text-neutral-700'>
                            <span>{t('subtotal')}</span>
                            <span>{formatCurrency(subtotal, currency)}</span>
                        </div>
                        <div className='flex items-center justify-between text-neutral-700'>
                            <span>{t('shipping')}</span>
                            <span>{formatCurrency(shippingCost, currency)}</span>
                        </div>
                        {vatAmount > 0 ? (
                            <div className='flex items-center justify-between text-neutral-700'>
                                <span>{t('vat')}</span>
                                <span>{formatCurrency(vatAmount, currency)}</span>
                            </div>
                        ) : null}
                        {discountAmount > 0 ? (
                            <div className='flex items-center justify-between text-emerald-700'>
                                <span>{t('discount')}</span>
                                <span>-{formatCurrency(discountAmount, currency)}</span>
                            </div>
                        ) : null}
                        <div className='flex items-center justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900'>
                            <span>{t('total')}</span>
                            <span>{formatCurrency(total, currency)}</span>
                        </div>
                    </div>

                    <p className='mt-8 text-xs text-neutral-500'>
                        {t('invoiceDisclaimer')}
                    </p>
                </section>
            </div>
        </main>
    );
};

export default InvoicePage;
