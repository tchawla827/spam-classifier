import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyItMatters } from "@/components/sections/WhyItMatters";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { MetricsStrip } from "@/components/sections/MetricsStrip";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyItMatters />
      <ProductPreview />
      <MetricsStrip />
      <FinalCTA />
      <Footer />
    </>
  );
}
