// @/app/(backend)/admin/tickets/actions.js
'use server';

import { addTicketReply, createTicket, deleteTicket, updateTicket } from '@/lib/server/tickets.js';

export async function updateTicketStatus(ticketId, updateData) {
    try {
        const result = await updateTicket(ticketId, updateData);
        return result;
    } catch (error) {
        console.error('Error updating ticket:', error);
        return { success: false, error: 'Failed to update ticket' };
    }
}

export async function addReplyToTicket(ticketId, replyData) {
    try {
        const result = await addTicketReply(ticketId, replyData);
        return result;
    } catch (error) {
        console.error('Error adding reply:', error);
        return { success: false, error: 'Failed to add reply' };
    }
}

export async function deleteTicketById(ticketId) {
    try {
        const result = await deleteTicket(ticketId);
        return result;
    } catch (error) {
        console.error('Error deleting ticket:', error);
        return { success: false, error: 'Failed to delete ticket' };
    }
}

export async function createTicketAction(ticketData) {
    try {
        const result = await createTicket(ticketData);
        return result;
    } catch (error) {
        console.error('Error creating ticket:', error);
        return { success: false, error: 'Failed to create ticket' };
    }
}
