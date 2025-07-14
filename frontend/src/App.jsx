import React, { useState } from 'react';

const App = () => {
  const [order, setOrder] = useState(null);
  const [paymentId, setPaymentId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);


  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrder = async () => {
    setLoading(true);
    setVerifyResult(null);
    const res = await fetch('http://localhost:3000/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      alert('Order failed: ' + data.message);
      return;
    }
    setOrder(data.order);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert('Razorpay SDK failed to load.');
      return;
    }
    const options = {
      key: 'rzp_test_vvA7njrmEUIw5b', // Use your Razorpay key here or from env
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'Demo Payment',
      description: 'Test Transaction',
      order_id: data.order.id,
      handler: function (response) {
        // Send payment details to backend for verification
        verifyPaymentWithBackend({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
      },
      prefill: {
        name: 'Test User',
        email: 'test@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#3399cc'
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const verifyPaymentWithBackend = async (paymentData) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ success: false, message: err.message });
    }
    setLoading(false);
  };

  // No manual verifyPayment needed, handled by Razorpay popup

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1 className="text-3xl font-bold underline">Razorpay Demo</h1>
      <button onClick={placeOrder} disabled={loading} style={{ margin: '16px 0', padding: '8px 16px' }}>
        Pay with Razorpay
      </button>
      {order && (
        <div style={{ margin: '16px 0' }}>
          <div><b>Order ID:</b> {order.id}</div>
          <div><b>Amount:</b> {order.amount / 100} INR</div>
        </div>
      )}
      {verifyResult && (
        <div style={{ marginTop: 16, color: verifyResult.success ? 'green' : 'red' }}>
          <b>{verifyResult.message}</b>
        </div>
      )}
    </div>
  );
};

export default App;