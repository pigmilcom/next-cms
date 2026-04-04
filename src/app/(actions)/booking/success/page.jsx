// @/app/(actions)/booking/success/page.jsx

import { getAllAppointments } from '@/lib/server/admin.js';
import BookingSuccessPageClient from './page.client';

// No caching for success page (always fresh booking status)
export const revalidate = 0;

const BookingSuccessPage = async ({ searchParams }) => {
    const params = await searchParams;
    const bookingId = params.id || params.booking_id;
    const paymentMethod = params.payment_method || null;

    let bookingDetails = null;
    let error = null;
    let actualBookingId = bookingId || null;

    try {
        actualBookingId = atob(bookingId);
    } catch (_e) {
        actualBookingId = bookingId || null;
    }

    try {
        if (!actualBookingId) {
            error = 'Booking not found';
        } else {
            const bookingResult = await getAllAppointments();

            if (!bookingResult?.success || !Array.isArray(bookingResult?.data)) {
                error = bookingResult?.error || bookingResult?.message || 'Booking data not found';
            } else {
                const bookingData = bookingResult.data.find((item) => item?.id === actualBookingId);

                if (!bookingData) {
                    error = 'Booking data not found';
                } else {
                    bookingDetails = {
                        id: bookingData.id || actualBookingId,
                        createdAt: bookingData.createdAt || null,
                        updatedAt: bookingData.updatedAt || null,
                        dateTime: bookingData.dateTime || null,
                        name: bookingData.name || '',
                        email: bookingData.email || '',
                        phone: bookingData.phone || '',
                        address: bookingData.address || '',
                        device: bookingData.deviceLabel || bookingData.device || '',
                        issue: bookingData.issue || '',
                        status: bookingData.status || 'pending',
                        paymentOption: bookingData.paymentOption || 'pay_later',
                        paymentStatus: bookingData.paymentStatus || 'pending',
                        source: bookingData.source || 'web_form',
                        amount: 29,
                        currency: 'EUR'
                    };
                }
            }
        }
    } catch (_e) {
        error = 'Booking retrieval error';
    }

    return (
        <BookingSuccessPageClient
            initialBookingDetails={bookingDetails}
            initialError={error}
            bookingId={actualBookingId}
            paymentMethod={paymentMethod}
        />
    );
};

export default BookingSuccessPage;
