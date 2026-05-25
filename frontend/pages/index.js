// frontend/pages/index.js
import Layout from '../components/Layout';
import Hero from '../components/Hero';
import InstrumentCards from '../components/InstrumentCards';
import FeatureGrid from '../components/FeatureGrid';
import Awards from '../components/Awards';
import CTASection from '../components/CTASection';

export default function Home() {
  return (
    <Layout>
      <Hero />
      <InstrumentCards />
      <FeatureGrid />
      <Awards />
      <CTASection />
    </Layout>
  );
}