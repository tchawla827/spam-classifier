import { Hero } from "../components/sections/Hero";
import { HowItWorks } from "../components/sections/HowItWorks";
import { WhyItMatters } from "../components/sections/WhyItMatters";
import { ClassifySection } from "../components/sections/ClassifySection";
import { ProductPreview } from "../components/sections/ProductPreview";
import { MetricsStrip } from "../components/sections/MetricsStrip";
import { FinalCTA } from "../components/sections/FinalCTA";
import { Footer } from "../components/sections/Footer";
import { AmbientBackground } from "../components/layout/AmbientBackground";
import { LandingRedirect } from "../components/layout/LandingRedirect";

function SectionDivider() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
      <div
        className="h-[1px]"
        style={{
          background:
            "linear-gradient(to right, transparent, hsl(263 84% 58% / 0.15), hsl(188 95% 43% / 0.1), transparent)",
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <LandingRedirect />
      <AmbientBackground />
      <Hero />
      <SectionDivider />
      <HowItWorks />
      <WhyItMatters />
      <ClassifySection />
      <ProductPreview />
      <SectionDivider />
      <MetricsStrip />
      <FinalCTA />
      <Footer />
    </>
  );
}
