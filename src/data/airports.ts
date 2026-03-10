export type HomeCountryCode = "KR" | "US" | "JP" | "TH" | "ES";

export type AirportOption = {
  code: string;
  nameEn: string;
  nameKo: string;
};

export const countryOptions: Array<{ code: HomeCountryCode; nameEn: string; nameKo: string }> = [
  { code: "KR", nameEn: "South Korea", nameKo: "\uB300\uD55C\uBBFC\uAD6D" },
  { code: "US", nameEn: "United States", nameKo: "\uBBF8\uAD6D" },
  { code: "JP", nameEn: "Japan", nameKo: "\uC77C\uBCF8" },
  { code: "TH", nameEn: "Thailand", nameKo: "\uD0DC\uAD6D" },
  { code: "ES", nameEn: "Spain", nameKo: "\uC2A4\uD398\uC778" },
];

export const airportsByCountry: Record<HomeCountryCode, AirportOption[]> = {
  KR: [
    { code: "ICN", nameEn: "Incheon International", nameKo: "\uC778\uCC9C\uAD6D\uC81C\uACF5\uD56D" },
    { code: "GMP", nameEn: "Gimpo International", nameKo: "\uAE40\uD3EC\uAD6D\uC81C\uACF5\uD56D" },
    { code: "PUS", nameEn: "Gimhae International", nameKo: "\uAE40\uD574\uAD6D\uC81C\uACF5\uD56D" },
  ],
  US: [
    { code: "LAX", nameEn: "Los Angeles International", nameKo: "\uB85C\uC2A4\uC564\uC824\uB808\uC2A4\uAD6D\uC81C\uACF5\uD56D" },
    { code: "JFK", nameEn: "John F. Kennedy International", nameKo: "\uC874 F. \uCF00\uB124\uB514\uAD6D\uC81C\uACF5\uD56D" },
    { code: "SFO", nameEn: "San Francisco International", nameKo: "\uC0CC\uD504\uB780\uC2DC\uC2A4\uCF54\uAD6D\uC81C\uACF5\uD56D" },
  ],
  JP: [
    { code: "HND", nameEn: "Tokyo Haneda", nameKo: "\uB3C4\uCFC4 \uD558\uB124\uB2E4\uACF5\uD56D" },
    { code: "NRT", nameEn: "Tokyo Narita", nameKo: "\uB3C4\uCFC4 \uB098\uB9AC\uD0C0\uACF5\uD56D" },
    { code: "KIX", nameEn: "Kansai International", nameKo: "\uAC04\uC0AC\uC774\uAD6D\uC81C\uACF5\uD56D" },
  ],
  TH: [
    { code: "BKK", nameEn: "Suvarnabhumi", nameKo: "\uC218\uC644\uB098\uD48D\uACF5\uD56D" },
    { code: "DMK", nameEn: "Don Mueang", nameKo: "\uB3C8\uBB34\uC559\uACF5\uD56D" },
    { code: "HKT", nameEn: "Phuket International", nameKo: "\uD478\uCF13\uAD6D\uC81C\uACF5\uD56D" },
  ],
  ES: [
    { code: "BCN", nameEn: "Barcelona El Prat", nameKo: "\uBC14\uB974\uC140\uB85C\uB098 \uC5D8\uD504\uB77C\uD2B8\uACF5\uD56D" },
    { code: "MAD", nameEn: "Madrid Barajas", nameKo: "\uB9C8\uB4DC\uB9AC\uB4DC \uBC14\uB77C\uD558\uC2A4\uACF5\uD56D" },
    { code: "AGP", nameEn: "Malaga Costa del Sol", nameKo: "\uB9D0\uB77C\uAC00 \uCF54\uC2A4\uD0C0\uB378\uC194\uACF5\uD56D" },
  ],
};
