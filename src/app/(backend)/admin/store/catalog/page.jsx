// @/app/(backend)/admin/store/catalog/page.jsx

'use client';

import { DialogDescription } from '@radix-ui/react-dialog';
import {
    BadgePercent,
    Download,
    Image,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    SlidersHorizontal,
    Star,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCatalogItem, deleteCatalogItem, updateCatalogItem, uploadFiles } from '@/lib/server/admin';
import { getSettings } from '@/lib/server/settings';
import { getCatalog, getCategories, getCollections } from '@/lib/server/store';
import { useAdminSettings } from '../../context/LayoutProvider';
import { formatAvailableLanguages } from '@/lib/i18n';
import { CatalogItemForm } from './CatalogItemForm';

const initialFormData = {
    type: 'physical',
    name: '', // Will be converted to multi-language object
    nameML: {}, // Multi-language names: { en: 'Name', fr: 'Nom' }
    slug: '',
    sku: '',
    description: '', // Will be converted to multi-language object
    descriptionML: {}, // Multi-language descriptions
    price: 0,
    currency: 'EUR',
    discountAmount: 0,
    discountType: 'none', // 'none', 'percentage' or 'fixed' - default to no discount
    categoryId: '',
    collections: [],
    images: [],
    coverImageIndex: 0,
    quantity: 1, // Default to 1 instead of 0
    quantityUnit: 'g', // Unit type: kg, g, oz, lb, unit, piece, box, etc.
    stock: -1, // -1 for unlimited stock
    lowStockAlert: 5,
    // Wholesale/Quantity-based pricing
    hasQuantityPricing: true,
    quantityPricing: [], // [{ quantity: 1, unit: 'g', price: 10 }]
    downloadLink: '',
    downloadNotes: '',
    duration: 60,
    hasDuration: true,
    durationUnit: 'minutes',
    serviceType: 'standard',
    deliveryMethod: 'in-person',
    platform: '',
    maxParticipants: 1,
    hasCapacityLimit: true,
    prerequisites: '',
    serviceIncludes: '',
    serviceNotes: '',
    requiresAppointment: false,
    appointmentSettings: {
        allowOnlineBooking: false,
        bufferTime: 15, // minutes between appointments
        advanceBookingDays: 30, // how far in advance customers can book
        workingHours: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '17:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' }
        }
    },
    customAttributes: [],
    // SEO fields with multi-language support
    seo: {
        metaTitle: '',
        metaTitleML: {},
        metaDescription: '',
        metaDescriptionML: {},
        metaKeywords: '',
        metaKeywordsML: {},
        ogImage: ''
    },
    isActive: true,
    isFeatured: false
};

export default function CatalogPage() {
    const t = useTranslations('Admin.Catalog');
    const [catalog, setCatalog] = useState([]);
    const [categories, setCategories] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [storeSettings, setStoreSettings] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fetchError, setFetchError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Get settings from LayoutProvider context
    const { siteSettings } = useAdminSettings();

    // Language configuration
    const availableLanguages = siteSettings?.languages || ['en'];
    const defaultLanguage = siteSettings?.language || 'en';
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);

    // Language labels mapping using i18n formatting
    const formattedLanguages = formatAvailableLanguages(availableLanguages, selectedLanguage);
    const languageLabels = formattedLanguages.reduce((acc, lang) => {
        acc[lang.code] = lang.name;
        return acc;
    }, {});

    // Filter states following orders page pattern
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [collectionFilter, setCollectionFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [featuredFilter, setFeaturedFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [discountFilter, setDiscountFilter] = useState('all');
    const [priceRangeFilter, setPriceRangeFilter] = useState('all');
    const [sortByFilter, setSortByFilter] = useState('newest');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            typeFilter !== 'all' ||
            categoryFilter !== 'all' ||
            collectionFilter !== 'all' ||
            statusFilter !== 'all' ||
            featuredFilter !== 'all' ||
            stockFilter !== 'all' ||
            discountFilter !== 'all' ||
            priceRangeFilter !== 'all' ||
            sortByFilter !== 'newest'
        );
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'itemId', label: t('csv.itemId'), defaultChecked: true },
        {
            key: 'basicInfo',
            label: t('csv.basicInfo.label'),
            headers: [t('table.name'), t('csv.type'), t('csv.sku')],
            fields: ['name', 'type', 'sku'],
            defaultChecked: true
        },
        {
            key: 'pricing',
            label: t('csv.pricing.label'),
            headers: [t('table.price'), t('csv.currency'), t('csv.discountType'), t('csv.discountAmount')],
            fields: ['price', 'currency', 'discountType', 'discountAmount'],
            defaultChecked: true
        },
        {
            key: 'inventory',
            label: t('csv.inventory.label'),
            headers: [t('csv.stock'), t('csv.lowStockAlert'), t('csv.quantity'), t('csv.quantityUnit')],
            fields: ['stock', 'lowStockAlert', 'quantity', 'quantityUnit'],
            defaultChecked: true
        },
        {
            key: 'categoryInfo',
            label: t('csv.categoryInfo.label'),
            headers: [t('table.category'), t('table.collections')],
            fields: ['category', 'collections'],
            defaultChecked: true
        },
        {
            key: 'status',
            label: t('csv.status.label'),
            headers: [t('csv.statusTitle'), t('csv.featured'), t('csv.active')],
            fields: ['status', 'featured', 'active'],
            defaultChecked: true
        },
        {
            key: 'seoData',
            label: t('csv.seoData.label'),
            headers: [t('csv.metaTitle'), t('csv.metaDescription'), t('csv.metaKeywords')],
            fields: ['metaTitle', 'metaDescription', 'metaKeywords'],
            defaultChecked: false
        },
        {
            key: 'timestamps',
            label: t('csv.timestamps.label'),
            headers: [t('csv.createdAt'), t('csv.updatedAt')],
            fields: ['createdAt', 'updatedAt'],
            defaultChecked: true
        }
    ];

    const formatCatalogRowData = (item, selectedOptions, fieldMapping) => {
        const category = categories.find(
            (cat) =>
                cat.id === item.categoryId ||
                cat.key === item.categoryId ||
                cat.id === item.category ||
                cat.key === item.category
        );

        const itemCollections = (item.collections || [])
            .map((collectionId) => {
                const collection = collections.find((c) => c.id === collectionId || c.key === collectionId);
                return collection?.name || collection?.nameML?.[defaultLanguage] || collectionId;
            })
            .join(', ');

        const rowData = {
            itemId: item.id || '',
                        name: item.nameML?.[defaultLanguage] || item.name || t('common.untitled'),
            type: item.type || '',
            sku: item.sku || '',
            price: formatPrice(item.price || 0),
            currency: item.currency || 'EUR',
            discountType: item.discountType || 'none',
            discountAmount: item.discountAmount || 0,
            stock:
                item.type === 'service' || item.type === 'digital'
                                        ? t('stock.na')
                    : item.stock === -1
                                            ? t('stock.unlimited')
                      : item.stock || 0,
            lowStockAlert: item.lowStockAlert || 0,
            quantity: item.quantity || 0,
            quantityUnit: item.quantityUnit || '',
            category:
                category?.name ||
                category?.nameML?.[defaultLanguage] ||
                Object.values(category?.nameML || {})[0] ||
                '-',
            collections: itemCollections || '-',
            status: item.isActive ? t('status.active') : t('status.inactive'),
            featured: item.isFeatured ? t('common.yes') : t('common.no'),
            active: item.isActive ? t('common.yes') : t('common.no'),
            metaTitle: item.seo?.metaTitleML?.[defaultLanguage] || item.seo?.metaTitle || '',
            metaDescription: item.seo?.metaDescriptionML?.[defaultLanguage] || item.seo?.metaDescription || '',
            metaKeywords: item.seo?.metaKeywordsML?.[defaultLanguage] || item.seo?.metaKeywords || '',
            createdAt: item.createdAt ? formatDate(item.createdAt) : '',
            updatedAt: item.updatedAt ? formatDate(item.updatedAt) : ''
        };

        return fieldMapping.map((field) => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
        });
    };

    const fetchData = async (isRetry = false) => {
        try {
            setLoading(isRetry ? false : true);
            if (isRetry) {
                setIsRetrying(true);
                setFetchError(null);
            }

            const [catalogRes, categoriesRes, collectionsRes, settingsRes] = await Promise.all([
                getCatalog({
                    limit: 0, // Get all items
                    activeOnly: false // Admin sees all items
                }),
                getCategories({ limit: 0, activeOnly: false }), // Get all categories for admin
                getCollections({ limit: 0 }), // Get all collections for admin
                getSettings()
            ]);

            if (catalogRes?.success) {
                setCatalog(catalogRes.data);
            }
            if (categoriesRes?.success) {
                setCategories(categoriesRes.data);
            }
            if (collectionsRes?.success) {
                setCollections(collectionsRes.data);
            }
            if (settingsRes) {
                // getSettings returns { siteSettings, storeSettings, adminSiteSettings, adminStoreSettings }
                if (settingsRes.adminStoreSettings) {
                    setStoreSettings(settingsRes.adminStoreSettings);
                }
            }

            setFetchError(null);
        } catch (error) {
            console.error('Error fetching data:', error);
            setFetchError(t('errors.loadData'));
            toast.error(t('toasts.fetchFailed'));
        } finally {
            setLoading(false);
            setIsRetrying(false);
        }
    };

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setSelectedLanguage(newLang);
    };

    // Multi-language helper functions
    const updateMultiLanguageField = (fieldName, langCode, value) => {
        const mlField = `${fieldName}ML`;
        const currentMLValues = formData[mlField] || {};
        
        setFormData({
            ...formData,
            [fieldName]: langCode === defaultLanguage ? value : formData[fieldName],
            [mlField]: {
                ...currentMLValues,
                [langCode]: value
            }
        });
    };

    const getMultiLanguageValue = (fieldName, langCode) => {
        const mlField = `${fieldName}ML`;
        return formData[mlField]?.[langCode] || (langCode === defaultLanguage ? formData[fieldName] : '');
    };

    // Retry function to refetch all data
    const handleRetryFetch = async () => {
        await fetchData(true);
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            setFetchError(null);

            const [catalogRes, categoriesRes, collectionsRes, settingsRes] = await Promise.all([
                getCatalog({
                    limit: 0, // Get all items
                    activeOnly: false, // Admin sees all items
                    options: { duration: '0' } // Force fresh data by bypassing cache
                }),
                getCategories({
                    limit: 0,
                    activeOnly: false,
                    options: { duration: '0' }
                }),
                getCollections({
                    limit: 0,
                    options: { duration: '0' }
                }),
                getSettings({ options: { duration: '0' } })
            ]);

            if (catalogRes?.success) {
                setCatalog(catalogRes.data);
            }
            if (categoriesRes?.success) {
                setCategories(categoriesRes.data);
            }
            if (collectionsRes?.success) {
                setCollections(collectionsRes.data);
            }
            if (settingsRes) {
                // getSettings returns { siteSettings, storeSettings, adminSiteSettings, adminStoreSettings }
                if (settingsRes.adminStoreSettings) {
                    setStoreSettings(settingsRes.adminStoreSettings);
                }
            }  
            toast.success(t('toasts.dataRefreshed'));
        } catch (error) {
            console.error('Error refreshing data:', error);
            setFetchError(t('errors.refreshData'));
            toast.error(t('toasts.refreshFailed')); 
        } finally {
            setIsRefreshingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleImageUpload = async (files) => {
        // Prevent multiple uploads
        if (uploadingImages) {
            toast.error(t('toasts.waitUpload'));
            return;
        }

        // Ensure files is an array
        const fileArray = Array.isArray(files) ? files : [files];

        if (fileArray.length === 0) {
            toast.error(t('toasts.noFiles'));
            return;
        }

        setUploadingImages(true);
        setUploadProgress(0);

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 200);

        try {
            // Validation constants (matching backend-data.js)
            const maxFileSize = 10 * 1024 * 1024; // 10MB limit
            const blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.sh'];

            // Validate files before upload
            const validFiles = [];
            for (const file of fileArray) {
                // Skip if no file or no name
                if (!file || !file.name) {
                    continue;
                }

                // Validation: File size
                if (file.size > maxFileSize) {
                    toast.error(t('toasts.fileTooLarge', { name: file.name }));
                    continue;
                }

                // Security checks: Extension
                const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
                if (blockedExtensions.includes(fileExtension)) {
                    toast.error(t('toasts.fileTypeNotAllowed', { name: file.name, extension: fileExtension }));
                    continue;
                }

                // Validation: Image files only
                if (!file.type.startsWith('image/')) {
                    toast.error(t('toasts.notImageFile', { name: file.name }));
                    continue;
                }

                validFiles.push(file);
            }

            if (validFiles.length === 0) {
                toast.error(t('toasts.noValidImages'));
                clearInterval(progressInterval);
                setUploadingImages(false);
                setUploadProgress(0);
                return;
            }

            // Upload files directly using server function
            const result = await uploadFiles(validFiles, 'uploads');

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result.success && result.files?.length > 0) {
                const uploadedImages = result.files.map((file) => ({
                    url: file.url,
                    alt: file.originalName || file.filename
                }));

                setFormData((prev) => {
                    const updatedImages = [...prev.images, ...uploadedImages];
                    return {
                        ...prev,
                        images: updatedImages
                    };
                });

                toast.success(t('toasts.uploadSuccess', { count: result.files.length }));
            } else {
                const errorMsg = result.error || t('toasts.uploadFailed');
                toast.error(errorMsg);
                console.error('Upload failed:', errorMsg);
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Upload error:', error);
            toast.error(error.message || t('toasts.uploadFailed'));
        } finally {
            setTimeout(() => {
                setUploadingImages(false);
                setUploadProgress(0);
            }, 800);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validate slug is provided
            if (!formData.slug || formData.slug.trim() === '') {
                toast.error(t('toasts.slugRequired'));
                setIsSubmitting(false);
                return;
            }

            // Check for slug uniqueness in current catalog
            const existingItems = catalog.filter(
                (item) => item.slug === formData.slug && (!editItem || item.key !== editItem.key)
            );

            if (existingItems.length > 0) {
                toast.error(t('toasts.slugExists'));
                setIsSubmitting(false);
                return;
            }

            // Filter form data to only include relevant fields based on product type
            let typeSpecificData = {
                // Universal fields for all types
                type: formData.type,
                name: formData.name,
                nameML: formData.nameML,
                slug: formData.slug,
                sku: formData.sku,
                description: formData.description,
                descriptionML: formData.descriptionML,
                price: formData.price,
                compareAtPrice: formData.compareAtPrice || formData.price,
                discountAmount: formData.discountAmount,
                discountType: formData.discountType,
                currency: storeSettings?.currency || 'EUR',
                categoryId: formData.categoryId,
                collections: (formData.collections || []).filter((col) => {
                    if (!col) return false;
                    // Keep string IDs (legacy format)
                    if (typeof col === 'string') return col.trim().length > 0;
                    // Keep collection objects with valid id
                    if (typeof col === 'object' && (col.id || col.key)) return true;
                    return false;
                }),
                images: formData.images || [],
                coverImageIndex: formData.coverImageIndex >= 0 ? formData.coverImageIndex : 0,
                customAttributes: formData.customAttributes || [],
                seo: formData.seo || {},
                isActive: formData.isActive,
                isFeatured: formData.isFeatured
            };

            // Add type-specific fields based on product type
            if (formData.type === 'physical') {
                typeSpecificData = {
                    ...typeSpecificData,
                    quantity: formData.quantity,
                    quantityUnit: formData.quantityUnit,
                    stock: formData.stock,
                    lowStockAlert: formData.lowStockAlert,
                    hasQuantityPricing: formData.hasQuantityPricing,
                    quantityPricing: formData.quantityPricing || []
                };
            } else if (formData.type === 'digital') {
                typeSpecificData = {
                    ...typeSpecificData,
                    downloadLink: formData.downloadLink,
                    downloadNotes: formData.downloadNotes
                };
            } else if (formData.type === 'service') {
                typeSpecificData = {
                    ...typeSpecificData,
                    serviceType: formData.serviceType,
                    duration: formData.duration,
                    durationUnit: formData.durationUnit,
                    hasDuration: formData.hasDuration,
                    deliveryMethod: formData.deliveryMethod,
                    platform: formData.platform,
                    maxParticipants: formData.maxParticipants,
                    hasCapacityLimit: formData.hasCapacityLimit,
                    prerequisites: formData.prerequisites,
                    serviceIncludes: formData.serviceIncludes,
                    serviceNotes: formData.serviceNotes,
                    requiresAppointment: formData.requiresAppointment,
                    appointmentSettings: formData.appointmentSettings
                };
            }

            if (editItem) {
                const updatedItemRes = await updateCatalogItem(editItem.key || editItem.id, typeSpecificData);
                if (updatedItemRes.success) {
                    toast.success(t('toasts.itemUpdated'));
                    // Refresh data to get the actual saved state
                    await fetchData();
                } else {
                    toast.error(updatedItemRes.error || t('toasts.updateFailed'));
                    setIsSubmitting(false);
                    return;
                }
            } else {
                const newItemRes = await createCatalogItem(typeSpecificData);
                if (newItemRes.success) {
                    toast.success(t('toasts.itemCreated'));
                    // Refresh data to get the actual saved state
                    await fetchData();
                } else {
                    toast.error(newItemRes.error || t('toasts.createFailed'));
                    setIsSubmitting(false);
                    return;
                }
            }

            setIsOpen(false);
            setFormData(initialFormData);
            setEditItem(null);
        } catch (error) {
            toast.error(error.message || t('toasts.saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (product) => {
        setEditItem(product);
        setFormData({
            ...initialFormData,
            ...product,
            // Ensure all fields are properly set
            slug: product.slug || '',
            // Handle multi-language fields - backwards compatibility
            nameML: product.nameML || (product.name ? { [defaultLanguage]: product.name } : {}),
            descriptionML:
                product.descriptionML || (product.description ? { [defaultLanguage]: product.description } : {}),
            // FIXED: Ensure collections are properly structured as objects
            collections: Array.isArray(product.collections) ? product.collections : [],
            images: product.gallery || product.images || [],
            customAttributes: product.attributes || product.customAttributes || [],
            categoryId: product.category || product.categoryId || '',
            // Quantity and unit type (backwards compatible with weight)
            quantity: product.quantity || product.weight || 0,
            quantityUnit: product.quantityUnit || product.weightUnit || 'g',
            // Quantity-based pricing
            hasQuantityPricing: product.hasQuantityPricing || true,
            quantityPricing: product.quantityPricing || [],
            // SEO fields with proper structure and multi-language support
            seo: {
                metaTitle: product.seo?.metaTitle || '',
                metaTitleML:
                    product.seo?.metaTitleML ||
                    (product.seo?.metaTitle ? { [defaultLanguage]: product.seo.metaTitle } : {}),
                metaDescription: product.seo?.metaDescription || '',
                metaDescriptionML:
                    product.seo?.metaDescriptionML ||
                    (product.seo?.metaDescription ? { [defaultLanguage]: product.seo.metaDescription } : {}),
                metaKeywords: product.seo?.metaKeywords || '',
                metaKeywordsML:
                    product.seo?.metaKeywordsML ||
                    (product.seo?.metaKeywords ? { [defaultLanguage]: product.seo.metaKeywords } : {}),
                ogImage: product.seo?.ogImage || ''
            },
            // Ensure numeric fields are properly handled
            price: product.compareAtPrice || product.price || 0,
            discountAmount: product.discountAmount || 0,
            discountType: product.discountType || 'none',
            stock: product.stock || 0,
            lowStockAlert: product.lowStockAlert || 5,
            duration: product.duration || 60,
            coverImageIndex: product.coverImageIndex || 0,
            isFeatured: product.isFeatured || false
        });
        setIsOpen(true);
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            const deleteRes = await deleteCatalogItem(itemToDelete.key || itemToDelete.id);
            if (deleteRes.success) {
                toast.success(t('toasts.itemDeleted'));
                setDeleteConfirmOpen(false);
                setItemToDelete(null);
                fetchData();
            } else {
                toast.error(deleteRes.error || t('toasts.deleteFailed'));
            }
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error(t('toasts.deleteFailed'));
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const formatPrice = (price) => {
        const currency = storeSettings?.currency || 'EUR';
        const locale = currency === 'EUR' ? 'fr-FR' : currency === 'USD' ? 'en-US' : 'en-GB';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(price);
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('common.na');
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return t('common.invalidDate');
        }
    };

    // Enhanced filter function for AdminTable with comprehensive filtering
    const filterCatalogItems = (items, search, sortConfig) => {
        if (!items || !Array.isArray(items)) return [];

        const filteredItems = items.filter((item) => {
            // Search filter
            if (search?.trim()) {
                const searchLower = search.toLowerCase().trim();
                const nameMatch =
                    item.nameML?.[defaultLanguage]?.toLowerCase().includes(searchLower) ||
                    item.name?.toLowerCase().includes(searchLower) ||
                    false;
                const descriptionMatch =
                    item.descriptionML?.[defaultLanguage]?.toLowerCase().includes(searchLower) ||
                    item.description?.toLowerCase().includes(searchLower) ||
                    false;
                const skuMatch = item.sku?.toLowerCase().includes(searchLower) || false;
                const slugMatch = item.slug?.toLowerCase().includes(searchLower) || false;
                const itemCategoryRef = item.categoryId || item.category;
                const category = categories.find((c) => c.key === itemCategoryRef || c.id === itemCategoryRef);
                const categoryMatch =
                    category?.nameML?.[defaultLanguage]?.toLowerCase().includes(searchLower) ||
                    category?.name?.toLowerCase().includes(searchLower) ||
                    false;

                if (!(nameMatch || descriptionMatch || skuMatch || slugMatch || categoryMatch)) {
                    return false;
                }
            }

            // Type filter
            if (typeFilter !== 'all' && item.type !== typeFilter) return false;

            // Category filter
            if (categoryFilter !== 'all') {
                // Check multiple possible field names for category reference
                const itemCategoryRef = item.categoryId || item.category;
                const itemHasMatchingCategory = categories.some(
                    (c) =>
                        (c.id === itemCategoryRef || c.key === itemCategoryRef) &&
                        (c.id === categoryFilter || c.key === categoryFilter)
                );
                if (!itemHasMatchingCategory) return false;
            }

            // Collection filter
            if (collectionFilter !== 'all') {
                if (!item.collections || !Array.isArray(item.collections) || item.collections.length === 0) {
                    return false;
                }

                // Check if any of the item's collections match the filter
                const hasMatchingCollection = item.collections.some(
                    (collection) =>
                        collection && (collection.id === collectionFilter || collection.key === collectionFilter)
                );

                if (!hasMatchingCollection) return false;
            }

            // Status filter (active/inactive)
            if (statusFilter !== 'all') {
                if (statusFilter === 'active' && !item.isActive) return false;
                if (statusFilter === 'inactive' && item.isActive) return false;
            }

            // Featured filter
            if (featuredFilter !== 'all') {
                if (featuredFilter === 'featured' && !item.isFeatured) return false;
                if (featuredFilter === 'not-featured' && item.isFeatured) return false;
            }

            // Stock filter
            if (stockFilter !== 'all') {
                if (item.type === 'service' || item.type === 'digital') {
                    // Digital and service items are always "available" if active
                    if (stockFilter === 'out-of-stock') return false;
                } else {
                    // Physical items
                    if (stockFilter === 'in-stock' && item.stock <= 0 && item.stock !== -1) return false;
                    if (stockFilter === 'out-of-stock' && (item.stock > 0 || item.stock === -1)) return false;
                    if (stockFilter === 'unlimited' && item.stock !== -1) return false;
                }
            }

            // Discount filter
            if (discountFilter !== 'all') {
                const hasDiscount = item.discountAmount && item.discountAmount > 0;
                if (discountFilter === 'with-discount' && !hasDiscount) return false;
                if (discountFilter === 'without-discount' && hasDiscount) return false;
            }

            // Price range filter
            if (priceRangeFilter !== 'all') {
                const price = parseFloat(item.price || 0);
                switch (priceRangeFilter) {
                    case 'under-10':
                        if (price >= 10) return false;
                        break;
                    case '10-50':
                        if (price < 10 || price > 50) return false;
                        break;
                    case '50-100':
                        if (price < 50 || price > 100) return false;
                        break;
                    case 'over-100':
                        if (price <= 100) return false;
                        break;
                }
            }

            return true;
        });

        // Apply sorting based on sortByFilter or sortConfig
        const effectiveSortConfig = sortConfig || {
            key:
                sortByFilter === 'price-high'
                    ? 'price'
                    : sortByFilter === 'price-low'
                      ? 'price'
                      : sortByFilter === 'name'
                        ? 'name'
                        : sortByFilter === 'oldest'
                          ? 'createdAt'
                          : 'createdAt',
            direction:
                sortByFilter === 'price-high'
                    ? 'desc'
                    : sortByFilter === 'price-low'
                      ? 'asc'
                      : sortByFilter === 'name'
                        ? 'asc'
                        : sortByFilter === 'oldest'
                          ? 'asc'
                          : 'desc'
        };

        if (effectiveSortConfig.key) {
            filteredItems.sort((a, b) => {
                let aValue, bValue;

                if (effectiveSortConfig.key === 'name') {
                    aValue = a.nameML?.[defaultLanguage] || a.name || '';
                    bValue = b.nameML?.[defaultLanguage] || b.name || '';
                } else if (effectiveSortConfig.key === 'category') {
                    const aCategoryRef = a.categoryId || a.category;
                    const bCategoryRef = b.categoryId || b.category;
                    const aCat = categories.find((c) => c.id === aCategoryRef || c.key === aCategoryRef);
                    const bCat = categories.find((c) => c.id === bCategoryRef || c.key === bCategoryRef);
                    aValue = aCat?.nameML?.[defaultLanguage] || aCat?.name || '';
                    bValue = bCat?.nameML?.[defaultLanguage] || bCat?.name || '';
                } else {
                    aValue = a[effectiveSortConfig.key];
                    bValue = b[effectiveSortConfig.key];
                }

                // Handle dates
                if (effectiveSortConfig.key === 'createdAt' || effectiveSortConfig.key === 'updatedAt') {
                    aValue = new Date(aValue || 0).getTime();
                    bValue = new Date(bValue || 0).getTime();
                } else if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) {
                    return effectiveSortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return effectiveSortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else {
            // Default sort: Active items first, then by creation date (newest first)
            filteredItems.sort((a, b) => {
                if (a.isActive !== b.isActive) {
                    return b.isActive - a.isActive;
                }
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });
        }

        return filteredItems;
    };

    // Define table columns
    const columns = [
        {
            key: 'image',
            label: t('table.image'),
            sortable: false,
            render: (item) =>
                item.gallery && item.gallery.length > 0 ? (
                    <img
                        src={
                            item.gallery[item.coverImageIndex >= 0 ? item.coverImageIndex : 0]?.url ||
                            item.gallery[0]?.url
                        }
                        alt={item.name}
                        className="h-10 w-10 rounded object-cover ms-auto sm:ms-0"
                    />
                ) : item.image ? (
                    <img src={item.image} alt={item.name} className="h-10 w-10 rounded object-cover ms-auto sm:ms-0" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 ms-auto sm:ms-0">
                        <Image className="h-6 w-6 text-gray-400" />
                    </div>
                )
        },
        {
            key: 'name',
            label: t('table.name'),
            sortable: true,
            render: (item) => (
                <div className="font-medium">{item.nameML?.[defaultLanguage] || item.name || t('common.untitled')}</div>
            )
        },
        {
            key: 'price',
            label: t('table.price'),
            sortable: true,
            render: (item) => (
                <div className="flex items-center justify-end sm:justify-start gap-1">
                    <span>{formatPrice(item.quantityPricing?.[0]?.price || item.price)} </span>
                    {item.isFeatured && <Star className="text-yellow-500" size={16} />}
                    {item.discountAmount > 0 && <BadgePercent className="text-red-500" size={16} />}
                </div>
            )
        },
        {
            key: 'category',
            label: t('table.category'),
            sortable: false,
            render: (item) => {
                // Check multiple possible field names for category reference
                const categoryRef = item.categoryId || item.category;
                const category = categories.find((c) => c.id === categoryRef || c.key === categoryRef);
                return (
                    category?.name ||
                    category?.nameML?.[defaultLanguage] ||
                    Object.values(category?.nameML || {})[0] ||
                    '-'
                );
            }
        },
        {
            key: 'collections',
            label: t('table.collections'),
            sortable: false,
            render: (item) => {
                if (!item.collections || !Array.isArray(item.collections) || item.collections.length === 0) {
                    return '-';
                }

                // Display first collection (since collections are already complete objects)
                const firstCollection = item.collections[0];
                const collectionName =
                    firstCollection?.nameML?.[defaultLanguage] || firstCollection?.name || t('common.untitled');

                // If there are multiple collections, show count
                if (item.collections.length > 1) {
                    return `${collectionName} (+${item.collections.length - 1})`;
                }

                return collectionName;
            }
        },
        {
            key: 'stock',
            label: t('table.stockStatus'),
            sortable: true,
            render: (item) => (
                <span
                    className={`rounded-full px-2 py-1 text-xs border border-border ${
                        item.type === 'service' || item.type === 'digital' || item.stock > 0 || item.stock === -1
                            ? 'bg-neutral-100 text-lime-900'
                            : 'bg-red-800 text-neutral-100'
                    }`}>
                    {item.type === 'service' || item.type === 'digital'
                        ? item.isActive
                                                        ? t('stock.available')
                                                        : t('stock.notAvailable')
                        : item.stock === -1
                                                    ? t('stock.unlimited')
                          : item.stock > 0
                                                        ? t('stock.inStock', { count: item.stock })
                                                        : t('stock.outOfStock')}
                </span>
            )
        }
    ];

    // Define row actions
    const getRowActions = (item) => [
        {
            label: t('actions.editItem'),
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(item)
        },
        {
            label: t('actions.deleteItem'),
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(item),
            className: 'text-destructive'
        }
    ];

    // Show error state with retry option
    if (fetchError && !loading) {
        return (
            <div className="space-y-4">
                <AdminHeader title={t('header.title')} description={t('header.description')} />

                <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="rounded-full bg-destructive/20 p-3">
                            <X className="h-6 w-6 text-destructive" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-semibold text-destructive">{t('errors.failedLoadTitle')}</h3>
                            <p className="mt-1 text-muted-foreground text-sm">{fetchError}</p>
                        </div>
                        <Button onClick={handleRetryFetch} disabled={isRetrying} variant="outline" className="gap-2">
                            {isRetrying ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('actions.retrying')}
                                </>
                            ) : (
                                t('actions.tryAgain')
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AdminHeader title={t('header.title')} description={t('header.description')} />

            <AdminTable
                data={catalog}
                columns={columns}
                filterData={filterCatalogItems}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage={t('table.emptyMessage')}
                searchPlaceholder={t('table.searchPlaceholder')}
                customFilters={
                    <div className="space-y-3">
                        {/* Collapsible Filters */}
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                {/* Type Filter */}
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.type.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.type.all')}</SelectItem>
                                        <SelectItem value="physical">{t('filters.type.physical')}</SelectItem>
                                        <SelectItem value="digital">{t('filters.type.digital')}</SelectItem>
                                        <SelectItem value="service">{t('filters.type.service')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Category Filter */}
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.category.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.category.all')}</SelectItem>
                                        {(categories || [])
                                            .filter((cat) => cat.isActive !== false)
                                            .map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name ||
                                                        category.nameML?.[defaultLanguage] ||
                                                        Object.values(category.nameML || {})[0] ||
                                                        t('common.untitled')}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>

                                {/* Collection Filter */}
                                <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.collection.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.collection.all')}</SelectItem>
                                        {(collections || [])
                                            .filter((col) => col.isActive !== false)
                                            .map((collection) => (
                                                <SelectItem key={collection.id} value={collection.id}>
                                                    {collection.nameML?.[defaultLanguage] ||
                                                        collection.name ||
                                                        t('common.untitled')}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>

                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.status.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.status.all')}</SelectItem>
                                        <SelectItem value="active">{t('status.active')}</SelectItem>
                                        <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Featured Filter */}
                                <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.featured.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.featured.all')}</SelectItem>
                                        <SelectItem value="featured">{t('filters.featured.only')}</SelectItem>
                                        <SelectItem value="not-featured">{t('filters.featured.notFeatured')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Stock Filter */}
                                <Select value={stockFilter} onValueChange={setStockFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.stock.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.stock.all')}</SelectItem>
                                        <SelectItem value="in-stock">{t('filters.stock.inStock')}</SelectItem>
                                        <SelectItem value="out-of-stock">{t('filters.stock.outOfStock')}</SelectItem>
                                        <SelectItem value="unlimited">{t('filters.stock.unlimited')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Discount Filter */}
                                <Select value={discountFilter} onValueChange={setDiscountFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.discount.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.discount.all')}</SelectItem>
                                        <SelectItem value="with-discount">{t('filters.discount.withDiscount')}</SelectItem>
                                        <SelectItem value="without-discount">{t('filters.discount.noDiscount')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Price Range Filter */}
                                <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.priceRange.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.priceRange.all')}</SelectItem>
                                        <SelectItem value="under-10">{t('filters.priceRange.under10')}</SelectItem>
                                        <SelectItem value="10-50">{t('filters.priceRange.10to50')}</SelectItem>
                                        <SelectItem value="50-100">{t('filters.priceRange.50to100')}</SelectItem>
                                        <SelectItem value="over-100">{t('filters.priceRange.over100')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Sort By Filter */}
                                <Select value={sortByFilter} onValueChange={setSortByFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.sort.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">{t('filters.sort.newest')}</SelectItem>
                                        <SelectItem value="oldest">{t('filters.sort.oldest')}</SelectItem>
                                        <SelectItem value="name">{t('filters.sort.nameAZ')}</SelectItem>
                                        <SelectItem value="price-low">{t('filters.sort.priceLowHigh')}</SelectItem>
                                        <SelectItem value="price-high">{t('filters.sort.priceHighLow')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Action Buttons Row */}
                                <div className="flex gap-2">
                                    {/* Reset Filters Button - Only show when filters applied */}
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setTypeFilter('all');
                                                setCategoryFilter('all');
                                                setCollectionFilter('all');
                                                setStatusFilter('all');
                                                setFeaturedFilter('all');
                                                setStockFilter('all');
                                                setDiscountFilter('all');
                                                setPriceRangeFilter('all');
                                                setSortByFilter('newest');
                                            }}
                                            title={t('actions.resetFilters')}>
                                            <X className="h-4 w-4" color="red" />
                                            <span className="text-red-500">{t('actions.reset')}</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                }
                headerActions={
                    <>
                        <Button
                            variant={isFiltersExpanded ? 'default' : 'outline'}
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className="gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden xl:block">
                                {isFiltersExpanded ? t('actions.hideFilters') : t('actions.showFilters')}
                            </span>
                            {hasFiltersApplied() && (
                                <Badge
                                    variant={isFiltersExpanded ? 'default' : 'outline'}
                                    className="ml-1 px-1.5 py-0.5 text-xs">
                                    {
                                        [
                                            typeFilter !== 'all' && t('filters.badges.type'),
                                            categoryFilter !== 'all' && t('filters.badges.category'),
                                            collectionFilter !== 'all' && t('filters.badges.collection'),
                                            statusFilter !== 'all' && t('filters.badges.status'),
                                            featuredFilter !== 'all' && t('filters.badges.featured'),
                                            stockFilter !== 'all' && t('filters.badges.stock'),
                                            discountFilter !== 'all' && t('filters.badges.discount'),
                                            priceRangeFilter !== 'all' && t('filters.badges.price'),
                                            sortByFilter !== 'newest' && t('filters.badges.sort')
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title={t('actions.refreshData')}>
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? t('actions.refreshing') : t('actions.refresh')}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">{t('actions.exportCsv')}</span>
                        </Button>
                        <Button
                            onClick={() => {
                                setEditItem(null);
                                setFormData(initialFormData);
                                setIsOpen(true);
                            }}
                            disabled={isSubmitting}>
                            <Plus className="h-4 w-4" />
                            {t('actions.addItem')}
                        </Button>
                    </>
                }
            />

            {/* Item Form Dialog - aligned with orders page pattern */}
            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    // Apply same logic as Cancel button - prevent closing during submission/upload
                    if (!open) {
                        if (!isSubmitting && !uploadingImages) {
                            setIsOpen(false);
                            setEditItem(null);
                            setFormData(initialFormData);
                        }
                    }
                }}>
                <DialogContent
                    onPointerDownOutside={(e) => {
                        // Prevent closing when clicking outside
                        e.preventDefault();
                    }}
                    onEscapeKeyDown={(e) => {
                        // Prevent closing with escape key
                        e.preventDefault();
                    }}>
                    <DialogHeader className="flex flex-col pb-6 gap-2 text-center sm:text-left sm:max-w-60">
                        <DialogTitle className="font-semibold text-lg leading-none">
                            {editItem ? t('dialog.editItemTitle') : t('dialog.addNewItemTitle')}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {t('dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                        <div className="flex-1 overflow-auto">
                            <CatalogItemForm
                                formData={formData}
                                setFormData={setFormData}
                                editItem={editItem}
                                categories={categories}
                                collections={collections}
                                availableLanguages={availableLanguages}
                                defaultLanguage={defaultLanguage}
                                onImageUpload={handleImageUpload}
                                isSubmitting={isSubmitting}
                                uploadingImages={uploadingImages}
                                uploadProgress={uploadProgress}
                                showSubmitButton={false}
                                storeSettings={storeSettings}
                            />
                        </div>
                        <div className="pt-6 shrink-0">
                            <div className="flex justify-end space-x-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (!isSubmitting && !uploadingImages) {
                                            setIsOpen(false);
                                            setEditItem(null);
                                            setFormData(initialFormData);
                                        }
                                    }}
                                    disabled={isSubmitting || uploadingImages}>
                                    {t('actions.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || uploadingImages}
                                    className="min-w-30">
                                    {uploadingImages ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('actions.uploading')}
                                        </>
                                    ) : isSubmitting ? (
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
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title={t('deleteDialog.title')}
                description={t('deleteDialog.description', {
                    item: itemToDelete?.nameML?.[defaultLanguage] || itemToDelete?.name || t('deleteDialog.thisItem')
                })}
                confirmText={t('deleteDialog.confirmText')}
                requireConfirmText="delete"
                onConfirm={handleDeleteConfirm}
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title={t('csv.dialogTitle')}
                description={t('csv.dialogDescription')}
                data={catalog}
                exportFields={csvExportFields}
                filename="catalog-export"
                formatRowData={formatCatalogRowData}
            />
        </div>
    );
}
