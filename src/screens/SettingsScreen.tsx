import { Picker } from "@react-native-picker/picker";
import { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { colors } from "../theme";

function OptionGroup<T extends string>({
  title,
  value,
  options,
  labels,
  onChange,
}: {
  title: string;
  value: T;
  options: T[];
  labels?: Record<string, string>;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.segmentRow}>
        {options.map((item) => {
          const selected = item === value;
          return (
            <Pressable key={item} onPress={() => onChange(item)} style={[styles.segment, selected && styles.segmentActive]}>
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]} numberOfLines={1}>
                {labels?.[item] ?? item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const {
    language,
    currency,
    tempUnit,
    distanceUnit,
    homeCountry,
    homeAirport,
    availableCountries,
    availableAirports,
    priceAlerts,
    weatherAlerts,
    eventReminders,
    budgetStyle,
    setLanguage,
    setCurrency,
    setTempUnit,
    setDistanceUnit,
    setHomeCountry,
    setHomeAirport,
    setPriceAlerts,
    setWeatherAlerts,
    setEventReminders,
    setBudgetStyle,
    t,
  } = useSettings();

  const budgetLabel = useMemo(
    () => ({
      normal: t.normal,
      comfort: t.comfort,
      premium: t.premium,
    }),
    [t],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t.settingsTitle}</Text>

        <OptionGroup
          title={t.language}
          value={language}
          options={["en", "ko"]}
          labels={{ en: t.languageEnglish, ko: t.languageKorean }}
          onChange={setLanguage}
        />
        <OptionGroup title={t.currency} value={currency} options={["KRW", "USD", "EUR"]} onChange={setCurrency} />
        <OptionGroup title={t.temperatureUnit} value={tempUnit} options={["C", "F"]} onChange={setTempUnit} />
        <OptionGroup title={t.distanceUnit} value={distanceUnit} options={["km", "mi"]} onChange={setDistanceUnit} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.homeCountry}</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={homeCountry} onValueChange={(value) => setHomeCountry(value)} style={styles.picker}>
              {availableCountries.map((country) => (
                <Picker.Item
                  key={country.code}
                  label={language === "ko" ? country.nameKo : country.nameEn}
                  value={country.code}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.homeAirport}</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={homeAirport} onValueChange={(value) => setHomeAirport(value)} style={styles.picker}>
              {availableAirports.map((airport) => (
                <Picker.Item key={airport.code} label={`${airport.code} - ${airport.name}`} value={airport.code} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.notifications}</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} numberOfLines={1}>{t.priceAlerts}</Text>
            <Switch value={priceAlerts} onValueChange={setPriceAlerts} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} numberOfLines={1}>{t.weatherAlerts}</Text>
            <Switch value={weatherAlerts} onValueChange={setWeatherAlerts} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} numberOfLines={1}>{t.eventReminders}</Text>
            <Switch value={eventReminders} onValueChange={setEventReminders} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.budgetStyle}</Text>
          <View style={styles.segmentRow}>
            {(["normal", "comfort", "premium"] as const).map((key) => {
              const selected = budgetStyle === key;
              return (
                <Pressable key={key} style={[styles.segment, selected && styles.segmentActive]} onPress={() => setBudgetStyle(key)}>
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]} numberOfLines={1}>{budgetLabel[key]}</Text>
                </Pressable>
              );
            })}
          </View>
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
    gap: 10,
    minHeight: 92,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    backgroundColor: "#EEF3FA",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: "#DCEBFF",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  segmentText: { fontSize: 12, fontWeight: "600", color: colors.subText },
  segmentTextActive: { color: colors.primary },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFCFF",
    height: 52,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    marginTop: -2,
  },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 36 },
  toggleLabel: { fontSize: 14, color: colors.subText, fontWeight: "600", flex: 1, marginRight: 16 },
});
