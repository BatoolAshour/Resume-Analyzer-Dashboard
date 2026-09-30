import { AnalyzerWorkspace } from "@/components/analyzer/AnalyzerWorkspace";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AnalyzerWorkspace />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
