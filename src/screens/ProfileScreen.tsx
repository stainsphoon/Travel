import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useTripContext } from "../context/TripContext";
import { destinations } from "../data/mockDestinations";
import { buildTravelInsight } from "../services/travelInsight";
import { colors } from "../theme";

export function ProfileScreen() {
  const { selectedDestinationId, startDate, endDate } = useTripContext();
  const { formatPrice, labelCountry, labelMonth, labelRisk, t } = useSettings();
  const destination = destinations.find((item) => item.id === selectedDestinationId) ?? destinations[0];
  const insight = buildTravelInsight(destination, startDate, endDate);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t.profileTitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.currentDraft}</Text>
          <Text style={styles.cardText}>
            {destination.city}, {labelCountry(destination.country)} ({labelMonth(destination.monthly[0].month)})
          </Text>
          <Text style={styles.cardText}>{t.expectedFare}: {formatPrice(insight.avgFlightPrice)}</Text>
          <Text style={styles.cardText}>{t.riskLevel}: {labelRisk(insight.riskLevel)}</Text>
          <Text style={styles.cardText}>
            {startDate} - {endDate}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.planArchive}</Text>
          <Text style={styles.cardText}>{t.archiveTokyo}</Text>
          <Text style={styles.cardText}>{t.archiveBangkok}</Text>
          <Text style={styles.cardText}>{t.archiveBarcelona}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.subscription}</Text>
          <Text style={styles.badge}>FREE</Text>
          <Text style={styles.cardText}>{t.subscriptionLine}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardText: { fontSize: 14, color: colors.subText, lineHeight: 20 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E7F0FF",
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
