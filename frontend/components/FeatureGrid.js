// frontend/components/FeatureGrid.js
const features = [
  {
    title: 'Superfast Execution',
    description: 'Lightning-fast order execution with minimal latency, even during high volatility.',
    icon: '⚡',
  },
  {
    title: 'Tight Spreads',
    description: 'Competitive spreads starting from 0.0 pips on major forex pairs.',
    icon: '📊',
  },
  {
    title: 'Advanced Tools',
    description: 'Professional charting, indicators, and risk management tools.',
    icon: '🛠️',
  },
  {
    title: 'Negative Balance Protection',
    description: 'You can never lose more than your deposit. Your balance is protected.',
    icon: '🛡️',
  },
  {
    title: 'Segregated Funds',
    description: 'Client funds held in tier-1 banks, completely separate from company assets.',
    icon: '🏦',
  },
  {
    title: '24/7 Support',
    description: 'Multi-lingual customer support available around the clock.',
    icon: '🎧',
  },
];

export default function FeatureGrid() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-primary">
          Why Trade with VelozTrade?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-primary mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}