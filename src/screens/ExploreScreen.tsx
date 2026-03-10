import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, DateData } from "react-native-calendars";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useTripContext } from "../context/TripContext";
import { destinations } from "../data/mockDestinations";
import { savePlan } from "../services/planStore";
import { getTravelInsight, TravelInsight } from "../services/travelInsight";
import { colors } from "../theme";

function dateLabel(dateISO: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(dateISO));
}

function dateTimeLabel(dateISO: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(dateISO),
  );
}

function monthToken(dateISO: string) {
  const month = new Date(dateISO).getMonth();
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[month];
}

function buildMarkedDates(startDate: string, endDate: string) {
  const marks: Record<string, { startingDay?: boolean; endingDay?: boolean; color: string; textColor: string }> = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const isStart = key === startDate;
    const isEnd = key === endDate;
    marks[key] = {
      startingDay: isStart,
      endingDay: isEnd,
      color: isStart || isEnd ? "#0A84FF" : "#D9E9FF",
      textColor: isStart || isEnd ? "#ffffff" : "#274C77",
    };
    cursor.setDate(cursor.getDate() + 1);
  }
  return marks;
}

export function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [pickMode, setPickMode] = useState<"start" | "end">("start");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [insight, setInsight] = useState<TravelInsight | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  const { selectedDestinationId, startDate, endDate, setSelectedDestinationId, setDateRange } = useTripContext();
  const {
    language,
    homeCountryLabel,
    homeAirport,
    homeAirportLabel,
    formatPrice,
    formatTemp,
    labelCountry,
    labelMonth,
    labelRain,
    labelRisk,
    t,
  } = useSettings();

  const locale = language === "ko" ? "ko-KR" : "en-US";
  const sourceLabel = (source: TravelInsight["source"]) => {
    if (source === "live") return t.sourceLive;
    if (source === "cache") return t.sourceCache;
    return t.sourceFallback;
  };

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return destinations;
    return destinations.filter(
      (item) =>
        item.city.toLowerCase().includes(keyword) ||
        item.country.toLowerCase().includes(keyword) ||
        labelCountry(item.country).toLowerCase().includes(keyword),
    );
  }, [labelCountry, query]);

  const destination = destinations.find((item) => item.id === selectedDestinationId) ?? destinations[0];

  const loadInsight = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await getTravelInsight({
        destination,
        originAirport: homeAirport,
        startDate,
        endDate,
      });
      setInsight(next);
    } catch {
      setLoadError(t.loadInsightFailed);
    } finally {
      setLoading(false);
    }
  }, [destination, endDate, homeAirport, startDate, t.loadInsightFailed]);

  useEffect(() => {
    void loadInsight();
  }, [loadInsight]);

  const onPressDay = (day: DateData) => {
    if (pickMode === "start" || day.dateString < startDate) {
      setDateRange(day.dateString, day.dateString);
      setPickMode("end");
      return;
    }
    setDateRange(startDate, day.dateString);
    setPickMode("start");
  };

  const onSavePlan = async () => {
    setSavingPlan(true);
    try {
      await savePlan({
        destinationId: destination.id,
        country: destination.country,
        city: destination.city,
        startDate,
        endDate,
      });
      setPlanSaved(true);
      setTimeout(() => setPlanSaved(false), 1500);
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t.tabDiscover}</Text>
        <Text style={styles.subtitle}>{t.homeSubtitle}</Text>
        <View style={styles.fromBox}>
          <Text style={styles.fromText}>
            {t.exploreFrom}: {homeCountryLabel} | {homeAirport} ({homeAirportLabel})
          </Text>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.searchPlaceholder}
            placeholderTextColor="#8B98A7"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.destinationRow}>
          {filtered.map((item) => {
            const selected = item.id === selectedDestinationId;
            return (
              <Pressable key={item.id} style={[styles.destinationChip, selected && styles.destinationChipActive]} onPress={() => setSelectedDestinationId(item.id)}>
                <Text style={[styles.destinationText, selected && styles.destinationTextActive]} numberOfLines={1}>
                  {item.city} | {labelCountry(item.country)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.travelPeriod}</Text>
          <Text style={styles.cardHint}>
            {dateLabel(startDate, locale)} - {dateLabel(endDate, locale)}
          </Text>
          <Calendar
            markingType="period"
            markedDates={buildMarkedDates(startDate, endDate)}
            onDayPress={onPressDay}
            theme={{
              textSectionTitleColor: "#7A8897",
              selectedDayBackgroundColor: colors.primary,
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
            }}
          />
          <Pressable style={styles.planSaveBtn} onPress={() => void onSavePlan()} disabled={savingPlan}>
            <Text style={styles.planSaveText}>
              {savingPlan ? "Saving..." : "Save This Plan"}
            </Text>
          </Pressable>
          {planSaved ? <Text style={styles.planSavedText}>Plan saved for My Stamp</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.integratedReport}</Text>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>{t.loadingInsight}</Text>
            </View>
          ) : null}
          {loadError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void loadInsight()}>
                <Text style={styles.retryText}>{t.retry}</Text>
              </Pressable>
            </View>
          ) : null}
          {insight ? (
            <>
              <Text style={styles.line}>{t.destinationLabel}: {destination.city}, {labelCountry(destination.country)}</Text>
              <Text style={styles.line}>{t.avgFlightShort}: {formatPrice(insight.avgFlightPrice)}</Text>
              <Text style={styles.line}>{t.avgTempShort}: {formatTemp(insight.avgTempC)}</Text>
              <Text style={styles.line}>{t.humidity}: {insight.avgHumidity}%</Text>
              <Text style={styles.line}>{t.rainShort}: {labelRain(insight.rainLabel)}</Text>
              <Text style={styles.risk}>{t.riskShort}: {labelRisk(insight.riskLevel)}</Text>
              <Text style={styles.score}>{t.recommendation}: {insight.recommendationScore}/100</Text>
              <Text style={styles.meta}>
                {t.dataSource}: {sourceLabel(insight.source)}
              </Text>
              <Text style={styles.meta}>
                {t.lastUpdated}: {dateTimeLabel(insight.updatedAtISO, locale)}
              </Text>
              <Text style={styles.summary}>
                {language === "ko"
                  ? `${destination.city} ${labelMonth(monthToken(startDate))}-${labelMonth(monthToken(endDate))} 구간 분석 결과, 여행 리스크는 ${labelRisk(insight.riskLevel)} 수준입니다.`
                  : insight.reportSummary}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.eventsWindow}</Text>
          {insight && insight.events.length > 0 ? (
            insight.events.map((event) => (
              <Text key={`${event.name}-${event.month}`} style={styles.line}>
                {event.name} ({labelMonth(event.month)})
              </Text>
            ))
          ) : (
            <Text style={styles.line}>{t.noMajorEvents}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, marginTop: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.subText },
  fromBox: { borderRadius: 12, backgroundColor: "#EAF2FB", paddingHorizontal: 12, paddingVertical: 8 },
  fromText: { fontSize: 12, color: "#274C77", fontWeight: "700" },
  searchBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { color: colors.text, fontSize: 15 },
  destinationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  destinationChip: {
    backgroundColor: "#EEF3FA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
  },
  destinationChipActive: { backgroundColor: "#DCEBFF", borderWidth: 1, borderColor: colors.primary },
  destinationText: { fontSize: 12, color: colors.subText, fontWeight: "600" },
  destinationTextActive: { color: colors.primary },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardHint: { fontSize: 13, color: colors.subText, fontWeight: "600" },
  planSaveBtn: {
    marginTop: 4,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  planSaveText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  planSavedText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: colors.subText, fontWeight: "600" },
  errorWrap: { backgroundColor: "#FFF4F0", borderRadius: 10, padding: 10, gap: 8 },
  errorText: { fontSize: 12, color: "#B54708", fontWeight: "600" },
  retryBtn: { alignSelf: "flex-start", backgroundColor: "#F79009", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  retryText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  line: { fontSize: 14, color: colors.subText },
  risk: { fontSize: 14, color: colors.warning, fontWeight: "700" },
  score: { fontSize: 14, color: colors.success, fontWeight: "700" },
  meta: { fontSize: 12, color: "#66788A", fontWeight: "600" },
  summary: { fontSize: 13, color: colors.text, lineHeight: 19 },
});
