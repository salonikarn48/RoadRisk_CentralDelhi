import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import BestFixesTab from "../components/BestFixesTab";
import PortalBreadcrumbs from "../components/common/PortalBreadcrumbs";
import PortalNotice from "../components/common/PortalNotice";
import PortalFooter from "../components/common/PortalFooter";
import { useAppState } from "../context/AppStateContext";

export default function BestFixesPage() {
  const navigate = useNavigate();
  const {
    currentZone,
    roads,
    graph,
    odPairs,
    hospitals,
    rainfallLevel,
    whatIfScenario,
    activeZoneHotspots,
    activeScenario,
    setSelectedHotspotId,
    setActiveTab,
    setLegacyEngineEnabled,
  } = useAppState();

  React.useEffect(() => {
    setLegacyEngineEnabled(true);
    return () => setLegacyEngineEnabled(false);
  }, [setLegacyEngineEnabled]);

  const floodedCount = whatIfScenario?.floodedHotspots?.length || 0;
  const floodedNames = whatIfScenario?.floodedHotspots?.map((h) => h.name).join(", ") || "";

  const hasAnalysis = Boolean(roads && roads.length > 0 && graph);

  return (
    <div className="relative w-full min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Consistent Shared Top Navigation Bar */}
      <TopNavBar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        <PortalBreadcrumbs items={[{ label: "Fix Optimizer" }]} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6DCE5] pb-4 bg-white p-5 rounded border shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#12356B]">
              Best Fixes Optimizer
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5668] mt-1 font-medium">
              CPWD / DSR Pareto Capital &amp; Quick Drainage Recommender for {currentZone.isDefault ? "Central Delhi Corridor" : currentZone.name}
            </p>
            <p className="text-xs text-[#12356B] font-medium mt-0.5">
              Costs are indicative, calibrated to CPWD/DSR-style rates, not official quotes. Recovery is relative and based on synthetic demand.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {activeScenario && activeScenario.hotspotIds.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-[#EBF1FA] text-[#12356B] border border-[#A5BEDB] font-semibold flex items-center gap-1.5">
                Using dashboard scenario: {activeScenario.label || `${activeScenario.hotspotIds.length === 1 ? "1 hotspot" : `${activeScenario.hotspotIds.length} hotspots`}, ${activeScenario.rainfallLevel ? activeScenario.rainfallLevel.charAt(0).toUpperCase() + activeScenario.rainfallLevel.slice(1) : "Extreme"} rain`}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-semibold">
              Pareto Solver Active
            </span>
          </div>
        </div>

        <PortalNotice type="scenario" />

        {/* Optimizer Component or Empty State */}
        {hasAnalysis ? (
          <BestFixesTab
            graph={graph}
            roads={roads}
            odPairs={odPairs}
            hospitals={hospitals}
            rainfallLevel={rainfallLevel}
            targetHotspots={activeZoneHotspots}
            scenarioFloodedHotspots={whatIfScenario?.floodedHotspots || []}
            activeScenario={activeScenario}
            currentZoneName={currentZone.isDefault ? "Central Delhi" : currentZone.name}
            floodedHotspotsCount={floodedCount}
            floodedHotspotsNames={floodedNames}
            onSimulateHotspotFix={(hotspotId) => {
              setSelectedHotspotId(hotspotId);
              setActiveTab("what_if");
              navigate("/dashboard");
            }}
            onNavigateToWhatIf={() => {
              setActiveTab("what_if");
              navigate("/dashboard");
            }}
          />
        ) : (
          <div className="p-8 rounded bg-white border border-[#D6DCE5] text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-[#12356B]">
                No Network Analysis Initialized
              </h2>
              <p className="text-xs text-[#4A5668] leading-relaxed">
                The municipal fix optimizer requires an active road graph and demand matrix. Open the simulation dashboard to initialize the network.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-white font-semibold text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-xs transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      <PortalFooter />
    </div>
  );
}
