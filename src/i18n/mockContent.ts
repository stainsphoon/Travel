import { Language } from "./strings";

const koMap: Record<string, string> = {
  "City + food + spring culture": "\uB3C4\uC2DC + \uBBF8\uC2DD + \uBD04 \uBB38\uD654",
  "Sakura spots": "\uBC9A\uAF43 \uBA85\uC18C",
  "Neighborhood food": "\uB3D9\uB124 \uBBF8\uC2DD",
  Museums: "\uBC15\uBB3C\uAD00",
  "Peak spring demand.": "\uBD04 \uC131\uC218\uAE30 \uC218\uC694\uAC00 \uD070 \uC2DC\uAE30\uC785\uB2C8\uB2E4.",
  "Comfortable weather.": "\uB0A0\uC528\uAC00 \uBE44\uAD50\uC801 \uC30D\uC801\uD569\uB2C8\uB2E4.",
  "Rainy season starts.": "\uC6B0\uAE30\uAC00 \uC2DC\uC791\uB418\uB294 \uAD6C\uAC04\uC785\uB2C8\uB2E4.",
  "Humid and hot.": "\uC2B5\uB3C4\uAC00 \uB192\uACE0 \uBB34\uB354\uC6B4 \uC2DC\uAE30\uC785\uB2C8\uB2E4.",
  "Summer crowds.": "\uC5EC\uB984 \uC131\uC218\uAE30\uB85C \uD63C\uC7A1\uB3C4\uAC00 \uB192\uC2B5\uB2C8\uB2E4.",
  "Typhoon watch.": "\uD0DC\uD48D \uC601\uD5A5\uC744 \uCCB4\uD06C\uD574\uC57C \uD569\uB2C8\uB2E4.",
  "Street food + nightlife + tropical vibe": "\uC2A4\uD2B8\uB9AC\uD2B8 \uBBF8\uC2DD + \uB098\uC774\uD2B8\uB77C\uC774\uD504 + \uD2B8\uB85C\uD53C\uCEEC \uBD84\uC704\uAE30",
  "Night markets": "\uC57C\uC2DC\uC7A5",
  Temples: "\uC0AC\uC6D0 \uD22C\uC5B4",
  "Rooftop bars": "\uB8E8\uD504\uD0D1 \uBC14",
  "Very hot days.": "\uB9E4\uC6B0 \uB354\uC6B4 \uB0A0\uC774 \uB9CE\uC2B5\uB2C8\uB2E4.",
  "Heat with occasional rain.": "\uBB34\uB354\uC704\uC640 \uAC00\uB057 \uBE44\uAC00 \uD568\uAED8 \uC788\uC2B5\uB2C8\uB2E4.",
  "Frequent evening rain.": "\uC800\uB141 \uC18C\uB098\uAE30\uAC00 \uC790\uC8FC \uBC1C\uC0DD\uD569\uB2C8\uB2E4.",
  "Monsoon pattern.": "\uBAAC\uC21C \uD328\uD134 \uC2DC\uAE30\uC785\uB2C8\uB2E4.",
  "Flood-prone days possible.": "\uC77C\uBD80 \uAE30\uAC04 \uCE68\uC218 \uAC00\uB2A5\uC131\uC774 \uC788\uC2B5\uB2C8\uB2E4.",
  "Wettest period.": "\uC5F0\uC911 \uAC00\uC7A5 \uBE44\uAC00 \uB9CE\uC740 \uC2DC\uAE30\uC785\uB2C8\uB2E4.",
  "Architecture + beach + art": "\uAC74\uCD95 + \uBC14\uB2E4 + \uC608\uC220",
  "Gaudi tour": "\uAC00\uC6B0\uB514 \uD22C\uC5B4",
  "Beach walk": "\uD574\uBCC0 \uC0B0\uCC45",
  "Late-night tapas": "\uB2A6\uC740 \uC2DC\uAC04 \uD0C0\uD30C\uC2A4",
  "Good shoulder season.": "\uBE44\uC218\uAE30 \uB300\uBE44 \uC5EC\uD589 \uD658\uACBD\uC774 \uC88B\uC2B5\uB2C8\uB2E4.",
  "Great outdoor weather.": "\uC57C\uC678 \uD65C\uB3D9\uD558\uAE30 \uC88B\uC740 \uB0A0\uC528\uC785\uB2C8\uB2E4.",
  "Prices rise with demand.": "\uC218\uC694\uAC00 \uB192\uC544 \uAC00\uACA9\uC774 \uC0C1\uC2B9\uD569\uB2C8\uB2E4.",
  "Peak tourist crowds.": "\uAD00\uAD11 \uC131\uC218\uAE30\uB85C \uD63C\uC7A1\uB3C4\uAC00 \uD070 \uC2DC\uAE30\uC785\uB2C8\uB2E4.",
  "High crowd density.": "\uD604\uC9C0 \uD63C\uC7A1\uB3C4\uAC00 \uB9E4\uC6B0 \uB192\uC2B5\uB2C8\uB2E4.",
  "Balanced weather and demand.": "\uB0A0\uC528\uC640 \uC218\uC694\uAC00 \uBE44\uAD50\uC801 \uADE0\uD615\uC7A1\uD78C \uC2DC\uAE30\uC785\uB2C8\uB2E4.",
  "Cloudy 17C": "\uD750\uB9BC 17C",
  "Sunny 31C": "\uB9D1\uC74C 31C",
  "Sunny 19C": "\uB9D1\uC74C 19C",
};

export function localizeMockText(text: string, language: Language) {
  if (language === "en") return text;
  return koMap[text] ?? text;
}
