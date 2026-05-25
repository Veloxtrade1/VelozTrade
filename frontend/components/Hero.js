// frontend/components/Hero.js
export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-primary to-primary-light text-white py-20">
      <div className="container mx-auto text-center px-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          Trade Forex, Stocks & Crypto with VelozTrade
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Superfast execution · Tight spreads · Negative balance protection
        </p>
        <button className="bg-accent text-black px-8 py-3 rounded-lg text-lg font-semibold hover:bg-yellow-500 transition shadow-lg">
          Open Account
        </button>
        <p className="mt-4 text-sm opacity-75">
          Start with as little as $10. No hidden fees.
        </p>
      </div>
    </section>
  );
}