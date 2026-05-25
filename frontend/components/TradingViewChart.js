// frontend/components/TradingViewChart.js
import { useEffect, useRef } from 'react';

export default function TradingViewChart({ symbol }) {
  const container = useRef(null);

  useEffect(() => {
    // Map symbol to TradingView format
    const getTradingViewSymbol = (sym) => {
      const mappings = {
        'EURUSD': 'FX:EURUSD',
        'GBPUSD': 'FX:GBPUSD',
        'USDJPY': 'FX:USDJPY',
        'AAPL': 'NASDAQ:AAPL',
        'MSFT': 'NASDAQ:MSFT',
        'GOOGL': 'NASDAQ:GOOGL',
        'BTCUSD': 'BINANCE:BTCUSDT',
        'ETHUSD': 'BINANCE:ETHUSDT',
        'XAUUSD': 'FX:XAUUSD',
        'XAGUSD': 'FX:XAGUSD',
      };
      return mappings[sym] || `FX:${sym}`;
    };

    const tvSymbol = getTradingViewSymbol(symbol);

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView && container.current) {
        new window.TradingView.widget({
          container_id: container.current.id,
          symbol: tvSymbol,
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          loading_screen: { backgroundColor: '#f4f7fa' },
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      if (script.parentNode) script.parentNode.removeChild(script);
      // Remove widget container content
      if (container.current) container.current.innerHTML = '';
    };
  }, [symbol]);

  return (
    <div
      id={`tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '')}`}
      ref={container}
      style={{ height: '500px', width: '100%' }}
      className="rounded-lg overflow-hidden shadow"
    />
  );
}