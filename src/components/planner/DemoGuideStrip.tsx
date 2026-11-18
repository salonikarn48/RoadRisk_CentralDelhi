import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Presentation,
  ExternalLink,
  Info,
  CheckCircle2,
  X,
} from "lucide-react";

export interface DemoStepDefinition {
  step: number;
  title: string;
  speakerNote: string;
  actionSummary: string;
}

export const DEMO_STEPS: DemoStepDefinition[] = [
  {
    step: 1,
    title: "The problem and the corridor",
    speakerNote: "Central Delhi's arterial Minto Bridge & ITO corridors repeatedly submerge under cloudbursts, blocking emergency hospital access.",
    actionSummary: "Reset view to corridor center, hospitals visible.",
  },
  {
    step: 2,
    title: "AI vulnerability index",
    speakerNote: "Our Structural Vulnerability Index scores susceptibility from physical terrain geometry rather than transient rain forecasts.",
    actionSummary: "Vulnerability layer active across all 394 corridor segments.",
  },
  {
    step: 3,
    title: "Why this road?",
    speakerNote: "Explainable factor attribution: low-point depression depth, underpass trap cut, and Yamuna drain backflow head.",
    actionSummary: "Auto-selected highest ranked underpass corridor.",
  },
  {
    step: 4,
    title: "Close the worst 10%",
    speakerNote: "Scenario modeling: if the worst 10% vulnerable corridors submerge, where does traffic route?",
    actionSummary: "Closure scenario set to 10%.",
  },
  {
    step: 5,
    title: "Who loses hospital access",
    speakerNote: "Graph rerouting identifies isolated neighborhoods that lose flood-free access to major tertiary trauma centres.",
    actionSummary: "Auto-selected most affected neighborhood origin.",
  },
  {
    step: 6,
    title: "Push it further",
    speakerNote: "At 20% corridor failure, arterial bottlenecks break down across the entire Central Delhi transit network.",
    actionSummary: "Closure scenario set to 20%.",
  },
  {
    step: 7,
    title: "Can we trust it?",
    speakerNote: "Spatial cross-validation on held-out ~500m blocks tests generalization without spatial leakage.",
    actionSummary: "Ready to inspect Reliability and Hold-Out validation.",
  },
  {
    step: 8,
    title: "Limits and next steps",
    speakerNote: "Structural index, not a flood forecast. Next steps: citizen reporting screen, IMD live rainfall, budget optimizer, and ambulance dispatch.",
    actionSummary: "Review disclaimers and product roadmap.",
  },
];

interface DemoGuideStripProps {
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onGoToStep: (step: number) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  headlineKpis?: { extraDelayMin: number; cutOffsCount: number };
  onOpenLimitsModal: () => void;
}

export default function DemoGuideStrip({
  currentStep,
  onNext,
  onPrev,
  onGoToStep,
  isCollapsed,
  setIsCollapsed,
  headlineKpis,
  onOpenLimitsModal,
}: DemoGuideStripProps) {
  const currentDef = DEMO_STEPS.find((s) => s.step === currentStep) || DEMO_STEPS[0];

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev, setIsCollapsed]);

  // Collapsed small floating pill
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 px-3.5 py-2 rounded-full bg-[#0E7490] hover:bg-[#0891B2] text-white text-xs font-bold shadow-2xl border border-cyan-400/50 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 select-none print:hidden"
        title="Expand Presenter Demo Guide (Esc)"
      >
        <Presentation className="w-4 h-4 text-cyan-200" />
        <span>Demo Guide ({currentStep}/8)</span>
        <Maximize2 className="w-3.5 h-3.5 opacity-80" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#091E33]/95 border-t border-cyan-500/50 shadow-2xl backdrop-blur-md px-4 sm:px-6 py-2.5 text-slate-100 transition-all select-none print:hidden"
      role="region"
      aria-label="Presenter Demo Guide"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Step indicator, Title & Action */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center">
              {currentStep}
            </span>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Step {currentStep} of 8
            </span>
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span>{currentDef.title}</span>
              <span className="text-[11px] text-cyan-300 font-normal bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 shrink-0">
                {currentDef.actionSummary}
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 italic">
              <span className="text-cyan-400 font-semibold not-italic">Speaker Note:</span> "
              {currentDef.speakerNote}"
            </p>
          </div>
        </div>

        {/* Center / Right: Step Context Extras (Links / KPIs) */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          {currentStep === 6 && headlineKpis && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700 text-xs">
              <span className="text-slate-400">Scenario KPIs:</span>
              <span className="text-amber-400 font-mono font-bold">
                +{headlineKpis.extraDelayMin.toFixed(1)}m delay
              </span>
              <span className="text-red-400 font-mono font-bold">
                {headlineKpis.cutOffsCount} cut-offs
              </span>
            </div>
          )}

          {currentStep === 7 && (
            <Link
              to="/reliability"
              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <span>View Reliability Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {currentStep === 8 && (
            <button
              type="button"
              onClick={onOpenLimitsModal}
              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Deck Next Steps</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Controls: Prev / Next / Minimize */}
          <div className="flex items-center gap-1.5 border-l border-slate-700/80 pl-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentStep === 1}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Step (Left Arrow)"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={currentStep === 8}
              className="px-3 py-1.5 rounded-md bg-[#0E7490] hover:bg-[#0891B2] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              title="Next Step (Right Arrow)"
              aria-label="Next step"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Hide Demo Guide (Esc)"
              aria-label="Hide demo guide"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
