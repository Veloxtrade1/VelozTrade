// frontend/components/CTASection.js
import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-primary to-primary-light">
      <div className="container mx-auto px-4 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Start Trading?
        </h2>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
          Join thousands of traders who trust VelozTrade. Open your account in minutes.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/register">
            <button className="bg-accent text-black px-8 py-3 rounded-lg text-lg font-semibold hover:bg-yellow-500 transition shadow-lg">
              Create Free Account
            </button>
          </Link>
          <Link href="/demo">
            <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white hover:text-primary transition">
              Try Demo Account
            </button>
          </Link>
        </div>
        <p className="mt-6 text-sm opacity-75">
          No minimum deposit. Regulated broker. Negative balance protection.
        </p>
      </div>
    </section>
  );
}