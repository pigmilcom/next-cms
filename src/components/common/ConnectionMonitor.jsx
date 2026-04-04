// @/components/common/ConnectionMonitor.jsx
'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * ConnectionMonitor component
 * Monitors internet connection and displays a toast alert when connection is lost
 * - Shows alert after 10 seconds of connection loss
 * - Automatically hides alert when connection is restored
 */
export default function ConnectionMonitor() {
    const timeoutRef = useRef(null);
    const toastIdRef = useRef(null);

    useEffect(() => {
        // Check if running in browser
        if (typeof window === 'undefined') return;

        const handleOffline = () => {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set a 10-second delay before showing the toast
            timeoutRef.current = setTimeout(() => {
                // Dismiss any existing connection toast
                if (toastIdRef.current) {
                    toast.dismiss(toastIdRef.current);
                }

                // Show connection lost toast with emoji
                toastIdRef.current = toast.error('Connection lost, check your internet connection.', {
                    duration: Infinity, // Keep toast visible until dismissed
                    id: 'connection-lost', // Unique ID to prevent duplicates
                    dismissible: false, // Prevent manual dismissal
                    className: 'connection-toast'
                });
            }, 10000); // 10 seconds delay
        };

        const handleOnline = () => {
            // Clear the timeout if connection is restored before toast shows
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Immediately dismiss the connection lost toast if it exists
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
                toastIdRef.current = null;

                // Optional: Show a brief "Connection restored" message
                toast.success('Connection restored', {
                    duration: 2000,
                    id: 'connection-restored'
                });
            }
        };

        // Add event listeners
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Check initial connection state
        if (!navigator.onLine) {
            handleOffline();
        }

        // Cleanup
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);

            // Clear timeout on unmount
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Dismiss toast on unmount
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
        };
    }, []);

    // This component doesn't render anything visible
    return null;
}
