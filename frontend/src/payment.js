import api from './api';

const openCheckout = (booking, { createOrderUrl, verifyUrl, description }, { onSuccess, onDismiss, onError } = {}) => {
    api.post(createOrderUrl, { bookingId: booking._id })
        .then(({ data }) => {
            const razorpay = new window.Razorpay({
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                order_id: data.orderId,
                name: 'Evento',
                description: `${description} for ${data.eventName}`,
                handler: (response) => {
                    api.post(verifyUrl, {
                        bookingId: booking._id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    })
                        .then(({ data: updatedBooking }) => onSuccess?.(updatedBooking))
                        .catch((err) => onError?.(err));
                },
                modal: {
                    ondismiss: () => onDismiss?.(),
                },
            });
            razorpay.open();
        })
        .catch((err) => onError?.(err));
};

// Opens Razorpay checkout for a booking that is awaiting its advance payment.
// Calls onSuccess(updatedBooking) once the payment is verified server-side,
// or onDismiss() if the user closes the checkout without paying.
export const payForBooking = (booking, callbacks) => openCheckout(
    booking,
    { createOrderUrl: '/payments/create-order', verifyUrl: '/payments/verify', description: 'Advance payment' },
    callbacks
);

// Opens Razorpay checkout for the remaining balance owed on a completed booking
// (event.price - advanceAmount). Same success/dismiss/error contract as payForBooking.
export const payFinalAmount = (booking, callbacks) => openCheckout(
    booking,
    { createOrderUrl: '/payments/final/create-order', verifyUrl: '/payments/final/verify', description: 'Final payment' },
    callbacks
);
