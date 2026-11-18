/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, Layers, SlidersHorizontal, ChevronRight, ChevronLeft } from "lucide-react";
import TopNavBar from "./components/TopNavBar";
import LeftSidebar, { SidebarSectionKey } from "./components/LeftSidebar";
import DetailPanel from "./components/DetailPanel";
import RoadMap, { MapMode } from "./components/RoadMap";
import RightTabsPanel from "./components/RightTabsPanel";
import ResidentReportingModal from "./components/ResidentReportingModal";
import ModelAssumptionsModal from "./components/ModelAssumptionsModal";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useAppState, AppStateProvider, AppStateContext } from "./context/AppStateContext";

function DashboardView() {
  const {
    currentZone,
    roads,
    hospitals,
    dataSource,
    loading,
    loadingMessage,
    fetchError,
    selectedRoad,
    setSelectedRoad,
    closedRoadIds,
    selectedHotspotId,
    setSelectedHotspotId,
    selectedHotspotIds,
    toggleHotspot,
    selectAllHotspots,
    clearHotspots,
    applyMonsoonPreset,
    applySeverePreset,
    rainfallLevel,
    setRainfallLevel,
    activeTab,
    setActiveTab,
    cascadeStepIndex,
    setCascadeStepIndex,
    selectedHospitalAreaId,
    setSelectedHospitalAreaId,
    showHospitalNodes,
    setShowHospitalNodes,
    liveFeed,
    isLiveFeedLoading,
    useLiveTinyFish,
    setUseLiveTinyFish,
    effectiveClosedRoadIds,
    graph,
    odPairs,
    baselineTraffic,
    whatIfScenario,
    hospitalAccess,
    setLegacyEngineEnabled,
    activeZoneHotspots,
    loadZoneData,
    handleRunAnalysisArea,
    handleResetToCentralDelhi,
    fetchLiveFeed,
    toggleRoadClosed,
    resetClosures,
    fitTrigger,
  } = useAppState();

  // Enable legacy engine for dashboard simulation
  React.useEffect(() => {
    setLegacyEngineEnabled(true);
    return () => setLegacyEngineEnabled(false);
  }, [setLegacyEngineEnabled]);

  // Active detail panel in sidebar
  const [activePanel, setActivePanel] = useState<SidebarSectionKey | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("utilization");
  const [showHotspotCircles, setShowHotspotCircles] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Modals
  const [showResidentModal, setShowResidentModal] = useState<boolean>(false);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);

  const handleSelectPanel = (panel: SidebarSectionKey) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleRetry = () => {
    loadZoneData(currentZone, true);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#F5F7FA] text-[#1B2430] font-sans overflow-hidden select-none">
      {/* 1. Fixed-Height Top Navigation */}
      <TopNavBar />

      {/* 2. Main Flex Content Area (flex:1, min-height:0) */}
      <div className="flex-1 min-h-0 w-full relative flex overflow-hidden">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-full border-3 border-[#12356B] border-t-transparent animate-spin mb-4" />
            <h3 className="text-base font-semibold text-[#12356B] mb-1">
              Loading Central Delhi Road Network...
            </h3>
            <p className="text-xs text-[#4A5668] max-w-sm mb-4">
              {loadingMessage || "Retrieving road geometries, hospital nodes, and traffic cascade simulation..."}
            </p>
            <div className="text-xs text-[#12356B] font-medium bg-[#EBF1FA] px-3 py-1.5 rounded border border-[#A5BEDB]">
              Zone: {currentZone?.name || "Central Delhi Corridor"}
            </div>
          </div>
        )}

        {/* Preparing Simulation state */}
        {!loading && !fetchError && roads && roads.length > 0 && !baselineTraffic && (
          <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#12356B] border-t-transparent animate-spin mb-3" />
            <h3 className="text-sm font-semibold text-[#12356B] mb-1">
              Preparing simulation...
            </h3>
            <p className="text-xs text-[#4A5668] max-w-sm">
              Computing baseline traffic flow across {roads.length} road corridors...
            </p>
          </div>
        )}

        {/* Error State Overlay */}
        {!loading && fetchError && (
          <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto rounded border border-[#F5ABA8] shadow-lg">
            <div className="w-12 h-12 rounded-full bg-[#FDF1F0] border border-[#F5ABA8] flex items-center justify-center text-[#B3261E] mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#B3261E] mb-2">Network Data Unavailable</h3>
            <p className="text-xs text-[#4A5668] mb-5 leading-relaxed">{fetchError}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded bg-[#12356B] hover:bg-[#0D2850] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Loading</span>
              </button>
              <button
                type="button"
                onClick={handleResetToCentralDelhi}
                className="px-4 py-2 rounded bg-white hover:bg-[#F0F4F8] text-[#12356B] text-xs font-semibold border border-[#D6DCE5] transition-colors cursor-pointer"
              >
                Use Default Snapshot
              </button>
            </div>
          </div>
        )}

        {/* 3. Dashboard Body (Rendered when ready) */}
        {/* Left Sidebar (Parameter Controls) */}
        <div className="hidden md:flex shrink-0 z-20">
          <LeftSidebar
            activePanel={activePanel}
            onSelectPanel={handleSelectPanel}
            activeZoneHotspots={activeZoneHotspots}
            selectedHotspotIds={selectedHotspotIds}
            rainfallLevel={rainfallLevel}
            effectiveClosedRoadIds={effectiveClosedRoadIds}
            mapMode={mapMode}
            whatIfScenario={whatIfScenario}
            hospitalAccess={hospitalAccess}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </div>

        {/* Secondary Detail Panel (Slide-Over when a section is active) */}
        {activePanel && (
          <div className="absolute md:relative left-0 top-0 bottom-0 z-30 w-full sm:w-[360px] md:w-[380px] shrink-0 shadow-2xl h-full overflow-hidden">
            <DetailPanel
              activePanel={activePanel}
              onClose={() => setActivePanel(null)}
              onSwitchPanel={setActivePanel}
              activeZoneHotspots={activeZoneHotspots}
              selectedHotspotIds={selectedHotspotIds}
              onToggleHotspot={toggleHotspot}
              onSelectAllHotspots={selectAllHotspots}
              onClearHotspots={clearHotspots}
              onMonsoonPreset={applyMonsoonPreset}
              onSeverePreset={applySeverePreset}
              rainfallLevel={rainfallLevel}
              onSetRainfallLevel={setRainfallLevel}
              roads={roads}
              closedRoadIds={closedRoadIds}
              effectiveClosedRoadIds={effectiveClosedRoadIds}
              onToggleRoadClosed={toggleRoadClosed}
              selectedRoad={selectedRoad}
              onClearSelectedRoad={() => setSelectedRoad(null)}
              onResetClosures={resetClosures}
              mapMode={mapMode}
              onSetMapMode={setMapMode}
              showHotspotCircles={showHotspotCircles}
              onToggleHotspots={() => setShowHotspotCircles((prev) => !prev)}
              showHospitalNodes={showHospitalNodes}
              onToggleHospitalNodes={() => setShowHospitalNodes((prev) => !prev)}
              baselineTraffic={baselineTraffic}
              whatIfScenario={whatIfScenario}
              cascadeStepIndex={cascadeStepIndex}
              onSetCascadeStepIndex={setCascadeStepIndex}
              hospitalAccess={hospitalAccess}
              selectedHospitalAreaId={selectedHospitalAreaId}
              onSelectHospitalArea={setSelectedHospitalAreaId}
            />
          </div>
        )}

        {/* Center: Leaflet RoadMap Container (flex:1, min-height:0) */}
        <div className="flex-1 min-h-0 w-full h-full relative flex flex-col overflow-hidden bg-[#F5F7FA]">
          <ErrorBoundary moduleName="Simulation Map">
            <RoadMap
              roads={roads}
              hospitals={hospitals}
              graph={graph}
              dataSource={dataSource}
              loading={loading}
              loadingMessage={loadingMessage}
              onRefresh={handleRetry}
              selectedRoadId={selectedRoad?.id}
              onSelectRoad={setSelectedRoad}
              baselineTraffic={baselineTraffic}
              odPairs={odPairs}
              whatIfScenario={whatIfScenario}
              closedRoadIds={effectiveClosedRoadIds}
              onToggleRoadClosed={toggleRoadClosed}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
              selectedHotspotIds={selectedHotspotIds}
              onToggleHotspot={toggleHotspot}
              rainfallLevel={rainfallLevel}
              activeTab={activeTab}
              cascadeStepIndex={cascadeStepIndex}
              onResetClosures={resetClosures}
              hospitalAccess={hospitalAccess}
              selectedHospitalAreaId={selectedHospitalAreaId}
              onSelectHospitalArea={setSelectedHospitalAreaId}
              showHospitalNodes={showHospitalNodes}
              onToggleHospitalNodes={() => setShowHospitalNodes((prev) => !prev)}
              currentZone={currentZone}
              onRunAnalysisArea={handleRunAnalysisArea}
              onResetToCentralDelhi={handleResetToCentralDelhi}
              resetTrigger={fitTrigger}
              fetchError={fetchError}
              onRetryAnalysis={handleRetry}
              mapMode={mapMode}
              onSetMapMode={setMapMode}
              showHotspotCircles={showHotspotCircles}
              onToggleHotspots={() => setShowHotspotCircles((prev) => !prev)}
            />
          </ErrorBoundary>

          {/* Right Panel Collapse/Expand Toggle Tab */}
          <button
            type="button"
            onClick={() => setIsRightPanelOpen((prev) => !prev)}
            className="absolute top-3 right-3 z-20 bg-white hover:bg-[#F0F4F8] text-[#12356B] border border-[#D6DCE5] px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
            title={isRightPanelOpen ? "Collapse Right Panel" : "Expand Right Panel"}
          >
            {isRightPanelOpen ? (
              <>
                <span>Hide Analysis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Show Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Right Panel: Simulation What-If & Cascade Analysis Tabs */}
        {isRightPanelOpen && (
          <div className="hidden lg:flex w-[420px] xl:w-[460px] h-full shrink-0 z-20 border-l border-[#D6DCE5] bg-white overflow-hidden">
            <RightTabsPanel
              roads={roads}
              hospitals={hospitals}
              graph={graph}
              dataSource={dataSource}
              loading={loading}
              selectedRoad={selectedRoad}
              onClearSelectedRoad={() => setSelectedRoad(null)}
              baselineTraffic={baselineTraffic}
              odPairs={odPairs}
              whatIfScenario={whatIfScenario}
              closedRoadIds={effectiveClosedRoadIds}
              onToggleRoadClosed={toggleRoadClosed}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
              selectedHotspotIds={selectedHotspotIds}
              onToggleHotspot={toggleHotspot}
              onSelectAllHotspots={selectAllHotspots}
              onClearHotspots={clearHotspots}
              onMonsoonPreset={applyMonsoonPreset}
              onSeverePreset={applySeverePreset}
              rainfallLevel={rainfallLevel}
              onSetRainfallLevel={setRainfallLevel}
              onResetClosures={resetClosures}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              cascadeStepIndex={cascadeStepIndex}
              onSetCascadeStepIndex={setCascadeStepIndex}
              hospitalAccess={hospitalAccess}
              selectedHospitalAreaId={selectedHospitalAreaId}
              onSelectHospitalArea={setSelectedHospitalAreaId}
              liveFeed={liveFeed}
              isLiveFeedLoading={isLiveFeedLoading}
              onRefreshLiveFeed={() => fetchLiveFeed(true)}
              useLiveTinyFish={useLiveTinyFish}
              onToggleUseLiveTinyFish={setUseLiveTinyFish}
              activeZoneHotspots={activeZoneHotspots}
              currentZone={currentZone}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ResidentReportingModal
        isOpen={showResidentModal}
        onClose={() => setShowResidentModal(false)}
      />
      <ModelAssumptionsModal
        isOpen={showAssumptionsModal}
        onClose={() => setShowAssumptionsModal(false)}
      />
    </div>
  );
}

export default function App() {
  const existingContext = React.useContext(AppStateContext);
  if (!existingContext) {
    return (
      <AppStateProvider>
        <DashboardView />
      </AppStateProvider>
    );
  }
  return <DashboardView />;
}
