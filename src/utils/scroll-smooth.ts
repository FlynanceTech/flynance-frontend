import React from "react";

export const scrollToSection = (
  e: React.MouseEvent<HTMLAnchorElement>,
  sectionId: string
) => {
  e.preventDefault();
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
};
