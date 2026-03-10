export type Language = "en" | "ko";

type Dictionary = {
  tabDiscover: string;
  tabTiming: string;
  tabReport: string;
  tabMyTrip: string;
  tabVoyage: string;
  tabSettings: string;
  homeTitle: string;
  homeSubtitle: string;
  homeSortHint: string;
  searchPlaceholder: string;
  settingsTitle: string;
  language: string;
  languageEnglish: string;
  languageKorean: string;
  currency: string;
  temperatureUnit: string;
  distanceUnit: string;
  homeCountry: string;
  homeAirport: string;
  exploreFrom: string;
  notifications: string;
  priceAlerts: string;
  weatherAlerts: string;
  eventReminders: string;
  budgetStyle: string;
  normal: string;
  comfort: string;
  premium: string;
  dashboardTitle: string;
  selectedMonthSnapshot: string;
  avgFlightPrice: string;
  avgTemperature: string;
  rainPattern: string;
  humidity: string;
  riskAlert: string;
  chartTitle: string;
  reportTitle: string;
  reportSubtitleIn: string;
  reportWhyTitle: string;
  reportWhyLineA: string;
  reportWhyLineB: string;
  reportRiskTitle: string;
  reportEventsTitle: string;
  noMajorEvents: string;
  profileTitle: string;
  currentDraft: string;
  expectedFare: string;
  riskLevel: string;
  planArchive: string;
  archiveTokyo: string;
  archiveBangkok: string;
  archiveBarcelona: string;
  subscription: string;
  subscriptionLine: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  onboardingContinue: string;
  travelPeriod: string;
  integratedReport: string;
  destinationLabel: string;
  eventsWindow: string;
  loadingInsight: string;
  loadInsightFailed: string;
  retry: string;
  recommendation: string;
  avgFlightShort: string;
  avgTempShort: string;
  rainShort: string;
  riskShort: string;
  dataSource: string;
  sourceLive: string;
  sourceCache: string;
  sourceFallback: string;
  lastUpdated: string;
};

export const strings: Record<Language, Dictionary> = {
  en: {
    tabDiscover: "Discover",
    tabTiming: "Timing",
    tabReport: "Report",
    tabMyTrip: "My Trip",
    tabVoyage: "My Stamp",
    tabSettings: "Settings",
    homeTitle: "Where to next?",
    homeSubtitle: "Choose a destination and compare timing by price and climate risk.",
    homeSortHint: "Sorted by your budget style and current month risk.",
    searchPlaceholder: "Search city or country",
    settingsTitle: "Settings",
    language: "Language",
    languageEnglish: "English",
    languageKorean: "Korean",
    currency: "Currency",
    temperatureUnit: "Temperature unit",
    distanceUnit: "Distance unit",
    homeCountry: "Country",
    homeAirport: "Home airport",
    exploreFrom: "From",
    notifications: "Notifications",
    priceAlerts: "Flight price alerts",
    weatherAlerts: "Weather risk alerts",
    eventReminders: "Festival and holiday reminders",
    budgetStyle: "Travel budget style",
    normal: "Normal",
    comfort: "Comfort",
    premium: "Premium",
    dashboardTitle: "Timing Dashboard",
    selectedMonthSnapshot: "Selected Month Snapshot",
    avgFlightPrice: "Avg flight price",
    avgTemperature: "Avg temperature",
    rainPattern: "Rain pattern",
    humidity: "Humidity",
    riskAlert: "Risk alert",
    chartTitle: "Avg Flight Price Trend",
    reportTitle: "Trip Report",
    reportSubtitleIn: "in",
    reportWhyTitle: "Why this timing works",
    reportWhyLineA: "Average temperature is around",
    reportWhyLineB: "with current demand reflected in fare.",
    reportRiskTitle: "Risk warning",
    reportEventsTitle: "Events and holidays",
    noMajorEvents: "No major high-impact event in this month.",
    profileTitle: "My Plans",
    currentDraft: "Current draft",
    expectedFare: "Expected fare",
    riskLevel: "Risk level",
    planArchive: "Plan archive",
    archiveTokyo: "Tokyo, Apr - saved",
    archiveBangkok: "Bangkok, Jun - price alert on",
    archiveBarcelona: "Barcelona, Sep - draft",
    subscription: "Subscription",
    subscriptionLine: "Vibe Pro unlocks AI itinerary builder and advanced crowd analytics.",
    onboardingTitle: "Set your departure profile",
    onboardingSubtitle: "Choose your country and default airport before exploring routes.",
    onboardingContinue: "Continue",
    travelPeriod: "Travel Period",
    integratedReport: "Integrated Timing + Report",
    destinationLabel: "Destination",
    eventsWindow: "Events In Selected Window",
    loadingInsight: "Loading travel insight...",
    loadInsightFailed: "Could not load live data. Showing fallback insight.",
    retry: "Retry",
    recommendation: "Recommendation",
    avgFlightShort: "Avg flight",
    avgTempShort: "Avg temp",
    rainShort: "Rain",
    riskShort: "Risk",
    dataSource: "Data source",
    sourceLive: "Live API",
    sourceCache: "Local cache",
    sourceFallback: "Fallback model",
    lastUpdated: "Last updated",
  },
  ko: {
    tabDiscover: "\uD0D0\uC0C9",
    tabTiming: "\uD0C0\uC774\uBC0D",
    tabReport: "\uB9AC\uD3EC\uD2B8",
    tabMyTrip: "\uB9C8\uC774",
    tabVoyage: "My Stamp",
    tabSettings: "\uC124\uC815",
    homeTitle: "\uC5B4\uB514\uB85C \uB5A0\uB0A0\uAE4C\uC694?",
    homeSubtitle: "\uBAA9\uC801\uC9C0\uB97C \uC120\uD0DD\uD558\uACE0 \uD56D\uACF5\uAC00/\uAE30\uD6C4 \uB9AC\uC2A4\uD06C\uB97C \uBE44\uAD50\uD574\uBCF4\uC138\uC694.",
    homeSortHint: "\uC124\uC815\uD55C \uC608\uC0B0 \uC2A4\uD0C0\uC77C\uACFC \uD604\uC7AC \uC120\uD0DD \uC6D4 \uAE30\uC900\uC73C\uB85C \uC815\uB82C\uB429\uB2C8\uB2E4.",
    searchPlaceholder: "\uB3C4\uC2DC \uB610\uB294 \uAD6D\uAC00 \uAC80\uC0C9",
    settingsTitle: "\uC124\uC815",
    language: "\uC5B8\uC5B4",
    languageEnglish: "\uC601\uC5B4",
    languageKorean: "\uD55C\uAD6D\uC5B4",
    currency: "\uD1B5\uD654",
    temperatureUnit: "\uC628\uB3C4 \uB2E8\uC704",
    distanceUnit: "\uAC70\uB9AC \uB2E8\uC704",
    homeCountry: "\uAD6D\uAC00",
    homeAirport: "\uD648 \uACF5\uD56D",
    exploreFrom: "\uCD9C\uBC1C \uAE30\uC900",
    notifications: "\uC54C\uB9BC",
    priceAlerts: "\uD56D\uACF5\uAD8C \uAC00\uACA9 \uC54C\uB9BC",
    weatherAlerts: "\uAE30\uC0C1 \uB9AC\uC2A4\uD06C \uC54C\uB9BC",
    eventReminders: "\uCD95\uC81C/\uACF5\uD734\uC77C \uC54C\uB9BC",
    budgetStyle: "\uC5EC\uD589 \uC608\uC0B0 \uC2A4\uD0C0\uC77C",
    normal: "\uC77C\uBC18",
    comfort: "\uCEF4\uD37C\uD2B8",
    premium: "\uD504\uB9AC\uBBF8\uC5C4",
    dashboardTitle: "\uC5EC\uD589 \uD0C0\uC774\uBC0D \uB300\uC2DC\uBCF4\uB4DC",
    selectedMonthSnapshot: "\uC120\uD0DD \uC6D4 \uC694\uC57D",
    avgFlightPrice: "\uD3C9\uADE0 \uD56D\uACF5\uB8CC",
    avgTemperature: "\uD3C9\uADE0 \uAE30\uC628",
    rainPattern: "\uAC15\uC218 \uD328\uD134",
    humidity: "\uC2B5\uB3C4",
    riskAlert: "\uB9AC\uC2A4\uD06C \uC54C\uB9BC",
    chartTitle: "\uD3C9\uADE0 \uD56D\uACF5\uB8CC \uCD94\uC774",
    reportTitle: "\uC0C1\uC138 \uB9AC\uD3EC\uD2B8",
    reportSubtitleIn: "",
    reportWhyTitle: "\uC774 \uC2DC\uAE30 \uCD94\uCC9C \uC774\uC720",
    reportWhyLineA: "\uD3C9\uADE0 \uAE30\uC628\uC740",
    reportWhyLineB: "\uC218\uC694\uB97C \uBC18\uC601\uD55C \uD56D\uACF5\uB8CC \uC218\uC900\uC785\uB2C8\uB2E4.",
    reportRiskTitle: "\uB9AC\uC2A4\uD06C \uACBD\uACE0",
    reportEventsTitle: "\uCD95\uC81C/\uACF5\uD734\uC77C \uC815\uBCF4",
    noMajorEvents: "\uD574\uB2F9 \uC6D4\uC5D0 \uD070 \uC601\uD5A5 \uC774\uBCA4\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
    profileTitle: "\uB9C8\uC774 \uACC4\uD68D",
    currentDraft: "\uD604\uC7AC \uC791\uC131 \uC911 \uACC4\uD68D",
    expectedFare: "\uC608\uC0C1 \uD56D\uACF5\uB8CC",
    riskLevel: "\uB9AC\uC2A4\uD06C \uB808\uBCA8",
    planArchive: "\uC800\uC7A5\uB41C \uACC4\uD68D",
    archiveTokyo: "\uB3C4\uCFC4, 4\uC6D4 - \uC800\uC7A5\uB428",
    archiveBangkok: "\uBC29\uCF55, 6\uC6D4 - \uAC00\uACA9 \uC54C\uB9BC \uCF1C\uC9D0",
    archiveBarcelona: "\uBC14\uB974\uC140\uB85C\uB098, 9\uC6D4 - \uCD08\uC548",
    subscription: "\uAD6C\uB3C5",
    subscriptionLine: "Vibe Pro\uB97C \uC774\uC6A9\uD558\uBA74 AI \uC77C\uC815 \uD3B8\uC9D1\uAE30\uC640 \uD63C\uC7A1\uB3C4 \uBD84\uC11D\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    onboardingTitle: "\uCD9C\uBC1C \uC815\uBCF4 \uC124\uC815",
    onboardingSubtitle: "\uD0D0\uC0C9 \uC2DC\uC791 \uC804 \uAD6D\uAC00\uC640 \uAE30\uBCF8 \uACF5\uD56D\uC744 \uC120\uD0DD\uD558\uC138\uC694.",
    onboardingContinue: "\uACC4\uC18D\uD558\uAE30",
    travelPeriod: "\uC5EC\uD589 \uAE30\uAC04",
    integratedReport: "\uD0C0\uC774\uBC0D/\uB9AC\uD3EC\uD2B8 \uD1B5\uD569 \uC870\uD68C",
    destinationLabel: "\uBAA9\uC801\uC9C0",
    eventsWindow: "\uC120\uD0DD \uAE30\uAC04 \uC774\uBCA4\uD2B8",
    loadingInsight: "\uC5EC\uD589 \uB370\uC774\uD130 \uC870\uD68C \uC911...",
    loadInsightFailed: "\uC2E4\uC2DC\uAC04 \uC870\uD68C\uC5D0 \uC2E4\uD328\uD574 \uAE30\uBCF8 \uB370\uC774\uD130\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    retry: "\uB2E4\uC2DC \uC2DC\uB3C4",
    recommendation: "\uC5EC\uD589 \uCD94\uCC9C\uB3C4",
    avgFlightShort: "\uD3C9\uADE0 \uD56D\uACF5\uB8CC",
    avgTempShort: "\uD3C9\uADE0 \uAE30\uC628",
    rainShort: "\uAC15\uC218",
    riskShort: "\uB9AC\uC2A4\uD06C",
    dataSource: "\uB370\uC774\uD130 \uCD9C\uCC98",
    sourceLive: "\uC2E4\uC2DC\uAC04 API",
    sourceCache: "\uB85C\uCEEC \uCE90\uC2DC",
    sourceFallback: "\uD3F4\uBC31 \uBAA8\uB378",
    lastUpdated: "\uCD5C\uC885 \uAC31\uC2E0",
  },
};
