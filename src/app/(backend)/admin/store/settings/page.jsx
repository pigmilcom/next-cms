// @/app/(backend)/admin/store/settings/page.jsx

'use client';

// Country data for shipping/restrictions
import { countries } from 'country-data-list';
import { Building, CreditCard, DollarSign, Globe, Package, Plus, Save, Settings, Truck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateStoreSettings } from '@/lib/server/admin';

export default function StoreSettingsPage() {
    const router = useRouter();
    const { storeSettings, siteSettings } = useAdminSettings();
    console.log(siteSettings);

    // Default form state - matches settings.js structure
    const defaultFormState = {
        businessName: storeSettings.businessName || siteSettings.siteName || '',
        tvaNumber: storeSettings.tvaNumber || '',
        address: storeSettings.address || siteSettings.businessAddress || '',
        vatEnabled: storeSettings?.vatEnabled !== false,
        vatPercentage: storeSettings?.vatPercentage || 20,
        vatIncludedInPrice: storeSettings?.vatIncludedInPrice !== false,
        paymentMethods: {
            bankTransfer: {
                enabled: storeSettings?.paymentMethods?.bankTransfer?.enabled || false,
                bankName: storeSettings?.paymentMethods?.bankTransfer?.bankName || '',
                accountHolder: storeSettings?.paymentMethods?.bankTransfer?.accountHolder || '',
                iban: storeSettings?.paymentMethods?.bankTransfer?.iban || '',
                bic: storeSettings?.paymentMethods?.bankTransfer?.bic || '',
                instructions: storeSettings?.paymentMethods?.bankTransfer?.instructions || ''
            },
            payOnDelivery: {
                enabled: storeSettings?.paymentMethods?.payOnDelivery?.enabled || false
            },
            euPago: {
                enabled: storeSettings?.paymentMethods?.euPago?.enabled || false,
                apiUrl: storeSettings?.paymentMethods?.euPago?.apiUrl || 'https://sandbox.eupago.pt/',
                apiKey: storeSettings?.paymentMethods?.euPago?.apiKey || '',
                supportedMethods: storeSettings?.paymentMethods?.euPago?.supportedMethods || ['mb', 'mbway'],
                mbwayExpiryTime: storeSettings?.paymentMethods?.euPago?.mbwayExpiryTime || 5, // minutes (fixed)
                mbExpiryTime: storeSettings?.paymentMethods?.euPago?.mbExpiryTime || 2880 // minutes (48 hours default)
            },
            stripe: {
                enabled: storeSettings?.paymentMethods?.stripe?.enabled || false,
                apiPuplicKey: storeSettings?.paymentMethods?.stripe?.apiPuplicKey || '',
                apiSecretKey: storeSettings?.paymentMethods?.stripe?.apiSecretKey || ''
            },
            sumup: {
                enabled: storeSettings?.paymentMethods?.sumup?.enabled || false,
                merchantCode: storeSettings?.paymentMethods?.sumup?.merchantCode || '', 
                apiKey: storeSettings?.paymentMethods?.sumup?.apiKey || ''
            }
        },
        freeShippingEnabled: storeSettings?.freeShippingEnabled !== false,
        freeShippingThreshold: storeSettings?.freeShippingThreshold || 50,
        freeShippingCarrier: storeSettings?.freeShippingCarrier || '',
        allowedCountries: storeSettings?.allowedCountries || [],
        bannedCountries: storeSettings?.bannedCountries || [],
        carriers: storeSettings?.carriers || [],
        currency: siteSettings?.currency || 'EUR'
    };

    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState(defaultFormState);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAllowedCountries, setSelectedAllowedCountries] = useState([]);
    const [selectedBannedCountries, setSelectedBannedCountries] = useState([]);
    const [carriers, setCarriers] = useState([]);
    const [_allowedOpen, _setAllowedOpen] = useState(false);
    const [_bannedOpen, _setBannedOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('business');
    const fetchedRef = useRef(false);
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleNestedInputChange = (parent, field, value) => {
        setFormData((prev) => {
            // Handle dot notation for deeply nested fields (e.g., 'payOnDelivery.enabled')
            if (field.includes('.')) {
                const keys = field.split('.');
                
                // Recursive function to build nested update
                const setNestedValue = (obj, keys, value) => {
                    const [firstKey, ...restKeys] = keys;
                    
                    if (restKeys.length === 0) {
                        return { ...obj, [firstKey]: value };
                    }
                    
                    return {
                        ...obj,
                        [firstKey]: setNestedValue(obj?.[firstKey] || {}, restKeys, value)
                    };
                };
                
                return {
                    ...prev,
                    [parent]: setNestedValue(prev[parent] || {}, keys, value)
                };
            }

            // Handle simple one-level nesting
            return {
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [field]: value
                }
            };
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.businessName || formData.businessName.length < 2) {
            newErrors.businessName = 'Business name is required (minimum 2 characters)';
        }

        if (formData.vatPercentage < 0 || formData.vatPercentage > 100) {
            newErrors.vatPercentage = 'VAT percentage must be between 0 and 100';
        }

        if (formData.freeShippingEnabled && (!formData.freeShippingThreshold || formData.freeShippingThreshold <= 0)) {
            newErrors.freeShippingThreshold = 'Free shipping threshold must be greater than 0';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        const fetchSettings = async () => {
            // Skip if already fetched or no settings available
            if (!storeSettings) return;
            if (fetchedRef.current) return;

            try {
                // Mark as fetched immediately to prevent race conditions
                fetchedRef.current = true;
 
                const storeSettingsData = storeSettings;

                if (storeSettingsData) {
                    setFormData({
                        businessName: storeSettingsData.businessName || '',
                        tvaNumber: storeSettingsData.tvaNumber || '',
                        address: storeSettingsData.address || '',
                        vatEnabled: storeSettingsData.vatEnabled !== false,
                        vatPercentage: storeSettingsData.vatPercentage || 20,
                        vatIncludedInPrice: storeSettingsData.vatIncludedInPrice !== false,
                        paymentMethods: {
                            bankTransfer: {
                                enabled: storeSettingsData.paymentMethods?.bankTransfer?.enabled || false,
                                bankName: storeSettingsData.paymentMethods?.bankTransfer?.bankName || '',
                                accountHolder: storeSettingsData.paymentMethods?.bankTransfer?.accountHolder || '',
                                iban: storeSettingsData.paymentMethods?.bankTransfer?.iban || '',
                                bic: storeSettingsData.paymentMethods?.bankTransfer?.bic || '',
                                instructions: storeSettingsData.paymentMethods?.bankTransfer?.instructions || ''
                            },
                            payOnDelivery: {
                                enabled: storeSettingsData.paymentMethods?.payOnDelivery?.enabled || storeSettingsData.paymentMethods?.payOnDelivery || false
                            },
                            euPago: {
                                enabled: storeSettingsData.paymentMethods?.euPago?.enabled || false,
                                apiUrl: storeSettingsData.paymentMethods?.euPago?.apiUrl || 'https://sandbox.eupago.pt/',
                                apiKey: storeSettingsData.paymentMethods?.euPago?.apiKey || '',
                                supportedMethods: storeSettingsData.paymentMethods?.euPago?.supportedMethods || [
                                    'mb',
                                    'mbway'
                                ],
                                mbwayExpiryTime: storeSettingsData.paymentMethods?.euPago?.mbwayExpiryTime || 5,
                                mbExpiryTime: storeSettingsData.paymentMethods?.euPago?.mbExpiryTime || 2880
                            },
                            stripe: {
                                enabled: storeSettingsData.paymentMethods?.stripe?.enabled || false,
                                apiPuplicKey: storeSettingsData.paymentMethods?.stripe?.apiPuplicKey || '',
                                apiSecretKey: storeSettingsData.paymentMethods?.stripe?.apiSecretKey || ''
                            },
                            sumup: {
                                enabled: storeSettingsData.paymentMethods?.sumup?.enabled || false,
                                merchantCode: storeSettingsData.paymentMethods?.sumup?.merchantCode || '', 
                                apiKey: storeSettingsData.paymentMethods?.sumup?.apiKey || ''
                            }
                        },
                        freeShippingEnabled: storeSettingsData.freeShippingEnabled || false,
                        freeShippingThreshold: storeSettingsData.freeShippingThreshold || 50,
                        freeShippingCarrier: storeSettingsData.freeShippingCarrier || '',
                        allowedCountries: storeSettingsData.allowedCountries || [],
                        bannedCountries: storeSettingsData.bannedCountries || [],
                        carriers: storeSettingsData.carriers || [],
                        currency: storeSettingsData.currency || siteSettings?.currency || 'EUR'
                    });
                    setSelectedAllowedCountries(storeSettingsData.allowedCountries || []);
                    setSelectedBannedCountries(storeSettingsData.bannedCountries || []);
                    setCarriers(storeSettingsData.carriers || []);
                } else {
                    // No settings found, use default form state
                    // Settings should be created by setup process
                    console.log('No store settings found, using defaults');
                    setFormData(defaultFormState);
                    setSelectedAllowedCountries([]);
                    setSelectedBannedCountries([]);
                    setCarriers([]);
                }
            } catch (error) {
                // Reset fetched flag on error so it can try again
                fetchedRef.current = false;
                toast.error('Failed to load store settings');
                console.error('Store settings error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [storeSettings, siteSettings?.currency]);

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the validation errors');
            return;
        }

        setIsSubmitting(true);
        try {
            const submissionData = {
                ...formData,
                allowedCountries: selectedAllowedCountries,
                bannedCountries: selectedBannedCountries,
                carriers: carriers,
                updatedAt: new Date().toISOString()
            };

            const result = await updateStoreSettings(submissionData);

            if (result.success) {
                toast.success('Store settings saved successfully!');
                // Reset fetchedRef to allow form to reload with updated data
                fetchedRef.current = false;
                // Refresh router to get updated server data
                router.refresh();
            } else {
                throw new Error(result.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <StoreSettingsSkeleton />;
    }

    return (
        <div className="space-y-4">
            <AdminHeader title="Store Settings" description="Manage your store's configuration and preferences" />

            <div className="relative">
                <form onSubmit={onSubmit} className="space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList disabled={isSubmitting}>
                            <TabsTrigger value="business" className="flex items-center gap-2" disabled={isSubmitting}>
                                <Building className="h-4 w-4" />
                                Business
                            </TabsTrigger>
                            <TabsTrigger value="payments" className="flex items-center gap-2" disabled={isSubmitting}>
                                <CreditCard className="h-4 w-4" />
                                Payments
                            </TabsTrigger>
                            <TabsTrigger value="shipping" className="flex items-center gap-2" disabled={isSubmitting}>
                                <Truck className="h-4 w-4" />
                                Shipping
                            </TabsTrigger>
                            <TabsTrigger value="general" className="flex items-center gap-2" disabled={isSubmitting}>
                                <Settings className="h-4 w-4" />
                                General
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="business" className="space-y-6">
                            <BusinessTab
                                formData={formData}
                                handleInputChange={handleInputChange}
                                handleNestedInputChange={handleNestedInputChange}
                                errors={errors}
                            />
                        </TabsContent>

                        <TabsContent value="payments" className="space-y-6">
                            <PaymentsTab
                                formData={formData}
                                handleNestedInputChange={handleNestedInputChange}
                                errors={errors}
                            />
                        </TabsContent>

                        <TabsContent value="shipping" className="space-y-6">
                            <ShippingTab
                                formData={formData}
                                handleInputChange={handleInputChange}
                                selectedAllowedCountries={selectedAllowedCountries}
                                selectedBannedCountries={selectedBannedCountries}
                                setSelectedAllowedCountries={setSelectedAllowedCountries}
                                setSelectedBannedCountries={setSelectedBannedCountries}
                                carriers={carriers}
                                setCarriers={setCarriers}
                                errors={errors}
                            />
                        </TabsContent>

                        <TabsContent value="general" className="space-y-6">
                            <GeneralTab formData={formData} handleInputChange={handleInputChange} errors={errors} />
                        </TabsContent>
                    </Tabs>

                    <div className="right-0 bottom-0 left-0 z-10 mb-6 flex justify-center fixed md:ml-64">
                        <Button className="w-auto" type="submit" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2 dark:border-black"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-1 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>

                {isSubmitting && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/50">
                        <div className="flex flex-col items-center gap-4 rounded-lg border bg-background p-6 shadow-lg">
                            <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
                            <p className="text-muted-foreground text-sm">Saving settings...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Business Tab Component
function BusinessTab({ formData, handleInputChange, handleNestedInputChange, errors }) {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Business Information
                    </CardTitle>
                    <CardDescription>Enter your business details and VAT information</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                placeholder="Your Business Name"
                                value={formData.businessName}
                                onChange={(e) => handleInputChange('businessName', e.target.value)}
                            />
                            {errors.businessName && <p className="mt-1 text-red-500 text-sm">{errors.businessName}</p>}
                        </div>
                        <div>
                            <Label htmlFor="tvaNumber">TVA Number</Label>
                            <Input
                                id="tvaNumber"
                                placeholder="TVA/VAT Number"
                                value={formData.tvaNumber}
                                onChange={(e) => handleInputChange('tvaNumber', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="address">Business Address</Label>
                        <Input
                            id="address"
                            placeholder="Complete Business Address"
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        VAT Configuration
                    </CardTitle>
                    <CardDescription>Configure how VAT is handled in your store</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable VAT/TVA</Label>
                            <p className="text-muted-foreground text-sm">
                                Enable or disable VAT/TVA calculations for your store
                            </p>
                        </div>
                        <Switch
                            checked={formData.vatEnabled}
                            onCheckedChange={(checked) => handleInputChange('vatEnabled', checked)}
                        />
                    </div>

                    {formData.vatEnabled && (
                        <>
                            <div>
                                <Label htmlFor="vatPercentage">VAT Percentage</Label>
                                <Input
                                    id="vatPercentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="20"
                                    value={formData.vatPercentage}
                                    onChange={(e) =>
                                        handleInputChange('vatPercentage', parseFloat(e.target.value) || 0)
                                    }
                                />
                                {errors.vatPercentage && (
                                    <p className="mt-1 text-red-500 text-sm">{errors.vatPercentage}</p>
                                )}
                            </div>

                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">VAT Included in Price</Label>
                                    <p className="text-muted-foreground text-sm">
                                        Display product prices with VAT included
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.vatIncludedInPrice}
                                    onCheckedChange={(checked) => handleInputChange('vatIncludedInPrice', checked)}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Payments Tab Component
function PaymentsTab({ formData, handleNestedInputChange, errors }) {
    const [showStripeSecret, setShowStripeSecret] = useState(false);
    const [showStripeConfig, setShowStripeConfig] = useState(false);
    const [showSumUpApiKey, setshowSumUpApiKey] = useState(false);
    const [showSumUpConfig, setShowSumUpConfig] = useState(false);
    const [showEuPagoApiKey, setShowEuPagoApiKey] = useState(false);
    const [showEuPagoConfig, setShowEuPagoConfig] = useState(false);
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Methods
                    </CardTitle>
                    <CardDescription>Configure available payment options for your customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Bank Transfer</Label>
                            <p className="text-muted-foreground text-sm">Accept bank transfer payments</p>
                        </div>
                        <Switch
                            checked={formData.paymentMethods?.bankTransfer?.enabled || false}
                            onCheckedChange={(checked) => {
                                const newBankTransfer = {
                                    ...formData.paymentMethods?.bankTransfer,
                                    enabled: checked
                                };
                                handleNestedInputChange('paymentMethods', 'bankTransfer', newBankTransfer);
                            }}
                        />
                    </div>
                    {formData.paymentMethods?.bankTransfer?.enabled && (
                        <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input
                                        id="bankName"
                                        placeholder="Bank Name"
                                        value={formData.paymentMethods?.bankTransfer?.bankName || ''}
                                        onChange={(e) => {
                                            const newBankTransfer = {
                                                ...formData.paymentMethods?.bankTransfer,
                                                bankName: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'bankTransfer', newBankTransfer);
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="accountHolder">Account Holder</Label>
                                    <Input
                                        id="accountHolder"
                                        placeholder="Account Holder Name"
                                        value={formData.paymentMethods?.bankTransfer?.accountHolder || ''}
                                        onChange={(e) => {
                                            const newBankTransfer = {
                                                ...formData.paymentMethods?.bankTransfer,
                                                accountHolder: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'bankTransfer', newBankTransfer);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="iban">IBAN</Label>
                                    <Input
                                        id="iban"
                                        placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                                        value={formData.paymentMethods?.bankTransfer?.iban || ''}
                                        onChange={(e) => {
                                            const newBankTransfer = {
                                                ...formData.paymentMethods?.bankTransfer,
                                                iban: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'bankTransfer', newBankTransfer);
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="bic">BIC/SWIFT</Label>
                                    <Input
                                        id="bic"
                                        placeholder="BNPAFRPPXXX"
                                        value={formData.paymentMethods?.bankTransfer?.bic || ''}
                                        onChange={(e) => {
                                            const newBankTransfer = {
                                                ...formData.paymentMethods?.bankTransfer,
                                                bic: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'bankTransfer', newBankTransfer);
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="additionalInstructions">Additional Instructions</Label>
                                <Input
                                    id="additionalInstructions"
                                    placeholder="Additional transfer instructions (optional)"
                                    value={formData.paymentMethods?.bankTransfer?.instructions || ''}
                                    onChange={(e) => {
                                        const newBankTransfer = {
                                            ...formData.paymentMethods?.bankTransfer,
                                            instructions: e.target.value
                                        };
                                        handleNestedInputChange('paymentMethods', 'bankTransfer', newBankTransfer);
                                    }}
                                />
                            </div>
                        </>
                    )}
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Pay on Delivery</Label>
                            <p className="text-muted-foreground text-sm">
                                Allow customers to pay when receiving their order
                            </p>
                        </div>
                        <Switch
                            checked={formData.paymentMethods?.payOnDelivery?.enabled || false}
                            onCheckedChange={(checked) =>
                                handleNestedInputChange('paymentMethods', 'payOnDelivery.enabled', checked)
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Payment Integrations
                    </CardTitle>
                    <CardDescription>Configure third-party payment processing services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="w-full flex flex-col rounded-lg border p-4">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Stripe Payments</Label>
                                <p className="text-muted-foreground text-sm">
                                    Accept credit cards and other payments via Stripe
                                </p>
                            </div>
                            <Switch
                                checked={formData.paymentMethods?.stripe?.enabled || false}
                                onCheckedChange={(checked) => {
                                    const newStripe = {
                                        ...formData.paymentMethods?.stripe,
                                        enabled: checked
                                    };
                                    handleNestedInputChange('paymentMethods', 'stripe', newStripe);
                                }}
                            />
                        </div>
                        {formData.paymentMethods?.stripe?.enabled && (
                            <Button
                                type="button"
                                variant="outline"
                                className={`mb-4 p-0 ${showStripeConfig ? 'bg-background/50! text-gray-600' : ''}`}
                                onClick={() => setShowStripeConfig(!showStripeConfig)}>
                                {showStripeConfig ? 'Hide Configuration' : 'Show Configuration'}
                            </Button>
                        )}
                        {showStripeConfig && formData.paymentMethods?.stripe?.enabled && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="stripePublicKey">Stripe Publishable Key</Label>
                                    <Input
                                        id="stripePublicKey"
                                        placeholder="pk_test_... or pk_live_..."
                                        value={formData.paymentMethods?.stripe?.apiPuplicKey || ''}
                                        onChange={(e) => {
                                            const newStripe = {
                                                ...formData.paymentMethods?.stripe,
                                                apiPuplicKey: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'stripe', newStripe);
                                        }}
                                    />
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        Your Stripe publishable key (safe to expose in client-side code)
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                                    <div className="relative">
                                        <Input
                                            id="stripeSecretKey"
                                            type={showStripeSecret ? 'text' : 'password'}
                                            placeholder="sk_test_... or sk_live_..."
                                            value={formData.paymentMethods?.stripe?.apiSecretKey || ''}
                                            onChange={(e) => {
                                                const newStripe = {
                                                    ...formData.paymentMethods?.stripe,
                                                    apiSecretKey: e.target.value
                                                };
                                                handleNestedInputChange('paymentMethods', 'stripe', newStripe);
                                            }}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowStripeSecret(!showStripeSecret)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showStripeSecret ? (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        Your Stripe secret key (keep this secure and never expose it)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-full flex flex-col rounded-lg border p-4">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">SumUp Payments</Label>
                                <p className="text-muted-foreground text-sm">
                                    Accept card payments via SumUp payment gateway
                                </p>
                            </div>
                            <Switch
                                checked={formData.paymentMethods?.sumup?.enabled || false}
                                onCheckedChange={(checked) => {
                                    const newSumUp = {
                                        ...formData.paymentMethods?.sumup,
                                        enabled: checked
                                    };
                                    handleNestedInputChange('paymentMethods', 'sumup', newSumUp);
                                    setShowSumUpConfig(checked);
                                }}
                            />
                        </div>
                        {formData.paymentMethods?.sumup?.enabled && (
                            <Button
                                type="button"
                                variant="outline"
                                className={`mb-4 p-0 ${showSumUpConfig ? 'bg-background/50! text-gray-600' : ''}`}
                                onClick={() => {
                                    setShowSumUpConfig(!showSumUpConfig);
                                }}>
                                {showSumUpConfig ? 'Hide Configuration' : 'Show Configuration'}
                            </Button>
                        )}
                        {showSumUpConfig && formData.paymentMethods?.sumup?.enabled && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="sumupMerchantCode">Merchant Code</Label>
                                    <Input
                                        id="sumupMerchantCode"
                                        placeholder="Your SumUp merchant code"
                                        value={formData.paymentMethods?.sumup?.merchantCode || ''}
                                        onChange={(e) => {
                                            const newSumUp = {
                                                ...formData.paymentMethods?.sumup,
                                                merchantCode: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'sumup', newSumUp);
                                        }}
                                    />
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        Your SumUp merchant code (found in your SumUp dashboard)
                                    </p>
                                </div> 
                                <div>
                                    <Label htmlFor="sumupApiKey">API Key</Label>
                                    <div className="relative">
                                        <Input
                                            id="sumupApiKey"
                                            type={showSumUpApiKey ? 'text' : 'password'}
                                            placeholder="sup_sk_..."
                                            value={formData.paymentMethods?.sumup?.apiKey || ''}
                                            onChange={(e) => {
                                                const newSumUp = {
                                                    ...formData.paymentMethods?.sumup,
                                                    apiKey: e.target.value
                                                };
                                                handleNestedInputChange('paymentMethods', 'sumup', newSumUp);
                                            }}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setshowSumUpApiKey(!showSumUpApiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showSumUpApiKey ? (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div> 
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        Get your API key from <a href="https://developer.sumup.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SumUp Developer Portal</a>. <strong>Not</strong> your client ID or public key.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-full flex flex-col rounded-lg border p-4">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">EuPago Payments</Label>
                                <p className="text-muted-foreground text-sm">
                                    Accept Multibanco, MB WAY, and credit card payments via EuPago
                                </p>
                            </div>
                            <Switch
                                checked={formData.paymentMethods?.euPago?.enabled || false}
                                onCheckedChange={(checked) => {
                                    const newEuPago = {
                                        ...formData.paymentMethods?.euPago,
                                        enabled: checked
                                    };
                                    handleNestedInputChange('paymentMethods', 'euPago', newEuPago);
                                    setShowEuPagoConfig(checked);
                                }}
                            />
                        </div>
                        {formData.paymentMethods?.euPago?.enabled && (
                            <Button
                                type="button"
                                variant="outline"
                                className={`mb-4 p-0 ${showEuPagoConfig ? 'bg-background/50! text-gray-600' : ''}`}
                                onClick={() => {
                                    setShowEuPagoConfig(!showEuPagoConfig);
                                }}>
                                {showEuPagoConfig ? 'Hide Configuration' : 'Show Configuration'}
                            </Button>
                        )}
                        {showEuPagoConfig && formData.paymentMethods?.euPago?.enabled && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="euPagoApiUrl">EuPago API URL</Label>
                                    <Input
                                        id="euPagoApiUrl"
                                        placeholder="https://sandbox.eupago.pt/ or https://clientes.eupago.pt/"
                                        value={formData.paymentMethods?.euPago?.apiUrl || 'https://sandbox.eupago.pt/'}
                                        onChange={(e) => {
                                            const newEuPago = {
                                                ...formData.paymentMethods?.euPago,
                                                apiUrl: e.target.value
                                            };
                                            handleNestedInputChange('paymentMethods', 'euPago', newEuPago);
                                        }}
                                    />
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        Use sandbox URL for testing, production URL for live payments
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="euPagoApiKey">EuPago API Key</Label>
                                    <div className="relative">
                                        <Input
                                            id="euPagoApiKey"
                                            type={showEuPagoApiKey ? 'text' : 'password'}
                                            placeholder="Your EuPago API key"
                                            value={formData.paymentMethods?.euPago?.apiKey || ''}
                                            onChange={(e) => {
                                                const newEuPago = {
                                                    ...formData.paymentMethods?.euPago,
                                                    apiKey: e.target.value
                                                };
                                                handleNestedInputChange('paymentMethods', 'euPago', newEuPago);
                                            }}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowEuPagoApiKey(!showEuPagoApiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showEuPagoApiKey ? (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-muted-foreground text-sm">
                                        Your EuPago API key (keep this secure and never expose it)
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Supported Payment Methods</Label>
                                    <div className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="euPagoMB"
                                                checked={
                                                    formData.paymentMethods?.euPago?.supportedMethods?.includes('mb') ||
                                                    false
                                                }
                                                onChange={(e) => {
                                                    const currentMethods =
                                                        formData.paymentMethods?.euPago?.supportedMethods || [];
                                                    const newMethods = e.target.checked
                                                        ? [...currentMethods, 'mb']
                                                        : currentMethods.filter((m) => m !== 'mb');
                                                    const newEuPago = {
                                                        ...formData.paymentMethods?.euPago,
                                                        supportedMethods: newMethods
                                                    };
                                                    handleNestedInputChange('paymentMethods', 'euPago', newEuPago);
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor="euPagoMB" className="text-sm">
                                                Multibanco
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="euPagoMBWay"
                                                checked={
                                                    formData.paymentMethods?.euPago?.supportedMethods?.includes(
                                                        'mbway'
                                                    ) || false
                                                }
                                                onChange={(e) => {
                                                    const currentMethods =
                                                        formData.paymentMethods?.euPago?.supportedMethods || [];
                                                    const newMethods = e.target.checked
                                                        ? [...currentMethods, 'mbway']
                                                        : currentMethods.filter((m) => m !== 'mbway');
                                                    const newEuPago = {
                                                        ...formData.paymentMethods?.euPago,
                                                        supportedMethods: newMethods
                                                    };
                                                    handleNestedInputChange('paymentMethods', 'euPago', newEuPago);
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor="euPagoMBWay" className="text-sm">
                                                MB WAY
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="mbwayExpiryTime">MB WAY Payment Expiry</Label>
                                        <Select value="5" disabled>
                                            <SelectTrigger id="mbwayExpiryTime">
                                                <SelectValue>5 minutes (fixed)</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="mt-1 text-muted-foreground text-sm">
                                            MB WAY payment expiry time is fixed at 5 minutes
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="mbExpiryTime">Multibanco Payment Expiry</Label>
                                        <Select
                                            value={String(formData.paymentMethods?.euPago?.mbExpiryTime || 2880)}
                                            onValueChange={(value) => {
                                                const newEuPago = {
                                                    ...formData.paymentMethods?.euPago,
                                                    mbExpiryTime: parseInt(value, 10)
                                                };
                                                handleNestedInputChange('paymentMethods', 'euPago', newEuPago);
                                            }}>
                                            <SelectTrigger id="mbExpiryTime">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1440">24 hours (1 day)</SelectItem>
                                                <SelectItem value="2880">48 hours (2 days)</SelectItem>
                                                <SelectItem value="4320">72 hours (3 days)</SelectItem>
                                                <SelectItem value="7200">5 days</SelectItem>
                                                <SelectItem value="10080">7 days (1 week)</SelectItem>
                                                <SelectItem value="20160">14 days (2 weeks)</SelectItem>
                                                <SelectItem value="43200">30 days (1 month)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="mt-1 text-muted-foreground text-sm">
                                            How long Multibanco references remain valid for payment
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Shipping Tab Component
function ShippingTab({
    formData,
    handleInputChange,
    selectedAllowedCountries,
    selectedBannedCountries,
    setSelectedAllowedCountries,
    setSelectedBannedCountries,
    carriers,
    setCarriers,
    errors
}) {
    const addNewCarrier = () => {
        const newCarrier = {
            id: `carrier_${Date.now()}`,
            name: '',
            carrierName: '',
            description: '',
            deliveryTime: '',
            deliveryTimeUnit: 'Days',
            basePrice: 0,
            supportedCountries: [],
            logo: '',
            enabled: true
        };
        setCarriers([...carriers, newCarrier]);
    };

    const removeCarrier = (index) => {
        const newCarriers = carriers.filter((_, i) => i !== index);
        setCarriers(newCarriers);
    };

    const updateCarrier = (index, field, value) => {
        const newCarriers = [...carriers];
        newCarriers[index] = { ...newCarriers[index], [field]: value };
        setCarriers(newCarriers);
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Free Shipping Configuration
                    </CardTitle>
                    <CardDescription>Configure free shipping options and eligible countries</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Free Shipping</Label>
                            <p className="text-muted-foreground text-sm">Offer free shipping to customers</p>
                        </div>
                        <Switch
                            checked={formData.freeShippingEnabled}
                            onCheckedChange={(checked) => handleInputChange('freeShippingEnabled', checked)}
                        />
                    </div>
                    {formData.freeShippingEnabled && (
                        <>
                            <div>
                                <Label htmlFor="freeShippingThreshold">Free Shipping Threshold (€)</Label>
                                <Input
                                    id="freeShippingThreshold"
                                    type="number"
                                    min="0"
                                    placeholder="100"
                                    value={formData.freeShippingThreshold}
                                    onChange={(e) =>
                                        handleInputChange('freeShippingThreshold', parseFloat(e.target.value) || 0)
                                    }
                                />
                                <p className="mt-2 text-muted-foreground text-sm">
                                    Minimum order amount for free shipping
                                </p>
                                {errors.freeShippingThreshold && (
                                    <p className="mt-1 text-red-500 text-sm">{errors.freeShippingThreshold}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="freeShippingCarrier">Free Shipping Carrier</Label>
                                <Select
                                    value={formData.freeShippingCarrier}
                                    onValueChange={(value) => handleInputChange('freeShippingCarrier', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a carrier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {carriers.length === 0 ? (
                                            <SelectItem value="none" disabled>
                                                No carriers available
                                            </SelectItem>
                                        ) : (
                                            carriers.map((carrier) => (
                                                <SelectItem key={carrier.id} value={carrier.id}>
                                                    {carrier.name} {carrier.carrierName && `(${carrier.carrierName})`}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="mt-2 text-muted-foreground text-sm">
                                    Select which carrier to use for free shipping
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Shipping Countries
                    </CardTitle>
                    <CardDescription>Configure allowed and restricted shipping destinations</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div>
                        <Label>Allowed Countries</Label>
                        <div className="mb-4 flex flex-wrap gap-2">
                            <div className="grow">
                                <CountryDropdown
                                    onChange={(country) => {
                                        const values = new Set(selectedAllowedCountries || []);
                                        if (!values.has(country.alpha2.toUpperCase())) {
                                            values.add(country.alpha2.toUpperCase());
                                            const newValues = Array.from(values);
                                            handleInputChange('allowedCountries', newValues);
                                            setSelectedAllowedCountries(newValues);
                                        }
                                    }}
                                    placeholder="Select countries..."
                                />
                            </div>
                        </div>
                        <p className="mb-2 text-muted-foreground text-sm">
                            Select countries where shipping is allowed (leave empty to allow all countries)
                        </p>
                        {selectedAllowedCountries?.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                                {selectedAllowedCountries.map((countryCode) => {
                                    const country = countries.all.find((c) => c.alpha2.toUpperCase() === countryCode);
                                    return (
                                        country && (
                                            <Badge
                                                key={countryCode}
                                                variant="secondary"
                                                className="mr-1 mb-1 flex items-center gap-2">
                                                <span>{country.name}</span>
                                                <button
                                                    type="button"
                                                    className="hover:text-destructive"
                                                    onClick={() => {
                                                        const values = selectedAllowedCountries.filter(
                                                            (c) => c !== countryCode
                                                        );
                                                        handleInputChange('allowedCountries', values);
                                                        setSelectedAllowedCountries(values);
                                                    }}>
                                                    ×
                                                </button>
                                            </Badge>
                                        )
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label>Banned Countries</Label>
                        <div className="mb-4 flex flex-wrap gap-2">
                            <div className="grow">
                                <CountryDropdown
                                    onChange={(country) => {
                                        const values = new Set(selectedBannedCountries || []);
                                        if (!values.has(country.alpha2.toUpperCase())) {
                                            values.add(country.alpha2.toUpperCase());
                                            const newValues = Array.from(values);
                                            handleInputChange('bannedCountries', newValues);
                                            setSelectedBannedCountries(newValues);
                                        }
                                    }}
                                    placeholder="Select countries..."
                                />
                            </div>
                        </div>
                        <p className="mb-2 text-muted-foreground text-sm">
                            Select countries where shipping is not allowed
                        </p>
                        {selectedBannedCountries?.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                                {selectedBannedCountries.map((countryCode) => {
                                    const country = countries.all.find((c) => c.alpha3 === countryCode);
                                    return (
                                        country && (
                                            <Badge
                                                key={countryCode}
                                                variant="secondary"
                                                className="mr-1 mb-1 flex items-center gap-2">
                                                <span>{country.name}</span>
                                                <button
                                                    type="button"
                                                    className="hover:text-destructive"
                                                    onClick={() => {
                                                        const values = selectedBannedCountries.filter(
                                                            (c) => c !== countryCode
                                                        );
                                                        handleInputChange('bannedCountries', values);
                                                        setSelectedBannedCountries(values);
                                                    }}>
                                                    ×
                                                </button>
                                            </Badge>
                                        )
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Carriers Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Shipping Carriers
                    </CardTitle>
                    <CardDescription>Configure available shipping carriers and their rates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {carriers.map((carrier, index) => (
                        <Card key={carrier.id} className="border-dashed">
                            <CardContent className="pt-6">
                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Carrier {index + 1}</h4>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeCarrier(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <Label htmlFor={`carrier-name-${index}`}>Service Name</Label>
                                            <Select
                                                value={carrier.name || ''}
                                                onValueChange={(value) => updateCarrier(index, 'name', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select service type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Standard">Standard</SelectItem>
                                                    <SelectItem value="Express">Express</SelectItem>
                                                    <SelectItem value="Priority">Priority</SelectItem>
                                                    <SelectItem value="Economy">Economy</SelectItem>
                                                    <SelectItem value="Overnight">Overnight</SelectItem>
                                                    <SelectItem value="Same Day">Same Day</SelectItem>
                                                    <SelectItem value="International">International</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor={`carrier-carrier-name-${index}`}>Carrier Name</Label>
                                            <Input
                                                id={`carrier-carrier-name-${index}`}
                                                placeholder="DHL, FedEx, UPS..."
                                                value={carrier.carrierName || ''}
                                                onChange={(e) => updateCarrier(index, 'carrierName', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor={`carrier-description-${index}`}>Description</Label>
                                        <Input
                                            id={`carrier-description-${index}`}
                                            placeholder="Reliable delivery service..."
                                            value={carrier.description || ''}
                                            onChange={(e) => updateCarrier(index, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <Label htmlFor={`carrier-delivery-time-${index}`}>Delivery Time</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id={`carrier-delivery-time-${index}`}
                                                    type="number"
                                                    min="1"
                                                    placeholder="3-5"
                                                    value={carrier.deliveryTime || ''}
                                                    onChange={(e) =>
                                                        updateCarrier(index, 'deliveryTime', e.target.value)
                                                    }
                                                    className="flex-1"
                                                />
                                                <Select
                                                    value={carrier.deliveryTimeUnit || 'Days'}
                                                    onValueChange={(value) =>
                                                        updateCarrier(index, 'deliveryTimeUnit', value)
                                                    }>
                                                    <SelectTrigger className="w-30">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Hours">Hours</SelectItem>
                                                        <SelectItem value="Days">Days</SelectItem>
                                                        <SelectItem value="Weeks">Weeks</SelectItem>
                                                        <SelectItem value="Months">Months</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor={`carrier-base-price-${index}`}>Base Price (€)</Label>
                                            <Input
                                                id={`carrier-base-price-${index}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="9.99"
                                                value={carrier.basePrice || 0}
                                                onChange={(e) =>
                                                    updateCarrier(index, 'basePrice', parseFloat(e.target.value) || 0)
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor={`carrier-logo-${index}`}>Logo URL (Optional)</Label>
                                        <Input
                                            id={`carrier-logo-${index}`}
                                            placeholder="https://example.com/logo.png"
                                            value={carrier.logo || ''}
                                            onChange={(e) => updateCarrier(index, 'logo', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Supported Countries</Label>
                                        <div className="mb-4 flex flex-wrap gap-2">
                                            <div className="grow">
                                                <CountryDropdown
                                                    onChange={(country) => {
                                                        const currentCountries = carrier.supportedCountries || [];
                                                        const values = new Set(currentCountries);
                                                        if (!values.has(country.alpha2.toUpperCase())) {
                                                            const newCountries = [
                                                                ...currentCountries,
                                                                country.alpha2.toUpperCase()
                                                            ];
                                                            updateCarrier(index, 'supportedCountries', newCountries);
                                                        }
                                                    }}
                                                    placeholder="Select countries..."
                                                />
                                            </div>
                                        </div>
                                        <p className="mb-2 text-muted-foreground text-sm">
                                            Select countries where this carrier is available (leave empty for all
                                            countries)
                                        </p>
                                        {carrier.supportedCountries && carrier.supportedCountries.length > 0 && (
                                            <div className="mb-2 flex flex-wrap gap-1">
                                                {carrier.supportedCountries.map((countryCode) => {
                                                    const country = countries.all.find(
                                                        (c) => c.alpha2.toUpperCase() === countryCode
                                                    );
                                                    return (
                                                        country && (
                                                            <Badge
                                                                key={countryCode}
                                                                variant="secondary"
                                                                className="mr-1 mb-1 flex items-center gap-2">
                                                                <span>{country.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="hover:text-destructive"
                                                                    onClick={() => {
                                                                        const newCountries = (
                                                                            carrier.supportedCountries || []
                                                                        ).filter((code) => code !== countryCode);
                                                                        updateCarrier(
                                                                            index,
                                                                            'supportedCountries',
                                                                            newCountries
                                                                        );
                                                                    }}>
                                                                    ×
                                                                </button>
                                                            </Badge>
                                                        )
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Enabled</Label>
                                            <p className="text-muted-foreground text-sm">
                                                Show this carrier as an option during checkout
                                            </p>
                                        </div>
                                        <Switch
                                            checked={carrier.enabled !== false}
                                            onCheckedChange={(checked) => updateCarrier(index, 'enabled', checked)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={addNewCarrier} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Carrier
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// General Tab Component
function GeneralTab({ formData, handleInputChange, errors }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    General Store Settings
                </CardTitle>
                <CardDescription>Configure general store settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div>
                    <Label htmlFor="currency">Store Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                            <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                            <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                            <SelectItem value="AUD">AUD (A$) - Australian Dollar</SelectItem>
                            <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                            <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
                            <SelectItem value="CHF">CHF (CHF) - Swiss Franc</SelectItem>
                            <SelectItem value="CNY">CNY (¥) - Chinese Yuan</SelectItem>
                            <SelectItem value="SEK">SEK (kr) - Swedish Krona</SelectItem>
                            <SelectItem value="NZD">NZD (NZ$) - New Zealand Dollar</SelectItem>
                            <SelectItem value="MXN">MXN ($) - Mexican Peso</SelectItem>
                            <SelectItem value="SGD">SGD (S$) - Singapore Dollar</SelectItem>
                            <SelectItem value="HKD">HKD (HK$) - Hong Kong Dollar</SelectItem>
                            <SelectItem value="NOK">NOK (kr) - Norwegian Krone</SelectItem>
                            <SelectItem value="KRW">KRW (₩) - South Korean Won</SelectItem>
                            <SelectItem value="TRY">TRY (₺) - Turkish Lira</SelectItem>
                            <SelectItem value="RUB">RUB (₽) - Russian Ruble</SelectItem>
                            <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                            <SelectItem value="BRL">BRL (R$) - Brazilian Real</SelectItem>
                            <SelectItem value="ZAR">ZAR (R) - South African Rand</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="mt-2 text-muted-foreground text-sm">Select the default currency for your store</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Skeleton Loading Component
function StoreSettingsSkeleton() {
    return (
        <div className="space-y-4">
            <AdminHeader title="Store Settings" description="Manage your store's configuration and preferences" />

            <div className="space-y-6">
                <Skeleton className="h-6 w-full" />

                <div className="grid gap-6">
                    <div className="rounded-lg border p-6">
                        <Skeleton className="mb-4 h-6 w-40" />
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </div>

                    <div className="rounded-lg border p-6">
                        <Skeleton className="mb-4 h-6 w-40" />
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border p-6">
                        <Skeleton className="mb-4 h-6 w-40" />
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    );
}
