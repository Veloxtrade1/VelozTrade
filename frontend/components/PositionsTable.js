// frontend/components/PositionsTable.js
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function PositionsTable() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState(null);

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/account/positions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPositions(res.data);
    } catch (err) {
      console.error('Failed to fetch positions', err);
    } finally {
      setLoading(false);
    }
  };

  const closePosition = async (positionId) => {
    setClosingId(positionId);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/trade/close', { positionId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh positions after close
      await fetchPositions();
    } catch (err) {
      alert('Failed to close position: ' + (err.response?.data?.error || err.message));
    } finally {
      setClosingId(null);
    }
  };

  useEffect(() => {
    fetchPositions();
    // Refresh every 10 seconds to update P&L
    const interval = setInterval(fetchPositions, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-3">Open Positions</h2>
        <div className="text-center py-8 text-gray-500">Loading positions...</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-3">Open Positions</h2>
        <div className="text-center py-8 text-gray-500">No open positions</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-3">Open Positions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-left">Side</th>
              <th className="p-2 text-right">Quantity</th>
              <th className="p-2 text-right">Open Price</th>
              <th className="p-2 text-right">Current Price</th>
              <th className="p-2 text-right">P&L</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const isProfit = pos.pnl >= 0;
              return (
                <tr key={pos.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{pos.symbol}</td>
                  <td className={`p-2 font-semibold ${pos.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                    {pos.side.toUpperCase()}
                  </td>
                  <td className="p-2 text-right">{pos.quantity}</td>
                  <td className="p-2 text-right">{parseFloat(pos.open_price).toFixed(5)}</td>
                  <td className="p-2 text-right">{parseFloat(pos.current_price || 0).toFixed(5)}</td>
                  <td className={`p-2 text-right font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    ${parseFloat(pos.pnl || 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => closePosition(pos.id)}
                      disabled={closingId === pos.id}
                      className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                    >
                      {closingId === pos.id ? 'Closing...' : 'Close'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}