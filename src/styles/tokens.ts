/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Public Portal Design System Tokens
 * Single source of truth for public-sector decision-support styling.
 */

export const PORTAL_TOKENS = {
  // Theme Backgrounds
  colorPage: "#F5F7FA",
  colorSurface: "#FFFFFF",
  colorSurfaceSubtle: "#F0F4F8",
  colorSurfaceMuted: "#E4E9F0",

  // Borders
  colorBorder: "#D6DCE5",
  colorBorderSubtle: "#E2E8F0",
  colorBorderFocus: "#12356B",

  // Text Hierarchy (AA compliant against light backgrounds)
  colorText: "#1B2430",
  colorTextSecondary: "#4A5668",
  colorTextMuted: "#64748B",
  colorTextInverse: "#FFFFFF",

  // Primary Government Blue
  colorPrimary: "#12356B",
  colorPrimaryHover: "#0D2850",
  colorPrimarySubtle: "#EBF1FA",
  colorPrimaryBorder: "#A5BEDB",

  // Restrained Accent: Saffron
  colorSaffron: "#C77700",
  colorSaffronSubtle: "#FFF9F0",
  colorSaffronBorder: "#FCD34D",

  // Status Colors (Government Portal standard)
  status: {
    green: "#1E7B4F",
    greenSubtle: "#EAF6EE",
    greenBorder: "#A3D9B8",
    amber: "#B26A00",
    amberSubtle: "#FEF7EC",
    amberBorder: "#F5CF96",
    red: "#B3261E",
    redSubtle: "#FDF1F0",
    redBorder: "#F5ABA8",
  },

  // Road Risk Map Colors (Standard gradient retained for high contrast on light basemap)
  riskScale: {
    low: "#FEF08A",        // Light yellow
    moderate: "#FBBF24",   // Amber yellow
    high: "#F97316",       // Orange
    severe: "#DC2626",     // Red
    critical: "#7F1D1D",   // Deep crimson
  },

  // Shape and Elevation (4-8px corners, 1px borders, no heavy drop-shadows)
  radius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
  },
  borderWidth: "1px",
  shadow: "0 1px 3px rgba(27, 36, 48, 0.08)",
  shadowMd: "0 4px 6px -1px rgba(27, 36, 48, 0.08)",

  // Typography
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
  fontFamilyHindi: "'Noto Sans Devanagari', 'Inter', sans-serif",
} as const;

export default PORTAL_TOKENS;
