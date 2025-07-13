import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Input validation helper
const validateRequired = (fields, data) => {
   const missing = fields.filter(field => !data[field]);
   if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
   }
};

// Initialize Razorpay with proper error handling
let razorpay;
try {
   if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not found in environment variables');
   }

   razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
   });
} catch (error) {
   console.error('Failed to initialize Razorpay:', error.message);
   process.exit(1);
}

export const placeOrder = async (req, res) => {
   try {
      // Validate required fields
      validateRequired(['amount', 'currency'], req.body);

      const {
         amount,
         currency = 'INR',
         receipt,
         notes = {},
         customerId,
         customerEmail,
         customerPhone
      } = req.body;

      // Validate amount (should be in smallest currency unit - paise for INR)
      if (!Number.isInteger(amount) || amount <= 0) {
         return res.status(400).json({
            success: false,
            message: 'Amount must be a positive integer in smallest currency unit (paise for INR)',
         });
      }

      // Validate currency
      const supportedCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
      if (!supportedCurrencies.includes(currency)) {
         return res.status(400).json({
            success: false,
            message: `Currency must be one of: ${supportedCurrencies.join(', ')}`,
         });
      }

      const options = {
         amount,
         currency,
         receipt: receipt || `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
         payment_capture: 1,
         notes: {
            customer_id: customerId,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            created_at: new Date().toISOString(),
            ...notes
         }
      };

      console.log('Creating Razorpay order with options:', {
         ...options,
         amount: `${amount} ${currency}`
      });

      const order = await razorpay.orders.create(options);

      console.log('Order created successfully:', order.id);

      return res.status(200).json({
         success: true,
         order: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
            created_at: order.created_at
         },
         razorpay_key_id: process.env.RAZORPAY_KEY_ID, // Safe to expose key_id
      });
   } catch (error) {
      console.error('Error placing order:', error);

      // Handle specific Razorpay errors
      if (error.error && error.error.code) {
         return res.status(400).json({
            success: false,
            message: 'Razorpay error',
            error: error.error.description || error.error.code
         });
      }

      return res.status(500).json({
         success: false,
         message: 'Failed to place order',
         error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
   }
};

export const verifyPayment = async (req, res) => {
   try {
      // Validate required fields
      validateRequired(['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'], req.body);

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // Validate format of IDs
      if (!razorpay_order_id.startsWith('order_') ||
         !razorpay_payment_id.startsWith('pay_')) {
         return res.status(400).json({
            success: false,
            message: 'Invalid order ID or payment ID format',
         });
      }

      console.log('Verifying payment:', {
         order_id: razorpay_order_id,
         payment_id: razorpay_payment_id
      });

      // Create signature for verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
         .update(body.toString())
         .digest('hex');

      const isSignatureValid = expectedSignature === razorpay_signature;

      if (!isSignatureValid) {
         console.warn('Invalid payment signature detected:', {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            provided_signature: razorpay_signature,
            expected_signature: expectedSignature
         });

         return res.status(400).json({
            success: false,
            message: 'Payment signature verification failed',
         });
      }

      // Fetch payment details from Razorpay for additional verification
      try {
         const payment = await razorpay.payments.fetch(razorpay_payment_id);

         // Verify payment status
         if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return res.status(400).json({
               success: false,
               message: `Payment not successful. Status: ${payment.status}`,
            });
         }

         // Verify order ID matches
         if (payment.order_id !== razorpay_order_id) {
            return res.status(400).json({
               success: false,
               message: 'Order ID mismatch',
            });
         }

         console.log('Payment verified successfully:', {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            amount: payment.amount,
            status: payment.status
         });

         return res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: {
               orderId: razorpay_order_id,
               paymentId: razorpay_payment_id,
               amount: payment.amount,
               currency: payment.currency,
               status: payment.status,
               method: payment.method,
               verified_at: new Date().toISOString()
            }
         });

      } catch (paymentFetchError) {
         console.error('Error fetching payment details:', paymentFetchError);

         // If we can't fetch payment details but signature is valid, still proceed
         return res.status(200).json({
            success: true,
            message: 'Payment signature verified (unable to fetch payment details)',
            data: {
               orderId: razorpay_order_id,
               paymentId: razorpay_payment_id,
               verified_at: new Date().toISOString()
            }
         });
      }

   } catch (error) {
      console.error('Error verifying payment:', error);
      return res.status(500).json({
         success: false,
         message: 'Failed to verify payment',
         error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
   }
};