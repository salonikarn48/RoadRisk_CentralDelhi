/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - "Test Your Delhi" Engagement Layer i18n
 * Supports English (en) and Hindi (hi).
 */

export type ExploreLanguage = "en" | "hi";

export interface ExploreStrings {
  title: string;
  tagline: string;
  scenarioDisclaimer: string;
  emergencyAlert: string;
  bigScreenToggle: string;
  langToggle: string;

  // Navigation steps
  step0Title: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step4Title: string;
  step5Title: string;
  backBtn: string;
  nextBtn: string;

  // Step 0 - Hook
  hookQuestion: string;
  checkMySpotBtn: string;
  useMyLocationBtn: string;
  locating: string;
  outsideCorridorMsg: string;
  teaserText: (segs: number, areas: number) => string;

  // Step 1 - Your Spot
  yourSpotTitle: string;
  normalDayLabel: string;
  heavyRainLabel: string;
  severeRainLabel: string;
  extraTime: (min: number) => string;
  cutOffAlert: string;
  call112Btn: string;
  routeSentenceNormal: (hosp: string) => string;
  routeSentenceDetour: (hosp: string, closedRoad: string) => string;
  routeSentenceCutOff: (closedRoad: string) => string;

  // Step 2 - Guess Weak Link
  guessPrompt: string;
  neutralMapHelp: string;
  yourPickRanks: (rank: number, total: number, pct: number) => string;
  warmTop10Feedback: string;
  warmOtherFeedback: string;
  top5RevealedTitle: string;
  guessAgainBtn: string;
  structuralNote: string;

  // Step 3 - SPOF
  spofTitle: string;
  spofSubtitle: string;
  spofLoading: string;
  tieBreakExplanation: string;
  spofImpact: (cutOff: number, delay: number) => string;
  showOnMapBtn: string;

  // Step 4 - Planner
  plannerPrompt: string;
  picksRemaining: (count: number) => string;
  reconnectedCount: (count: number) => string;
  seeModelPicksBtn: string;
  resetPicksBtn: string;
  comparisonNote: (userSaved: number, modelSaved: number, userReconnected: number, modelReconnected: number) => string;

  // Step 5 - Share & Join
  summaryTitle: string;
  copyResultBtn: string;
  copiedNotice: string;
  qrPrompt: string;
  openCitizenBtn: string;
  seeScienceBtn: string;
  openPlannerBtn: string;
}

export const EXPLORE_I18N: Record<ExploreLanguage, ExploreStrings> = {
  en: {
    title: "Test Your Delhi",
    tagline: "How would Delhi's roads hold up when the monsoon strikes?",
    scenarioDisclaimer: "Scenario, not a flood forecast. Times estimated from road-class speeds.",
    emergencyAlert: "In an emergency call 112; do not rely on this tool.",
    bigScreenToggle: "Big screen",
    langToggle: "हिन्दी",

    step0Title: "Find Your Spot",
    step1Title: "Ambulance Access",
    step2Title: "Guess the Weak Link",
    step3Title: "Critical Roads",
    step4Title: "Protect 3 Roads",
    step5Title: "Summary & Share",
    backBtn: "← Back",
    nextBtn: "Next →",

    hookQuestion: "If Delhi's most waterlogging-prone roads closed in heavy rain, could an ambulance still reach you?",
    checkMySpotBtn: "Check my spot",
    useMyLocationBtn: "Use my current location",
    locating: "Finding your spot...",
    outsideCorridorMsg: "This pilot covers the Minto Bridge / ITO corridor. Try one of these landmark places.",
    teaserText: (segs, areas) => `We tested ${segs} road segments and ${areas} local areas across Central Delhi.`,

    yourSpotTitle: "Hospital Access from Your Spot",
    normalDayLabel: "Normal Day",
    heavyRainLabel: "Heavy Rain (illustrative)",
    severeRainLabel: "Severe Rain (illustrative)",
    extraTime: (min) => `+${min} min extra delay`,
    cutOffAlert: "No flood-free route found",
    call112Btn: "Call 112 Emergency",
    routeSentenceNormal: (hosp) => `On a normal day and in lighter rain, emergency access to ${hosp} remains completely clear.`,
    routeSentenceDetour: (hosp, closedRoad) => `A waterlogging closure on ${closedRoad} forces an ambulance detour to reach ${hosp}.`,
    routeSentenceCutOff: (closedRoad) => `Key links including ${closedRoad} are waterlogged, severing all continuous vehicle access to nearby emergency hospitals.`,

    guessPrompt: "Which road do you think would be hardest hit by waterlogging? Tap one.",
    neutralMapHelp: "Tap any road on the map or choose from the list below.",
    yourPickRanks: (rank, total, pct) => `Your pick ranks #${rank} of ${total} (among the top ${pct}% highest susceptibility).`,
    warmTop10Feedback: "Sharp intuition! Your road is in Delhi's top 10% most vulnerable links. It features low elevation and depression geometry that traps stormwater.",
    warmOtherFeedback: "A sensible guess, but structurally different from Delhi's deepest traps. Roads like Minto Bridge sit in subterranean railway cuts where runoff pools rapidly.",
    top5RevealedTitle: "The Model's 5 Most Waterlogging-Prone Road Segments:",
    guessAgainBtn: "Guess another road",
    structuralNote: "The score reflects structural susceptibility, not confirmed flooding.",

    spofTitle: "The Roads Delhi Can't Afford to Lose",
    spofSubtitle: "If just ONE road gets waterlogged, which one causes the biggest cascade across the city?",
    spofLoading: "Testing roads one by one...",
    tieBreakExplanation: "Ranked by areas completely cut off from hospital care, then by average extra travel delay.",
    spofImpact: (cutOff, delay) => `Closing this alone cuts off ${cutOff} ${cutOff === 1 ? "area" : "areas"} / adds +${delay} min delay on average`,
    showOnMapBtn: "Show on map",

    plannerPrompt: "You have budget to protect 3 roads before the monsoon. Which ones?",
    picksRemaining: (count) => `Select up to ${count} more roads to protect`,
    reconnectedCount: (count) => `${count} ${count === 1 ? "area" : "areas"} reconnected!`,
    seeModelPicksBtn: "See what the model would protect",
    resetPicksBtn: "Reset picks",
    comparisonNote: (userSaved, modelSaved, userRec, modelRec) =>
      `You reconnected ${userRec} areas and saved ${userSaved} min. The model's search protected 3 arterial links, reconnecting ${modelRec} areas and saving ${modelSaved} min. Both demonstrate that protecting targeted bottlenecks preserves critical citywide access.`,

    summaryTitle: "Your Delhi Resilience Summary",
    copyResultBtn: "Copy my result",
    copiedNotice: "Copied to clipboard!",
    qrPrompt: "See waterlogging near you? Drop a pin to help map ground truth.",
    openCitizenBtn: "Open Citizen Pin Dropper",
    seeScienceBtn: "See the Science & Reliability",
    openPlannerBtn: "Open Full Municipal Planner",
  },
  hi: {
    title: "टेस्ट योर दिल्ली (Test Your Delhi)",
    tagline: "मानसून की बारिश में दिल्ली की सड़कें कैसा प्रदर्शन करेंगी?",
    scenarioDisclaimer: "यह एक परिदृश्य है, बाढ़ का पूर्वानुमान नहीं। समय सड़क-श्रेणी गति से अनुमानित है।",
    emergencyAlert: "आपात स्थिति में 112 पर कॉल करें; इस टूल पर निर्भर न रहें।",
    bigScreenToggle: "बड़ी स्क्रीन",
    langToggle: "English",

    step0Title: "अपनी जगह चुनें",
    step1Title: "एम्बुलेंस पहुंच",
    step2Title: "कमजोर कड़ी पहचानें",
    step3Title: "सबसे महत्वपूर्ण सड़कें",
    step4Title: "3 सड़कें सुरक्षित करें",
    step5Title: "निष्कर्ष और साझा करें",
    backBtn: "← पीछे",
    nextBtn: "आगे →",

    hookQuestion: "यदि भारी बारिश में दिल्ली की सबसे जलभराव-प्रवण सड़कें बंद हो जाएं, तो क्या एम्बुलेंस आप तक पहुँच पाएगी?",
    checkMySpotBtn: "मेरी जगह जांचें",
    useMyLocationBtn: "मेरी वर्तमान स्थिति का उपयोग करें",
    locating: "आपकी स्थिति खोजी जा रही है...",
    outsideCorridorMsg: "यह पायलट मिंटो ब्रिज / आईटीओ कॉरिडोर को कवर करता है। इनमें से किसी प्रमुख स्थान को चुनें।",
    teaserText: (segs, areas) => `हमने मध्य दिल्ली के ${segs} सड़क खंडों और ${areas} स्थानीय क्षेत्रों का परीक्षण किया।`,

    yourSpotTitle: "आपकी जगह से अस्पताल पहुंच",
    normalDayLabel: "सामान्य दिन",
    heavyRainLabel: "भारी बारिश (चित्रात्मक)",
    severeRainLabel: "गंभीर बारिश (चित्रात्मक)",
    extraTime: (min) => `+${min} मिनट अतिरिक्त देरी`,
    cutOffAlert: "बाढ़-मुक्त कोई रास्ता नहीं मिला",
    call112Btn: "112 आपातकालीन कॉल",
    routeSentenceNormal: (hosp) => `सामान्य दिनों और हल्की बारिश में, ${hosp} तक आपातकालीन रास्ता पूरी तरह खुला रहता है।`,
    routeSentenceDetour: (hosp, closedRoad) => `${closedRoad} पर जलभराव के कारण एम्बुलेंस को ${hosp} पहुँचने के लिए चक्कर लगाना पड़ता है।`,
    routeSentenceCutOff: (closedRoad) => `${closedRoad} सहित प्रमुख रास्ते जलमग्न होने से आपातकालीन अस्पतालों तक सभी वाहन मार्ग कट जाते हैं।`,

    guessPrompt: "आपके अनुसार कौन सी सड़क जलभराव से सबसे ज्यादा प्रभावित होगी? किसी एक को चुनें।",
    neutralMapHelp: "मानचित्र पर किसी भी सड़क को दबाएं या नीचे दी गई सूची से चुनें।",
    yourPickRanks: (rank, total, pct) => `आपकी चुनी सड़क ${total} में से #${rank} स्थान पर है (शीर्ष ${pct}% सर्वाधिक संवेदनशील)।`,
    warmTop10Feedback: "सटीक अनुमान! आपकी सड़क दिल्ली के शीर्ष 10% सबसे संवेदनशील हिस्सों में है। इसका निचला स्तर बारिश के पानी को तुरंत रोक लेता है।",
    warmOtherFeedback: "अच्छा प्रयास, लेकिन दिल्ली के गहरे अंडरपासों से भिन्न है। मिंटो ब्रिज जैसी सड़कें गहरे रेल कट में स्थित हैं जहाँ पानी तेजी से जमा होता है।",
    top5RevealedTitle: "मॉडल के अनुसार जलभराव के प्रति सबसे संवेदनशील 5 सड़कें:",
    guessAgainBtn: "दूसरी सड़क का अनुमान लगाएं",
    structuralNote: "यह स्कोर संरचनात्मक संवेदनशीलता को दर्शाता है, पुष्ट बाढ़ को नहीं।",

    spofTitle: "दिल्ली जिन सड़कों को खोना सहन नहीं कर सकती",
    spofSubtitle: "यदि केवल एक सड़क पर जलभराव हो, तो शहर भर में सबसे बड़ा संकट कौन सी सड़क पैदा करती है?",
    spofLoading: "सड़कों का एक-एक करके परीक्षण हो रहा है...",
    tieBreakExplanation: "अस्पताल पहुंच से पूरी तरह कटे क्षेत्रों और फिर औसत अतिरिक्त देरी के आधार पर रैंक किया गया।",
    spofImpact: (cutOff, delay) => `केवल इसे बंद करने से ${cutOff} क्षेत्र कट जाते हैं / औसतन +${delay} मिनट देरी जुड़ती है`,
    showOnMapBtn: "नक्शे पर देखें",

    plannerPrompt: "मानसून से पहले 3 सड़कों को सुरक्षित करने का बजट आपके पास है। आप किन्हें चुनेंगे?",
    picksRemaining: (count) => `सुरक्षित करने के लिए ${count} और सड़कें चुनें`,
    reconnectedCount: (count) => `${count} क्षेत्र पुनः जुड़ गए!`,
    seeModelPicksBtn: "देखें मॉडल क्या सुरक्षित करता",
    resetPicksBtn: "चयन रीसेट करें",
    comparisonNote: (userSaved, modelSaved, userRec, modelRec) =>
      `आपने ${userRec} क्षेत्रों को पुनः जोड़ा और ${userSaved} मिनट बचाए। मॉडल की खोज ने 3 प्रमुख सड़कों को चुना, जिससे ${modelRec} क्षेत्र जुड़े और ${modelSaved} मिनट बचे। दोनों दर्शाते हैं कि रणनीतिक सुरक्षा से शहर की कनेक्टिविटी बचती है।`,

    summaryTitle: "आपकी दिल्ली लचीलापन सारांश",
    copyResultBtn: "मेरा परिणाम कॉपी करें",
    copiedNotice: "क्लिपबोर्ड पर कॉपी हो गया!",
    qrPrompt: "क्या आपके आस-पास जलभराव है? वास्तविक स्थिति दर्ज करने के लिए पिन लगाएं।",
    openCitizenBtn: "सिटिजन पिन ड्रॉपर खोलें",
    seeScienceBtn: "विज्ञान और विश्वसनीयता देखें",
    openPlannerBtn: "पूर्ण नगर निगम योजनाकार खोलें",
  },
};
