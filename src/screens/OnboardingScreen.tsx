import { Picker } from "@react-native-picker/picker";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { colors } from "../theme";

export function OnboardingScreen() {
  const {
    language,
    homeCountry,
    homeAirport,
    availableCountries,
    availableAirports,
    setHomeCountry,
    setHomeAirport,
    completeOnboarding,
    t,
  } = useSettings();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{t.onboardingTitle}</Text>
        <Text style={styles.subtitle}>{t.onboardingSubtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t.homeCountry}</Text>
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

          <Text style={styles.label}>{t.homeAirport}</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={homeAirport} onValueChange={(value) => setHomeAirport(value)} style={styles.picker}>
              {availableAirports.map((airport) => (
                <Picker.Item key={airport.code} label={`${airport.code} - ${airport.name}`} value={airport.code} />
              ))}
            </Picker>
          </View>
        </View>

        <Pressable style={styles.button} onPress={completeOnboarding}>
          <Text style={styles.buttonText}>{t.onboardingContinue}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 14 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.subText },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  label: { fontSize: 14, fontWeight: "700", color: colors.text },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFCFF",
    height: 52,
    justifyContent: "center",
  },
  picker: { width: "100%", marginTop: -2 },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
