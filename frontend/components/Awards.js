// frontend/components/Awards.js
const awards = [
  { name: 'Best Forex Broker 2024', organization: 'Global Forex Awards', year: 2024 },
  { name: 'Best Trading Platform', organization: 'Investors Choice', year: 2023 },
  { name: 'Most Innovative Broker', organization: 'FinTech Awards', year: 2024 },
  { name: 'Best Customer Support', organization: 'International Finance', year: 2023 },
];

export default function Awards() {
  return (
    <section className="py-12 bg-white border-t border-b border-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-primary">
          Recognized Excellence
        </h2>
        <div className="flex flex-wrap justify-center gap-8">
          {awards.map((award) => (
            <div
              key={award.name}
              className="text-center p-4 min-w-[200px]"
            >
              <div className="text-3xl mb-2">🏆</div>
              <p className="font-semibold text-primary">{award.name}</p>
              <p className="text-sm text-gray-500">
                {award.organization} · {award.year}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}