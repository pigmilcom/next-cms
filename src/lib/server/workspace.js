// @/lib/server/workspace.js

'use server';

import { generateUID } from '@/lib/shared/helpers.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import DBService from '@/data/rest.db.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

// Initialize workspace cache instance
const { loadCacheData, saveCacheData } = await initCache('workspace');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// APPOINTMENTS CRUD FUNCTIONS
// ============================================================================

/**
 * Get all appointments
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Appointments data
 */
export async function getAllAppointments(options = {}) {
    try {
        const cachedData = await loadCacheData('appointments', options);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('appointments');
        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch appointments',
                data: []
            };
        }

        let appointments = [];
        if (Array.isArray(result.data)) {
            appointments = result.data;
        } else if (typeof result.data === 'object') {
            appointments = Object.values(result.data || {});
        }

        // Sort by date
        appointments.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateA - dateB;
        });

        const response = {
            success: true,
            data: appointments
        };

        await saveCacheData('appointments', options, response);
        return response;
    } catch (error) {
        console.error('Error fetching appointments:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch appointments',
            data: []
        };
    }
}

/**
 * Create a new appointment utility function
 * @param {Object} appointmentData - Appointment data to create
 * @returns {Promise<Object>} Created appointment data
 */
export async function createAppointment(appointmentData) {
    try {
        const newAppointment = {
            ...appointmentData,
            id: appointmentData.id || generateUID('BOOK'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(newAppointment, 'appointments', ['workspace', 'store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create appointment' };
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        return {
            success: false,
            error: 'Failed to create appointment',
            message: error.message
        };
    }
}

/**
 * Update an appointment utility function
 * @param {string} appointmentId - ID of the appointment to update
 * @param {Object} appointmentData - Appointment data to update
 * @returns {Promise<Object>} Updated appointment data
 */
export async function updateAppointment(appointmentId, appointmentData) {
    try {
        const updatedData = {
            ...appointmentData,
            updatedAt: new Date().toISOString()
        };

        // Check if appointment exists
        const existingAppointmentResponse = await DBService.readBy('id', appointmentId, 'appointments');
        if (!existingAppointmentResponse?.success || !existingAppointmentResponse.data) {
            return {
                success: false,
                error: 'Appointment not found'
            };
        }

        const result = await updateWithCacheClear(appointmentId, updatedData, 'appointments', ['workspace', 'store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update appointment' };
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
        return {
            success: false,
            error: 'Failed to update appointment',
            message: error.message
        };
    }
}

/**
 * Delete an appointment utility function
 * @param {string} appointmentId - ID of the appointment to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAppointment(appointmentId) {
    try {
        const result = await deleteWithCacheClear(appointmentId, 'appointments', ['workspace', 'store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete appointment' };
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        return {
            success: false,
            error: 'Failed to delete appointment',
            message: error.message
        };
    }
}

// ============================================================================
// TASKS CRUD FUNCTIONS
// ============================================================================

/**
 * Get all tasks
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Tasks data
 */
export async function getAllTasks(options = {}) {
    try {
        const cachedData = await loadCacheData('tasks', options);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('tasks');
        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch tasks',
                data: []
            };
        }

        let tasks = [];
        if (Array.isArray(result.data)) {
            tasks = result.data;
        } else if (typeof result.data === 'object') {
            tasks = Object.values(result.data || {});
        }

        // Sort by creation date (newest first)
        tasks.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        const response = {
            success: true,
            data: tasks
        };

        await saveCacheData('tasks', options, response);
        return response;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch tasks',
            data: []
        };
    }
}

/**
 * Create a new task
 * @param {Object} taskData - Task data to create
 * @returns {Promise<Object>} Created task data
 */
export async function createTask(taskData) {
    try {
        const timeNow = new Date().toISOString();
        const payload = {
            id: generateUID('task'),
            title: taskData.title || 'Untitled Task',
            description: taskData.description || '',
            status: taskData.status || 'pending',
            priority: taskData.priority || 'medium',
            dueDate: taskData.dueDate || null,
            assignedTo: taskData.assignedTo || null,
            tags: taskData.tags || [],
            progress: taskData.progress || 0,
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'tasks', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating task:', error);
        return {
            success: false,
            error: error.message || 'Failed to create task'
        };
    }
}

/**
 * Update a task
 * @param {string} taskId - ID of the task to update
 * @param {Object} taskData - Task data to update
 * @returns {Promise<Object>} Updated task data
 */
export async function updateTask(taskId, taskData) {
    try {
        const updateData = {
            ...taskData,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(taskId, updateData, 'tasks', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating task:', error);
        return {
            success: false,
            error: error.message || 'Failed to update task'
        };
    }
}

/**
 * Delete a task
 * @param {string} taskId - ID of the task to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTask(taskId) {
    try {
        const result = await deleteWithCacheClear(taskId, 'tasks', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting task:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete task'
        };
    }
}

/**
 * Create an order task
 * @param {Object} taskData - Task data to create (with order context)
 * @returns {Promise<Object>} Created task data
 */
export async function createOrderTask(taskData) {
    try {
        const timeNow = new Date().toISOString();
        const payload = {
            id: generateUID('task'),
            title: taskData.title || 'Order Task',
            description: taskData.description || '',
            status: taskData.status || 'pending',
            priority: taskData.priority || 'medium',
            dueDate: taskData.dueDate || null,
            assignedTo: taskData.assignedTo || null,
            tags: taskData.tags || [],
            progress: taskData.progress || 0,
            // Order-specific fields
            orderId: taskData.orderId || '',
            orderNumber: taskData.orderNumber || '',
            customerName: taskData.customerName || '',
            serviceType: taskData.serviceType || '',
            appointmentId: taskData.appointmentId || '',
            type: 'order-task', // Mark as order-related task
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'tasks', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating order task:', error);
        return {
            success: false,
            error: error.message || 'Failed to create order task'
        };
    }
}

// ============================================================================
// SCHEDULE CRUD FUNCTIONS
// ============================================================================

/**
 * Get all schedule items
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Schedule items data
 */
export async function getAllScheduleItems(options = {}) {
    try {
        const cachedData = await loadCacheData('schedule', options);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('schedule');
        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch schedule items',
                data: []
            };
        }

        let scheduleItems = [];
        if (Array.isArray(result.data)) {
            scheduleItems = result.data;
        } else if (typeof result.data === 'object') {
            scheduleItems = Object.values(result.data || {});
        }

        // Sort by start time
        scheduleItems.sort((a, b) => {
            const dateA = new Date(a.startTime || a.createdAt || 0);
            const dateB = new Date(b.startTime || b.createdAt || 0);
            return dateA - dateB;
        });

        const response = {
            success: true,
            data: scheduleItems
        };

        await saveCacheData('schedule', options, response);
        return response;
    } catch (error) {
        console.error('Error fetching schedule items:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch schedule items',
            data: []
        };
    }
}

/**
 * Create a schedule item
 * @param {Object} scheduleData - Schedule item data to create
 * @returns {Promise<Object>} Created schedule item data
 */
export async function createScheduleItem(scheduleData) {
    try {
        const timeNow = new Date().toISOString();
        const payload = {
            id: generateUID('schedule'),
            title: scheduleData.title || 'Untitled Event',
            type: scheduleData.type || 'meeting',
            startTime: scheduleData.startTime || '09:00',
            endTime: scheduleData.endTime || '10:00',
            date: scheduleData.date || new Date().toISOString().split('T')[0],
            location: scheduleData.location || '',
            attendees: scheduleData.attendees || [],
            description: scheduleData.description || '',
            status: scheduleData.status || 'scheduled',
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'schedule', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating schedule item:', error);
        return {
            success: false,
            error: error.message || 'Failed to create schedule item'
        };
    }
}

/**
 * Update a schedule item
 * @param {string} scheduleId - ID of the schedule item to update
 * @param {Object} scheduleData - Schedule item data to update
 * @returns {Promise<Object>} Updated schedule item data
 */
export async function updateScheduleItem(scheduleId, scheduleData) {
    try {
        const updateData = {
            ...scheduleData,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(scheduleId, updateData, 'schedule', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating schedule item:', error);
        return {
            success: false,
            error: error.message || 'Failed to update schedule item'
        };
    }
}

/**
 * Delete a schedule item
 * @param {string} scheduleId - ID of the schedule item to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteScheduleItem(scheduleId) {
    try {
        const result = await deleteWithCacheClear(scheduleId, 'schedule', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting schedule item:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete schedule item'
        };
    }
}

// ============================================================================
// AGENDA CRUD FUNCTIONS
// ============================================================================

/**
 * Get all agenda items
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Agenda items data
 */
export async function getAllAgenda(options = {}) {
    try {
        const cachedData = await loadCacheData('agenda', options);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('agenda');
        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch agenda items',
                data: []
            };
        }

        let agendaItems = [];
        if (Array.isArray(result.data)) {
            agendaItems = result.data;
        } else if (typeof result.data === 'object') {
            agendaItems = Object.values(result.data || {});
        }

        // Sort by date
        agendaItems.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateA - dateB;
        });

        const response = {
            success: true,
            data: agendaItems
        };

        await saveCacheData('agenda', options, response);
        return response;
    } catch (error) {
        console.error('Error fetching agenda items:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch agenda items',
            data: []
        };
    }
}

/**
 * Create an agenda item
 * @param {Object} agendaData - Agenda item data to create
 * @returns {Promise<Object>} Created agenda item data
 */
export async function createAgenda(agendaData) {
    try {
        const timeNow = new Date().toISOString();
        const payload = {
            id: generateUID('agenda'),
            title: agendaData.title || 'Untitled Event',
            date: agendaData.date || new Date().toISOString().split('T')[0],
            time: agendaData.time || '09:00',
            duration: agendaData.duration || 60,
            attendees: agendaData.attendees || 0,
            description: agendaData.description || '',
            location: agendaData.location || '',
            status: agendaData.status || 'scheduled',
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'agenda', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating agenda item:', error);
        return {
            success: false,
            error: error.message || 'Failed to create agenda item'
        };
    }
}

/**
 * Update an agenda item
 * @param {string} agendaId - ID of the agenda item to update
 * @param {Object} agendaData - Agenda item data to update
 * @returns {Promise<Object>} Updated agenda item data
 */
export async function updateAgenda(agendaId, agendaData) {
    try {
        const updateData = {
            ...agendaData,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(agendaId, updateData, 'agenda', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating agenda item:', error);
        return {
            success: false,
            error: error.message || 'Failed to update agenda item'
        };
    }
}

/**
 * Delete an agenda item
 * @param {string} agendaId - ID of the agenda item to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAgenda(agendaId) {
    try {
        const result = await deleteWithCacheClear(agendaId, 'agenda', ['workspace', 'dashboard']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting agenda item:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete agenda item'
        };
    }
}
