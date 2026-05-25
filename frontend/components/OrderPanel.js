// frontend/components/OrderPanel.js
import { useState } from 'react';
import axios from 'axios';

export default function OrderPanel({ symbol, bid, ask }) {
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState(0.01);
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const placeOrder = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '/api/trade/market';
      let payload = { symbol, side, quantity };
      
      if (orderType === 'limit') {
        endpoint = '/api/trade/limit';
        payload = { ...payload, price: parseFloat(limitPrice) };
      } else if (orderType === 'stop') {
        endpoint = '/api/trade/stop';
        payload = { ...payload, price: parseFloat(limitPrice) };
      }
      
      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.status === 'accepted') {
        setMessage({ type: 'success', text: 'Order placed successfully!' });
        // Reset limit price if was set
        if (orderType !== 'market') setLimitPrice('');
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Order failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Network error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold text-primary mb-3">Place Order</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Symbol</label>
        <div className="text-lg font-semibold">{symbol}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-sm font-medium mb-1">Bid</label>
          <div className="text-green-600 font-medium">{bid?.toFixed(5) || '—'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ask</label>
          <div className="text-red-600 font-medium">{ask?.toFixed(5) || '—'}</div>
        </div>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
        </select>
      </div>
      
      {orderType !== 'market' && (
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            step="0.00001"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Enter price"
          />
        </div>
      )}
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Quantity (lots)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value))}
          className="w-full border rounded p-2"
        />
      </div>
      
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 rounded font-semibold ${
            side === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 rounded font-semibold ${
            side === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          SELL
        </button>
      </div>
      
      <button
        onClick={placeOrder}
        disabled={loading || (orderType !== 'market' && !limitPrice)}
        className="w-full btn-primary py-2 text-lg disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Place ${orderType.toUpperCase()} Order`}
      </button>
      
      {message && (
        <div
          className={`mt-3 p-2 rounded text-center text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500 text-center">
        Leverage: Up to 1:100 | Margin: ~1%
      </div>
    </div>
  );
}