// @/lib/server/ai.js
'use server';

import DBService from '@/data/rest.db.js';
import { getSettings } from '@/lib/server/settings.js';
import { getCatalog, getCategories } from '@/lib/server/store.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import { generateUID } from '@/lib/shared/helpers.js';

// Initialize cache for AI operations
const { loadCacheData, saveCacheData } = await initCache('ai');
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// AI SETTINGS FUNCTIONS
// ============================================================================

/**
 * Get AI settings (training configuration only)
 * Note: aiEnabled and replicateApiKey are now stored in site_settings
 * @returns {Promise<Object>} AI settings data
 */
export const getAISettings = async (params = {}) => {
    try {
        // Try cache first
        const cached = await loadCacheData('ai_settings', params);
        if (cached) return cached;

        const response = await DBService.readBy('id', 'ai_settings', 'ai_settings');

        // Check if response is valid and has data
        if (!response?.success || !response.data) {
            // Create default settings if none exist
            const defaultSettings = {
                id: 'ai_settings',
                systemPrompt: '',
                tone: '',
                context: '',
                additionalInstructions: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Create default settings in database
            const created = await createWithCacheClear(defaultSettings, 'ai_settings', ['ai']);

            const result = {
                success: true,
                data: created.data || defaultSettings
            };

            await saveCacheData('ai_settings', params, result);
            return result;
        }

        // Extract first record from data object (response.data is an object with keys)
        const allSettings = response.data || [];

        const result = {
            success: true,
            data: allSettings
        };

        await saveCacheData('ai_settings', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching AI settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch AI settings',
            data: null
        };
    }
};

/**
 * Update or create AI settings (training configuration only)
 * Note: aiEnabled and replicateApiKey are now stored in site_settings
 * @param {Object} settingsData - AI settings data to save
 * @returns {Promise<Object>} Save result
 */
export async function updateAISettings(settingsData) {
    try {
        const payload = {
            id: 'ai_settings',
            // Training configuration fields only
            systemPrompt: settingsData.systemPrompt || '',
            tone: settingsData.tone || '',
            context: settingsData.context || '',
            additionalInstructions: settingsData.additionalInstructions || '',
            updatedAt: new Date().toISOString()
        };

        // Check for existing record
        const response = await DBService.readBy('id', 'ai_settings', 'ai_settings');

        let existingKey = null;
        if (response?.success && response.data) {
            existingKey = response.data.key || response.data.id || null;
        }

        let result;
        if (existingKey) {
            result = await updateWithCacheClear(existingKey, payload, 'ai_settings', ['ai'], ['ai_settings']);
        } else {
            payload.createdAt = new Date().toISOString();
            result = await createWithCacheClear(payload, 'ai_settings', ['ai']);
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating AI settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to update AI settings'
        };
    }
}

// ============================================================================
// AI MODELS MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all AI models
 * @param {Object} params - Query parameters (enabledOnly filter, etc.)
 * @returns {Promise<Object>} AI models data
 */
export const getAllAIModels = async (params = {}) => {
    try {
        // Try cache first
        const cached = await loadCacheData('ai_models', params);
        if (cached) return cached;

        const response = await DBService.readAll('ai_models');

        if (!response || !response?.success || response.data === null) {
            return {
                success: true,
                data: []
            };
        }

        // Check if response is valid and has data
        if (!response?.success || !response.data || Object.keys(response.data).length === 0) {
            const result = { success: true, data: [] };
            await saveCacheData('ai_models', params, result);
            return result;
        }

        const allModels = response.data;

        // Convert object to array
        let records = Array.isArray(allModels)
            ? allModels
            : Object.entries(allModels).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Filter enabled models if requested
        if (params.enabledOnly) {
            records = records.filter((model) => model && model.enabled === true);
        }

        // Sort by creation date (newest first) - only if records has items
        if (records.length > 0) {
            records.sort((a, b) => {
                const dateA = new Date(a?.createdAt || 0);
                const dateB = new Date(b?.createdAt || 0);
                return dateB - dateA;
            });
        }

        const result = {
            success: true,
            data: records
        };

        await saveCacheData('ai_models', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching AI models:', error);
        return {
            success: false,
            data: [],
            error: error.message || 'Failed to fetch AI models'
        };
    }
};

/**
 * Get AI model by ID
 * @param {string} modelId - ID of the model to get
 * @returns {Promise<Object>} AI model data
 */
export const getAIModelById = async (modelId, params = {}) => {
    try {
        // Try cache first
        const cached = await loadCacheData(`ai_model`, { model: modelId, ...params });
        if (cached) return cached;

        const response = await DBService.readBy('id', modelId, 'ai_models');

        // Extract data from DBService response { success, data }
        const result = response?.data || null;

        if (!result) {
            return {
                success: false,
                error: 'Model not found',
                data: null
            };
        }

        const data = {
            success: true,
            data: result
        };

        await saveCacheData(`ai_model`, { model: modelId, ...params }, data);
        return data;
    } catch (error) {
        console.error('Error fetching AI model:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch AI model'
        };
    }
};

/**
 * Create a new AI model
 * @param {Object} modelData - AI model data to create
 * @returns {Promise<Object>} Created AI model data
 */
export async function createAIModel(modelData) {
    try {
        const timeNow = new Date().toISOString();
        const payload = {
            id: generateUID('AI_MODEL'),
            name: modelData.name || 'Unnamed Model',
            modelId: modelData.modelId || '',
            description: modelData.description || '',
            modelType: modelData.modelType || 'text',
            enabled: modelData.enabled !== false,
            config: modelData.config || {},
            provider: 'replicate',
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'ai_models', ['ai']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating AI model:', error);
        return {
            success: false,
            error: error.message || 'Failed to create AI model'
        };
    }
}

/**
 * Update an AI model
 * @param {string} modelId - ID of the model to update
 * @param {Object} modelData - AI model data to update
 * @returns {Promise<Object>} Updated AI model data
 */
export async function updateAIModel(modelId, modelData) {
    try {
        const updateData = {
            name: modelData.name,
            modelId: modelData.modelId,
            description: modelData.description,
            modelType: modelData.modelType,
            enabled: modelData.enabled,
            config: modelData.config || {},
            updatedAt: new Date().toISOString()
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(modelId, updateData, 'ai_models', ['ai'], ['ai_models']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating AI model:', error);
        return {
            success: false,
            error: error.message || 'Failed to update AI model'
        };
    }
}

/**
 * Delete an AI model
 * @param {string} modelId - ID of the model to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAIModel(modelId) {
    try {
        const result = await deleteWithCacheClear(modelId, 'ai_models', ['ai']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting AI model:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete AI model'
        };
    }
}

// ============================================================================
// REPLICATE API INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Generate AI custom instructions from business settings and catalog
 * This version is for UI generation and doesn't include existing AI settings
 * @returns {Promise<Object>} Generated instructions object with fields
 */
export async function generateAIInstructions() {
    try {
        // Fetch business settings and catalog data
        const [businessSettings, catalogResult] = await Promise.all([
            getSettings(),
            getCatalog({ limit: 0, activeOnly: true, fetchReviews: false })
        ]);

        const siteSettings = businessSettings?.adminSiteSettings;
        const storeSettings = businessSettings?.adminStoreSettings;

        // Generate system prompt
        const systemPromptParts = [];
        
        if (siteSettings?.siteName || storeSettings?.businessName) {
            const businessName = storeSettings?.businessName || siteSettings?.siteName;
            systemPromptParts.push(`You are an AI assistant for ${businessName}.`);
        } else {
            systemPromptParts.push('You are a professional AI business assistant.');
        }
        
        if (siteSettings?.siteDescription) {
            systemPromptParts.push(siteSettings.siteDescription);
        }

        systemPromptParts.push('Your goal is to help customers with product information, answer questions, and provide excellent service.');

        // Generate tone
        const tone = 'Professional, helpful, and friendly. Use clear and concise language.';

        // Generate context
        const contextParts = [];
        
        // Business information
        if (siteSettings?.businessAddress) {
            const address = [
                siteSettings.businessAddress,
                siteSettings.businessCity,
                siteSettings.businessCp,
                siteSettings.country
            ].filter(Boolean).join(', ');
            if (address) contextParts.push(`Business Location: ${address}`);
        }

        if (siteSettings?.serviceArea) {
            contextParts.push(`Service Area: ${siteSettings.serviceArea}`);
        }

        // Hours of operation
        if (siteSettings?.workingHours?.length > 0) {
            const hoursText = siteSettings.workingHours
                .filter((h) => h.enabled)
                .map((h) => `${h.day}: ${h.open} - ${h.close}`)
                .join(', ');
            if (hoursText) contextParts.push(`Working Hours: ${hoursText}`);
        }

        // Contact information
        const contactInfo = [];
        if (siteSettings?.siteEmail) contactInfo.push(`Email: ${siteSettings.siteEmail}`);
        if (siteSettings?.sitePhone) contactInfo.push(`Phone: ${siteSettings.sitePhone}`);
        if (contactInfo.length > 0) {
            contextParts.push(`Contact: ${contactInfo.join(', ')}`);
        }

        // Store operations
        if (storeSettings) {
            const storeParts = [];
            
            if (storeSettings.currency) {
                storeParts.push(`Currency: ${storeSettings.currency}`);
            }

            // Payment methods
            if (storeSettings.paymentMethods) {
                const payments = [];
                if (storeSettings.paymentMethods.bankTransfer?.enabled) payments.push('Bank Transfer');
                if (storeSettings.paymentMethods.payOnDelivery?.enabled) payments.push('Cash on Delivery');
                if (storeSettings.paymentMethods.euPago?.enabled) {
                    const methods = storeSettings.paymentMethods.euPago.supportedMethods || [];
                    if (methods.includes('mb')) payments.push('Multibanco');
                    if (methods.includes('mbway')) payments.push('MB Way');
                }
                if (storeSettings.paymentMethods.stripe?.enabled) payments.push('Credit/Debit Card');
                if (payments.length > 0) {
                    storeParts.push(`Payment Methods: ${payments.join(', ')}`);
                }
            }

            // Shipping
            if (storeSettings.freeShippingEnabled && storeSettings.freeShippingThreshold) {
                storeParts.push(`Free Shipping: Orders over ${storeSettings.freeShippingThreshold} ${storeSettings.currency}`);
            }

            if (storeSettings.vatEnabled) {
                const vatText = storeSettings.vatIncludedInPrice 
                    ? `VAT ${storeSettings.vatPercentage}% included in prices`
                    : `VAT ${storeSettings.vatPercentage}% added at checkout`;
                storeParts.push(vatText);
            }

            if (storeParts.length > 0) {
                contextParts.push(storeParts.join('. '));
            }
        }

        // Additional instructions
        const additionalParts = [];
        
        // Language preferences
        if (siteSettings?.language) {
            additionalParts.push(`Always respond in ${siteSettings.language.toUpperCase()} unless customer requests otherwise.`);
        }
        if (siteSettings?.languages?.length > 1) {
            additionalParts.push(`Supported languages: ${siteSettings.languages.join(', ').toUpperCase()}.`);
        }

        // Catalog context
        if (catalogResult?.success && catalogResult.data?.length > 0) {
            const items = catalogResult.data;
            const totalProducts = items.length;
            const inStock = items.filter(item => item.inStock !== false && (item.stock === undefined || item.stock > 0)).length;
            
            additionalParts.push(`We have ${totalProducts} products/services available${inStock < totalProducts ? ` (${inStock} in stock)` : ''}.`);
            
            // Categorize products
            const types = {
                physical: items.filter(i => i.type === 'physical').length,
                service: items.filter(i => i.type === 'service').length,
                digital: items.filter(i => i.type === 'digital').length
            };
            
            const typesList = [];
            if (types.physical > 0) typesList.push(`${types.physical} physical products`);
            if (types.service > 0) typesList.push(`${types.service} services`);
            if (types.digital > 0) typesList.push(`${types.digital} digital products`);
            
            if (typesList.length > 0) {
                additionalParts.push(`Catalog: ${typesList.join(', ')}.`);
            }

            // Get category names for better context (using getCategories to fetch active categories)
            const categoriesResult = await getCategories({ limit: 0, activeOnly: true });
            const categories = [];

            if(categoriesResult?.success && categoriesResult.data && categoriesResult.data.length > 0) {
                categoriesResult.data.forEach(item => {
                    const cat = item.title || item.name || 'Uncategorized'; 
                    categories.push(cat);
                });
            } 
            
            if (categories.length > 0) {
                additionalParts.push(`Main categories: ${categories.join(', ')}.`);
            }
        }

        additionalParts.push('Always provide accurate product information. If you don\'t know something, admit it and offer to help the customer contact support.');
        additionalParts.push('Be proactive in suggesting relevant products that might interest the customer.');
        additionalParts.push('Handle complaints professionally and always prioritize customer satisfaction.');

        return {
            success: true,
            data: {
                systemPrompt: systemPromptParts.filter(Boolean).join(' '),
                tone: tone,
                context: contextParts.filter(Boolean).join('\n'),
                additionalInstructions: additionalParts.filter(Boolean).join(' ')
            }
        };
    } catch (error) {
        console.error('Error generating AI instructions:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate AI instructions',
            data: null
        };
    }
}

/**
 * Build training instructions from AI settings and site/store configuration
 * @returns {Promise<string>} Formatted training instructions with business context
 */
async function buildTrainingInstructions() {
    try {
        // Fetch AI settings, business settings, and catalog data
        const [settingsResult, businessSettings, catalogResult] = await Promise.all([
            getAISettings(),
            getSettings(),
            getCatalog({ limit: 0, activeOnly: true, fetchReviews: false })
        ]);

        if (!settingsResult.success || !settingsResult.data) {
            return '';
        }

        const settings = settingsResult.data;
        const instructions = [];

        // AI-specific instructions
        if (settings.systemPrompt) {
            instructions.push(`System Instructions: ${settings.systemPrompt}`);
        }

        if (settings.tone) {
            instructions.push(`Tone: ${settings.tone}`);
        }

        if (settings.context) {
            instructions.push(`Context: ${settings.context}`);
        }

        if (settings.additionalInstructions) {
            instructions.push(`Additional Instructions: ${settings.additionalInstructions}`);
        }

        // Build business context from site and store settings
        const siteSettings = businessSettings?.adminSiteSettings;
        const storeSettings = businessSettings?.adminStoreSettings;

        if (siteSettings || storeSettings) {
            const businessContext = [];

            // Business identity and branding
            if (siteSettings?.siteName || storeSettings?.businessName) {
                const businessName = storeSettings?.businessName || siteSettings?.siteName;
                businessContext.push(`Business Name: ${businessName}`);
            }

            if (siteSettings?.siteDescription) {
                businessContext.push(`Business Description: ${siteSettings.siteDescription}`);
            }

            // Location and service area
            if (siteSettings?.businessAddress) {
                const address = [
                    siteSettings.businessAddress,
                    siteSettings.businessCity,
                    siteSettings.businessCp,
                    siteSettings.country
                ]
                    .filter(Boolean)
                    .join(', ');
                if (address) businessContext.push(`Location: ${address}`);
            }

            if (siteSettings?.serviceArea) {
                businessContext.push(`Service Area: ${siteSettings.serviceArea}`);
            }

            // Store operations
            if (storeSettings?.currency) {
                businessContext.push(`Currency: ${storeSettings.currency}`);
            }

            // Payment methods
            if (storeSettings?.paymentMethods) {
                const enabledPayments = [];
                if (storeSettings.paymentMethods.bankTransfer?.enabled) enabledPayments.push('Bank Transfer');
                if (storeSettings.paymentMethods.payOnDelivery?.enabled) enabledPayments.push('Pay on Delivery');
                if (storeSettings.paymentMethods.euPago?.enabled) {
                    const euPagoMethods = storeSettings.paymentMethods.euPago.supportedMethods || [];
                    if (euPagoMethods.includes('mb')) enabledPayments.push('Multibanco');
                    if (euPagoMethods.includes('mbway')) enabledPayments.push('MB Way');
                }
                if (storeSettings.paymentMethods.stripe?.enabled) enabledPayments.push('Credit Card (Stripe)');

                if (enabledPayments.length > 0) {
                    businessContext.push(`Payment Methods: ${enabledPayments.join(', ')}`);
                }
            }

            // Shipping information
            if (storeSettings?.freeShippingEnabled && storeSettings?.freeShippingThreshold) {
                businessContext.push(
                    `Free Shipping: Available for orders over ${storeSettings.freeShippingThreshold} ${storeSettings.currency}`
                );
            }

            if (storeSettings?.internationalShipping) {
                businessContext.push('International Shipping: Available');
            }

            // VAT information
            if (storeSettings?.vatEnabled) {
                const vatInfo = `VAT: ${storeSettings.vatPercentage}%`;
                const vatDetails = storeSettings.vatIncludedInPrice ? ' (included in prices)' : ' (added at checkout)';
                businessContext.push(vatInfo + vatDetails);
            }

            // Language and localization
            if (siteSettings?.language) {
                businessContext.push(`Primary Language: ${siteSettings.language}`);
            }

            if (siteSettings?.languages?.length > 1) {
                businessContext.push(`Supported Languages: ${siteSettings.languages.join(', ')}`);
            }

            // Contact information
            if (siteSettings?.siteEmail) {
                businessContext.push(`Contact Email: ${siteSettings.siteEmail}`);
            }

            if (siteSettings?.sitePhone) {
                businessContext.push(`Contact Phone: ${siteSettings.sitePhone}`);
            }

            // Working hours
            if (siteSettings?.workingHours?.length > 0) {
                const hoursText = siteSettings.workingHours
                    .map((h) => `${h.day}: ${h.open} - ${h.close}`)
                    .join(', ');
                if (hoursText) businessContext.push(`Working Hours: ${hoursText}`);
            }

            // Add business context to instructions
            if (businessContext.length > 0) {
                instructions.push(`Business Context:\n${businessContext.join('\n')}`);
            }
        }

        // Add catalog (products/services) information
        if (catalogResult?.success && catalogResult.data?.length > 0) {
            const catalogItems = catalogResult.data;
            const catalogContext = [];

            // Filter and format essential catalog information
            const productsSummary = catalogItems
                .map((item) => {
                    const essentialInfo = {
                        name: item.title || item.titleML?.en || item.name,
                        type: item.type || 'physical',
                        category: item.categoryName || item.category,
                        price: item.finalPrice
                            ? `${item.finalPrice} ${item.currency || storeSettings?.currency || 'EUR'}`
                            : null,
                        inStock: item.inStock !== false && (item.stock === undefined || item.stock > 0),
                        description: item.description || item.descriptionML?.en || ''
                    };

                    // Build compact product description
                    const parts = [];
                    if (essentialInfo.name) parts.push(essentialInfo.name);
                    if (essentialInfo.type) parts.push(`(${essentialInfo.type})`);
                    if (essentialInfo.category) parts.push(`- ${essentialInfo.category}`);
                    if (essentialInfo.price) parts.push(`- ${essentialInfo.price}`);
                    if (!essentialInfo.inStock) parts.push('- Out of Stock');

                    // Add short description if available (limit to 100 chars)
                    if (essentialInfo.description) {
                        const shortDesc = essentialInfo.description.substring(0, 100).replace(/\n/g, ' ').trim();
                        if (shortDesc)
                            parts.push(`- ${shortDesc}${essentialInfo.description.length > 100 ? '...' : ''}`);
                    }

                    return parts.join(' ');
                })
                .filter(Boolean);

            if (productsSummary.length > 0) {
                catalogContext.push(`Available Products/Services (${productsSummary.length} items):`);

                // Group by type for better organization
                const byType = {
                    physical: [],
                    service: [],
                    digital: []
                };

                catalogItems.forEach((item) => {
                    const type = item.type || 'physical';
                    if (byType[type]) {
                        const itemInfo = `- ${item.title || item.name}`;
                        byType[type].push(itemInfo);
                    }
                });

                // Add grouped products
                if (byType.physical.length > 0) {
                    catalogContext.push(`\nPhysical Products: ${byType.physical.join(', ')}`);
                }
                if (byType.service.length > 0) {
                    catalogContext.push(`\nServices: ${byType.service.join(', ')}`);
                }
                if (byType.digital.length > 0) {
                    catalogContext.push(`\nDigital Products: ${byType.digital.join(', ')}`);
                }

                // Add summary statistics
                const totalInStock = catalogItems.filter(
                    (item) => item.inStock !== false && (item.stock === undefined || item.stock > 0)
                ).length;
                const totalOutOfStock = catalogItems.length - totalInStock;
                catalogContext.push(
                    `\nInventory: ${totalInStock} in stock${totalOutOfStock > 0 ? `, ${totalOutOfStock} out of stock` : ''}`
                );
            }

            if (catalogContext.length > 0) {
                instructions.push(`Catalog Information:\n${catalogContext.join('\n')}`);
            }
        }

        return instructions && instructions?.length > 0 ? instructions.join('\n\n') : '';
    } catch (error) {
        console.warn('Failed to build training instructions:', error);
        return '';
    }
}

/**
 * Get Replicate API token from settings or environment
 * @returns {Promise<string|null>} API token or null
 */
async function getReplicateToken() {
    try {
        const settingsResult = await getAISettings();
        if (settingsResult.success && settingsResult.data?.replicateApiKey) {
            return settingsResult.data.replicateApiKey;
        }
    } catch (error) {
        console.warn('Failed to get Replicate token from settings:', error);
    }

    // Fallback to environment variable
    return process.env.REPLICATE_API_TOKEN || null;
}

function getLanguageInstruction(language) {
    if (!language || language === 'en') {
        return '';
    }

    let languageName = language.toUpperCase();
    try {
        const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
        languageName = displayNames.of(language) || languageName;
    } catch (_error) {
        // Fallback to uppercase code if DisplayNames fails
    }

    return `Generate the response in ${languageName} language.`;
}

function buildExecutionPrompt(basePrompt = '', instructions = '', language = 'en') {
    return [instructions?.trim(), getLanguageInstruction(language), basePrompt?.trim()].filter(Boolean).join('\n\n');
}

/**
 * Get status of a Replicate prediction
 * @param {string} predictionId - The Replicate prediction ID
 * @returns {Promise<Object>} The prediction status and results
 */
export async function getPredictionStatus(predictionId) {
    try {
        if (!predictionId) {
            return {
                success: false,
                error: 'Prediction ID is required'
            };
        }

        const apiToken = await getReplicateToken();
        if (!apiToken) {
            return {
                success: false,
                error: 'Replicate API token not configured'
            };
        }

        // Get prediction status from Replicate
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                Authorization: `Token ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `Replicate API error: ${response.status} ${errorText}`
            };
        }

        const prediction = await response.json();
        return {
            success: true,
            data: prediction
        };
    } catch (error) {
        console.error('Error getting prediction status:', error);
        return {
            success: false,
            error: error.message || 'Failed to get prediction status'
        };
    }
}

/**
 * Use a specific AI model with Replicate
 * @param {string} modelId - ID of the model to use
 * @param {string} prompt - The prompt to send to the model
 * @param {Object} modelSettings - Additional model settings
 * @returns {Promise<Object>} Model execution result
 */
export async function useAIModel(modelId, prompt, modelSettings = {}) {
    try {
        if (!prompt && Object.keys(modelSettings)?.length === 0) {
            return {
                success: false,
                error: 'Missing prompt or modelSettings'
            };
        }

        // Load model record from DB
        const response = await DBService.read(modelId, 'ai_models');

        // Extract data from DBService response { success, data }
        const modelRecord = response?.data || null;

        if (!modelRecord) {
            return {
                success: false,
                error: 'Model not found'
            };
        }

        if (!modelRecord.enabled) {
            return {
                success: false,
                error: 'Model is disabled'
            };
        }

        const replicateModelId = modelRecord.modelId || modelRecord.id || modelRecord.model || null;
        if (!replicateModelId) {
            return {
                success: false,
                error: 'Model record missing modelId'
            };
        }

        // Get API token
        const apiToken = await getReplicateToken();
        if (!apiToken) {
            return {
                success: false,
                error: 'Replicate API token not configured'
            };
        }

        // Dynamically import Replicate
        const { default: Replicate } = await import('replicate');
        const client = new Replicate({ auth: apiToken });

        // Get training instructions
        const trainingInstructions = await buildTrainingInstructions();

        const runtimeSettings = Object.fromEntries(
            Object.entries(modelSettings).filter(([key]) => key !== 'instructions')
        );
        const runtimeLanguage = runtimeSettings.language || 'en';

        // Build prompt with custom instructions if provided
        const finalPrompt = buildExecutionPrompt(
            prompt || modelRecord.config?.prompt || '',
            modelSettings.instructions,
            runtimeLanguage
        );

        // Build input with proper structure
        const input = {
            ...(modelRecord.config || {}),
            ...runtimeSettings,
            prompt: finalPrompt,
            temperature: modelSettings.temperature ?? modelRecord.config?.temperature ?? 1,
            system_prompt: trainingInstructions || undefined
        };

        // Run the model
        const output = await client.run(replicateModelId, { input });

        return {
            success: true,
            data: output
        };
    } catch (error) {
        console.error('Error using AI model:', error);
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}

/**
 * Execute AI model with custom parameters
 * Makes request to Replicate API with the model configuration
 * @param {string} modelId - ID of the model to execute
 * @param {Object} params - Parameters for the model execution
 * @returns {Promise<Object>} Execution result with prediction ID
 */
export async function executeAIModel(modelId, params = {}) {
    try {
        // Get AI settings to check if enabled and get API key
        const settingsResult = await getAISettings();
        if (!settingsResult.success || !settingsResult.data?.enabled) {
            return {
                success: false,
                error: 'AI agent is not enabled'
            };
        }

        const apiKey = settingsResult.data.replicateApiKey;
        if (!apiKey) {
            return {
                success: false,
                error: 'Replicate API key not configured'
            };
        }

        // Get the model configuration
        const modelResult = await getAIModelById(modelId);
        if (!modelResult.success) {
            return {
                success: false,
                error: 'Model not found'
            };
        }

        const model = modelResult.data;
        if (!model.enabled) {
            return {
                success: false,
                error: 'Model is disabled'
            };
        }

        // Get training instructions
        const trainingInstructions = await buildTrainingInstructions();

        const language = params.language || 'en';

        // Build prompt with custom instructions if provided
        const finalPrompt = buildExecutionPrompt(
            params.prompt || model.config?.prompt || '',
            params.instructions,
            language
        );

        // Build Replicate input with proper structure
        const replicateInput = {
            ...model.config,
            prompt: finalPrompt,
            temperature: params.temperature ?? model.config?.temperature ?? 1,
            system_prompt: trainingInstructions || undefined,
            language: language,
            // Merge any additional params from runtime
            ...Object.fromEntries(
                Object.entries(params).filter(
                    ([key]) => key !== 'prompt' && key !== 'temperature' && key !== 'instructions' && key !== 'language'
                )
            )
        };

        // Make request to Replicate API
        const response = await fetch(`https://api.replicate.com/v1/models/${model.modelId}/predictions`, {
            method: 'POST',
            headers: {
                Authorization: `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: replicateInput
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `Replicate API error: ${response.status} ${errorText}`
            };
        }

        const result = await response.json();
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error executing AI model:', error);
        return {
            success: false,
            error: error.message || 'Failed to execute AI model'
        };
    }
}

// ============================================================================
// HIGH-LEVEL AI HELPER FUNCTIONS
// ============================================================================

/**
 * Wait for a prediction to complete with polling
 * @param {string} predictionId - The Replicate prediction ID
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 5 minutes)
 * @param {number} pollInterval - How often to check status in milliseconds (default: 2 seconds)
 * @returns {Promise<Object>} The final prediction result
 */
export async function waitForPrediction(predictionId, maxWaitTime = 300000, pollInterval = 2000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const status = await getPredictionStatus(predictionId);

        if (!status.success) {
            return status;
        }

        const prediction = status.data;

        if (prediction.status === 'succeeded') {
            return {
                success: true,
                data: prediction
            };
        }
        if (prediction.status === 'failed' || prediction.status === 'canceled') {
            return {
                success: false,
                error: prediction.error || 'Prediction failed'
            };
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return {
        success: false,
        error: 'Prediction timed out'
    };
}

/**
 * Execute AI model and wait for completion
 * @param {string} modelId - The ID of the AI model to execute
 * @param {Object} params - Parameters to pass to the model
 * @param {number} maxWaitTime - Maximum time to wait (default: 5 minutes)
 * @returns {Promise<Object>} The completed prediction result
 */
export async function executeAIModelAndWait(modelId, params = {}, maxWaitTime = 300000) {
    try {
        // Start the prediction
        const startResult = await executeAIModel(modelId, params);

        if (!startResult.success) {
            return startResult;
        }

        const predictionId = startResult.data?.id;
        if (!predictionId) {
            return {
                success: false,
                error: 'No prediction ID returned'
            };
        }

        // Wait for completion
        return await waitForPrediction(predictionId, maxWaitTime);
    } catch (error) {
        console.error('Error in executeAIModelAndWait:', error);
        return {
            success: false,
            error: error.message || 'Failed to execute and wait for AI model'
        };
    }
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS (Deprecated - use new names above)
// ============================================================================

/**
 * @deprecated Use executeAIModel instead
 */
export async function callAIModel(modelId, params = {}) {
    return await executeAIModel(modelId, params);
}

/**
 * @deprecated Use getPredictionStatus instead
 */
export async function getAIPredictionStatus(predictionId) {
    return await getPredictionStatus(predictionId);
}

/**
 * @deprecated Use executeAIModelAndWait instead
 */
export async function callAIModelAndWait(modelId, params = {}, maxWaitTime = 300000) {
    return await executeAIModelAndWait(modelId, params, maxWaitTime);
}

// ============================================================================
// AI MODEL PRESETS & USAGE EXAMPLES
// ============================================================================

/**
 * Common AI model preset patterns (use these patterns in your code):
 *
 * Text generation:
 * {
 *   prompt: 'Your text here',
 *   temperature: 0.7,
 *   max_tokens: 500
 * }
 *
 * Image generation:
 * {
 *   prompt: 'Your image description',
 *   width: 1024,
 *   height: 1024,
 *   num_inference_steps: 20,
 *   guidance_scale: 7.5
 * }
 *
 * Text to speech:
 * {
 *   text: 'Text to convert',
 *   voice: 'default',
 *   speed: 1.0
 * }
 *
 * Speech to text:
 * {
 *   audio: 'audio_url',
 *   language: 'en',
 *   task: 'transcribe'
 * }
 */

/**
 * Usage examples:
 *
 * // Simple model execution with text generation
 * const result = await executeAIModel('my_text_model', {
 *   prompt: 'Write a poem',
 *   temperature: 0.7,
 *   max_tokens: 500
 * });
 *
 * // Execute and wait for image generation
 * const result = await executeAIModelAndWait('my_image_model', {
 *   prompt: 'A beautiful sunset',
 *   width: 1024,
 *   height: 1024,
 *   num_inference_steps: 20
 * });
 *
 * // Use a model directly with Replicate
 * const result = await useAIModel('my_model_id', 'Generate an image of a cat', {
 *   width: 1024,
 *   height: 768
 * });
 *
 * // Custom parameters
 * const result = await executeAIModel('my_model', {
 *   prompt: 'Custom prompt',
 *   temperature: 0.9,
 *   custom_param: 'value'
 * });
 *
 * // Get prediction status
 * const status = await getPredictionStatus('prediction_id_here');
 *
 * // Manage AI models
 * const models = await getAllAIModels({ enabledOnly: true });
 * const model = await getAIModelById('model_id');
 * await createAIModel({ name: 'New Model', modelId: 'vendor/model' });
 * await updateAIModel('model_id', { enabled: false });
 * await deleteAIModel('model_id');
 *
 * // Manage AI settings
 * const settings = await getAISettings();
 * await updateAISettings({ enabled: true, replicateApiKey: 'key' });
 */
