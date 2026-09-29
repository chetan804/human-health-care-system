import { useCallback, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TrustBar from "./components/TrustBar";
import Problem from "./components/Problem";
import Solution from "./components/Solution";
import Features from "./components/Features";
import Showcase from "./components/Showcase";
import HowItWorks from "./components/HowItWorks";
import AISection from "./components/AISection";
import Technology from "./components/Technology";
import Security from "./components/Security";
import Benefits from "./components/Benefits";
import Principles from "./components/Principles";
import Pricing from "./components/Pricing";
import FAQ from "./components/FAQ";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import CtaModal from "./components/CtaModal";
import { CtaContext, type CtaIntent } from "./components/ui";

export default function App() {
  const [modal, setModal] = useState<{ intent: CtaIntent; plan?: string } | null>(null);
  const open = useCallback((intent: CtaIntent, plan?: string) => setModal({ intent, plan }), []);
  const close = useCallback(() => setModal(null), []);
  const ctx = useMemo(() => ({ open }), [open]);

  return (
    <CtaContext.Provider value={ctx}>
      <Navbar />
      <main id="main">
        <Hero />
        <TrustBar />
        <Problem />
        <Solution />
        <Features />
        <Showcase />
        <HowItWorks />
        <AISection />
        <Technology />
        <Security />
        <Benefits />
        <Principles />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <CtaModal intent={modal?.intent ?? null} plan={modal?.plan} onClose={close} />
    </CtaContext.Provider>
  );
}
