import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyItMatters } from "@/components/sections/WhyItMatters";
import { ClassifySection } from "@/components/sections/ClassifySection";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { MetricsStrip } from "@/components/sections/MetricsStrip";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { AmbientBackground } from "@/components/layout/AmbientBackground";

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <Hero />
      <HowItWorks />
      <WhyItMatters />
      <ClassifySection />
      <ProductPreview />
      <MetricsStrip />
      <FinalCTA />
      <Footer />
    </>
  );
}
