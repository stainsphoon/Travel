import { Destination } from "../types";

export const destinations: Destination[] = [
  {
    id: "tokyo",
    city: "Tokyo",
    country: "Japan",
    tagline: "City + food + spring culture",
    nowWeather: "Cloudy 17C",
    highlights: ["Sakura spots", "Neighborhood food", "Museums"],
    monthly: [
      { month: "Apr", avgFlightPrice: 420000, avgTempC: 18, rainLevel: "Mixed", humidity: 58, riskLevel: "Moderate", note: "Peak spring demand." },
      { month: "May", avgFlightPrice: 460000, avgTempC: 22, rainLevel: "Dry", humidity: 55, riskLevel: "Low", note: "Comfortable weather." },
      { month: "Jun", avgFlightPrice: 510000, avgTempC: 25, rainLevel: "Rainy", humidity: 73, riskLevel: "High", note: "Rainy season starts." },
      { month: "Jul", avgFlightPrice: 540000, avgTempC: 29, rainLevel: "Rainy", humidity: 78, riskLevel: "High", note: "Humid and hot." },
      { month: "Aug", avgFlightPrice: 530000, avgTempC: 30, rainLevel: "Mixed", humidity: 75, riskLevel: "Moderate", note: "Summer crowds." },
      { month: "Sep", avgFlightPrice: 470000, avgTempC: 26, rainLevel: "Mixed", humidity: 70, riskLevel: "Moderate", note: "Typhoon watch." },
    ],
    majorEvents: [
      { name: "Golden Week", month: "May", impact: "High" },
      { name: "Sumida Fireworks", month: "Jul", impact: "Medium" },
    ],
  },
  {
    id: "bangkok",
    city: "Bangkok",
    country: "Thailand",
    tagline: "Street food + nightlife + tropical vibe",
    nowWeather: "Sunny 31C",
    highlights: ["Night markets", "Temples", "Rooftop bars"],
    monthly: [
      { month: "Apr", avgFlightPrice: 390000, avgTempC: 34, rainLevel: "Dry", humidity: 60, riskLevel: "Moderate", note: "Very hot days." },
      { month: "May", avgFlightPrice: 410000, avgTempC: 33, rainLevel: "Mixed", humidity: 67, riskLevel: "Moderate", note: "Heat with occasional rain." },
      { month: "Jun", avgFlightPrice: 430000, avgTempC: 32, rainLevel: "Rainy", humidity: 78, riskLevel: "High", note: "Frequent evening rain." },
      { month: "Jul", avgFlightPrice: 450000, avgTempC: 31, rainLevel: "Rainy", humidity: 80, riskLevel: "High", note: "Monsoon pattern." },
      { month: "Aug", avgFlightPrice: 440000, avgTempC: 31, rainLevel: "Rainy", humidity: 82, riskLevel: "High", note: "Flood-prone days possible." },
      { month: "Sep", avgFlightPrice: 420000, avgTempC: 30, rainLevel: "Rainy", humidity: 84, riskLevel: "High", note: "Wettest period." },
    ],
    majorEvents: [
      { name: "Songkran", month: "Apr", impact: "High" },
      { name: "King's Birthday Events", month: "Jul", impact: "Medium" },
    ],
  },
  {
    id: "barcelona",
    city: "Barcelona",
    country: "Spain",
    tagline: "Architecture + beach + art",
    nowWeather: "Sunny 19C",
    highlights: ["Gaudi tour", "Beach walk", "Late-night tapas"],
    monthly: [
      { month: "Apr", avgFlightPrice: 790000, avgTempC: 19, rainLevel: "Mixed", humidity: 61, riskLevel: "Low", note: "Good shoulder season." },
      { month: "May", avgFlightPrice: 860000, avgTempC: 22, rainLevel: "Dry", humidity: 57, riskLevel: "Low", note: "Great outdoor weather." },
      { month: "Jun", avgFlightPrice: 940000, avgTempC: 26, rainLevel: "Dry", humidity: 56, riskLevel: "Moderate", note: "Prices rise with demand." },
      { month: "Jul", avgFlightPrice: 990000, avgTempC: 29, rainLevel: "Dry", humidity: 55, riskLevel: "Moderate", note: "Peak tourist crowds." },
      { month: "Aug", avgFlightPrice: 1020000, avgTempC: 30, rainLevel: "Dry", humidity: 58, riskLevel: "Moderate", note: "High crowd density." },
      { month: "Sep", avgFlightPrice: 910000, avgTempC: 27, rainLevel: "Mixed", humidity: 63, riskLevel: "Low", note: "Balanced weather and demand." },
    ],
    majorEvents: [
      { name: "Primavera Sound", month: "Jun", impact: "High" },
      { name: "La Merce", month: "Sep", impact: "High" },
    ],
  },
];
