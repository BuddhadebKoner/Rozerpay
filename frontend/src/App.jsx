import React, { useState, useCallback } from 'react';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const App = () => {
  const [order, setOrder] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTesting, setShowTesting] = useState(false);
  const [lastPaymentPayload, setLastPaymentPayload] = useState(null);

  // Form state for dynamic order creation
  const [orderForm, setOrderForm] = useState({
    amount: 50000, // Amount in paise (500 INR)
    currency: 'INR',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    customerPhone: '9999999999',
    description: 'Test Transaction'
  });

  // Load Razorpay script
  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const placeOrder = async () => {
    if (!orderForm.amount || orderForm.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setVerifyResult(null);
    setOrder(null);

    try {
      const response = await fetch(`${API_BASE_URL}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseInt(orderForm.amount),
          currency: orderForm.currency,
          customerId: 'customer_001',
          customerEmail: orderForm.customerEmail,
          customerPhone: orderForm.customerPhone,
          notes: {
            description: orderForm.description,
            source: 'demo_app'
          }
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      setOrder(data.order);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // Razorpay checkout options
      const options = {
        key: data.razorpay_key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Razorpay Demo App',
        description: orderForm.description,
        order_id: data.order.id,
        handler: function (response) {
          const payload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          };
          setLastPaymentPayload(payload);
          verifyPaymentWithBackend(payload);
        },
        prefill: {
          name: orderForm.customerName,
          email: orderForm.customerEmail,
          contact: orderForm.customerPhone
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: function () {
            console.log('Payment modal dismissed');
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentWithBackend = async (paymentData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();
      setVerifyResult(data);

      if (data.success) {
        console.log('Payment verified successfully:', data);
      } else {
        console.error('Payment verification failed:', data);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerifyResult({
        success: false,
        message: `Verification failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setOrderForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatAmount = (amount) => {
    return (amount / 100).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-8 text-center">
          Razorpay Integration Demo
        </h1>

        {/* Order Form */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (in paise)
              </label>
              <input
                type="number"
                name="amount"
                value={orderForm.amount}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="100"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: ₹{formatAmount(orderForm.amount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={orderForm.currency}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                name="customerName"
                value={orderForm.customerName}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                name="customerEmail"
                value={orderForm.customerEmail}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Phone
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={orderForm.customerPhone}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={orderForm.description}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={placeOrder}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed mb-6 text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay ₹${formatAmount(orderForm.amount)} with Razorpay`
          )}
        </button>

        {/* Order Details */}
        {order && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Order Created</h3>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Order ID:</span> {order.id}</div>
              <div><span className="font-medium">Amount:</span> ₹{formatAmount(order.amount)}</div>
              <div><span className="font-medium">Currency:</span> {order.currency}</div>
              <div><span className="font-medium">Status:</span> {order.status}</div>
            </div>
          </div>
        )}

        {/* Payment Verification Result */}
        {verifyResult && (
          <div className={`p-4 rounded-lg border mb-6 ${verifyResult.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}>
            <h3 className="font-semibold mb-2">
              {verifyResult.success ? '✅ Payment Verified' : '❌ Verification Failed'}
            </h3>
            <p className="text-sm">{verifyResult.message}</p>
            {verifyResult.success && verifyResult.data && (
              <div className="mt-2 text-xs space-y-1">
                <div><span className="font-medium">Payment ID:</span> {verifyResult.data.paymentId}</div>
                <div><span className="font-medium">Order ID:</span> {verifyResult.data.orderId}</div>
                {verifyResult.data.amount && (
                  <div><span className="font-medium">Amount:</span> ₹{formatAmount(verifyResult.data.amount)}</div>
                )}
                {verifyResult.data.method && (
                  <div><span className="font-medium">Method:</span> {verifyResult.data.method}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Testing Panel */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <button
            onClick={() => setShowTesting(!showTesting)}
            className="bg-gray-100 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200 transition font-medium"
          >
            {showTesting ? 'Hide' : 'Show'} Developer Panel
          </button>

          {showTesting && (
            <div className="mt-6 bg-gray-50 p-4 rounded-lg text-sm">
              <div className="mb-4">
                <span className="font-semibold">Order Object:</span>
                <pre className="bg-gray-100 p-3 rounded mt-1 overflow-x-auto text-xs">
                  {order ? JSON.stringify(order, null, 2) : 'No order created yet.'}
                </pre>
              </div>
              <div className="mb-4">
                <span className="font-semibold">Last Payment Payload:</span>
                <pre className="bg-gray-100 p-3 rounded mt-1 overflow-x-auto text-xs">
                  {lastPaymentPayload ? JSON.stringify(lastPaymentPayload, null, 2) : 'No payment payload yet.'}
                </pre>
              </div>
              <div>
                <span className="font-semibold">Verification Result:</span>
                <pre className="bg-gray-100 p-3 rounded mt-1 overflow-x-auto text-xs">
                  {verifyResult ? JSON.stringify(verifyResult, null, 2) : 'No verification result yet.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;