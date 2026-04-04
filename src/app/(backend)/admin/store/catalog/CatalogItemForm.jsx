// @/app/(backend)/admin/store/catalog/CatalogItemForm.jsx

'use client';

import { Image as ImageIcon, Loader2, Plus, Shuffle, Star, Trash2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getAttributes } from '@/lib/server/store';
import GenerateAI from '@/app/(backend)/admin/components/GenerateAI';
import { formatAvailableLanguages } from '@/lib/i18n';
import { Languages } from 'lucide-react';
import { generateKeywords } from '@/lib/shared/helpers';

const ITEM_TYPES = [
    { value: 'physical', label: 'Physical Product' },
    { value: 'digital', label: 'Digital Product' },
    { value: 'service', label: 'Service' }
];

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .normalize('NFD') // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
};

const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `SKU-${timestamp}-${random}`;
};

export function CatalogItemForm({
    formData,
    setFormData,
    categories,
    collections,
    availableLanguages = ['en'],
    defaultLanguage = 'en',
    onImageUpload,
    editItem,
    isSubmitting = false,
    uploadingImages = false,
    uploadProgress = 0,
    showSubmitButton = true,
    storeSettings = null
}) {
    const t = useTranslations('Admin.CatalogForm');
    const [generatedSku, setGeneratedSku] = useState('');
    const [customAttributes, setCustomAttributes] = useState(() => {
        // Initialize custom attributes with multi-language support and proper structure
        const attrs = formData.customAttributes || [{ name: '', nameML: {}, slug: '', value: '', valueML: {} }];
        return attrs.map((attr) => ({
            name: attr.name || '',
            nameML: attr.nameML || {},
            slug:
                attr.slug ||
                attr.name
                    ?.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') ||
                '',
            value: attr.value || '',
            valueML: attr.valueML || {},
            type: attr.type || 'text'
        }));
    });
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [unlimitedStock, setUnlimitedStock] = useState(formData.stock === -1);
    const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
    const [generatedMetaKeywords, setGeneratedMetaKeywords] = useState({});
    const [tabKey, setTabKey] = useState(0); // Force re-render when needed

    // Language labels mapping using i18n formatting
    const formattedLanguages = formatAvailableLanguages(availableLanguages, defaultLanguage);
    const languageLabels = formattedLanguages.reduce((acc, lang) => {
        acc[lang.code] = lang.name;
        return acc;
    }, {});

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setCurrentLanguage(newLang);
    };

    // Helper functions moved inside component to access defaultLanguage
    const decodeAttributeValue = (value) => {
        // Handle null, undefined, or empty values
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string') return String(value);

        try {
            // Handle potential encoding issues and normalize Unicode
            return value.normalize('NFC').trim(); // Normalize to composed form and trim whitespace
        } catch (e) {
            // Fallback for any normalization errors
            return value.trim();
        }
    };

    // Helper function to process attribute values based on their type
    const processAttributeValueByType = (value, attributeType) => {
        if (value === null || value === undefined) {
            return attributeType === 'boolean' ? false : '';
        }

        switch (attributeType) {
            case 'number': {
                if (value === '' || value === null || value === undefined) return '';
                const numValue = parseFloat(value);
                return isNaN(numValue) ? '' : numValue;
            }
            case 'boolean':
                return value === true || value === 'true' || value === '1';
            case 'color': {
                // Ensure color value is valid hex format
                const colorStr = String(value).trim();
                return colorStr.startsWith('#') ? colorStr : colorStr ? `#${colorStr}` : '#000000';
            }
            case 'select':
            case 'text':
            default:
                return decodeAttributeValue(value);
        }
    };

    // Helper function to get display value for form controls
    const getDisplayValueByType = (attributeData, attributeType) => {
        // For predefined attributes, check both value and valueML
        let value = attributeData?.value;
        if ((!value || value === '') && attributeData?.valueML) {
            value = attributeData.valueML[defaultLanguage] || Object.values(attributeData.valueML)[0] || '';
        }

        if (value === null || value === undefined || value === '') {
            return attributeType === 'boolean' ? false : '';
        }

        switch (attributeType) {
            case 'number':
                return String(value);
            case 'boolean':
                return value === true || value === 'true' || value === '1' || value === 1;
            case 'color': {
                const colorStr = String(value).trim();
                return colorStr.startsWith('#') ? colorStr : colorStr ? `#${colorStr}` : '#000000';
            }
            case 'select':
            case 'text':
            default:
                return String(value);
        }
    };

    // Generate SKU only once on mount for new items (not editing)
    useEffect(() => {
        if (!editItem && !formData.sku && !generatedSku) {
            setGeneratedSku(generateSKU());
        }
    }, []);

    useEffect(() => {
        if(formData.quantityPricing && formData.quantityPricing.length === 0) {
        const newPricing = [ 
            {
                quantity: 1,
                unit: formData.quantityUnit || formData.weightUnit || 'g',
                compareAtPrice: 0,
                price: 0
            }
        ];
        setFormData({
            ...formData,
            quantityPricing: newPricing
        });
        }
    }, [formData.quantityPricing, formData.quantityUnit, formData.weightUnit]);

    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                // Fetch all attributes without pagination limit
                const response = await getAttributes({ page: 1, limit: 1000, activeOnly: false });
                if (response?.success) {
                    setAvailableAttributes(response.data.filter((attr) => attr.isActive));
                }
            } catch (error) {
                console.error('Failed to fetch attributes:', error);
            }
        };
        fetchAttributes();
    }, []);

    // Sync customAttributes when formData changes (for edit mode) - only on mount
    useEffect(() => {
        if (editItem && formData.customAttributes) {
            setCustomAttributes(
                formData.customAttributes.map((attr) => ({
                    name: attr.name || '',
                    slug:
                        attr.slug ||
                        attr.name
                            ?.toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '') ||
                        '',
                    type: attr.type || 'text',
                    nameML: attr.nameML || {},
                    value: attr.value || '',
                    valueML: attr.valueML || {}
                }))
            );
        }
    }, [editItem]);

    // Sync formData with first quantityPricing tier when hasQuantityPricing is enabled
    useEffect(() => {
        if (formData.hasQuantityPricing && formData.quantityPricing && formData.quantityPricing.length > 0) {
            const firstTier = formData.quantityPricing[0];
            const needsUpdate =
                formData.price !== (firstTier.compareAtPrice || firstTier.price) ||
                formData.quantity !== firstTier.quantity ||
                formData.quantityUnit !== firstTier.unit;

            if (needsUpdate) {
                setFormData((prev) => ({
                    ...prev,
                    price: firstTier.compareAtPrice || firstTier.price || 0,
                    quantity: firstTier.quantity || 1,
                    quantityUnit: firstTier.unit || 'g'
                }));
            }
        }
    }, [formData.hasQuantityPricing, formData.quantityPricing]);

    // Set currency from storeSettings when component mounts or storeSettings changes
    useEffect(() => {
        if (storeSettings?.currency && (!formData.currency || formData.currency !== storeSettings.currency)) {
            setFormData((prev) => ({
                ...prev,
                currency: storeSettings.currency
            }));
        }
    }, [storeSettings?.currency]);

    // Auto-generate meta keywords when name/title or description changes for current language
    useEffect(() => {
        const currentName =
            getMultiLanguageValue('name', currentLanguage) || formData.title || formData.name || '';
        const currentDescription = getMultiLanguageValue('description', currentLanguage) || '';

        const plainDescription = currentDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const keywords = generateKeywords(currentName, plainDescription, 10);

        const currentGeneratedKeywords = generatedMetaKeywords[currentLanguage] || '';
        const currentStoredKeywords = getSEOMultiLanguageValue('metaKeywords', currentLanguage);

        if (!keywords || (keywords === currentGeneratedKeywords && keywords === currentStoredKeywords)) {
            return;
        }

        setGeneratedMetaKeywords((prev) => ({
            ...prev,
            [currentLanguage]: keywords
        }));

        if (keywords !== currentStoredKeywords) {
            updateSEOMultiLanguageField('metaKeywords', currentLanguage, keywords);
        }
    }, [
        formData.title,
        formData.name,
        formData.nameML,
        formData.description,
        formData.descriptionML,
        currentLanguage,
        generatedMetaKeywords
    ]);

    const addAttribute = () => {
        const newAttributes = [
            ...customAttributes,
            {
                name: '',
                nameML: {},
                slug: '',
                value: '',
                valueML: {},
                type: 'text'
            }
        ];
        setCustomAttributes(newAttributes);
        setFormData({
            ...formData,
            customAttributes: newAttributes
        });
    };

    const removeAttribute = (index) => {
        const newAttributes = customAttributes.filter((_, i) => i !== index);
        setCustomAttributes(newAttributes);
        setFormData({
            ...formData,
            customAttributes: newAttributes
        });
    };

    const updateAttribute = (index, field, value) => {
        const newAttributes = [...customAttributes];
        // Use type-aware processing based on attribute type
        const currentAttr = newAttributes[index];
        const attributeType = currentAttr.type || 'text';

        // For the 'value' field, use type-aware processing, otherwise use regular decoding
        const processedValue =
            field === 'value' ? processAttributeValueByType(value, attributeType) : decodeAttributeValue(value);

        newAttributes[index][field] = processedValue;

        // For predefined attributes, also update valueML for multi-language support
        if (field === 'value') {
            if (!newAttributes[index].valueML) {
                newAttributes[index].valueML = {};
            }
            newAttributes[index].valueML[defaultLanguage] = String(processedValue);
        }

        // Auto-generate slug ONLY for custom attributes (not predefined ones)
        // Check if this is a custom attribute by verifying it's not in availableAttributes
        const isCustomAttribute = !availableAttributes.some(
            (attr) => attr.slug === newAttributes[index].slug || attr.name === newAttributes[index].name
        );

        if (field === 'name' && processedValue && isCustomAttribute) {
            newAttributes[index].slug = generateSlug(processedValue);
        }

        setCustomAttributes(newAttributes);

        // Only filter for final form data, but keep all attributes in customAttributes state
        const filteredAttributes = newAttributes.filter((attr) => {
            // For predefined attributes, keep if they have a value (check both value and valueML)
            // For custom attributes, keep if they have both name and value
            const isPredefined = availableAttributes.some(
                (availAttr) => availAttr.slug === attr.slug || availAttr.name === attr.name
            );

            if (isPredefined) {
                // Check both value and valueML for predefined attributes
                const hasValue =
                    (attr.value !== '' && attr.value !== null && attr.value !== undefined) ||
                    (attr.valueML &&
                        Object.values(attr.valueML).some((v) => v !== '' && v !== null && v !== undefined));
                return hasValue;
            } else {
                return attr.name && attr.value !== '' && attr.value !== null && attr.value !== undefined;
            }
        });

        setFormData({
            ...formData,
            customAttributes: filteredAttributes
        });
    };

    // Dedicated function for updating predefined attributes
    const updatePredefinedAttribute = (attrFromDB, value) => {
        const processedValue = processAttributeValueByType(value, attrFromDB.type);

        const index = customAttributes.findIndex((ca) => ca.slug === attrFromDB.slug || ca.name === attrFromDB.name);

        if (index >= 0) {
            // Update existing attribute using updateAttribute which now handles valueML
            updateAttribute(index, 'value', processedValue);
        } else {
            // Add new predefined attribute
            const newAttribute = {
                slug: attrFromDB.slug,
                name: attrFromDB.name,
                nameML: attrFromDB.nameML || {},
                type: attrFromDB.type || 'text',
                value: processedValue,
                valueML: {
                    [defaultLanguage]: String(processedValue)
                }
            };

            const newAttributes = [...customAttributes, newAttribute];
            setCustomAttributes(newAttributes);

            // Update form data with filtered attributes
            const filteredAttributes = newAttributes.filter((attr) => {
                const isPredefined = availableAttributes.some(
                    (availAttr) => availAttr.slug === attr.slug || availAttr.name === attr.name
                );

                if (isPredefined) {
                    const hasValue =
                        (attr.value !== '' && attr.value !== null && attr.value !== undefined) ||
                        (attr.valueML &&
                            Object.values(attr.valueML).some((v) => v !== '' && v !== null && v !== undefined));
                    return hasValue;
                } else {
                    return attr.name && attr.value !== '' && attr.value !== null && attr.value !== undefined;
                }
            });

            setFormData({
                ...formData,
                customAttributes: filteredAttributes
            });
        }
    };

    // Multi-language helper functions for attributes
    const updateAttributeMultiLanguageField = (attrIndex, fieldName, langCode, value) => {
        const newAttributes = [...customAttributes];
        const mlField = `${fieldName}ML`;

        if (!newAttributes[attrIndex][mlField]) {
            newAttributes[attrIndex][mlField] = {};
        }

        // Properly decode the value
        const decodedValue = decodeAttributeValue(value);
        newAttributes[attrIndex][mlField][langCode] = decodedValue;

        // Update the main field with default language value for backwards compatibility
        if (langCode === defaultLanguage) {
            newAttributes[attrIndex][fieldName] = decodedValue;

            // Auto-generate slug ONLY for custom attributes (not predefined ones)
            const isCustomAttribute = !availableAttributes.some(
                (attr) => attr.slug === newAttributes[attrIndex].slug || attr.name === newAttributes[attrIndex].name
            );

            if (fieldName === 'name' && decodedValue && isCustomAttribute) {
                newAttributes[attrIndex].slug = generateSlug(decodedValue);
            }
        }

        setCustomAttributes(newAttributes);
        setFormData({
            ...formData,
            customAttributes: newAttributes.filter((attr) => {
                const isPredefined = availableAttributes.some(
                    (availAttr) => availAttr.slug === attr.slug || availAttr.name === attr.name
                );

                if (isPredefined) {
                    const hasValue =
                        (attr.value !== '' && attr.value !== null && attr.value !== undefined) ||
                        (attr.valueML &&
                            Object.values(attr.valueML).some((v) => v !== '' && v !== null && v !== undefined));
                    return hasValue;
                } else {
                    return attr.name && attr.value !== '' && attr.value !== null && attr.value !== undefined;
                }
            })
        });
    };

    const getAttributeMultiLanguageValue = (attrIndex, fieldName, langCode) => {
        if (!customAttributes[attrIndex]) return '';
        const mlField = `${fieldName}ML`;
        return (
            customAttributes[attrIndex][mlField]?.[langCode] ||
            (langCode === defaultLanguage ? customAttributes[attrIndex][fieldName] : '') ||
            ''
        );
    };

    const handleImageUploadLocal = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        try {
            if (onImageUpload) {
                await onImageUpload(files);
                // Success message is now handled in the parent component
                // Reset the input value to allow re-uploading the same file
                event.target.value = '';
            }
        } catch (error) {
            console.error('Image upload error:', error);
            toast.error(t('toasts.uploadFailed'));
        }
    };

    const handleCoverImageChange = (index) => {
        setFormData({ ...formData, coverImageIndex: index });
    };

    const removeImage = (index) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        const newCoverIndex = formData.coverImageIndex >= newImages.length ? 0 : formData.coverImageIndex;
        setFormData({
            ...formData,
            images: newImages,
            coverImageIndex: newCoverIndex
        });
    };

    // Multi-language helper functions
    const updateMultiLanguageField = (fieldName, langCode, value) => {
        const mlField = `${fieldName}ML`;
        setFormData({
            ...formData,
            [mlField]: {
                ...formData[mlField],
                [langCode]: value
            },
            // Update the main field with default language value for backwards compatibility
            [fieldName]: langCode === defaultLanguage ? value : formData[fieldName]
        });
    };

    const getMultiLanguageValue = (fieldName, langCode) => {
        const mlField = `${fieldName}ML`;
        return formData[mlField]?.[langCode] || (langCode === defaultLanguage ? formData[fieldName] : '') || '';
    };

    const updateSEOMultiLanguageField = (fieldName, langCode, value) => {
        const mlField = `${fieldName}ML`;
        setFormData({
            ...formData,
            seo: {
                ...formData.seo,
                [mlField]: {
                    ...formData.seo[mlField],
                    [langCode]: value
                },
                // Update the main field with default language value for backwards compatibility
                [fieldName]: langCode === defaultLanguage ? value : formData.seo[fieldName]
            }
        });
    };

    const getSEOMultiLanguageValue = (fieldName, langCode) => {
        const mlField = `${fieldName}ML`;
        return formData.seo[mlField]?.[langCode] || (langCode === defaultLanguage ? formData.seo[fieldName] : '') || '';
    };

    const handleCollectionChange = (collectionId) => {
        if (!collectionId) {
            return;
        }

        const currentCollections = formData.collections || [];
        // Support both old format (string IDs) and new format (objects with id and name)
        const isSelected = currentCollections.some((col) =>
            typeof col === 'string' ? col === collectionId : col.id === collectionId
        );

        let newCollections;
        if (isSelected) {
            // Remove collection
            newCollections = currentCollections.filter((col) =>
                typeof col === 'string' ? col !== collectionId : col.id !== collectionId
            );
        } else {
            // Add collection with full object structure
            const collection = collections.find((c) => c.id === collectionId || c.key === collectionId);
            if (collection) {
                // Ensure we store the collection with all necessary properties for consistency
                const collectionData = {
                    id: collection.id || collection.key,
                    key: collection.key || collection.id,
                    name: collection.name,
                    nameML: collection.nameML || {},
                    slug: collection.slug || ''
                };
                newCollections = [...currentCollections, collectionData];
            } else {
                newCollections = currentCollections;
            }
        }

        setFormData({ ...formData, collections: newCollections });
    };

    // Discount validation function
    const validateDiscount = (discountAmount, discountType, price) => {
        if (!discountAmount || discountAmount <= 0) return true;

        if (discountType === 'percentage') {
            if (discountAmount > 100) {
                toast.error(t('toasts.discountPercentageMax'));
                return false;
            }
        } else if (discountType === 'fixed') {
            if (discountAmount >= price) {
                toast.error(t('toasts.fixedDiscountInvalid'));
                return false;
            }
        }
        return true;
    };

    // Handle discount amount change with validation
    const handleDiscountChange = (value) => {
        const discountAmount = parseFloat(value) || 0;

        if (validateDiscount(discountAmount, formData.discountType, formData.price)) {
            setFormData({ ...formData, discountAmount });
        } else {
            // Clear invalid discount
            setFormData({ ...formData, discountAmount: 0 });
        }
    };

    // Handle discount type change and revalidate
    const handleDiscountTypeChange = (discountType) => {
        // If "No Discount" is selected, clear discountAmount
        if (!discountType || discountType === '' || discountType === 'none') {
            setFormData({ ...formData, discountType: 'none', discountAmount: 0 });
            return;
        }

        const discountAmount = formData.discountAmount || 0;

        if (validateDiscount(discountAmount, discountType, formData.price)) {
            setFormData({ ...formData, discountType });
        } else {
            // Clear invalid discount and set type
            setFormData({ ...formData, discountType, discountAmount: 0 });
        }
    };

    // Handler for generating SEO meta title for all languages
    const handleGenerateMetaTitle = async (generatedContent) => {
        try {
            // Update meta title for all available languages
            for (const lang of availableLanguages) {
                updateSEOMultiLanguageField('metaTitle', lang, generatedContent);
            }
            toast.success(t('toasts.metaTitleGenerated'));
        } catch (error) {
            console.error('Error updating meta title:', error);
            toast.error(t('toasts.metaTitleFailed'));
        }
    };

    // Handler for generating SEO meta description for all languages
    const handleGenerateMetaDescription = async (generatedContent) => {
        try {
            // Update meta description for all available languages
            for (const lang of availableLanguages) {
                updateSEOMultiLanguageField('metaDescription', lang, generatedContent);
            }
            toast.success(t('toasts.metaDescriptionGenerated'));
        } catch (error) {
            console.error('Error updating meta description:', error);
            toast.error(t('toasts.metaDescriptionFailed'));
        }
    };

    // Get current product info for AI instructions
    const getProductInfo = () => {
        const productName =
            getMultiLanguageValue('name', currentLanguage) ||
            getMultiLanguageValue('name', defaultLanguage) ||
            formData.name ||
            formData.title ||
            '';
        const productDescription =
            getMultiLanguageValue('description', currentLanguage) ||
            getMultiLanguageValue('description', defaultLanguage) ||
            formData.description ||
            '';
        return { productName, productDescription };
    };

    const getCatalogDescriptionInstructions = () => {
        const { productName } = getProductInfo();
        const currentItemName = productName || 'Unnamed item';
        const currentItemType = formData.type === 'service' ? 'service' : 'product';
        const currentItemDescription = formData.description || 'No description available';
        const currentLanguageLabel = languageLabels[currentLanguage] || currentLanguage.toUpperCase();

        return [
            `Current ${currentItemType} name/title: "${currentItemName}".`,
            `Current ${currentItemType} description: "${currentItemDescription}".`,
            `Generate the ${currentItemType} description for the ${currentLanguageLabel} language field.`,
            'The content must be directly usable inside the rich text editor as HTML.',
            'Focus on the current item only, highlight relevant value, benefits, use cases, and important features when applicable.',
            'Keep the output clean and production-ready with no explanations, no notes, no markdown, and no conversational filler.'
        ].join(' ');
    };

    // Protect against Google Translate DOM interference
    useEffect(() => {
        // Add CSS to prevent Google Translate artifacts
        const style = document.createElement('style');
        style.textContent = `
            .catalog-form-tabs font {
                all: unset !important;
            }
            .catalog-form-tabs .skiptranslate,
            .catalog-form-tabs .VIpgJd-ZVi9od-l4eHX-hSRGPd {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        // Force tab re-render if DOM gets corrupted
        const handleTranslationMutation = () => {
            setTabKey((prev) => prev + 1);
        };

        // Listen for DOM mutations that might indicate translation interference
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const removedNodes = Array.from(mutation.removedNodes);

                    // Check for Google Translate font elements
                    const hasTranslationArtifacts = [...addedNodes, ...removedNodes].some(
                        (node) =>
                            node.nodeType === 1 &&
                            (node.tagName === 'FONT' ||
                                node.classList?.contains('skiptranslate') ||
                                node.classList?.contains('VIpgJd-ZVi9od-l4eHX-hSRGPd'))
                    );

                    if (hasTranslationArtifacts) {
                        handleTranslationMutation();
                    }
                }
            });
        });

        const tabsElement = document.querySelector('.catalog-form-tabs');
        if (tabsElement) {
            observer.observe(tabsElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        return () => {
            if (style.parentNode) {
                document.head.removeChild(style);
            }
            observer.disconnect();
        };
    }, []);

    return (
        <div className="space-y-6 catalog-form-tabs" translate="no">
            {/* Form Header with Language Selector */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between"> 
                {availableLanguages.length > 1 && (
                    <div className="flex items-center gap-2 sm:absolute sm:top-5 sm:right-16">
                        <Languages className="h-4 w-4 text-muted-foreground" />
                        <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                            <SelectTrigger className="w-35">
                                <SelectValue placeholder={t('common.language')} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableLanguages.map((lang) => (
                                    <SelectItem key={lang} value={lang}>
                                        {languageLabels[lang] || lang.toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <Tabs key={tabKey} defaultValue="basic" className="w-full" translate="no">
                <TabsList translate="no">
                    <TabsTrigger value="basic" translate="no">
                        {t('tabs.basic')}
                    </TabsTrigger>
                    <TabsTrigger value="pricing" translate="no">
                        {t('tabs.pricing')}
                    </TabsTrigger>
                    <TabsTrigger value="details" translate="no">
                        {t('tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger value="images" translate="no">
                        {t('tabs.images')}
                    </TabsTrigger>
                    <TabsTrigger value="attributes" translate="no">
                        {t('tabs.attributes')}
                    </TabsTrigger>
                    <TabsTrigger value="seo" translate="no">
                        {t('tabs.seo')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-6 space-y-6" translate="no">
                    <div>
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <div>
                                <Label htmlFor="type" className="mb-2">
                                    {t('basic.itemTypeRequired')}
                                </Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    required>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('basic.selectItemType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEM_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {t(`itemTypes.${type.value}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <h3 className="mb-4 font-semibold text-lg">{t('basic.sectionTitle')}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <div className="mb-2">
                                        <Label htmlFor="name">
                                            {t('basic.nameRequired')}{' '}
                                            {availableLanguages.length > 1 &&
                                                `(${languageLabels[currentLanguage] || currentLanguage.toUpperCase()})`}
                                        </Label>
                                    </div> 
                                    <Input
                                        id="name"
                                        value={getMultiLanguageValue('name', currentLanguage)}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            updateMultiLanguageField('name', currentLanguage, name);
                                            // Auto-generate slug only for default language
                                            if (currentLanguage === defaultLanguage) {
                                                const currentSlug = formData.slug;
                                                const generatedSlug = generateSlug(
                                                    formData.nameML?.[defaultLanguage] || formData.name || ''
                                                );
                                                if (!currentSlug || currentSlug === generatedSlug) {
                                                    setFormData((prev) => ({ ...prev, slug: generateSlug(name) }));
                                                }
                                            }
                                        }}
                                        placeholder={t('basic.placeholders.name', {
                                            lang: currentLanguage.toUpperCase()
                                        })}
                                        required={currentLanguage === defaultLanguage}
                                    />
                                    {currentLanguage !== defaultLanguage && (
                                        <p className="mt-1 text-muted-foreground text-xs">
                                            {t('common.translationHint', { lang: currentLanguage.toUpperCase() })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="slug">{t('basic.slug')}</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug || ''}
                                    onChange={(e) => {
                                        const value = e.target.value.toLowerCase().replace(/\s+/g, '-');
                                        setFormData({ ...formData, slug: value });
                                    }}
                                    onBlur={(e) => {
                                        const slug = generateSlug(e.target.value);
                                        setFormData({ ...formData, slug });
                                    }}
                                    placeholder={t('basic.placeholders.slug')}
                                />
                                <p className="mt-1 text-muted-foreground text-xs">
                                    {t('basic.slugHelp')}
                                </p>
                            </div>

                            <div>
                                <div className="mb-2">
                                    <Label htmlFor="description">
                                        {t('basic.description')}{' '}
                                        {availableLanguages.length > 1 &&
                                            `(${languageLabels[currentLanguage] || currentLanguage.toUpperCase()})`}
                                    </Label>
                                </div> 
                                <div className="space-y-2">
                                    <RichTextEditor
                                        value={getMultiLanguageValue('description', currentLanguage)}
                                        onChange={(value) =>
                                            updateMultiLanguageField('description', currentLanguage, value)
                                        }
                                        type="product_description"
                                        customType="catalog_description"
                                        customOnly={true}
                                        customInstructions={getCatalogDescriptionInstructions()}
                                        language={currentLanguage}
                                        placeholder={t('basic.placeholders.description', {
                                            lang: currentLanguage.toUpperCase()
                                        })}
                                        className="min-h-37.5"
                                    />
                                </div>
                                {currentLanguage !== defaultLanguage && (
                                    <p className="mt-1 text-muted-foreground text-xs">
                                        {t('common.translationHint', { lang: currentLanguage.toUpperCase() })}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={formData.isActive}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                    />
                                    <Label>{t('basic.activeItem')}</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={formData.isFeatured || false}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                                    />
                                    <Label>{t('basic.featuredItem')}</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="pricing" className="mt-6 space-y-6" translate="no">
                    <div>
                        <h3 className="mb-4 font-semibold text-lg">{t('pricing.sectionTitle')}</h3>

                        {!storeSettings?.currency && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Currency - only show if storeSettings.currency is not available */}
                                <div>
                                    <Label className="mb-1.5" htmlFor="currency">{t('pricing.currency')}</Label>
                                    <Select
                                        value={formData.currency || 'EUR'}
                                        onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('pricing.selectCurrency')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                            <SelectItem value="CAD">CAD ($)</SelectItem>
                                            <SelectItem value="AUD">AUD ($)</SelectItem>
                                            <SelectItem value="JPY">JPY (¥)</SelectItem>
                                            <SelectItem value="CHF">CHF</SelectItem>
                                            <SelectItem value="SEK">SEK</SelectItem>
                                            <SelectItem value="NOK">NOK</SelectItem>
                                            <SelectItem value="DKK">DKK</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Unit Type Section - Global for all pricing */}
                        {formData.type === 'physical' && (
                            <div className="space-y-4 mb-4">
                                <div>
                                    <Label className="mb-1.5" htmlFor="quantityUnit">{t('pricing.unitType')}</Label>
                                    <Select
                                        value={formData.quantityUnit || formData.weightUnit || 'g'}
                                        onValueChange={(value) => {
                                            const updatedFormData = {
                                                ...formData,
                                                quantityUnit: value
                                            };

                                            // Update all quantity pricing tiers with the same unit
                                            if (formData.hasQuantityPricing && formData.quantityPricing) {
                                                const updatedQuantityPricing = formData.quantityPricing.map((tier) => ({
                                                    ...tier,
                                                    unit: value
                                                }));
                                                updatedFormData.quantityPricing = updatedQuantityPricing;
                                            }

                                            setFormData(updatedFormData);
                                        }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('pricing.selectUnit')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                            <SelectItem value="g">Gram (g)</SelectItem>
                                            <SelectItem value="mg">Milligram (mg)</SelectItem>
                                            <SelectItem value="oz">Ounce (oz)</SelectItem>
                                            <SelectItem value="lb">Pound (lb)</SelectItem>
                                            <SelectItem value="unit">Unit</SelectItem>
                                            <SelectItem value="piece">Piece</SelectItem>
                                            <SelectItem value="box">Box</SelectItem>
                                            <SelectItem value="pack">Pack</SelectItem>
                                            <SelectItem value="bag">Bag</SelectItem>
                                            <SelectItem value="bottle">Bottle</SelectItem>
                                            <SelectItem value="ml">Milliliter (ml)</SelectItem>
                                            <SelectItem value="l">Liter (L)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="mt-1 text-muted-foreground text-xs">
                                        {t('pricing.unitTypeHelp')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Basic Pricing */} 
                            <div className="space-y-4">
                                {!formData.hasQuantityPricing && formData.type === 'physical' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ">
                                        <div>
                                            <Label className="mb-1.5" htmlFor="quantity">{t('pricing.quantityValue')}</Label>
                                            <Input
                                                id="quantity"
                                                type="number" 
                                                value={formData.quantity || formData.weight || 1}
                                                onChange={(e) => {
                                                    const newQuantity = parseFloat(e.target.value) || 1;
                                                    const updatedFormData = {
                                                        ...formData,
                                                        quantity: newQuantity
                                                    };

                                                    // Sync with first quantityPricing tier if quantity-based pricing is enabled
                                                    if (
                                                        formData.hasQuantityPricing &&
                                                        formData.quantityPricing &&
                                                        formData.quantityPricing.length > 0
                                                    ) {
                                                        const updatedQuantityPricing = [
                                                            ...formData.quantityPricing
                                                        ];
                                                        updatedQuantityPricing[0] = {
                                                            ...updatedQuantityPricing[0],
                                                            quantity: newQuantity
                                                        };
                                                        updatedFormData.quantityPricing = updatedQuantityPricing;
                                                    }

                                                    setFormData(updatedFormData);
                                                }}
                                                placeholder={t('pricing.placeholders.quantity')}
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1.5" htmlFor="price">{t('pricing.basePriceOriginalRequired')}</Label>
                                            <Input
                                                id="price"
                                                type="number" 
                                                value={formData.price || ''}
                                                onChange={(e) => {
                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                    const updatedFormData = { ...formData, price: newPrice };

                                                    // Sync with first quantityPricing tier if quantity-based pricing is enabled
                                                    if (
                                                        formData.hasQuantityPricing &&
                                                        formData.quantityPricing &&
                                                        formData.quantityPricing.length > 0
                                                    ) {
                                                        const updatedQuantityPricing = [
                                                            ...formData.quantityPricing
                                                        ];
                                                        updatedQuantityPricing[0] = {
                                                            ...updatedQuantityPricing[0],
                                                            compareAtPrice: newPrice
                                                        };
                                                        updatedFormData.quantityPricing = updatedQuantityPricing;
                                                    }

                                                    setFormData(updatedFormData);
                                                }}
                                                placeholder={t('pricing.placeholders.price')}
                                                required
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Label className="mb-1.5" htmlFor="price">{t('pricing.basePriceRequired')}</Label>
                                        <Input
                                            id="price"
                                            type="number" 
                                            value={formData.price}
                                            onChange={(e) => {
                                                const newPrice = parseFloat(e.target.value) || 0;
                                                const updatedFormData = { ...formData, price: newPrice };

                                                // Sync with first quantityPricing tier if quantity-based pricing is enabled
                                                if (
                                                    formData.hasQuantityPricing &&
                                                    formData.quantityPricing &&
                                                    formData.quantityPricing.length > 0
                                                ) {
                                                    const updatedQuantityPricing = [...formData.quantityPricing];
                                                    updatedQuantityPricing[0] = {
                                                        ...updatedQuantityPricing[0],
                                                        price: newPrice
                                                    };
                                                    updatedFormData.quantityPricing = updatedQuantityPricing;
                                                }

                                                // Revalidate discount when price changes
                                                if (formData.discountAmount > 0) {
                                                    if (
                                                        !validateDiscount(
                                                            formData.discountAmount,
                                                            formData.discountType,
                                                            newPrice
                                                        )
                                                    ) {
                                                        updatedFormData.discountAmount = 0;
                                                    }
                                                }

                                                setFormData(updatedFormData);
                                            }}
                                            placeholder={t('pricing.placeholders.price')}
                                            required
                                        />
                                    </div>
                                )}
                            </div> 

                            {/* Quantity-Based Pricing for Physical Products */}
                            {formData.type === 'physical' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-base">{t('pricing.quantityBasedTitle')}</h4>
                                            <p className="mt-1 text-muted-foreground text-sm">
                                                {t('pricing.quantityBasedDescription')}
                                            </p>
                                        </div>
                                        {!formData?.hasQuantityPricing && ( 
                                        <Switch
                                            checked={formData.hasQuantityPricing || false}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    // Add base tier as first item in quantityPricing if it doesn't exist
                                                    const existingPricing = formData.quantityPricing || [];
                                                    const baseTier = {
                                                        quantity: formData.quantity || 1,
                                                        unit: formData.quantityUnit || 'g',
                                                        compareAtPrice: formData.price || 0,
                                                        price: formData.price || 0
                                                    };

                                                    // Check if base tier already exists (same quantity, unit, and compareAtPrice)
                                                    const hasBaseTier = existingPricing.some(
                                                        (tier) =>
                                                            tier.quantity === baseTier.quantity &&
                                                            tier.unit === baseTier.unit &&
                                                            (tier.compareAtPrice || tier.price) ===
                                                                baseTier.compareAtPrice
                                                    );

                                                    const newQuantityPricing = hasBaseTier
                                                        ? existingPricing
                                                        : [baseTier, ...existingPricing];

                                                    setFormData({
                                                        ...formData,
                                                        hasQuantityPricing: checked,
                                                        quantityPricing: newQuantityPricing
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        hasQuantityPricing: checked,
                                                        quantityPricing: []
                                                    });
                                                }
                                            }}
                                        /> 
                                        )}
                                    </div>
                                    {formData.hasQuantityPricing && (
                                        <div className="space-y-4">
                                            {/* Quantity Pricing Tiers */}
                                            {(formData.quantityPricing || []).map((tier, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex items-start gap-2 rounded-lg border border-border p-3`}>
                                                    <div className="grid flex-1 grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className={`text-xs mb-0.5`}>{t('pricing.quantity')}</Label>
                                                            <Input
                                                                type="number" 
                                                                value={tier.quantity || ''}
                                                                onChange={(e) => {
                                                                    const newPricing = [
                                                                        ...(formData.quantityPricing || [])
                                                                    ];
                                                                    const newQuantity = parseFloat(e.target.value) || 0;
                                                                    newPricing[index].quantity = newQuantity;

                                                                    // If this is the base tier (index 0), also update the main quantity
                                                                    const updatedFormData =
                                                                        index === 0
                                                                            ? {
                                                                                  ...formData,
                                                                                  quantityPricing: newPricing,
                                                                                  quantity: newQuantity
                                                                              }
                                                                            : {
                                                                                  ...formData,
                                                                                  quantityPricing: newPricing
                                                                              };

                                                                    setFormData(updatedFormData);
                                                                }}
                                                                placeholder={t('pricing.placeholders.one')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className={`text-xs mb-0.5`}>{t('pricing.priceOriginal')}</Label>
                                                            <Input
                                                                type="number" 
                                                                value={tier.compareAtPrice || tier.price || ''}
                                                                onChange={(e) => {
                                                                    const newPricing = [
                                                                        ...(formData.quantityPricing || [])
                                                                    ];
                                                                    const newCompareAtPrice =
                                                                        parseFloat(e.target.value) || 0;
                                                                    newPricing[index].compareAtPrice =
                                                                        newCompareAtPrice;

                                                                    // If this is the base tier (index 0), also update the main price
                                                                    const updatedFormData =
                                                                        index === 0
                                                                            ? {
                                                                                  ...formData,
                                                                                  quantityPricing: newPricing,
                                                                                  price: newCompareAtPrice
                                                                              }
                                                                            : {
                                                                                  ...formData,
                                                                                  quantityPricing: newPricing
                                                                              };

                                                                    setFormData(updatedFormData);
                                                                }}
                                                                placeholder={t('pricing.placeholders.price')}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-5 flex h-10 w-10 items-center justify-center">
                                                        {index === 0 ? (
                                                            <Badge className="text-xs">{t('pricing.base')}</Badge>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    const newPricing = (
                                                                        formData.quantityPricing || []
                                                                    ).filter((_, i) => i !== index);
                                                                    setFormData({
                                                                        ...formData,
                                                                        quantityPricing: newPricing
                                                                    });
                                                                }}
                                                                title={t('pricing.removeTier')}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const newPricing = [
                                                        ...(formData.quantityPricing || []),
                                                        {
                                                            quantity: 1,
                                                            unit: formData.quantityUnit || formData.weightUnit || 'g',
                                                            compareAtPrice: 0,
                                                            price: 0
                                                        }
                                                    ];
                                                    setFormData({
                                                        ...formData,
                                                        quantityPricing: newPricing
                                                    });
                                                }}
                                                className="w-full">
                                                <Plus className="mr-2 h-4 w-4" />
                                                {t('pricing.addPriceTier')}
                                            </Button>
                                            <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-xs">
                                                <strong>{t('common.note')}:</strong> {t('pricing.tiersNote')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Discount Section */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base">{t('pricing.discountSettings')}</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="mb-1.5" htmlFor="discountType">{t('pricing.discountType')}</Label>
                                            <Select
                                                value={formData.discountType || 'none'}
                                                onValueChange={handleDiscountTypeChange}>
                                                <SelectTrigger id="discountType">
                                                    <SelectValue placeholder={t('pricing.selectType')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">{t('pricing.discount.none')}</SelectItem>
                                                    <SelectItem value="percentage">{t('pricing.discount.percentage')}</SelectItem>
                                                    <SelectItem value="fixed">{t('pricing.discount.fixed')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.discountType !== 'none' && (
                                            <div>
                                                <Label className="mb-1.5" htmlFor="discountAmount">{t('pricing.discountAmount')}</Label>
                                                <Input
                                                    id="discountAmount"
                                                    type="number" 
                                                    value={formData.discountAmount || 0}
                                                    onChange={(e) => handleDiscountChange(e.target.value)}
                                                    placeholder={
                                                        formData.discountType === 'percentage'
                                                            ? t('pricing.placeholders.percentage')
                                                            : t('pricing.placeholders.price')
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {formData.discountAmount > 0 && formData.discountType !== 'none' && (
                                        <div className="rounded-lg bg-muted/50 p-3">
                                            <p className="text-sm">
                                                <span className="font-medium">{t('pricing.finalPrice')} </span>
                                                {formData.discountType === 'percentage'
                                                    ? new Intl.NumberFormat('fr-FR', {
                                                          style: 'currency',
                                                          currency: formData.currency || 'EUR'
                                                      }).format(formData.price * (1 - formData.discountAmount / 100))
                                                    : new Intl.NumberFormat('fr-FR', {
                                                          style: 'currency',
                                                          currency: formData.currency || 'EUR'
                                                      }).format(Math.max(0, formData.price - formData.discountAmount))}
                                                <span className="ml-2 text-muted-foreground">
                                                    ({t('pricing.save')} {' '}
                                                    {formData.discountType === 'percentage'
                                                        ? `${formData.discountAmount}%`
                                                        : new Intl.NumberFormat('fr-FR', {
                                                              style: 'currency',
                                                              currency: formData.currency || 'EUR'
                                                          }).format(formData.discountAmount)}
                                                    )
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="details" className="mt-6 space-y-6" translate="no">
                    <div>
                        <h3 className="mb-4 font-semibold text-lg">{t('details.sectionTitle')}</h3>
                        <div className="space-y-6">
                            {/* Category and Collections */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="mb-2">{t('details.category')}</Label>
                                        <Select
                                            value={formData.categoryId || 'none'}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, categoryId: value === 'none' ? '' : value })
                                            }>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('details.selectCategory')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('details.noCategory')}</SelectItem>
                                                {categories
                                                    .filter((category) => category.id && category.name)
                                                    .map((category) => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="mb-2">{t('details.collections')}</Label>
                                        <div className="relative">
                                            <Select onValueChange={handleCollectionChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('details.addToCollections')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {collections
                                                        .filter(
                                                            (collection) =>
                                                                collection.id &&
                                                                collection.name &&
                                                                !(formData.collections || []).some((col) => {
                                                                    const currentColId =
                                                                        typeof col === 'string'
                                                                            ? col
                                                                            : col?.id || col?.key;
                                                                    return (
                                                                        currentColId === collection.id ||
                                                                        currentColId === collection.key
                                                                    );
                                                                })
                                                        )
                                                        .map((collection) => (
                                                            <SelectItem key={collection.id} value={collection.id}>
                                                                {collection.nameML?.[defaultLanguage] ||
                                                                    collection.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(formData.collections || []).map((collectionItem, index) => {
                                                    // Handle both object format {id, name} and string ID format
                                                    const collectionId =
                                                        typeof collectionItem === 'string'
                                                            ? collectionItem
                                                            : collectionItem?.id || collectionItem?.key;

                                                    if (!collectionId) {
                                                        return null;
                                                    }

                                                    const collectionData =
                                                        typeof collectionItem === 'object' && collectionItem.name
                                                            ? collectionItem
                                                            : collections.find(
                                                                  (c) => c.id === collectionId || c.key === collectionId
                                                              );

                                                    return collectionData ? (
                                                        <Badge
                                                            key={`${collectionId}-${index}`}
                                                            variant="outline"
                                                            className="gap-1">
                                                            {collectionData.nameML?.[defaultLanguage] ||
                                                                collectionData.name ||
                                                                t('details.unknownCollection')}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCollectionChange(collectionId)}
                                                                className="h-auto p-0 hover:bg-transparent">
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SKU Field with Auto-Generate */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <Label className="mb-1.5" htmlFor="sku">{t('details.sku')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="sku"
                                            value={formData.sku || generatedSku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder={t('details.enterSku')}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                const newSku = generateSKU();
                                                setGeneratedSku(newSku);
                                                setFormData({ ...formData, sku: newSku });
                                            }}
                                            title={t('details.generateSku')}>
                                            <Shuffle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="mt-1 text-muted-foreground text-xs">
                                        {t('details.skuHelp')}
                                    </p>
                                </div>
                            </div>

                            {/* Stock Management for Physical Products */}
                            {formData.type === 'physical' && (
                                <div className="space-y-4">
                                    <Label className="mb-4 font-semibold text-lg">{t('details.stockManagement')}</Label>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="mb-1.5" htmlFor="stock">
                                                {t('details.stockQuantity')}
                                            </Label>
                                            <div className="space-y-2">
                                                <Input
                                                    id="stock"
                                                    type="number"
                                                    min="0"
                                                    value={unlimitedStock ? '' : formData.stock}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value, 10) || 0;
                                                        setFormData({
                                                            ...formData,
                                                            stock: value
                                                        });
                                                    }}
                                                    placeholder={t('details.placeholders.zero')}
                                                    disabled={unlimitedStock}
                                                />
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="unlimited-stock"
                                                        checked={unlimitedStock}
                                                        onCheckedChange={(checked) => {
                                                            setUnlimitedStock(checked);
                                                            setFormData({
                                                                ...formData,
                                                                stock: checked ? -1 : 0
                                                            });
                                                        }}
                                                    />
                                                    <Label className="mb-1.5 text-sm" htmlFor="unlimited-stock">
                                                        {t('details.unlimitedStock')}
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>
                                        { !unlimitedStock && ( 
                                            <div>
                                                <Label className="mb-1.5" htmlFor="lowStock">
                                                    {t('details.lowStockThreshold')}
                                                </Label>
                                                <Input
                                                    id="lowStock"
                                                    type="number"
                                                    min="0"
                                                    value={!unlimitedStock ? formData.lowStockAlert : 0}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            lowStockAlert: parseInt(e.target.value, 10) || 0
                                                        })
                                                    }
                                                    placeholder={t('details.placeholders.five')}
                                                    className="max-w-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {formData.type === 'digital' && (
                                <>
                                    <div>
                                        <Label className="mb-1.5" htmlFor="downloadLink">{t('details.downloadLink')}</Label>
                                        <Input
                                            id="downloadLink"
                                            value={formData.downloadLink}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    downloadLink: e.target.value
                                                })
                                            }
                                            placeholder={t('details.placeholders.downloadLink')}
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5" htmlFor="downloadNotes">{t('details.downloadNotes')}</Label>
                                        <Textarea
                                            id="downloadNotes"
                                            value={formData.downloadNotes}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    downloadNotes: e.target.value
                                                })
                                            }
                                            placeholder={t('details.placeholders.downloadNotes')}
                                            className="h-24"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.type === 'service' && (
                                <>
                                    {/* Service Type */}
                                    <div>
                                        <Label className="mb-1.5" htmlFor="serviceType">{t('details.serviceType')}</Label>
                                        <Select
                                            value={formData.serviceType || 'standard'}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    serviceType: value
                                                })
                                            }>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('details.selectServiceType')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="standard">{t('details.serviceTypes.standard')}</SelectItem>
                                                <SelectItem value="consultation">{t('details.serviceTypes.consultation')}</SelectItem>
                                                <SelectItem value="workshop">{t('details.serviceTypes.workshop')}</SelectItem>
                                                <SelectItem value="maintenance">{t('details.serviceTypes.maintenance')}</SelectItem>
                                                <SelectItem value="custom">{t('details.serviceTypes.custom')}</SelectItem>
                                                <SelectItem value="subscription">{t('details.serviceTypes.subscription')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Duration - now optional */}
                                    <div>
                                        <Label className="mb-1.5" htmlFor="duration">{t('details.duration')}</Label>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="hasDuration"
                                                    checked={formData.hasDuration !== false}
                                                    onCheckedChange={(checked) =>
                                                        setFormData({
                                                            ...formData,
                                                            hasDuration: checked,
                                                            duration: checked ? formData.duration || 60 : null
                                                        })
                                                    }
                                                />
                                                <Label className="mb-1.5 text-sm" htmlFor="hasDuration">
                                                    {t('details.serviceHasDuration')}
                                                </Label>
                                            </div>

                                            {formData.hasDuration !== false && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Input
                                                            id="duration"
                                                            type="number"
                                                            min="0"
                                                            value={formData.duration || ''}
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    duration: parseInt(e.target.value, 10) || 0
                                                                })
                                                            }
                                                            placeholder={t('details.placeholders.sixty')}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Select
                                                            value={formData.durationUnit || 'minutes'}
                                                            onValueChange={(value) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    durationUnit: value
                                                                })
                                                            }>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="minutes">{t('details.durationUnits.minutes')}</SelectItem>
                                                                <SelectItem value="hours">{t('details.durationUnits.hours')}</SelectItem>
                                                                <SelectItem value="days">{t('details.durationUnits.days')}</SelectItem>
                                                                <SelectItem value="weeks">{t('details.durationUnits.weeks')}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.hasDuration === false && (
                                                <p className="text-muted-foreground text-sm">
                                                    {t('details.durationDetermined')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Service Delivery Method */}
                                    <div>
                                        <Label className="mb-1.5" htmlFor="deliveryMethod">{t('details.deliveryMethod')}</Label>
                                        <Select
                                            value={formData.deliveryMethod || 'in-person'}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    deliveryMethod: value
                                                })
                                            }>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('details.selectDeliveryMethod')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="in-person">{t('details.deliveryMethods.inPerson')}</SelectItem>
                                                <SelectItem value="remote">{t('details.deliveryMethods.remote')}</SelectItem>
                                                <SelectItem value="hybrid">{t('details.deliveryMethods.hybrid')}</SelectItem>
                                                <SelectItem value="on-site">{t('details.deliveryMethods.onSite')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Location/Platform Details */}
                                    {(formData.deliveryMethod === 'remote' || formData.deliveryMethod === 'hybrid') && (
                                        <div>
                                            <Label className="mb-1.5" htmlFor="platform">{t('details.platformTool')}</Label>
                                            <Input
                                                id="platform"
                                                value={formData.platform || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        platform: e.target.value
                                                    })
                                                }
                                                placeholder={t('details.placeholders.platform')}
                                            />
                                        </div>
                                    )}

                                    {/* Service Capacity */}
                                    <div>
                                        <Label className="mb-1.5" htmlFor="maxParticipants">{t('details.maxParticipants')}</Label>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="hasCapacityLimit"
                                                    checked={formData.hasCapacityLimit !== false}
                                                    onCheckedChange={(checked) =>
                                                        setFormData({
                                                            ...formData,
                                                            hasCapacityLimit: checked,
                                                            maxParticipants: checked
                                                                ? formData.maxParticipants || 1
                                                                : null
                                                        })
                                                    }
                                                />
                                                <Label className="mb-1.5 text-sm" htmlFor="hasCapacityLimit">
                                                    {t('details.limitParticipants')}
                                                </Label>
                                            </div>

                                            {formData.hasCapacityLimit !== false && (
                                                <Input
                                                    id="maxParticipants"
                                                    type="number"
                                                    min="1"
                                                    value={formData.maxParticipants || ''}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            maxParticipants: parseInt(e.target.value, 10) || 1
                                                        })
                                                    }
                                                    placeholder={t('pricing.placeholders.one')}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Prerequisites */}
                                    <div>
                                        <Label className="mb-1.5" htmlFor="prerequisites">{t('details.prerequisites')}</Label>
                                        <Textarea
                                            id="prerequisites"
                                            value={formData.prerequisites || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    prerequisites: e.target.value
                                                })
                                            }
                                            placeholder={t('details.placeholders.prerequisites')}
                                            className="h-20"
                                        />
                                    </div>

                                    {/* Service Includes */}
                                    <div>
                                        <Label className="mb-1.5" htmlFor="serviceIncludes">{t('details.whatsIncluded')}</Label>
                                        <Textarea
                                            id="serviceIncludes"
                                            value={formData.serviceIncludes || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    serviceIncludes: e.target.value
                                                })
                                            }
                                            placeholder={t('details.placeholders.whatsIncluded')}
                                            className="h-20"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-1.5" htmlFor="serviceNotes">{t('details.additionalNotes')}</Label>
                                        <Textarea
                                            id="serviceNotes"
                                            value={formData.serviceNotes || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    serviceNotes: e.target.value
                                                })
                                            }
                                            placeholder={t('details.placeholders.additionalNotes')}
                                            className="h-24"
                                        />
                                    </div>

                                    {/* Appointment Booking Options */}
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="requiresAppointment"
                                            checked={formData.requiresAppointment || false}
                                            onCheckedChange={(checked) =>
                                                setFormData({
                                                    ...formData,
                                                    requiresAppointment: checked
                                                })
                                            }
                                        />
                                        <Label htmlFor="requiresAppointment">{t('details.requiresAppointment')}</Label>
                                    </div>

                                    {formData.requiresAppointment && (
                                        <Card className="border-blue-200 bg-blue-50 p-4">
                                            <h4 className="mb-3 font-medium text-blue-900">{t('details.appointmentSettings')}</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="allowOnlineBooking"
                                                        checked={
                                                            formData.appointmentSettings?.allowOnlineBooking !== false
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            setFormData({
                                                                ...formData,
                                                                appointmentSettings: {
                                                                    ...formData.appointmentSettings,
                                                                    allowOnlineBooking: checked
                                                                }
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="allowOnlineBooking">{t('details.allowOnlineBooking')}</Label>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="bufferTime">{t('details.bufferTimeMinutes')}</Label>
                                                        <Input
                                                            id="bufferTime"
                                                            type="number"
                                                            min="0"
                                                            value={formData.appointmentSettings?.bufferTime || 15}
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    appointmentSettings: {
                                                                        ...formData.appointmentSettings,
                                                                        bufferTime: parseInt(e.target.value, 10) || 15
                                                                    }
                                                                })
                                                            }
                                                            placeholder={t('details.placeholders.fifteen')}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="advanceBookingDays">
                                                            {t('details.advanceBookingDays')}
                                                        </Label>
                                                        <Input
                                                            id="advanceBookingDays"
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                formData.appointmentSettings?.advanceBookingDays || 30
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    appointmentSettings: {
                                                                        ...formData.appointmentSettings,
                                                                        advanceBookingDays:
                                                                            parseInt(e.target.value, 10) || 30
                                                                    }
                                                                })
                                                            }
                                                            placeholder={t('details.placeholders.thirty')}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="mb-2 block font-medium text-sm">
                                                        {t('details.workingHours')}
                                                    </Label>
                                                    <div className="space-y-2 text-sm">
                                                        {[
                                                            'monday',
                                                            'tuesday',
                                                            'wednesday',
                                                            'thursday',
                                                            'friday',
                                                            'saturday',
                                                            'sunday'
                                                        ].map((day) => {
                                                            const daySettings = formData.appointmentSettings
                                                                ?.workingHours?.[day] || {
                                                                enabled: [
                                                                    'monday',
                                                                    'tuesday',
                                                                    'wednesday',
                                                                    'thursday',
                                                                    'friday'
                                                                ].includes(day),
                                                                start: '09:00',
                                                                end: '17:00'
                                                            };

                                                            return (
                                                                <div
                                                                    key={day}
                                                                    className="flex items-center gap-4 rounded border bg-white p-2">
                                                                    <div className="flex w-24 items-center space-x-2">
                                                                        <Checkbox
                                                                            id={`${day}-enabled`}
                                                                            checked={daySettings.enabled}
                                                                            onCheckedChange={(checked) =>
                                                                                setFormData({
                                                                                    ...formData,
                                                                                    appointmentSettings: {
                                                                                        ...formData.appointmentSettings,
                                                                                        workingHours: {
                                                                                            ...formData
                                                                                                .appointmentSettings
                                                                                                ?.workingHours,
                                                                                            [day]: {
                                                                                                ...daySettings,
                                                                                                enabled: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }
                                                                        />
                                                                        <Label
                                                                            htmlFor={`${day}-enabled`}
                                                                            className="text-xs capitalize">
                                                                            {day.slice(0, 3)}
                                                                        </Label>
                                                                    </div>
                                                                    {daySettings.enabled && (
                                                                        <>
                                                                            <Input
                                                                                type="time"
                                                                                value={daySettings.start}
                                                                                onChange={(e) =>
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        appointmentSettings: {
                                                                                            ...formData.appointmentSettings,
                                                                                            workingHours: {
                                                                                                ...formData
                                                                                                    .appointmentSettings
                                                                                                    ?.workingHours,
                                                                                                [day]: {
                                                                                                    ...daySettings,
                                                                                                    start: e.target
                                                                                                        .value
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    })
                                                                                }
                                                                                className="w-20 text-xs"
                                                                            />
                                                                            <span className="text-gray-500 text-xs">
                                                                                {t('details.to')}
                                                                            </span>
                                                                            <Input
                                                                                type="time"
                                                                                value={daySettings.end}
                                                                                onChange={(e) =>
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        appointmentSettings: {
                                                                                            ...formData.appointmentSettings,
                                                                                            workingHours: {
                                                                                                ...formData
                                                                                                    .appointmentSettings
                                                                                                    ?.workingHours,
                                                                                                [day]: {
                                                                                                    ...daySettings,
                                                                                                    end: e.target.value
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    })
                                                                                }
                                                                                className="w-20 text-xs"
                                                                            />
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="images" className="mt-6 space-y-6" translate="no">
                    <div>
                        <h3 className="mb-4 font-semibold text-lg">{t('images.sectionTitle')}</h3>
                        <div className="space-y-4">
                            {/* Image Upload Area */}
                            <div
                                className={`rounded-lg border-2 border-dashed p-6 transition-colors ${
                                    uploadingImages
                                        ? 'pointer-events-none border-primary bg-primary/10'
                                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
                                }`}>
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    {uploadingImages ? (
                                        <>
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="font-medium text-primary text-sm">{t('images.uploading')}</p>
                                            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-muted-foreground text-xs">
                                                {Math.round(uploadProgress)}%
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                            <div className="text-center">
                                                <Label
                                                    htmlFor="image-upload"
                                                    className="cursor-pointer font-medium text-sm">
                                                    {t('images.clickToUpload')}
                                                </Label>
                                                <p className="mt-1 text-muted-foreground text-xs">
                                                    {t('images.uploadHelp')}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    <Input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUploadLocal}
                                        disabled={uploadingImages}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Uploaded Images */}
                            {formData.images && formData.images.length > 0 && (
                                <div>
                                    <Label>{t('images.uploadedImages')}</Label>
                                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                        {formData.images.map((image, index) => (
                                            <div key={index} className="group relative">
                                                <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                                                    <img
                                                        src={image.url}
                                                        alt={image.alt || `Image ${index + 1}`}
                                                        className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
                                                    />
                                                </div>

                                                {/* Cover Image Badge */}
                                                {formData.coverImageIndex === index && (
                                                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                                                        <Star className="mr-1 h-3 w-3" />
                                                        {t('images.cover')}
                                                    </Badge>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <div className="flex space-x-1">
                                                        {formData.coverImageIndex !== index && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCoverImageChange(index);
                                                                    toast.success(t('toasts.coverImageUpdated'));
                                                                }}
                                                                className="h-8 w-8 bg-white/90 p-0 hover:bg-white"
                                                                title={t('images.setAsCover')}>
                                                                <Star className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeImage(index);
                                                                toast.success(t('toasts.imageRemoved'));
                                                            }}
                                                            className="h-8 w-8 bg-white/90 p-0 hover:bg-destructive"
                                                            title={t('images.removeImage')}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Image info */}
                                                <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-2 text-white text-xs opacity-0 transition-opacity group-hover:opacity-100">
                                                    <p className="truncate">{image.alt || `Image ${index + 1}`}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.images && formData.images.length === 0 && (
                                <div className="py-8 text-center">
                                    <ImageIcon className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                                    <p className="text-muted-foreground text-sm">{t('images.noImagesYet')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="attributes" className="mt-6 space-y-6" translate="no">
                    <div>
                        <h3 className="mb-2 font-semibold text-lg">{t('attributes.sectionTitle')}</h3>
                        <p className="mb-4 text-muted-foreground text-sm">
                            {t('attributes.description')}
                        </p>
                        <div className="space-y-6">
                            {/* Attributes Section - Simplified without Variants */}
                            <div className="space-y-4">
                                {/* Predefined Attributes from Database */}
                                {availableAttributes.length > 0 && (
                                    <div>
                                        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {availableAttributes.map((attr) => {
                                                const existingAttr = customAttributes.find(
                                                    (ca) => ca.slug === attr.slug || ca.name === attr.name
                                                );
                                                return (
                                                    <div key={attr.id || attr.slug} className="space-y-2">
                                                        <Label className="text-sm">
                                                            {attr.nameML?.[defaultLanguage] || attr.name}
                                                            {attr.isRequired && (
                                                                <span className="ml-1 text-destructive">*</span>
                                                            )}
                                                        </Label>
                                                        {attr.type === 'select' ? (
                                                            <Select
                                                                value={getDisplayValueByType(existingAttr, 'select')}
                                                                onValueChange={(value) => {
                                                                    updatePredefinedAttribute(attr, value);
                                                                }}
                                                                required={attr.isRequired}>
                                                                <SelectTrigger>
                                                                    <SelectValue
                                                                        placeholder={t('attributes.selectAttribute', {
                                                                            name: attr.name.toLowerCase()
                                                                        })}
                                                                    />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {attr.options?.map((option) => (
                                                                        <SelectItem key={option} value={option}>
                                                                            {option}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : attr.type === 'boolean' ? (
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    checked={getDisplayValueByType(
                                                                        existingAttr,
                                                                        'boolean'
                                                                    )}
                                                                    onCheckedChange={(checked) => {
                                                                        updatePredefinedAttribute(attr, checked);
                                                                    }}
                                                                />
                                                                <Label className="text-sm">
                                                                    {attr.descriptionML?.[defaultLanguage] ||
                                                                        attr.description ||
                                                                        t('common.yes')}
                                                                </Label>
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type={
                                                                    attr.type === 'number'
                                                                        ? 'number'
                                                                        : attr.type === 'color'
                                                                          ? 'color'
                                                                          : 'text'
                                                                }
                                                                value={getDisplayValueByType(existingAttr, attr.type)}
                                                                onChange={(e) => {
                                                                    updatePredefinedAttribute(attr, e.target.value);
                                                                }}
                                                                placeholder={t('attributes.enterAttribute', {
                                                                    name: attr.name.toLowerCase()
                                                                })}
                                                                required={attr.isRequired}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Custom Attributes */}
                                <div>
                                    <Label className="font-medium text-sm">{t('attributes.customTitle')}</Label> 

                                    {customAttributes.filter(
                                        (attr) =>
                                            !availableAttributes.some(
                                                (aa) => aa.slug === attr.slug || aa.name === attr.name
                                            )
                                    ).length > 0 && (
                                        <div className="mt-2 space-y-3">
                                            {customAttributes
                                                .filter(
                                                    (attr) =>
                                                        !availableAttributes.some(
                                                            (aa) => aa.slug === attr.slug || aa.name === attr.name
                                                        )
                                                )
                                                .map((attr, _index) => {
                                                    const actualIndex = customAttributes.indexOf(attr);
                                                    return (
                                                        <div
                                                            key={actualIndex}
                                                            className="space-y-2 rounded-lg border p-3">
                                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                <div className="space-y-1">
                                                                    <Label className="text-muted-foreground text-xs">
                                                                        {t('attributes.attributeName', {
                                                                            lang: currentLanguage.toUpperCase()
                                                                        })}
                                                                    </Label>
                                                                    <Input
                                                                        value={getAttributeMultiLanguageValue(
                                                                            actualIndex,
                                                                            'name',
                                                                            currentLanguage
                                                                        )}
                                                                        onChange={(e) =>
                                                                            updateAttributeMultiLanguageField(
                                                                                actualIndex,
                                                                                'name',
                                                                                currentLanguage,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        placeholder={t('attributes.enterAttributeName', {
                                                                            lang: currentLanguage.toUpperCase()
                                                                        })}
                                                                        required={currentLanguage === defaultLanguage}
                                                                    />
                                                                    {currentLanguage !== defaultLanguage && (
                                                                        <p className="text-muted-foreground text-xs">
                                                                            {t('common.translationHint', {
                                                                                lang: currentLanguage.toUpperCase()
                                                                            })}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1 space-y-1">
                                                                        <Label className="text-muted-foreground text-xs">
                                                                            {t('attributes.attributeValue', {
                                                                                lang: currentLanguage.toUpperCase()
                                                                            })}
                                                                        </Label>
                                                                        <Input
                                                                            value={getAttributeMultiLanguageValue(
                                                                                actualIndex,
                                                                                'value',
                                                                                currentLanguage
                                                                            )}
                                                                            onChange={(e) =>
                                                                                updateAttributeMultiLanguageField(
                                                                                    actualIndex,
                                                                                    'value',
                                                                                    currentLanguage,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder={t('attributes.enterAttributeValue', {
                                                                                lang: currentLanguage.toUpperCase()
                                                                            })}
                                                                            required={
                                                                                currentLanguage === defaultLanguage
                                                                            }
                                                                        />
                                                                        {currentLanguage !== defaultLanguage && (
                                                                            <p className="text-muted-foreground text-xs">
                                                                                {t('common.translationHint', {
                                                                                    lang: currentLanguage.toUpperCase()
                                                                                })}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-end">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                removeAttribute(actualIndex)
                                                                            }>
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                    <Button type="button" variant="outline" onClick={addAttribute} className="mt-2">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('attributes.addCustomAttribute')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="seo" className="mt-6 space-y-6" translate="no">
                    <div>
                        <h3 className="mb-4 font-semibold text-lg">{t('seo.sectionTitle')}</h3>
                        <div className="space-y-6"> 

                            {/* Basic Meta Tags */}
                            <div className="space-y-4"> 
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap justify-between gap-2">
                                        <Label htmlFor="metaTitle">{t('seo.metaTitle', { language: languageLabels[currentLanguage] })}</Label> 
                                        <GenerateAI
                                            lang={currentLanguage}
                                            instructions={`Create an SEO-optimized meta title (50-60 characters) for this product. Product name: "${getProductInfo().productName}". Product description: "${getProductInfo().productDescription}". Make it compelling and include relevant keywords to attract customers and improve search rankings.`}
                                            placeholder={t('seo.generateMetaTitlePlaceholder')}
                                            allowCode={false}
                                            onGenerated={handleGenerateMetaTitle}
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs"
                                        />
                                        </div>
                                        <Input
                                            id="metaTitle"
                                            value={getSEOMultiLanguageValue('metaTitle', currentLanguage)}
                                            onChange={(e) =>
                                                updateSEOMultiLanguageField(
                                                    'metaTitle',
                                                    currentLanguage,
                                                    e.target.value
                                                )
                                            }
                                            placeholder={t('seo.metaTitlePlaceholder', {
                                                lang: currentLanguage.toUpperCase()
                                            })}
                                            maxLength={60}
                                        />
                                        <p className="text-muted-foreground text-xs">
                                            {getSEOMultiLanguageValue('metaTitle', currentLanguage).length}/60
                                            {t('seo.characters')}
                                            {currentLanguage !== defaultLanguage &&
                                                ` - ${t('seo.translationFor', { lang: currentLanguage.toUpperCase() })}`}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap justify-between gap-2">
                                        <Label htmlFor="metaDescription">{t('seo.metaDescription', { language: languageLabels[currentLanguage] })}</Label> 
                                        <GenerateAI 
                                            instructions={`Create an SEO-optimized meta description (150-160 characters) for this product. Product name: "${getProductInfo().productName}". Product description: "${getProductInfo().productDescription}". Make it compelling, descriptive, and include relevant keywords to improve search rankings and click-through rates.`}
                                            placeholder={t('seo.generateMetaDescriptionPlaceholder')}
                                            allowCode={false}
                                            lang={currentLanguage}
                                            onGenerated={handleGenerateMetaDescription}
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs"
                                        />
                                        </div>
                                        <Textarea
                                            id="metaDescription"
                                            value={getSEOMultiLanguageValue('metaDescription', currentLanguage)}
                                            onChange={(e) =>
                                                updateSEOMultiLanguageField(
                                                    'metaDescription',
                                                    currentLanguage,
                                                    e.target.value
                                                )
                                            }
                                            placeholder={t('seo.metaDescriptionPlaceholder', {
                                                lang: currentLanguage.toUpperCase()
                                            })}
                                            maxLength={160}
                                            className="h-20"
                                        />
                                        <p className="text-muted-foreground text-xs">
                                            {getSEOMultiLanguageValue('metaDescription', currentLanguage).length}
                                            /160 {t('seo.characters')}
                                            {currentLanguage !== defaultLanguage &&
                                                ` - ${t('seo.translationFor', { lang: currentLanguage.toUpperCase() })}`}
                                        </p>
                                    </div> 
                                    <div className="space-y-2">
                                        <Label htmlFor="ogImage">{t('seo.ogImageUrl')}</Label>
                                        <Input
                                            id="ogImage"
                                            type="url"
                                            value={formData.seo?.ogImage || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    seo: { ...formData.seo, ogImage: e.target.value }
                                                })
                                            }
                                            placeholder={t('seo.ogImagePlaceholder')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SEO Preview */}
                            <div className="space-y-4">
                                <Label className="font-medium text-base">
                                    {t('seo.searchPreview', { language: languageLabels[currentLanguage] })}
                                </Label>
                                <div className="rounded-lg border bg-gray-50 p-4">
                                    <div className="space-y-1">
                                        <div className="line-clamp-1 font-medium text-blue-600 text-lg">
                                            {getSEOMultiLanguageValue('metaTitle', currentLanguage) ||
                                                getMultiLanguageValue('name', currentLanguage) ||
                                                t('seo.yourProductTitle')}
                                        </div>
                                        <div className="text-green-700 text-sm">
                                            yoursite.com/
                                            {currentLanguage !== defaultLanguage ? `${currentLanguage}/` : ''}
                                            products/{formData.slug || t('seo.productSlug')}
                                        </div>
                                        <div className="line-clamp-2 text-gray-600 text-sm">
                                            {getSEOMultiLanguageValue('metaDescription', currentLanguage) ||
                                                getMultiLanguageValue('description', currentLanguage) ||
                                                t('seo.productDescriptionPreview')}
                                        </div>
                                    </div>
                                    {currentLanguage !== defaultLanguage && (
                                        <p className="mt-2 border-t pt-2 text-muted-foreground text-xs">
                                            {t('seo.previewForLanguage', { lang: currentLanguage.toUpperCase() })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Submit button only shown if showSubmitButton is true (for standalone usage) */}
            {showSubmitButton && (
                <div className="flex justify-end space-x-4 pt-6">
                    <Button type="submit" disabled={isSubmitting} className="min-w-30">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {editItem ? t('actions.updating') : t('actions.creating')}
                            </>
                        ) : editItem ? (
                            t('actions.updateItem')
                        ) : (
                            t('actions.createItem')
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
