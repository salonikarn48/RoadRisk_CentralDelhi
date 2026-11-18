/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Citizen View Internationalization (i18n)
 * Supports English (en) and Hindi (hi).
 */

export type CitizenLanguage = "en" | "hi";

export interface CitizenStrings {
  appTitle: string;
  citizenViewTitle: string;
  emergencyNotice: string;
  tier3Banner: string;
  langToggle: string;

  // Location
  useMyLocation: string;
  locating: string;
  locationOutsideCorridor: string;
  locationOutsideCorridorSub: string;
  orSelectArea: string;
  tapMapPrompt: string;
  selectedLocation: string;
  distanceToRoad: string;
  snappedNear: string;

  // Scenarios
  scenarioTitle: string;
  scenarioNormal: string;
  scenarioHeavy: string;
  scenarioSevere: string;
  scenarioDisclaimer: string;

  // Card 1: Nearest Hospital
  nearestHospitalTitle: string;
  minAway: string;
  directionsAction: string;
  noRouteCutoffAlert: string;
  call112: string;
  traumaCenterBadge: string;

  // Card 2: Route to Hospital
  routeCardTitle: string;
  normalRouteLabel: string;
  floodAwareRouteLabel: string;
  noFloodFreeRoute: string;
  extraDelayLabel: string;
  routeStepsTitle: string;
  routeMapLegendNormal: string;
  routeMapLegendDetour: string;
  routeMapLegendClosed: string;

  // Card 3: Report Waterlogging
  reportCardTitle: string;
  reportPrivacyBadge: string;
  reportPrivacyNote: string;
  reportSeverityPrompt: string;
  severityAnkle: string;
  severityAnkleDesc: string;
  severityKnee: string;
  severityKneeDesc: string;
  severityImpassable: string;
  severityImpassableDesc: string;
  submitReportButton: string;
  submitting: string;
  reportConfirmedTitle: string;
  reportConfirmedMessage: string;
  reportErrorMessage: string;
  submitAnotherReport: string;

  // Disclaimers & Regulatory
  delayDisclaimer: string;
  oversightLine: string;
  backToPlanner: string;
  retry: string;
  loading: string;
  errorTitle: string;
}

export const CITIZEN_I18N: Record<CitizenLanguage, CitizenStrings> = {
  en: {
    appTitle: "RoadRisk Delhi",
    citizenViewTitle: "Citizen Flood-Aware Hospital Access",
    emergencyNotice: "In a medical emergency, call 112 immediately.",
    tier3Banner: "Emergency fallback: illustrative score from listed hotspots and underpass tags on a simplified corridor graph. Not validated.",
    langToggle: "हिन्दी",

    useMyLocation: "Use my location",
    locating: "Finding your location...",
    locationOutsideCorridor: "This pilot covers the Minto Bridge / ITO corridor.",
    locationOutsideCorridorSub: "Please select an area or tap anywhere within Central Delhi on the map.",
    orSelectArea: "Or choose a corridor location:",
    tapMapPrompt: "Tap the map to set your location pin",
    selectedLocation: "Selected origin",
    distanceToRoad: "meters to corridor link",
    snappedNear: "Near",

    scenarioTitle: "Rainfall Closure Scenario",
    scenarioNormal: "Normal day (0%)",
    scenarioHeavy: "Heavy rain (illustrative) (10%)",
    scenarioSevere: "Severe rain (illustrative) (20%)",
    scenarioDisclaimer: "Illustrative scenario: the roads our model finds most waterlogging-prone are assumed closed. This is not a live flood alert.",

    nearestHospitalTitle: "Nearest Hospital",
    minAway: "min away",
    directionsAction: "Show route on map",
    noRouteCutoffAlert: "No flood-free route found in this scenario. Call 112 or ask for help; do not rely on this tool in an emergency.",
    call112: "Call 112 Now",
    traumaCenterBadge: "24x7 Trauma / Emergency",

    routeCardTitle: "Route to Hospital",
    normalRouteLabel: "Normal route",
    floodAwareRouteLabel: "Flood-aware route",
    noFloodFreeRoute: "No flood-free route",
    extraDelayLabel: "Extra delay",
    routeStepsTitle: "Route steps (road names):",
    routeMapLegendNormal: "Normal dry route",
    routeMapLegendDetour: "Flood-aware detour",
    routeMapLegendClosed: "Closed road in scenario",

    reportCardTitle: "Report Waterlogging",
    reportPrivacyBadge: "Pin-only • Completely Anonymous",
    reportPrivacyNote: "No names, no phone numbers, no photos, no accounts. Exact location is rounded to ~100m.",
    reportSeverityPrompt: "Select waterlogging severity:",
    severityAnkle: "Ankle-deep",
    severityAnkleDesc: "Slow movement, curb overtopped",
    severityKnee: "Knee-deep",
    severityKneeDesc: "Small cars stalled, two-wheelers stopped",
    severityImpassable: "Road impassable",
    severityImpassableDesc: "Completely submerged, traffic blocked",
    submitReportButton: "Send Report Pin",
    submitting: "Submitting pin...",
    reportConfirmedTitle: "Report Received",
    reportConfirmedMessage: "Thanks. Your pin was received as an unverified report. It does not change the risk score. In an emergency call 112.",
    reportErrorMessage: "Failed to submit report. Please check connection and try again.",
    submitAnotherReport: "Report another spot",

    delayDisclaimer: "Estimated from road-class speeds, not real trip data.",
    oversightLine: "The tool informs, humans decide.",
    backToPlanner: "Planner view",
    retry: "Retry",
    loading: "Loading Central Delhi network & hospital routing...",
    errorTitle: "Unable to load corridor network",
  },
  hi: {
    appTitle: "रोडरिस्क दिल्ली",
    citizenViewTitle: "नागरिक बाढ़-सचेत अस्पताल पहुँच",
    emergencyNotice: "चिकित्सा आपातकाल में तुरंत 112 पर कॉल करें।",
    tier3Banner: "आपातकालीन फॉलबैक: सरलीकृत कॉरिडोर ग्राफ पर सूचीबद्ध हॉटस्पॉट और अंडरपास टैग से सांकेतिक स्कोर। मान्य नहीं है।",
    langToggle: "English",

    useMyLocation: "मेरी वर्तमान स्थिति का उपयोग करें",
    locating: "स्थान खोजा जा रहा है...",
    locationOutsideCorridor: "यह पायलट मिंटो ब्रिज / आईटीओ कॉरिडोर को कवर करता है।",
    locationOutsideCorridorSub: "कृपया नीचे दी गई सूची से क्षेत्र चुनें या मानचित्र पर टैप करें।",
    orSelectArea: "या कॉरिडोर का कोई क्षेत्र चुनें:",
    tapMapPrompt: "स्थान सेट करने के लिए मानचित्र पर टैप करें",
    selectedLocation: "चयनित स्थान",
    distanceToRoad: "मीटर मुख्य सड़क से",
    snappedNear: "निकट",

    scenarioTitle: "बारिश सड़क-बंद परिदृश्य",
    scenarioNormal: "सामान्य दिन (0%)",
    scenarioHeavy: "भारी बारिश (अनुमानित) (10%)",
    scenarioSevere: "भीषण बारिश (अनुमानित) (20%)",
    scenarioDisclaimer: "अनुमानित परिदृश्य: जिन सड़कों पर जलभराव की सबसे अधिक संभावना है, उन्हें बंद मान लिया गया है। यह कोई लाइव बाढ़ चेतावनी नहीं है।",

    nearestHospitalTitle: "निकटतम अस्पताल",
    minAway: "मिनट की दूरी पर",
    directionsAction: "मानचित्र पर मार्ग देखें",
    noRouteCutoffAlert: "इस परिदृश्य में कोई बाढ़-मुक्त मार्ग नहीं मिला। 112 पर कॉल करें या मदद लें; आपात स्थिति में केवल इस टूल पर निर्भर न रहें।",
    call112: "112 पर कॉल करें",
    traumaCenterBadge: "24x7 आपातकालीन ट्रॉमा सेंटर",

    routeCardTitle: "अस्पताल का मार्ग",
    normalRouteLabel: "सामान्य मार्ग",
    floodAwareRouteLabel: "बाढ़-सचेत मार्ग",
    noFloodFreeRoute: "कोई बाढ़-मुक्त मार्ग नहीं",
    extraDelayLabel: "अतिरिक्त समय",
    routeStepsTitle: "मार्ग के चरण (सड़कों के नाम):",
    routeMapLegendNormal: "सामान्य सूखा मार्ग",
    routeMapLegendDetour: "बाढ़-सचेत वैकल्पिक मार्ग",
    routeMapLegendClosed: "परिदृश्य में बंद सड़क",

    reportCardTitle: "जलभराव की रिपोर्ट करें",
    reportPrivacyBadge: "केवल पिन • पूर्णतः गोपनीय",
    reportPrivacyNote: "कोई नाम, फोन नंबर, फोटो या खाता नहीं। स्थान को ~100 मीटर तक सामान्यीकृत किया जाता है।",
    reportSeverityPrompt: "जलभराव की गंभीरता चुनें:",
    severityAnkle: "टखने तक पानी",
    severityAnkleDesc: "धीमी गति, फुटपाथ पर पानी",
    severityKnee: "घुटने तक पानी",
    severityKneeDesc: "छोटी कारें रुकीं, दोपहिया वाहन फंसे",
    severityImpassable: "सड़क पूरी तरह बंद",
    severityImpassableDesc: "पूरी तरह डूबा हुआ, यातायात अवरुद्ध",
    submitReportButton: "रिपोर्ट पिन भेजें",
    submitting: "पिन भेजा जा रहा है...",
    reportConfirmedTitle: "रिपोर्ट प्राप्त हुई",
    reportConfirmedMessage: "धन्यवाद। आपका पिन एक असत्यापित रिपोर्ट के रूप में प्राप्त हुआ है। इससे जोखिम स्कोर नहीं बदलता है। आपात स्थिति में 112 पर कॉल करें।",
    reportErrorMessage: "रिपोर्ट भेजने में विफल। कृपया पुनः प्रयास करें।",
    submitAnotherReport: "एक और रिपोर्ट भेजें",

    delayDisclaimer: "सड़क श्रेणी की गति से अनुमानित, वास्तविक यात्रा डेटा नहीं।",
    oversightLine: "उपकरण सूचित करता है, निर्णय मनुष्य लेते हैं।",
    backToPlanner: "प्लानर दृश्य",
    retry: "पुनः प्रयास करें",
    loading: "कॉरिडोर नेटवर्क और अस्पताल मार्ग लोड हो रहे हैं...",
    errorTitle: "कॉरिडोर नेटवर्क लोड नहीं हो सका",
  },
};

const STORAGE_KEY = "roadrisk_citizen_lang";

export function getSavedCitizenLanguage(): CitizenLanguage {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored === "hi" || stored === "en") {
        return stored;
      }
    }
  } catch {
    // sessionStorage not available (e.g. sandbox or private mode)
  }
  return "en";
}

export function saveCitizenLanguage(lang: CitizenLanguage): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    // Graceful fallback to memory
  }
}
