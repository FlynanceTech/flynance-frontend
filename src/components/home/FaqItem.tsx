"use client";
import { X } from "lucide-react";
import React, { useState, useId, useEffect } from "react";

interface FaqItemProps {
  question: string;
  answer: string;
  index?: number;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer, index = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const uniqueId = useId();
  const headingId = `faq-question-${uniqueId}-${index}`;
  const contentId = `faq-answer-${uniqueId}-${index}`;

  // Delay for screen reader announcement (in milliseconds)
  const SCREEN_READER_DELAY = 150;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isExpanded) {
      // Delay showing content to give screen readers time to announce state change
      timeoutId = setTimeout(() => {
        setIsContentVisible(true);
      }, SCREEN_READER_DELAY);
    } else {
      // Hide content immediately when collapsing
      setIsContentVisible(false);
    }

    // Cleanup timeout on unmount or when state changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isExpanded]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Toggle with Space or Enter key
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleExpand();
    }
  };

  return (
    <article
      className="mt-8 max-w-full bg-white rounded-lg border border-[#E2E8F0] border-solid w-full md:w-[1280px] first:mt-0 overflow-hidden transition-all duration-300"
      role="region"
      aria-labelledby={headingId}
    >
      <button
        onClick={toggleExpand}
        onKeyDown={handleKeyDown}
        className="flex gap-4 md:gap-8 px-4 md:px-6 py-5 md:py-7 w-full text-xl md:text-2xl font-bold text-neutral-500 items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 cursor-pointer"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        id={headingId}
      >
        <span
          className={`object-contain shrink-0 aspect-[1.02] w-[35px] md:w-[49px] transition-transform duration-300 ${isExpanded ? "rotate-90" : "rotate-45"}`}
        >
          <X className="w-full h-full text-primary" />
        </span>

        <h3 className="flex-auto my-auto w-full md:w-[1145px]">{question}</h3>
      </button>

      {/* The content is always in the DOM for screen readers when expanded,
          but visually hidden until after the delay */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!isExpanded}
        className={`px-4 md:px-6 pb-5 md:pb-7 ml-[43px] md:ml-[65px] text-base md:text-lg text-gray-700 transition-all duration-300 ${
          isExpanded ? "block" : "hidden"
        }`}
        style={{
          maxHeight: isContentVisible ? "500px" : "0",
          opacity: isContentVisible ? 1 : 0,
          paddingTop: isContentVisible ? "0.5rem" : "0",
          overflow: isContentVisible ? "visible" : "hidden",
          transition: "max-height 300ms, opacity 300ms, padding-top 300ms",
        }}
      >
        <p className="w-full md:max-w-[1145px]">{answer}</p>
      </div>
    </article>
  );
};

export default FaqItem;
