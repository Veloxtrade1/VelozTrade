// frontend/components/InstrumentCards.js
const instruments = [
  {
    name: 'Forex',
    icon: '💱',
    description: '190+ FX pairs',
    features: ['Major, Minor & Exotic pairs', '24/5 trading', 'Low spreads from 0.0 pips'],
  },
  {
    name: 'Stocks',
    icon: '📈',
    description: '19,000+ global shares',
    features: ['Apple, Amazon, Tesla & more', 'Fractional shares available', 'Real-time prices'],
  },
  {
    name: 'Commodities',
    icon: '🥇',
    description: 'Gold, Silver, Oil',
    features: ['Precious metals', 'Energy products', 'Agricultural futures'],
  },
  {
    name: 'Crypto',
    icon: '₿',
    description: 'BTC, ETH, LTC & more',
    features: ['24/7 trading', 'High liquidity', 'Competitive margins'],
  },
];

export default function InstrumentCards() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-primary">
          Trade What You Love
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {instruments.map((item) => (
            <div
              key={item.name}
              className="card hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-xl font-bold text-primary mb-1">{item.name}</h3>
              <p className="text-gray-600 mb-3">{item.description}</p>
              <ul className="text-sm text-gray-500 space-y-1">
                {item.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}