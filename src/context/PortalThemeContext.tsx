/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Portal Theme & Accessibility Context
 * Manages global text scaling, portal language toggle, and accessibility modal.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

export type PortalTextSize = "sm" | "base" | "lg";
export type PortalLanguage = "en" | "hi";

interface PortalThemeContextType {
  textSize: PortalTextSize;
  setTextSize: (size: PortalTextSize) => void;
  language: PortalLanguage;
  setLanguage: (lang: PortalLanguage) => void;
  isAccessibilityModalOpen: boolean;
  setIsAccessibilityModalOpen: (open: boolean) => void;
}

const PortalThemeContext = createContext<PortalThemeContextType | null>(null);

export function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<PortalTextSize>(() => {
    try {
      const saved = localStorage.getItem("roadrisk_text_size");
      if (saved === "sm" || saved === "base" || saved === "lg") return saved;
    } catch {}
    return "base";
  });

  const [language, setLanguageState] = useState<PortalLanguage>(() => {
    try {
      const saved = localStorage.getItem("roadrisk_portal_lang");
      if (saved === "en" || saved === "hi") return saved;
    } catch {}
    return "en";
  });

  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);

  const setTextSize = (size: PortalTextSize) => {
    setTextSizeState(size);
    try {
      localStorage.setItem("roadrisk_text_size", size);
    } catch {}
  };

  const setLanguage = (lang: PortalLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("roadrisk_portal_lang", lang);
    } catch {}
  };

  // Sync class on html element for root text scaling
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("portal-text-sm", "portal-text-base", "portal-text-lg");
    root.classList.add(`portal-text-${textSize}`);
  }, [textSize]);

  return (
    <PortalThemeContext.Provider
      value={{
        textSize,
        setTextSize,
        language,
        setLanguage,
        isAccessibilityModalOpen,
        setIsAccessibilityModalOpen,
      }}
    >
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) {
    // Provide safe fallback if accessed outside provider
    return {
      textSize: "base" as PortalTextSize,
      setTextSize: () => {},
      language: "en" as PortalLanguage,
      setLanguage: () => {},
      isAccessibilityModalOpen: false,
      setIsAccessibilityModalOpen: () => {},
    };
  }
  return ctx;
}
