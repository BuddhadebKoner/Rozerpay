import express from 'express';
import { placeOrder, verifyPayment } from '../controllers/controller.js';

const orderRouter = express.Router();

// Create order endpoint
orderRouter.post('/order', placeOrder);

// Verify payment endpoint
orderRouter.post('/verify-payment', verifyPayment);

export default orderRouter;