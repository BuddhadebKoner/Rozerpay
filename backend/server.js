import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { placeOrder, verifyPayment } from './src/controllers/controller.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Simple CORS - allow all origins for localhost testing
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Direct API routes (simplified)
app.post('/api/order', placeOrder);
app.post('/api/verify-payment', verifyPayment);

// Simple error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: 'Server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   POST /api/order - Create Razorpay order`);
  console.log(`   POST /api/verify-payment - Verify payment`);
  console.log(`   GET /health - Health check`);
});