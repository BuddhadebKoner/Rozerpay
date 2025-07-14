import Razerpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razerpay({
   key_id: process.env.ROZERPAY_ID,
   key_secret: process.env.ROZERPAY_SECRET,
});

console.log('Razorpay initialized with ID:', process.env.ROZERPAY_ID);

export const placeOrder = async (req, res) => {
   try {
      const options = {
         amount: 50000,
         currency: 'INR',
         receipt: 'receipt#1',
         payment_capture: 1,
         notes: {
            key1: 'value3',
            key2: 'value2'
         }
      }

      const order = await razorpay.orders.create(options);

      return res.status(200).json({
         success: true,
         order,
      });
   } catch (error) {
      console.error('Error placing order:', error);
      return res.status(500).json({
         success: false,
         message: 'Failed to place order',
         error: error.message
      });
   }
};

export const verifyPayment = async (req, res) => {
   try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;


      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
         .createHmac('sha256', process.env.ROZERPAY_SECRET)
         .update(body.toString())
         .digest('hex');

      const isSignatureValid = expectedSignature === razorpay_signature;

      if (!isSignatureValid) {
         return res.status(400).json({
            success: false,
            message: 'Invalid signature',
         });
      }

      return res.status(200).json({
         success: true,
         message: 'Payment verified successfully',
         orderId: razorpay_order_id,
         paymentId: razorpay_payment_id
      });

   } catch (error) {
      console.error('Error verifying payment:', error);
      return res.status(500).json({
         success: false,
         message: 'Failed to verify payment',
         error: error.message
      });
   }
};