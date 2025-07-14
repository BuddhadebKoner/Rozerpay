import express from 'express';
import { placeOrder, verifyPayment } from '../controllers/controller.js';

const orderRouter = express.Router()

orderRouter.post('/order', placeOrder);
orderRouter.post('/verify-payment', verifyPayment);

export default orderRouter;