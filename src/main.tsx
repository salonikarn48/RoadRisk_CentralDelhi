import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import CoverPage from "./pages/CoverPage";
import SelectAreaPage from "./pages/SelectAreaPage";
import LiveFeedPage from "./pages/LiveFeedPage";
import BestFixesPage from "./pages/BestFixesPage";
import ReportsPage from "./pages/ReportsPage";
import AssumptionsPage from "./pages/AssumptionsPage";
import PlannerPage from "./pages/PlannerPage";
import ReliabilityPage from "./pages/ReliabilityPage";
import PreflightPage from "./pages/PreflightPage";
import CitizenPage from "./pages/CitizenPage";
import ExplorePage from "./pages/ExplorePage";
import App from "./App";
import { AppStateProvider } from "./context/AppStateContext";
import { PortalThemeProvider } from "./context/PortalThemeContext";
import AccessibilityModal from "./components/common/AccessibilityModal";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "leaflet/dist/leaflet.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary moduleName="RoadRisk Application Root">
    <PortalThemeProvider>
      <AppStateProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<CoverPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/dashboard" element={<App />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/reliability" element={<ReliabilityPage />} />
            <Route path="/preflight" element={<PreflightPage />} />
            <Route path="/citizen" element={<CitizenPage />} />
            <Route path="/select-area" element={<SelectAreaPage />} />
            <Route path="/live-feed" element={<LiveFeedPage />} />
            <Route path="/best-fixes" element={<BestFixesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/assumptions" element={<AssumptionsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
        <AccessibilityModal />
      </AppStateProvider>
    </PortalThemeProvider>
  </ErrorBoundary>
);
