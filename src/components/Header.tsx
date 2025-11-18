"use client";
import Image from "next/image";
import Link from "next/link";
import logo from '../../assets/logo-flynance.png'
import React, { useState, useEffect, useRef } from "react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Add scroll event listener to change header style on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Smooth scroll to section
  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    e.preventDefault();
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false); // Close mobile menu after clicking a link
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle keyboard navigation in mobile menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsMobileMenuOpen(false);
    }
  };

  const links = [
    { href: "#hero", label: "Início" },
    { href: "#features", label: "Funcionalidade" },
    { href: "#pricing", label: "Planos" },
    { href: "#faq", label: "FAQ" }
  ]

  return (
    <header
      className={`flex flex-col items-center self-stretch pt-8 w-full max-md:px-5 max-md:max-w-full sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? " shadow-md pt-4 pb-4" : "bg-transparent pt-8"
      }`}
    >
     <nav role="navigation" aria-label="Navegação principal" className={`w-full ${isScrolled ? 'fixed top-0 left-0 z-50 bg-gradient-to-r from-[#EBF7F5] to-secondary shadow-md' : ''}`}>
     <div className="max-w-[1280px] mx-auto px-4 py-4 flex justify-between items-center">
          <a href="#hero" onClick={(e) => scrollToSection(e, "hero")}>
            <Image
              src={logo}
              alt="Flynance Logo"
              width={88}
              height={50}
              className="object-contain shrink-0 aspect-[1.76] w-[88px]"
            />
          </a>

          <div className="hidden md:flex flex-wrap gap-8 items-center self-start">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href.replace("#", ""))}
                className={`hover:scale-110 font-medium transition-transform ${
                  isScrolled ? "text-gray-700" : "text-[#475D69]"
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              className="px-6 py-2 font-bold text-white bg-blue-400 rounded-lg hover:bg-blue-500 transition"
            >
              Login
            </Link>
          </div>

          <div className="md:hidden flex items-center z-50">
            <button
              ref={hamburgerRef}
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
              className="p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md"
            >
              <div className="relative w-6 h-5">
                <span
                  className={`absolute h-0.5 w-6 bg-gray-700 transform transition-all duration-300 ${
                    isMobileMenuOpen ? "rotate-45 top-2.5" : "rotate-0 top-0"
                  }`}
                ></span>
                <span
                  className={`absolute h-0.5 w-6 bg-gray-700 top-2 transition-all duration-300 ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                ></span>
                <span
                  className={`absolute h-0.5 w-6 bg-gray-700 transform transition-all duration-300 ${
                    isMobileMenuOpen ? "-rotate-45 top-2.5" : "rotate-0 top-4"
                  }`}
                ></span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isMobileMenuOpen}
        onKeyDown={handleKeyDown}
        tabIndex={isMobileMenuOpen ? 0 : -1}
      >
        <div className="flex flex-col h-full p-8 gap-8 overflow-y-auto">
          <div className="flex justify-between items-center">
            <Image
              src={logo}
              alt="Flynance Logo"
              className="object-contain"
              width={88}
              height={50}
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              className="p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col space-y-6 text-lg w-full">
          {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-700 hover:text-blue-400 transition-colors py-2 border-b border-gray-100"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="w-full">
            <Link href="/login" className="w-full h-full py-3 px-8 font-bold text-white bg-blue-400 rounded-lg hover:bg-blue-500 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

