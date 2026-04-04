// @/app/(actions)/cart/checkout/PaymentForm.jsx
'use client';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import Turnstile from 'react-turnstile';
import { useCart } from 'react-use-cart';
import { toast } from 'sonner';
import GooglePlacesInput from '@/components/common/GooglePlacesInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { PhoneInput } from '@/components/ui/phone-input';
import { useSettings } from '@/context/providers';
import { calculateOrderPoints } from '@/lib/server/club.js';
import { createStripePaymentIntent, processEuPagoPaymentAction } from '@/lib/server/gateways.js';
import { createOrder } from '@/lib/server/orders.js';
import { applyCoupon, getCustomer, validateCoupon } from '@/lib/server/store.js';
import { generateUID } from '@/lib/shared/helpers.js';
import ShippingMethodSelector from './ShippingMethodSelector.jsx';

function nameSplit(str) {
    const s = str.split(' ');
    const limit = Math.ceil(s.length / 2);
    const first = s.slice(0, limit).join(' ');
    const second = s.slice(limit).join(' ');
    return [first, second];
}

const getDefaultCountry = (countryCode = null, fallback = 'US', locale = null) => {
    if (countryCode) {
        return countryCode;
    }

    // Try to get country from next-intl locale first
    if (locale) {
        const localeCountry = locale.split('-')[1]?.toUpperCase() || locale?.toUpperCase() || 'PT';
        if (localeCountry) {
            const supportedCountries = [
                // North America
                'US',
                'CA',
                'MX',
                'BR',
                'AR',
                'CL',
                'CO',
                'PE',
                // Europe
                'GB',
                'FR',
                'DE',
                'ES',
                'PT',
                'IT',
                'NL',
                'BE',
                'CH',
                'SE',
                'NO',
                'DK',
                'FI',
                'PL',
                'AT',
                'IE',
                'GR',
                'CZ',
                'RO',
                'HU',
                // Asia Pacific
                'AU',
                'NZ',
                'JP',
                'CN',
                'IN',
                'SG',
                'KR',
                'TH',
                'MY',
                'ID',
                'PH',
                'VN',
                'HK',
                'TW',
                // Middle East
                'AE',
                'SA',
                'IL',
                'TR',
                'QA',
                'KW',
                // Africa
                'ZA',
                'EG',
                'NG',
                'KE'
            ];

            if (supportedCountries.includes(localeCountry)) {
                return localeCountry;
            }
        }
    }

    // Fallback to original detection logic
    // Multiple fallback options for language detection
    let lang = 'en-US';

    // Try different browser APIs for language detection (in order of preference)
    if (typeof navigator !== 'undefined') {
        // 1. navigator.languages (array of user's preferred languages)
        if (navigator.languages && navigator.languages.length > 0) {
            lang = navigator.languages[0];
        }
        // 2. navigator.language (standard)
        else if (navigator.language) {
            lang = navigator.language;
        }
        // 3. navigator.userLanguage (IE fallback)
        else if (navigator.userLanguage) {
            lang = navigator.userLanguage;
        }
        // 4. navigator.browserLanguage (older browsers)
        else if (navigator.browserLanguage) {
            lang = navigator.browserLanguage;
        }
        // 5. navigator.systemLanguage (Windows system language)
        else if (navigator.systemLanguage) {
            lang = navigator.systemLanguage;
        }
    }

    // 6. Check HTML lang attribute as additional fallback
    if (typeof document !== 'undefined' && document.documentElement?.lang) {
        lang = lang || document.documentElement.lang;
    }

    // 7. Check localStorage for previously saved preference
    if (typeof localStorage !== 'undefined') {
        const savedLang = localStorage.getItem('preferred_language');
        if (savedLang) {
            lang = savedLang;
        }
    }

    // Extract country code from language string (e.g., 'en-US' -> 'US')
    const country = lang.split('-')[1]?.toUpperCase() || fallback;

    const supportedCountries = [
        // Americas
        'US',
        'CA',
        'MX',
        'BR',
        'AR',
        'CL',
        'CO',
        'PE',
        // Europe
        'GB',
        'FR',
        'DE',
        'ES',
        'PT',
        'IT',
        'NL',
        'BE',
        'CH',
        'SE',
        'NO',
        'DK',
        'FI',
        'PL',
        'AT',
        'IE',
        'GR',
        'CZ',
        'RO',
        'HU',
        // Asia-Pacific
        'AU',
        'NZ',
        'JP',
        'CN',
        'IN',
        'SG',
        'KR',
        'TH',
        'MY',
        'ID',
        'PH',
        'VN',
        'HK',
        'TW',
        // Middle East
        'AE',
        'SA',
        'IL',
        'TR',
        'QA',
        'KW',
        // Africa
        'ZA',
        'EG',
        'NG',
        'KE'
    ];

    const detectedCountry = supportedCountries.includes(country) ? country.toUpperCase() : null;
    // Save detected language to localStorage for future use
    if (typeof localStorage !== 'undefined' && lang) {
        localStorage.setItem('preferred_language', lang);
    }

    return detectedCountry;
};

const PaymentForm = ({
    user,
    isAuthenticated,
    cartTotal,
    subTotal,
    shippingCost,
    onShippingUpdate,
    selectedShippingMethod,
    isEligibleForFreeShipping,
    hasStripe = false
}) => {
    const { siteSettings, storeSettings } = useSettings();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Checkout');
    const { theme, resolvedTheme } = useTheme();
    const stripe = hasStripe ? useStripe() : null;
    const elements = hasStripe ? useElements() : null;
    const { items } = useCart();
    // UI State
    const [_isOpen, _setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState('information'); // 'information', 'payment'
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [mounted, setMounted] = useState(false); // For theme hydration safety
    // Form Data - Initialize all values to prevent controlled/uncontrolled input issues
    const userDisplayName = isAuthenticated && user?.displayName ? nameSplit(user?.displayName) : ['', ''];
    const userEmail = (isAuthenticated && user?.email) || '';
    const [emailInput, setEmailInput] = useState(userEmail);
    const [firstName, setFirstName] = useState(userDisplayName[0]);
    const [lastName, setLastName] = useState(userDisplayName[1]);
    const [streetAddress, setStreetAddress] = useState('');
    const [apartmentUnit, setApartmentUnit] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [countryIso, setCountryIso] = useState('');
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // Shipping State
    const [localSelectedShippingMethod, setLocalSelectedShippingMethod] = useState(null);
    const [hasAutoSelectedFreeShipping, setHasAutoSelectedFreeShipping] = useState(false);

    // Integration State
    const [turnstileKey, setTurnstileKey] = useState(
        siteSettings?.turnstileEnabled && siteSettings?.turnstileSiteKey ? siteSettings.turnstileSiteKey : null
    );
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState(
        siteSettings?.googleMapsEnabled && siteSettings?.googleMapsApiKey ? siteSettings.googleMapsApiKey : null
    );
    const [googlePlacesKey, setGooglePlacesKey] = useState(0); // Force re-render key for GooglePlacesInput
    const [isTurnstileVerified, setIsTurnstileVerified] = useState(false);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [couponFreeShipping, setCouponFreeShipping] = useState(false); // Track if coupon provides free shipping

    // Payment Method State
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [mbwayMobile, setMbwayMobile] = useState(''); // For MB WAY payments
    const [mbwayCountryCode, setMbwayCountryCode] = useState('+351'); // Default to Portugal for MB WAY
    
    // Track auto-fill to prevent multiple attempts
    const autoFillAttempted = useRef(false);

    // Handle mounting state for theme (prevents hydration mismatch)
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const defaultC = getDefaultCountry(null, siteSettings?.countryIso || 'US', locale);
        setCountry(defaultC);
        setCountryIso(defaultC);
    }, [locale, siteSettings?.countryIso]);

    // Auto-apply promo code from session storage
    useEffect(() => {
        const autoApplyPromo = async () => {
            if (typeof window === 'undefined') return;

            const savedPromoCode = sessionStorage.getItem('appliedPromoCode');
            if (!savedPromoCode || appliedCoupon || promoCode) return;

            // Set the promo code
            setPromoCode(savedPromoCode);

            try {
                // Validate the coupon
                const result = await validateCoupon(savedPromoCode.trim(), parseFloat(subTotal), emailInput);

                if (result.success && result.valid) {
                    setAppliedCoupon(result.coupon);
                    setDiscountAmount(result.discount.amount);
                    // Set free shipping flag from coupon
                    setCouponFreeShipping(result.discount.freeShipping || false);
                    setPromoError('');
                    // Update cart total display with current shipping method
                    const currentShippingMethod = localSelectedShippingMethod || selectedShippingMethod;
                    onShippingUpdate(shippingCost, currentShippingMethod, result.discount.amount);
                } else {
                    // Invalid coupon - clear it
                    setPromoCode('');
                    setAppliedCoupon(null);
                    setDiscountAmount(0);
                    setCouponFreeShipping(false);
                    sessionStorage.removeItem('appliedPromoCode');
                    toast.error(t('invalidPromoCode') || result.message || 'Invalid promo code');
                }
            } catch (error) {
                // Error validating - clear it
                setPromoCode('');
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setCouponFreeShipping(false);
                sessionStorage.removeItem('appliedPromoCode');
                toast.error(t('failedToApplyPromoCode'));
            }
        };

        autoApplyPromo();
    }, [subTotal, emailInput]); // Run when subtotal or email changes

    // Auto-fill customer data for authenticated users
    useEffect(() => {
        const fetchCustomerData = async () => {
            if (!isAuthenticated || !user?.email || autoFillAttempted.current) return;

            try {
                const result = await getCustomer(user.email);

                if (result.success && result.data) {
                    const customer = result.data;

                    // Auto-fill fields with customer data
                    if (customer.streetAddress) setStreetAddress(customer.streetAddress);
                    if (customer.apartmentUnit) setApartmentUnit(customer.apartmentUnit);
                    if (customer.city) setCity(customer.city);
                    if (customer.state) setState(customer.state);
                    if (customer.zipCode) setZipCode(customer.zipCode);
                    if (customer.country) setCountry(customer.country);
                    if (customer.countryIso) setCountryIso(customer.countryIso);
                    if (customer.phone) setPhone(customer.phone);
                }

                autoFillAttempted.current = true; // Mark that we've attempted auto-fill
            } catch (error) {
                console.error('Error fetching customer data:', error);
                autoFillAttempted.current = true; // Mark as attempted even if it failed
            }
        };

        fetchCustomerData();
    }, [isAuthenticated, user?.email]); // Simple dependency array

    const handleShippingMethodSelect = (method) => {
        setLocalSelectedShippingMethod(method);
        const shippingCost = method.fixed_rate || method.base_price || method.basePrice || 0;
        onShippingUpdate(shippingCost, method, discountAmount);
    };

    const handleCountryChange = (selectedCountry) => {
        setCountryIso(selectedCountry.alpha2);
        setCountry(selectedCountry.name);
        setState('');
        setCity('');
        setZipCode('');
        // Reset selected shipping method when country changes
        setLocalSelectedShippingMethod(null);
        setHasAutoSelectedFreeShipping(false);
        // Force Google Places input to reinitialize with new country
        setGooglePlacesKey((prev) => prev + 1);
        // Notify parent that shipping method was reset
        onShippingUpdate(0, null, discountAmount);
    };

    const handleGooglePlacesSelect = (placeDetails) => {
        if (!placeDetails?.address_components) {
            console.warn('No address components found in place details');
            return;
        }

        // Parse address components from Google Places API
        // Support both legacy (long_name/short_name) and modern (longText/shortText) formats
        let extractedStreetNumber = '';
        let extractedRoute = '';
        let extractedCity = '';
        let extractedState = '';
        let extractedZipCode = '';
        let extractedCountry = '';
        let extractedCountryCode = '';

        placeDetails.address_components.forEach((component) => {
            const types = component.types;
            // Support both formats: legacy (long_name) and modern (longText)
            const longName = component.long_name || component.longText;
            const shortName = component.short_name || component.shortText;

            // Street number
            if (types.includes('street_number')) {
                extractedStreetNumber = longName;
            }
            // Route (street name)
            else if (types.includes('route')) {
                extractedRoute = longName;
            }
            // City: locality
            else if (types.includes('locality')) {
                extractedCity = longName;
            }
            // Fallback for city: administrative_area_level_2
            else if (types.includes('administrative_area_level_2') && !extractedCity) {
                extractedCity = longName;
            }
            // State/Province: administrative_area_level_1
            else if (types.includes('administrative_area_level_1')) {
                extractedState = longName;
            }
            // Postal Code
            else if (types.includes('postal_code')) {
                extractedZipCode = longName;
            }
            // Country
            else if (types.includes('country')) {
                extractedCountry = longName;
                extractedCountryCode = shortName; // ISO code (e.g., 'US', 'PT', 'FR')
            }
        });

        // Construct street address from components or use formatted address
        const constructedAddress =
            extractedStreetNumber && extractedRoute
                ? `${extractedStreetNumber} ${extractedRoute}`
                : placeDetails.formatted_address || placeDetails.formattedAddress || '';

        // Update all form fields with extracted data
        setStreetAddress(constructedAddress);
        setCity(extractedCity || '');
        setState(extractedState || '');
        setZipCode(extractedZipCode || '');

        // Update country fields and trigger shipping update
        if (extractedCountryCode) {
            setCountry(extractedCountry);
            setCountryIso(extractedCountryCode);

            // Reset shipping method when country changes
            setLocalSelectedShippingMethod(null);
            setHasAutoSelectedFreeShipping(false);
            onShippingUpdate(0, null, discountAmount);
        }
    }; // Auto-select free shipping when eligible
    const handleShippingMethodsLoaded = (shippingMethods) => {
        if (isEligibleForFreeShipping && !hasAutoSelectedFreeShipping && shippingMethods.length > 0) {
            // Find free shipping method (id: 'free_shipping')
            const freeShippingMethod = shippingMethods.find((method) => method.id === 'free_shipping');

            if (freeShippingMethod) {
                setLocalSelectedShippingMethod(freeShippingMethod);
                onShippingUpdate(0, freeShippingMethod, discountAmount || 0);
                setHasAutoSelectedFreeShipping(true);
            } else if (!localSelectedShippingMethod) {
                // If no free shipping available but user is eligible, select first method
                const firstMethod = shippingMethods[0];
                const shippingCost = firstMethod.fixed_rate || firstMethod.base_price || firstMethod.basePrice || 0;

                setLocalSelectedShippingMethod(firstMethod);
                onShippingUpdate(shippingCost, firstMethod, discountAmount || 0);
            }
        } else if (!isEligibleForFreeShipping && !localSelectedShippingMethod && shippingMethods.length > 0) {
            // If not eligible for free shipping, auto-select first available method
            const firstMethod = shippingMethods[0];
            const shippingCost = firstMethod.fixed_rate || firstMethod.base_price || firstMethod.basePrice || 0;

            setLocalSelectedShippingMethod(firstMethod);
            onShippingUpdate(shippingCost, firstMethod, discountAmount || 0);
        } else if (shippingMethods.length === 1 && !localSelectedShippingMethod) {
            // Always auto-select if only one method available
            const onlyMethod = shippingMethods[0];
            const shippingCost = onlyMethod.fixed_rate || onlyMethod.base_price || onlyMethod.basePrice || 0;
            setLocalSelectedShippingMethod(onlyMethod);
            onShippingUpdate(shippingCost, onlyMethod, discountAmount || 0);
        }
    };

    // Reset auto-selection when eligibility changes
    useEffect(() => {
        if (!isEligibleForFreeShipping) {
            setHasAutoSelectedFreeShipping(false);
            // If currently selected method is free shipping and user is no longer eligible, reset
            if (localSelectedShippingMethod && localSelectedShippingMethod.id === 'free_shipping') {
                setLocalSelectedShippingMethod(null);
                onShippingUpdate(0, null);
            }
        }
    }, [isEligibleForFreeShipping]);

    // Direct address input handler for GooglePlacesInput onChange
    const handleAddressInputChange = (value) => {
        setStreetAddress(value);

        // Clear error when user inputs address
        if (errorMessage?.includes('address')) {
            setErrorMessage('');
        }
    };

    const validatePromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoError(t('enterPromoCode') || 'Please enter a promo code');
            return;
        }

        setPromoLoading(true);
        setPromoError('');

        try {
            // Use direct function from shop-data.js instead of API route
            const result = await validateCoupon(promoCode.trim(), parseFloat(subTotal), emailInput);

            if (result.success && result.valid) {
                setAppliedCoupon(result.coupon);
                setDiscountAmount(result.discount.amount);
                // Set free shipping flag from coupon
                setCouponFreeShipping(result.discount.freeShipping || false);
                setPromoError('');
                // Update cart total display with current shipping method and discount
                // Use localSelectedShippingMethod if available, otherwise use parent's selectedShippingMethod
                const currentShippingMethod = localSelectedShippingMethod || selectedShippingMethod;
                onShippingUpdate(shippingCost, currentShippingMethod, result.discount.amount);
                // Show success message
                toast.success(t('couponAppliedSuccessfully') || result.message || 'Coupon applied successfully');
            } else {
                setPromoError(t('invalidPromoCode') || result.message || 'Invalid promo code');
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setCouponFreeShipping(false);
            }
        } catch (error) {
            setPromoError(t('failedToApplyPromoCode') || 'Failed to validate promo code. Please try again.');
            setAppliedCoupon(null);
            setDiscountAmount(0);
            setCouponFreeShipping(false);
        } finally {
            setPromoLoading(false);
        }
    };

    const removePromoCode = () => {
        setPromoCode('');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponFreeShipping(false);
        setPromoError('');
        // Clear from session storage
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('appliedPromoCode');
        }
        // Reset cart total display with current shipping method
        const currentShippingMethod = localSelectedShippingMethod || selectedShippingMethod;
        onShippingUpdate(shippingCost, currentShippingMethod, 0);
    };

    const validateInformationStep = () => {
        const requiredFields = {
            email: userEmail || emailInput,
            firstName: firstName,
            lastName: lastName,
            streetAddress: streetAddress,
            city: city,
            state: state,
            zipCode: zipCode,
            phone: phone
        };

        // Check for empty required fields
        const emptyFields = Object.entries(requiredFields)
            .filter(([_key, value]) => !value || value.toString().trim() === '')
            .map(([key]) => key);

        if (emptyFields.length > 0) {
            const errorMsg = `${t('emptyFields') || 'Please complete the following required fields'}: ${emptyFields.join(', ')}`;
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            return false;
        }

        // Check for shipping method
        if (!localSelectedShippingMethod) {
            const errorMsg = t('pleaseSelectShippingMethod') || 'Please select a shipping method';
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            return false;
        } 

        setErrorMessage('');
        return true;
    };

    const handleContinueToPayment = async () => {
        if (validateInformationStep()) {
            // Re-validate coupon before proceeding to payment (if one is applied)
            if (appliedCoupon && promoCode) {
                setPromoLoading(true);
                setPromoError('');

                try {
                    const result = await validateCoupon(promoCode.trim(), parseFloat(subTotal), emailInput);

                    if (result.success && result.valid) {
                        // Update coupon data in case anything changed
                        setAppliedCoupon(result.coupon);
                        setDiscountAmount(result.discount.amount);
                        setCouponFreeShipping(result.discount.freeShipping || false);

                        // Continue to payment step
                        setCurrentStep('payment');
                        window.scrollTo({ top: 20, behavior: 'smooth' });
                    } else {
                        // Coupon is no longer valid
                        setPromoError(result.message || 'Coupon is no longer valid');
                        setAppliedCoupon(null);
                        setDiscountAmount(0);
                        setCouponFreeShipping(false);

                        // Remove from session storage
                        if (typeof window !== 'undefined') {
                            sessionStorage.removeItem('appliedPromoCode');
                        }

                        // Reset cart total display
                        const currentShippingMethod = localSelectedShippingMethod || selectedShippingMethod;
                        onShippingUpdate(shippingCost, currentShippingMethod, 0);

                        toast.error(t('couponValidationFailed'));
                        return;
                    }
                } catch (error) {
                    setPromoError('Failed to validate coupon. Please try again.');
                    toast.error(t('errorValidatingCoupon'));
                    return;
                } finally {
                    setPromoLoading(false);
                }
            } else {
                // No coupon applied, proceed directly
                setCurrentStep('payment');
                window.scrollTo({ top: 20, behavior: 'smooth' });
            }
        }
    };

    const handleBackToInformation = () => {
        setCurrentStep('information');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setIsProcessing(true);
        setErrorMessage('');

        try {
            // Validate form data
            const requiredFields = {
                email: userEmail || emailInput,
                firstName: firstName,
                lastName: lastName,
                streetAddress: streetAddress,
                city: city,
                state: state,
                zipCode: zipCode,
                phone: phone
            };

            const emptyFields = Object.entries(requiredFields)
                .filter(([_key, value]) => !value || value.toString().trim() === '')
                .map(([key]) => key);

            if (emptyFields.length > 0) {
                throw new Error(`Please complete the following required fields: ${emptyFields.join(', ')}`);
            }

            if (!localSelectedShippingMethod) {
                throw new Error('Please select a shipping method');
            }

            if (turnstileKey && !isTurnstileVerified) {
                throw new Error('Please complete the security verification');
            }

            // Handle Stripe payment if available
            if (hasStripe && stripe && elements) {
                const { error: submitError } = await elements.submit();
                if (submitError) {
                    throw new Error(submitError.message);
                }
            }

            // Create customer data to match orders structure
            const customerData = {
                firstName,
                lastName,
                email: userEmail || emailInput,
                phone,
                streetAddress,
                apartmentUnit,
                city,
                state,
                zipCode,
                country,
                countryIso
            };

            // Order items data to match orders structure
            const orderItems = items.map((item) => ({
                id: item.productId,
                name: item.name || 'NA',
                price: item.price || 0,
                priceBefore: item.originalPrice || item.price,
                discount: item.discount || 0,
                discountAmount: item.discountAmount || 0,
                discountType: item.discountType || '',
                quantity: item.quantity || 0,
                selectedQuantity: item.selectedQuantity || 0,
                unit: item.selectedUnit || '',
                image: item.image || '',
                type: 'catalog'
            }));

            // Calculate pricing with applied coupon discount and VAT
            const itemsTotal = parseFloat(subTotal);
            // Calculate shipping cost properly - check for free shipping eligibility or coupon free shipping
            let shippingTotal = 0;
            if (localSelectedShippingMethod) {
                // If coupon provides free shipping, shipping is free
                if (couponFreeShipping) {
                    shippingTotal = 0;
                }
                // If free shipping is eligible and this is the free shipping method, cost is 0
                else if (isEligibleForFreeShipping && localSelectedShippingMethod.id === 'free_shipping') {
                    shippingTotal = 0;
                } else {
                    // Use the selected method's cost
                    shippingTotal =
                        localSelectedShippingMethod.fixed_rate ||
                        localSelectedShippingMethod.base_price ||
                        localSelectedShippingMethod.basePrice ||
                        0;
                }
            }
            const couponDiscount = discountAmount || 0;

            // Calculate VAT correctly based on store settings
            let vatAmount = 0;
            let finalTotal = 0;
            let subtotalExclVat = itemsTotal;

            if (storeSettings?.vatEnabled) {
                const vatRate = (storeSettings.vatPercentage || 20) / 100;

                if (storeSettings.vatIncludedInPrice) {
                    // VAT is already included in item prices
                    subtotalExclVat = itemsTotal / (1 + vatRate);
                    vatAmount = itemsTotal - subtotalExclVat;
                    finalTotal = itemsTotal + shippingTotal - couponDiscount;
                } else {
                    // VAT needs to be added at checkout
                    vatAmount = itemsTotal * vatRate;
                    finalTotal = itemsTotal + vatAmount + shippingTotal - couponDiscount;
                }
            } else {
                // VAT disabled
                finalTotal = itemsTotal + shippingTotal - couponDiscount;
            }

            // Use selected payment method
            const paymentMethod = selectedPaymentMethod || 'pending';

            if (!selectedPaymentMethod) {
                throw new Error(t('selectPaymentMethodFirst'));
            }

            // Create order data matching the orders.js structure and admin settings
            const orderData = {
                id: generateUID('ORD'),
                customer: customerData,
                items: orderItems,
                subtotal: itemsTotal,
                shippingCost: shippingTotal,
                discountType: appliedCoupon ? appliedCoupon.type : 'fixed',
                discountValue: appliedCoupon ? appliedCoupon.value : 0,
                discountAmount: couponDiscount,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                // VAT structure matches admin settings.js
                vatEnabled: storeSettings?.vatEnabled || false,
                vatPercentage: storeSettings?.vatPercentage || 20,
                vatAmount: vatAmount,
                vatIncluded: storeSettings?.vatIncludedInPrice || false,
                finalTotal: Math.max(0, finalTotal),
                currency: storeSettings?.currency || 'EUR',
                status: 'pending',
                paymentStatus: paymentMethod === 'stripe' ? 'paid' : 'pending',
                paymentMethod: paymentMethod,
                // Shipping details match admin carriers structure
                shipping: {
                    method: localSelectedShippingMethod?.name || 'Standard',
                    carrier: localSelectedShippingMethod?.carrier_name || 'Standard',
                    cost: shippingTotal,
                    deliveryTime: localSelectedShippingMethod?.delivery_time || '5-7 days',
                    trackingNumber: null
                },
                // Bank transfer details match admin settings structure
                bankTransferDetails:
                    paymentMethod === 'bank_transfer' && storeSettings?.paymentMethods?.bankTransfer
                        ? {
                              bankName: storeSettings.paymentMethods.bankTransfer.bankName || '',
                              accountHolder: storeSettings.paymentMethods.bankTransfer.accountHolder || '',
                              iban: storeSettings.paymentMethods.bankTransfer.iban || '',
                              bic: storeSettings.paymentMethods.bankTransfer.bic || '',
                              instructions: storeSettings.paymentMethods.bankTransfer.instructions || ''
                          }
                        : null,
                // EuPago configuration matches admin settings
                eupagoConfig:
                    paymentMethod.startsWith('eupago_') && storeSettings?.paymentMethods?.euPago
                        ? {
                              apiUrl: storeSettings.paymentMethods.euPago.apiUrl || 'https://sandbox.eupago.pt/',
                              mbwayExpiryTime: storeSettings.paymentMethods.euPago.mbwayExpiryTime || 5,
                              mbExpiryTime: storeSettings.paymentMethods.euPago.mbExpiryTime || 2880,
                              supportedMethods: storeSettings.paymentMethods.euPago.supportedMethods || ['mb', 'mbway']
                          }
                        : null,
                deliveryNotes: deliveryNotes,
                shippingNotes: '',
                sendEmail: true,
                appointmentId: null,
                isServiceAppointment: false,
                clubPoints: 0, // Will be calculated below
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Calculate and add club points to order data
            try {
                const clubPointsResult = await calculateOrderPoints(finalTotal, emailInput);
                orderData.clubPoints = clubPointsResult?.data?.clubPoints || 0;
            } catch (error) {
                console.error('Error calculating order points:', error);
                orderData.clubPoints = 0;
            }

            // Handle different payment methods
            if (paymentMethod === 'stripe' && hasStripe && stripe && elements) {
                // Handle Stripe card payment
                const { error: submitError } = await elements.submit();
                if (submitError) {
                    throw new Error(submitError.message);
                }

                // Create payment intent for card payments using server action
                const stripeResult = await createStripePaymentIntent({
                    amount: Math.round(finalTotal * 100), // Use calculated finalTotal, not cartTotal prop
                    currency: (storeSettings?.currency || 'EUR').toLowerCase(),
                    email: emailInput,
                    automatic_payment_methods: true
                });

                if (!stripeResult.success) {
                    throw new Error(stripeResult.error);
                }

                const clientSecret = stripeResult.client_secret;

                // Apply coupon usage if a coupon was used
                if (appliedCoupon) {
                    try {
                        // Use direct function from shop-data.js instead of API route
                        await applyCoupon(appliedCoupon.id, orderData.id, emailInput, itemsTotal, couponDiscount);
                    } catch (couponError) {
                        console.error('Failed to apply coupon usage:', couponError);
                        // Don't fail the payment for coupon tracking errors
                    }
                }

                // Store order data in localStorage before confirming payment
                localStorage.setItem('orderData', JSON.stringify(orderData));

                // Store order access token in localStorage with timestamp (4-hour expiration)
                const orderAccessToken = {
                    orderId: orderData.id,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
                };
                localStorage.setItem('order_access_' + orderData.id, JSON.stringify(orderAccessToken));

                // Confirm payment with Stripe
                const { error: confirmError } = await stripe.confirmPayment({
                    elements,
                    clientSecret,
                    confirmParams: {
                        return_url: `${window.location.origin}/cart/checkout/success?tx=${btoa(orderData.id)}&payment_method=stripe`
                    }
                });

                if (confirmError) {
                    // Remove order data if payment fails
                    localStorage.removeItem('orderData');
                    localStorage.removeItem('order_access_' + orderData.id);
                    throw new Error(confirmError.message);
                }
            } else if (paymentMethod.startsWith('eupago_')) {
                // Handle EuPago payments (Multibanco and MB WAY)
                const eupagoMethod = paymentMethod.replace('eupago_', ''); // 'mb' or 'mbway'

                // Validate MB WAY mobile number if required
                if (eupagoMethod === 'mbway' && !mbwayMobile) {
                    throw new Error('Please enter your mobile number for MB WAY payment');
                }

                // Prepare EuPago payment data
                const eupagoPaymentData = {
                    orderId: orderData.id,
                    items: orderItems,
                    customer: customerData,
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    payment: {
                        method: eupagoMethod,
                        mobile: eupagoMethod === 'mbway' ? mbwayMobile : null,
                        countryCode: eupagoMethod === 'mbway' ? mbwayCountryCode : null
                    },
                    totals: {
                        subtotal: orderData.subtotal,
                        shipping: orderData.shippingCost,
                        discount: orderData.discountAmount,
                        vat: orderData.vatAmount,
                        total: orderData.finalTotal
                    }
                };

                // Process EuPago payment using server action
                const eupagoResult = await processEuPagoPaymentAction(eupagoPaymentData);

                if (!eupagoResult.success) {
                    throw new Error(eupagoResult.error || 'Failed to create EuPago payment');
                }

                // Apply coupon usage if a coupon was used
                if (appliedCoupon) {
                    try {
                        // Use direct function from shop-data.js instead of API route
                        await applyCoupon(appliedCoupon.id, orderData.id, emailInput, itemsTotal, couponDiscount);
                    } catch (couponError) {
                        console.error('Failed to apply coupon usage:', couponError);
                        // Don't fail the payment for coupon tracking errors
                    }
                }

                // Store order access token in localStorage with timestamp (4-hour expiration)
                const orderAccessToken = {
                    orderId: orderData.id,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
                };
                localStorage.setItem('order_access_' + orderData.id, JSON.stringify(orderAccessToken));

                // Redirect to success page without reload
                router.push(
                    `/cart/checkout/success?tx=${btoa(orderData.id)}&payment_method=eupago&eupago_method=${eupagoMethod}&reference=${eupagoResult.reference}&entity=${eupagoResult.entity || ''}&amount=${eupagoResult.amount}`
                );
            } else {
                // Handle alternative payment methods (bank transfer, pay on delivery)

                // Create order via server action
                const result = await createOrder(orderData, {
                    sendEmail: true,
                    createNotification: true
                });

                if (result.success) {
                    // Apply coupon usage if a coupon was used
                    if (appliedCoupon) {
                        try {
                            // Use direct function from shop-data.js instead of API route
                            await applyCoupon(appliedCoupon.id, orderData.id, emailInput, itemsTotal, couponDiscount);
                        } catch (couponError) {
                            console.error('Failed to apply coupon usage:', couponError);
                        }
                    }

                    // Store order data in localStorage before redirecting
                    localStorage.setItem('orderData', JSON.stringify(orderData));

                    // Store order access token in localStorage with timestamp (4-hour expiration)
                    const orderAccessToken = {
                        orderId: orderData.id,
                        timestamp: Date.now(),
                        expiresAt: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
                    };
                    localStorage.setItem('order_access_' + orderData.id, JSON.stringify(orderAccessToken));

                    // Clear cart and redirect to success page
                    if (typeof window !== 'undefined' && window.emptyCart) {
                        window.emptyCart();
                    }

                    window.location.href = `/cart/checkout/success?order_id=${orderData.id}&payment_method=${paymentMethod}`;
                } else {
                    throw new Error(result.error || 'Failed to create order');
                }
            }
        } catch (error) {
            console.error('Payment error:', error);
            const errorMsg = error.message || t('paymentError');
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            setIsProcessing(false);
        }
    };

    // Get available payment methods based on store settings (matches admin settings structure)
    const getAvailablePaymentMethods = () => {
        console.log(storeSettings?.paymentMethods, 'Current payment methods from store settings');
        const methods = [];

        // Add Stripe/Card payment if enabled (matches admin settings structure)
        if (hasStripe && storeSettings?.paymentMethods?.stripe?.enabled) {
            methods.push({
                value: 'stripe',
                label: `💳 ${t('cardPayment')}`,
                description: t('cardPaymentDescription')
            });
        }

        // Add EuPago payment methods if enabled (matches admin settings structure)
        if (storeSettings?.paymentMethods?.euPago?.enabled) {
            const supportedMethods = storeSettings.paymentMethods.euPago.supportedMethods || ['mb', 'mbway'];

            if (supportedMethods.includes('mb')) {
                methods.push({
                    value: 'eupago_mb',
                    img_dark: '/images/multibanco_dark.webp',
                    img_light: '/images/multibanco.webp',
                    label: `Multibanco`,
                    description: 'Pay using Multibanco ATM or online banking',
                    expiryTime: storeSettings.paymentMethods.euPago.mbExpiryTime || 2880 // minutes
                });
            }

            if (supportedMethods.includes('mbway')) {
                methods.push({
                    value: 'eupago_mbway',
                    img_dark: '/images/mbway_dark.webp',
                    img_light: '/images/mbway.webp',
                    label: `MB WAY`,
                    description: 'Pay instantly with your MB WAY app',
                    expiryTime: storeSettings.paymentMethods.euPago.mbwayExpiryTime || 5 // minutes
                });
            }
        }

        // Add Bank Transfer if enabled (matches admin settings structure)
        if (storeSettings?.paymentMethods?.bankTransfer?.enabled) {
            methods.push({
                value: 'bank_transfer',
                label: `🏦 ${t('bankTransfer')}`,
                description: t('bankTransferDescription'),
                bankDetails: {
                    bankName: storeSettings.paymentMethods.bankTransfer.bankName || '',
                    accountHolder: storeSettings.paymentMethods.bankTransfer.accountHolder || '',
                    iban: storeSettings.paymentMethods.bankTransfer.iban || '',
                    bic: storeSettings.paymentMethods.bankTransfer.bic || '',
                    instructions: storeSettings.paymentMethods.bankTransfer.instructions || ''
                }
            });
        }

        // Add Pay on Delivery if enabled (matches admin settings structure)
        if (storeSettings?.paymentMethods?.payOnDelivery?.enabled === true) {
            methods.push({
                value: 'pay_on_delivery',
                label: `📦 ${t('payOnDelivery')}`,
                description: t('payOnDeliveryDescription')
            });
        }

        return methods;
    };

    // Auto-select first available payment method when store settings are loaded
    useEffect(() => {
        if (storeSettings && !selectedPaymentMethod) {
            const availableMethods = getAvailablePaymentMethods();
            if (availableMethods.length > 0) {
                setSelectedPaymentMethod(availableMethods[0].value);
            }
        }
    }, [storeSettings, selectedPaymentMethod]);

    return (
        <div className="w-full space-y-6">
            <AnimatePresence mode="wait">
                {currentStep === 'information' && (
                    <motion.div
                        key="information"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6">
                        {/* Contact Information */}
                        <div>
                            <h2 className="mb-4 font-semibold text-lg">{t('contactInformation')}</h2>
                            <div className="space-y-4">
                                <Input
                                    required
                                    type="email"
                                    value={userEmail || emailInput || ''}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder={t('emailAddress')}
                                    className={`${!!userEmail && 'opacity-50'}`}
                                    disabled={!!userEmail}
                                    readOnly={!!userEmail}
                                />
                                <PhoneInput
                                    value={phone || ''}
                                    onChange={setPhone}
                                    defaultCountry={countryIso}
                                    placeholder={'910000000'}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Shipping Information */}
                        <div>
                            <h2 className="mb-4 font-semibold text-lg">{t('shippingInformation')}</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    required
                                    type="text"
                                    placeholder={t('firstName')}
                                    value={firstName || ''}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                                <Input
                                    required
                                    type="text"
                                    placeholder={t('lastName')}
                                    value={lastName || ''}
                                    onChange={(e) => setLastName(e.target.value)}
                                />

                                {/* Google Places Autocomplete for Street Address */}
                                <div className="col-span-2">
                                    <label className="mb-1 block font-medium text-gray-700 text-sm">
                                        {t('streetAddress')}
                                    </label>
                                    <div className="google-places-container">
                                        {googleMapsApiKey && (
                                            <GooglePlacesInput
                                                key={googlePlacesKey}
                                                legacy="mobile"
                                                value={streetAddress || ''}
                                                onChange={handleAddressInputChange}
                                                onPlaceSelected={handleGooglePlacesSelect}
                                                placeholder={t('streetAddress')}
                                                countryRestriction={countryIso}
                                                className=""
                                                styles={{
                                                    width: '100%',
                                                    color: 'inherit',
                                                    padding: '0.5rem 1rem',
                                                    border: '1px solid var(--border)',
                                                    borderColor: 'var(--border)',
                                                    boxShadow: 'none',
                                                    outline: 'none'
                                                }}
                                                apiKey={googleMapsApiKey}
                                            />
                                        )}
                                        {/* Fallback input if Google Maps is not enabled */}
                                        {!googleMapsApiKey && (
                                            <Input
                                                type="text"
                                                placeholder={t('streetAddress')}
                                                value={streetAddress || ''}
                                                onChange={(e) => setStreetAddress(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>

                                <Input
                                    type="text"
                                    placeholder={t('apartmentUnit')}
                                    value={apartmentUnit || ''}
                                    onChange={(e) => setApartmentUnit(e.target.value)}
                                    className="col-span-2"
                                />
                                <Input
                                    required
                                    type="text"
                                    placeholder={t('city')}
                                    value={city || ''}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                                <Input
                                    required
                                    type="text"
                                    placeholder={t('stateProvince')}
                                    value={state || ''}
                                    onChange={(e) => setState(e.target.value)}
                                />
                                <Input
                                    required
                                    type="text"
                                    placeholder={t('zipPostalCode')}
                                    value={zipCode || ''}
                                    onChange={(e) => setZipCode(e.target.value)}
                                />
                                <div className="w-full">
                                    <CountryDropdown
                                        key={countryIso || 'default'}
                                        className="h-full rounded-xl"
                                        value={countryIso}
                                        defaultValue={countryIso}
                                        onChange={handleCountryChange}
                                        placeholder={'Select'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Shipping Methods */}
                        <div>
                            <ShippingMethodSelector
                                storeSettings={storeSettings}
                                selectedCountry={countryIso}
                                onShippingMethodSelect={handleShippingMethodSelect}
                                onShippingMethodsLoaded={handleShippingMethodsLoaded}
                                selectedMethod={localSelectedShippingMethod}
                                isEligibleForFreeShipping={isEligibleForFreeShipping}
                                isLoading={false}
                            />
                        </div>

                        {/* Promo Code */}
                        <div>
                            <h2 className="mb-4 font-semibold text-lg">{t('promoCode')}</h2>
                            {!appliedCoupon ? (
                                <div className="space-y-3">
                                    <div className="relative flex flex-nowrap justify-start items-center gap-2 rounded-xl border">
                                        <Input
                                            type="text"
                                            value={promoCode || ''}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            placeholder={t('enterPromoCode')}
                                            className="w-4/5 rounded-xl border-none px-3 py-2 uppercase outline-none ring-none"
                                            disabled={promoLoading}
                                        />
                                        <div className="w-auto ms-auto p-1">
                                            <Button
                                                variant="ghost"
                                                onClick={validatePromoCode}
                                                disabled={promoLoading || !promoCode.trim()}
                                                className="bg-secondary hover:bg-secondary/80 border border-border disabled:cursor-not-allowed disabled:opacity-60 dark:disabled:opacity-30 h-auto rounded-xl px-4 py-2">
                                                {promoLoading ? t('validating') : t('apply')}
                                            </Button>
                                        </div>
                                    </div>
                                    {promoError && <div className="text-red-600 text-sm">{promoError}</div>}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border bg-brand p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-dark">✓ {appliedCoupon.code}</span>
                                                <span className="text-gray-800 text-sm">- {appliedCoupon.name}</span>
                                            </div>
                                            <div className="mt-1 text-dark text-sm">
                                                {t('youSaved', { amount: discountAmount.toFixed(2) })}
                                                {couponFreeShipping && (
                                                    <span className="ml-1 text-green-700 font-medium">
                                                        + {t('freeShipping') || 'Free Shipping'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removePromoCode}
                                            className="text-red-600 font-semibold text-sm hover:text-red-700">
                                            {t('remove')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delivery Notes */}
                        <div>
                            <h2 className="mb-4 font-semibold text-lg">{t('deliveryNotes')}</h2>
                            <Textarea
                                value={deliveryNotes || ''}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                placeholder={t('deliveryInstructions')}
                                rows={3}
                            />
                        </div> 

                        {/* Continue to Payment Button */}
                        <div className="pt-4">
                            <Button size="lg" onClick={handleContinueToPayment} className="w-full text-base">
                                {t('payButton', { amount: parseFloat(cartTotal).toFixed(2) })}
                            </Button>

                            {/* Error Message */}
                            {errorMessage && (
                                <div className="mt-2 text-center text-red-600 text-sm">{errorMessage}</div>
                            )}
                        </div>
                    </motion.div>
                )}

                {currentStep === 'payment' && (
                    <motion.div
                        key="payment"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Order Summary */}
                            <div className="rounded-xl bg-background/50 p-4 shadow-sm">
                                <h3 className="mb-3 font-semibold">{t('orderConfirmation')}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>{t('deliverTo')}:</span>
                                        <span>
                                            {firstName} {lastName}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('address')}:</span>
                                        <span className="text-right">
                                            {streetAddress}, {city}, {country}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('shippingMethod')}:</span>
                                        <span>{localSelectedShippingMethod?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('email')}:</span>
                                        <span>{emailInput}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-600">
                                            <span>{t('discount', { code: appliedCoupon.code })}:</span>
                                            <span>-{discountAmount.toFixed(2)}€</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-border pt-2">
                                        <span>{t('total')}:</span>
                                        <strong>{parseFloat(cartTotal).toFixed(2)}€</strong>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBackToInformation}
                                    className="mt-3 text-primary text-sm hover:underline">
                                    ← {t('editInformation')}
                                </button>
                            </div>

                            {/* Turnstile Verification */}
                            {turnstileKey && mounted && (
                                <div className="space-y-4">
                                    <h2 className="mb-4 font-semibold text-lg">{t('securityVerification')}</h2>
                                    <div className="flex justify-center">
                                        <Turnstile
                                            sitekey={turnstileKey}
                                            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                            size="flexible"
                                            onVerify={() => setIsTurnstileVerified(true)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Payment Methods Section */}
                            <div>
                                <h2 className="mb-4 font-semibold text-lg">{t('paymentMethod')}</h2>

                                {/* Payment Method Selection */}
                                <div className="mb-6">
                                    <label className="mb-4 block font-medium text-sm">{t('selectPaymentMethod')}</label>
                                    <div className="grid gap-3">
                                        {getAvailablePaymentMethods().map((method) => (
                                            <div
                                                key={method.value}
                                                className={`relative rounded-lg border-2 transition-all duration-200 ${
                                                    selectedPaymentMethod === method.value
                                                        ? 'border-primary bg-primary/5 shadow-sm'
                                                        : 'border-border bg-card hover:border-primary/50'
                                                }
    `}>
                                                <div
                                                    onClick={() => setSelectedPaymentMethod(method.value)}
                                                    className="cursor-pointer p-4">
                                                    {/* Radio indicator */}
                                                    <div className="absolute top-4 right-4">
                                                        <div
                                                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                                                                selectedPaymentMethod === method.value
                                                                    ? 'border-brand bg-background'
                                                                    : 'border-gray-300'
                                                            }
            `}>
                                                            {selectedPaymentMethod === method.value && (
                                                                <div className="h-2 w-2 rounded-full bg-white" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Payment method content */}
                                                    <div className="pr-8">
                                                        <div className="mb-2 flex items-center gap-3">
                                                            {/* Display logo if available */}
                                                            {(method.img_dark || method.img_light) && (
                                                                <img
                                                                    src={
                                                                        resolvedTheme === 'dark'
                                                                            ? method.img_dark
                                                                            : method.img_light
                                                                    }
                                                                    alt={method.label}
                                                                    className="h-8 w-auto object-contain"
                                                                />
                                                            )}
                                                            {/* Display label only if no image */}
                                                            {!method.img_dark && !method.img_light && (
                                                                <div className="font-medium text-base">
                                                                    {method.label}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-muted-foreground text-sm">
                                                            {method.description}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment Method Details - Show when selected */}
                                                {selectedPaymentMethod === method.value && (
                                                    <div className="border-t border-border px-4 pb-4 pt-3">
                                                        {/* MB WAY Mobile Input */}
                                                        {method.value === 'eupago_mbway' && (
                                                            <div>
                                                                <p className="mb-3 text-muted-foreground text-sm">
                                                                    Enter your mobile number to receive the payment
                                                                    request on your MB WAY app. You'll have 5 minutes to
                                                                    approve the payment.
                                                                </p>
                                                                <div>
                                                                    <label
                                                                        htmlFor="mbwayMobile"
                                                                        className="block mb-2 font-medium text-sm">
                                                                        Mobile Number
                                                                    </label>
                                                                    <PhoneInput
                                                                        value={mbwayMobile}
                                                                        onChange={(
                                                                            fullNumber,
                                                                            countryData,
                                                                            nationalNumber
                                                                        ) => {
                                                                            setMbwayMobile(
                                                                                nationalNumber || fullNumber
                                                                            );
                                                                            setMbwayCountryCode(
                                                                                countryData?.dialCode || '+351'
                                                                            );
                                                                        }}
                                                                        defaultCountry={'PT'}
                                                                        placeholder={'910000000'}
                                                                        className="w-full"
                                                                        required={
                                                                            selectedPaymentMethod === 'eupago_mbway'
                                                                        }
                                                                    />
                                                                    <p className="mt-2 text-muted-foreground text-xs">
                                                                        {mbwayCountryCode === '+351'
                                                                            ? 'Enter your 9-digit mobile number'
                                                                            : 'Enter your mobile number without country code'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* EuPago Multibanco */}
                                                        {method.value === 'eupago_mb' && (
                                                            <div>
                                                                <p className="text-muted-foreground text-sm">
                                                                    After placing your order, you'll receive payment
                                                                    instructions with Entity and Reference numbers to
                                                                    pay at any Multibanco ATM or through online banking.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Stripe Card Payment */}
                                                        {method.value === 'card' && hasStripe && (
                                                            <div>
                                                                <p className="mb-4 text-muted-foreground text-sm">
                                                                    {t('cardPaymentDescription')}
                                                                </p>
                                                                <PaymentElement />
                                                            </div>
                                                        )}

                                                        {method.value === 'card' && !hasStripe && (
                                                            <div>
                                                                <p className="text-muted-foreground text-sm">
                                                                    {t('cardPaymentSetup')}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Bank Transfer */}
                                                        {method.value === 'bank_transfer' && (
                                                            <div>
                                                                {storeSettings?.paymentMethods?.bankTransferDetails && (
                                                                    <div className="mb-3 space-y-2">
                                                                        {storeSettings.paymentMethods
                                                                            .bankTransferDetails.bankName && (
                                                                            <div className="flex justify-between">
                                                                                <span className="font-medium">
                                                                                    {t('bankName')}:
                                                                                </span>
                                                                                <span>
                                                                                    {
                                                                                        storeSettings.paymentMethods
                                                                                            .bankTransferDetails
                                                                                            .bankName
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {storeSettings.paymentMethods
                                                                            .bankTransferDetails.accountHolder && (
                                                                            <div className="flex justify-between">
                                                                                <span className="font-medium">
                                                                                    {t('accountHolder')}:
                                                                                </span>
                                                                                <span>
                                                                                    {
                                                                                        storeSettings.paymentMethods
                                                                                            .bankTransferDetails
                                                                                            .accountHolder
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {storeSettings.paymentMethods
                                                                            .bankTransferDetails.iban && (
                                                                            <div className="flex justify-between">
                                                                                <span className="font-medium">
                                                                                    IBAN:
                                                                                </span>
                                                                                <span className="font-mono text-sm">
                                                                                    {
                                                                                        storeSettings.paymentMethods
                                                                                            .bankTransferDetails.iban
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {storeSettings.paymentMethods
                                                                            .bankTransferDetails.bic && (
                                                                            <div className="flex justify-between">
                                                                                <span className="font-medium">
                                                                                    BIC:
                                                                                </span>
                                                                                <span className="font-mono text-sm">
                                                                                    {
                                                                                        storeSettings.paymentMethods
                                                                                            .bankTransferDetails.bic
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {storeSettings.paymentMethods
                                                                            .bankTransferDetails
                                                                            .additionalInstructions && (
                                                                            <div className="mt-3 border-t pt-2">
                                                                                <p className="text-muted-foreground text-xs">
                                                                                    {
                                                                                        storeSettings.paymentMethods
                                                                                            .bankTransferDetails
                                                                                            .additionalInstructions
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <p className="text-muted-foreground text-sm">
                                                                    {t('bankTransferInstructions')}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Pay on Delivery */}
                                                        {method.value === 'pay_on_delivery' && (
                                                            <div>
                                                                <p className="text-muted-foreground text-sm">
                                                                    {t('payOnDeliveryInstructions')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {getAvailablePaymentMethods().length === 0 && (
                                        <div className="rounded-lg border-2 border-border border-dashed px-4 py-8 text-center">
                                            <p className="text-muted-foreground">{t('noPaymentMethods')}</p>
                                            <p className="mt-1 text-muted-foreground text-sm">{t('contactSupport')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                size="lg"
                                className="w-full"
                                type="submit"
                                disabled={
                                    isProcessing ||
                                    !selectedPaymentMethod ||
                                    (turnstileKey && !isTurnstileVerified) ||
                                    (selectedPaymentMethod === 'card' && (!stripe || !elements))
                                }>
                                {isProcessing ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                        <span>{t('processing')}</span>
                                    </div>
                                ) : selectedPaymentMethod === 'card' ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span>{t('payAmount', { amount: cartTotal })}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <span>{t('placeOrder')}</span>
                                    </div>
                                )}
                            </Button>

                            {/* Error Message */}
                            {errorMessage && (
                                <div className="mt-2 text-center text-red-600 text-sm">{errorMessage}</div>
                            )}
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentForm;
