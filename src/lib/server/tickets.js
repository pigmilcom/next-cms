// @/lib/server/tickets.js
'use server';

import { auth } from '@/auth.js';
import DBService from '@/data/rest.db.js';
import { sendCustomerMessage, sendEmail } from '@/lib/server/email.js';
import { sendPhoneVerification } from '@/lib/server/sms.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import { generateUID } from '@/lib/shared/helpers.js';

// Initialize cache for tickets operations
const { loadCacheData, saveCacheData } = await initCache('tickets');
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get all tickets with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {string} options.userId - Filter by user ID
 * @param {string} options.status - Filter by status (open, in-progress, resolved, closed)
 * @param {string} options.priority - Filter by priority (low, medium, high, urgent)
 * @param {string} options.type - Filter by issue type
 * @param {number} options.limit - Limit number of results
 * @param {number} options.page - Page number for pagination
 * @returns {Promise<Object>} Response with tickets data
 */
export async function getAllTickets(options = {}) {
    try {
        const { userId, status, priority, type, limit = 50, page = 1, duration = '15M' } = options;

        // Build cache key
        const cacheKey = `all_tickets_${JSON.stringify({ userId, status, priority, type, limit, page })}`;

        // Try cache first
        const cached = await loadCacheData(cacheKey, { duration });
        if (cached) return cached;

        const result = await DBService.readAll('tickets');

        if (!result?.success || !result.data) {
            return {
                success: true,
                data: [],
                pagination: {
                    totalItems: 0,
                    currentPage: 1,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }

        const allTickets = result.data;
        // Convert object to array if needed
        let ticketsArray = Array.isArray(allTickets)
            ? allTickets
            : Object.entries(allTickets).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Apply filters
        if (userId) {
            ticketsArray = ticketsArray.filter((ticket) => ticket.userId === userId);
        }
        if (status) {
            ticketsArray = ticketsArray.filter((ticket) => ticket.status === status);
        }
        if (priority) {
            ticketsArray = ticketsArray.filter((ticket) => ticket.priority === priority);
        }
        if (type) {
            ticketsArray = ticketsArray.filter((ticket) => ticket.type === type);
        }

        // Sort by priority and created date
        ticketsArray.sort((a, b) => {
            // First by priority (urgent > high > medium > low)
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
            if (priorityDiff !== 0) return priorityDiff;

            // Then by creation date (newest first)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Calculate pagination
        const totalItems = ticketsArray.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedTickets = limit > 0 ? ticketsArray.slice(startIndex, endIndex) : ticketsArray;

        const response = {
            success: true,
            data: paginatedTickets,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        await saveCacheData(cacheKey, { duration }, response);
        return response;
    } catch (error) {
        console.error('Error getting tickets:', error);
        return { success: false, error: 'Failed to fetch tickets' };
    }
}

/**
 * Get single ticket by ID
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Response with ticket data
 */
export async function getTicket(ticketId) {
    try {
        if (!ticketId) {
            return { success: false, error: 'Ticket ID is required' };
        }

        // Try cache first
        const cacheKey = `ticket_${ticketId}`;
        const cached = await loadCacheData(cacheKey, { duration: '10M' });
        if (cached) return cached;

        const result = await DBService.read(ticketId, 'tickets');

        if (result.success) {
            await saveCacheData(cacheKey, { duration: '10M' }, result);
        }

        return result;
    } catch (error) {
        console.error('Error getting ticket:', error);
        return { success: false, error: 'Failed to fetch ticket' };
    }
}

/**
 * Create a new support ticket
 * @param {Object} ticketData - Ticket data
 * @param {string} ticketData.userId - User ID creating the ticket
 * @param {string} ticketData.userEmail - User email
 * @param {string} ticketData.userName - User name
 * @param {string} ticketData.subject - Ticket subject
 * @param {string} ticketData.description - Ticket description
 * @param {string} ticketData.type - Issue type (order-issue, payment-problem, delivery-delay, product-quality, other)
 * @param {string} ticketData.priority - Priority (low, medium, high, urgent)
 * @param {Object} ticketData.orderData - Related order data (optional)
 * @returns {Promise<Object>} Response with created ticket
 */
export async function createTicket(ticketData) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Authentication required' };
        }

        const {
            userId,
            userEmail,
            userName,
            subject,
            description,
            type = 'support',
            priority = 'medium',
            orderData = null,
            notifications = {}
        } = ticketData;

        if (!subject || !description) {
            return { success: false, error: 'Subject and description are required' };
        }

        // Generate ticket ID and number
        const ticketId = generateUID('TICKET');
        const ticketNumber = generateUID('TKT');

        const newTicket = {
            id: ticketId,
            ticketNumber,
            userId: userId || session.user.id,
            userEmail: userEmail || session.user.email,
            userName: userName || session.user.name || 'User',
            subject,
            description,
            type,
            priority,
            status: 'open',
            orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replies: [],
            assignedTo: null,
            resolvedAt: null,
            closedAt: null
        };

        // Create ticket with cache clearing
        const result = await createWithCacheClear(newTicket, 'tickets', ['tickets']);

        if (result.success) {
            // Send notification email to admin (optional)
            try {
                await sendEmail({
                    to: process.env.ADMIN_EMAIL || 'admin@example.com',
                    subject: `New Support Ticket: ${ticketNumber}`,
                    html: `
                        <h2>New Support Ticket Created</h2>
                        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                        <p><strong>User:</strong> ${userName} (${userEmail})</p>
                        <p><strong>Type:</strong> ${type}</p>
                        <p><strong>Priority:</strong> ${priority}</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p><strong>Description:</strong></p>
                        <p>${description}</p>
                        ${orderData ? `<p><strong>Related Order:</strong> ${orderData.orderNumber || orderData.id}</p>` : ''}
                        <p><a href="${process.env.NEXTAUTH_URL}/admin/tickets/${result.data.id}">View Ticket in Admin Panel</a></p>
                    `
                });
            } catch (emailError) {
                console.error('Failed to send admin notification email:', emailError);
                // Don't fail the ticket creation if email fails
            }

            // Send customer notification if requested
            if (notifications?.sendEmail && userEmail) {
                try {
                    await sendCustomerMessage(
                        userEmail,
                        `Your Support Ticket: ${ticketNumber}`,
                        `
                        <h2>Thank you for contacting support!</h2>
                        <p>Your support ticket has been created successfully.</p>
                        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p><strong>Type:</strong> ${type}</p>
                        <p><strong>Priority:</strong> ${priority}</p>
                        <p>We'll get back to you as soon as possible. You can track your ticket in your account dashboard.</p>
                        <p><a href="${process.env.NEXTAUTH_URL}/account?tab=tickets&ticket=${result.data.id}">View Your Ticket</a></p>
                        `,
                        userName
                    );
                } catch (emailError) {
                    console.error('Failed to send customer notification email:', emailError);
                }
            }

            // Send customer SMS notification if requested (placeholder for future implementation)
            if (notifications?.sendSMS && newTicket.userPhone) {
                try {
                    // For now, we'll use a simple SMS implementation
                    // In a full implementation, you'd create a proper SMS template for ticket creation
                    console.log('SMS notification would be sent to:', newTicket.userPhone);
                    // await sendTicketCreatedSMS(newTicket.userPhone, ticketNumber, userName);
                } catch (smsError) {
                    console.error('Failed to send customer SMS notification:', smsError);
                }
            }
        }

        return result;
    } catch (error) {
        console.error('Error creating ticket:', error);
        return { success: false, error: 'Failed to create ticket' };
    }
}

/**
 * Update ticket status, priority, or other fields
 * @param {string} ticketId - Ticket ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Response with updated ticket
 */
export async function updateTicket(ticketId, updateData) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Authentication required' };
        }

        if (!ticketId) {
            return { success: false, error: 'Ticket ID is required' };
        }

        // Get current ticket first
        const currentTicket = await DBService.read(ticketId, 'tickets');
        if (!currentTicket.success) {
            return { success: false, error: 'Ticket not found' };
        }

        // Only allow users to update their own tickets (unless admin)
        const isAdmin = session.user.role === 'admin';
        const isOwner = currentTicket.data.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return { success: false, error: 'Permission denied' };
        }

        const updates = {
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        // Add status-specific timestamps
        if (updateData.status === 'resolved' && currentTicket.data.status !== 'resolved') {
            updates.resolvedAt = new Date().toISOString();
        }
        if (updateData.status === 'closed' && currentTicket.data.status !== 'closed') {
            updates.closedAt = new Date().toISOString();
        }

        // Update ticket with cache clearing
        const result = await updateWithCacheClear(ticketId, updates, 'tickets', ['tickets']);

        return result;
    } catch (error) {
        console.error('Error updating ticket:', error);
        return { success: false, error: 'Failed to update ticket' };
    }
}

/**
 * Add reply to ticket
 * @param {string} ticketId - Ticket ID
 * @param {Object} replyData - Reply data
 * @param {string} replyData.message - Reply message
 * @param {boolean} replyData.isAdmin - Whether reply is from admin
 * @param {string} replyData.authorId - Author ID
 * @param {string} replyData.authorName - Author name
 * @returns {Promise<Object>} Response with updated ticket
 */
export async function addTicketReply(ticketId, replyData) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Authentication required' };
        }

        if (!ticketId || !replyData.message) {
            return { success: false, error: 'Ticket ID and message are required' };
        }

        // Extract notification preferences
        const { notifications = {} } = replyData;

        // Get current ticket
        const currentTicket = await DBService.read(ticketId, 'tickets');
        if (!currentTicket.success) {
            return { success: false, error: 'Ticket not found' };
        }

        // Check permissions
        const isAdmin = session.user.role === 'admin';
        const isOwner = currentTicket.data.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return { success: false, error: 'Permission denied' };
        }

        const newReply = {
            id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            message: replyData.message,
            isAdmin: replyData.isAdmin || isAdmin,
            authorId: replyData.authorId || session.user.id,
            authorName: replyData.authorName || session.user.name || 'User',
            createdAt: new Date().toISOString()
        };

        const currentReplies = currentTicket.data.replies || [];
        const updates = {
            replies: [...currentReplies, newReply],
            updatedAt: new Date().toISOString(),
            // If admin replies to open ticket, set to in-progress
            ...(isAdmin && currentTicket.data.status === 'open' ? { status: 'in-progress' } : {})
        };

        const result = await updateWithCacheClear(ticketId, updates, 'tickets', ['tickets']);

        if (result.success && isAdmin) {
            // Send email notification to user if requested
            if (notifications?.sendEmail && currentTicket.data.userEmail) {
                try {
                    await sendCustomerMessage(
                        currentTicket.data.userEmail,
                        `Reply to your support ticket: ${currentTicket.data.ticketNumber}`,
                        `
                        <h2>New Reply to Your Support Ticket</h2>
                        <p><strong>Ticket Number:</strong> ${currentTicket.data.ticketNumber}</p>
                        <p><strong>Subject:</strong> ${currentTicket.data.subject}</p>
                        <hr />
                        <p><strong>Support Team Reply:</strong></p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007cba; margin: 15px 0;">
                            ${replyData.message.replace(/\n/g, '<br>')}
                        </div>
                        <p>You can view the full conversation and respond to this ticket in your account dashboard.</p>
                        <p><a href="${process.env.NEXTAUTH_URL}/account?tab=tickets&ticket=${ticketId}">View Full Conversation</a></p>
                        `,
                        currentTicket.data.userName
                    );
                } catch (emailError) {
                    console.error('Failed to send user notification email:', emailError);
                }
            }

            // Send SMS notification to user if requested (placeholder for future implementation)
            if (notifications?.sendSMS && currentTicket.data.userPhone) {
                try {
                    // For now, we'll use a simple SMS implementation
                    // In a full implementation, you'd create a proper SMS template for ticket replies
                    console.log('SMS notification would be sent to:', currentTicket.data.userPhone);
                    // await sendTicketReplySMS(currentTicket.data.userPhone, currentTicket.data.ticketNumber, replyData.message);
                } catch (smsError) {
                    console.error('Failed to send user SMS notification:', smsError);
                }
            }
        }

        return result;
    } catch (error) {
        console.error('Error adding ticket reply:', error);
        return { success: false, error: 'Failed to add reply' };
    }
}

/**
 * Delete ticket (admin only)
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Response with deletion result
 */
export async function deleteTicket(ticketId) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return { success: false, error: 'Admin access required' };
        }

        if (!ticketId) {
            return { success: false, error: 'Ticket ID is required' };
        }

        // Delete ticket with cache clearing
        const result = await deleteWithCacheClear(ticketId, 'tickets', ['tickets']);

        return result;
    } catch (error) {
        console.error('Error deleting ticket:', error);
        return { success: false, error: 'Failed to delete ticket' };
    }
}

/**
 * Get ticket statistics (admin only)
 * @returns {Promise<Object>} Response with ticket statistics
 */
export async function getTicketStats() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return { success: false, error: 'Admin access required' };
        }

        // Try cache first
        const cached = await loadCacheData('ticket_stats', { duration: '30M' });
        if (cached) return cached;

        const allTickets = await DBService.readAll('tickets');

        if (!allTickets.success) {
            return { success: false, error: 'Failed to fetch ticket statistics' };
        }

        // Convert object to array if needed, ensure tickets data is an array
        const ticketsData = allTickets.data;
        const tickets = Array.isArray(ticketsData)
            ? ticketsData
            : Object.entries(ticketsData || {}).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        const stats = {
            total: tickets.length,
            open: tickets.filter((t) => t.status === 'open').length,
            inProgress: tickets.filter((t) => t.status === 'in-progress').length,
            resolved: tickets.filter((t) => t.status === 'resolved').length,
            closed: tickets.filter((t) => t.status === 'closed').length,
            byPriority: {
                urgent: tickets.filter((t) => t.priority === 'urgent').length,
                high: tickets.filter((t) => t.priority === 'high').length,
                medium: tickets.filter((t) => t.priority === 'medium').length,
                low: tickets.filter((t) => t.priority === 'low').length
            },
            byType: tickets.reduce((acc, ticket) => {
                acc[ticket.type] = (acc[ticket.type] || 0) + 1;
                return acc;
            }, {}),
            avgResponseTime: 0, // Could be calculated based on reply times
            recentActivity: tickets.filter(
                (t) => new Date(t.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length
        };

        const response = { success: true, data: stats };
        await saveCacheData('ticket_stats', { duration: '30M' }, response);

        return response;
    } catch (error) {
        console.error('Error getting ticket stats:', error);
        return { success: false, error: 'Failed to fetch ticket statistics' };
    }
}

/**
 * Get count of open tickets for navigation badge
 * Uses getAllTickets with status filter to count open tickets
 * @returns {Promise<Object>} Count of open tickets
 */
export async function getOpenTicketsCount() {
    try {
        // Use getAllTickets with status filter and no pagination limit
        const result = await getAllTickets({
            status: 'open',
            limit: 0 // Get all open tickets without pagination
        });

        if (!result?.success) {
            return {
                success: true,
                data: { count: 0 }
            };
        }

        // Return the total count from pagination info
        const count = result.pagination?.totalItems || 0;

        return {
            success: true,
            data: { count }
        };
    } catch (error) {
        console.error('Error getting open tickets count:', error);
        return {
            success: false,
            error: error.message,
            data: { count: 0 }
        };
    }
}
