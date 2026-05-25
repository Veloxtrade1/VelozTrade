// frontend/pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import Layout from '../components/Layout';
import TradingViewChart from '../components/TradingViewChart';
import OrderPanel from '../components/OrderPanel';
import PositionsTable from '../components/PositionsTable';

export default function Dashboard() {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [livePrice, setLivePrice] = useState({ bid: 0, ask: 0 });
  const [balance, setBalance] = useState(0);
  const [freeMargin, setFreeMargin] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Available symbols for dropdown
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AAPL', 'MSFT', 'GOOGL', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD'];

  // Check authentication and fetch account data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);

    const fetchAccount = async () => {
      try {
        const res = await axios.get('/api/account/balance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBalance(res.data.balance || 0);
        setFreeMargin(res.data.free_margin || 0);
      } catch (err) {
        console.error('Failed to fetch balance', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        }
      }
    };
    fetchAccount();

    // Setup WebSocket connection
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://veloztrade-api-gateway.onrender.com';
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      newSocket.emit('subscribe', selectedSymbol);
    });

    newSocket.on('price', (data) => {
      if (data.symbol === selectedSymbol) {
        setLivePrice({ bid: data.bid, ask: data.ask });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [router, selectedSymbol]);

  const handleSymbolChange = (e) => {
    const newSymbol = e.target.value;
    setSelectedSymbol(newSymbol);
    if (socket && socket.connected) {
      socket.emit('subscribe', newSymbol);
    }
  };

  if (!isAuthenticated) {
    return null; // or loading spinner
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Account Balance</p>
            <p className="text-2xl font-bold text-primary">${balance.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Free Margin</p>
            <p className="text-2xl font-bold text-primary">${freeMargin.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Live Spread</p>
            <p className="text-2xl font-bold text-accent">
              {livePrice.ask && livePrice.bid ? (livePrice.ask - livePrice.bid).toFixed(5) : '—'}
            </p>
          </div>
        </div>

        {/* Symbol Selector */}
        <div className="mb-4">
          <label className="text-sm font-medium mr-2">Instrument:</label>
          <select
            value={selectedSymbol}
            onChange={handleSymbolChange}
            className="border rounded p-1 bg-white"
          >
            {symbols.map((sym) => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </div>

        {/* Chart and Order Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TradingViewChart symbol={selectedSymbol} />
          </div>
          <div>
            <OrderPanel symbol={selectedSymbol} bid={livePrice.bid} ask={livePrice.ask} />
          </div>
        </div>

        {/* Positions Table */}
        <div className="mt-8">
          <PositionsTable />
        </div>
      </div>
    </Layout>
  );
}