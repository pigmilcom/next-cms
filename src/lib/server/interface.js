// @/lib/server/interface.js
'use server';
import { updateSiteSettings } from '@/lib/server/admin.js';

import { getSettings } from '@/lib/server/settings.js';

/**
 * Get interface menu settings
 * @returns {Promise<Object>} Interface menu settings
 */
export async function getInterfaceSettings() {
    try {
        const { siteSettings } = await getSettings();

        const settings = siteSettings || null;

        if (!settings) {
            return {
                success: false,
                error: 'Settings not found',
                data: null
            };
        }

        const enabledMenuItems = settings.enabledMenuItems || {
            store: true,
            media: true,
            workspace: true,
            marketing: true,
            club: true,
            tickets: true
        };

        return {
            success: true,
            data: {
                enabledMenuItems,
                updatedAt: settings.updatedAt
            }
        };
    } catch (error) {
        console.error('Error fetching interface settings:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
}

/**
 * Update interface menu settings
 * @param {Object} enabledMenuItems - Object with menu item keys and boolean values
 * @returns {Promise<Object>} Update result
 */
export async function updateInterfaceSettings(enabledMenuItems) {
    try {
        // Validate input
        if (!enabledMenuItems || typeof enabledMenuItems !== 'object') {
            return {
                success: false,
                error: 'Invalid menu items data'
            };
        }

        // Prepare update data with normalized menu items
        const updateData = {
            enabledMenuItems: {
                store: enabledMenuItems.store !== false,
                media: enabledMenuItems.media !== false,
                workspace: enabledMenuItems.workspace !== false,
                marketing: enabledMenuItems.marketing !== false,
                club: enabledMenuItems.club !== false,
                tickets: enabledMenuItems.tickets !== false
            }
        };

        // Use centralized updateSiteSettings function from admin.js
        // This handles cache clearing and database updates automatically
        const result = await updateSiteSettings(updateData);

        if (!result?.success) {
            return {
                success: false,
                error: result?.error || 'Failed to update interface settings'
            };
        }

        return {
            success: true,
            message: 'Interface settings updated successfully',
            data: result.data
        };
    } catch (error) {
        console.error('Error updating interface settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to update interface settings'
        };
    }
}
