"use client";
import React, { useEffect } from "react";
import Header from "../Header";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import PricingSection from "./PricingSection";
import FaqSection from "./FaqSection";
import Footer from "./Footer";
import ScrollToTopButton from "./ScrollToTopButton";
import Testimonials from "./Testimonials";

function Content() {
  // Add scroll padding to account for fixed header
  useEffect(() => {
    document.documentElement.style.scrollPaddingTop = "100px";
    return () => {
      document.documentElement.style.scrollPaddingTop = "";
    };
  }, []);

  return (
    <main className="flex overflow-hidden flex-col items-center pb-8">

      <header className="w-full h-full ">
        <Header />
        <HeroSection />
      </header>
     {/*  <PainSection /> */}
      <FeaturesSection />
      <PricingSection />
      <Testimonials />
      <FaqSection />
      <Footer />
      <ScrollToTopButton />
    </main>
  );
}

export default Content;
