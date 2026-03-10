import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type PassportCoverArtProps = {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  children?: ReactNode;
  stampCount?: number;
};

export function PassportCoverArt({ style, compact = false, children, stampCount = 0 }: PassportCoverArtProps) {
  return (
    <View style={[styles.root, style]}>
      <Ionicons name="airplane" size={compact ? 20 : 28} color="rgba(186, 198, 255, 0.28)" style={styles.iconPlane} />
      <Ionicons name="compass" size={compact ? 20 : 28} color="rgba(186, 198, 255, 0.28)" style={styles.iconCompass} />
      <Ionicons name="business" size={compact ? 20 : 28} color="rgba(186, 198, 255, 0.25)" style={styles.iconLandmark} />

      <View style={[styles.book, compact && styles.bookCompact]}>
        <Text style={[styles.passportLabel, compact && styles.passportLabelCompact]}>PASSPORT</Text>
        <View style={[styles.planet, compact && styles.planetCompact]}>
          <Ionicons name="earth" size={compact ? 44 : 62} color="#71A8FF" />
        </View>
        <Ionicons name="airplane" size={compact ? 24 : 30} color="#FFF7E9" />
        <Text style={[styles.brand, compact && styles.brandCompact]}>Tripvive</Text>
      </View>

      <View style={styles.footerGhost}>
        <Text style={[styles.footerGhostText, compact && styles.footerGhostTextCompact]}>MY STAMPS</Text>
      </View>
      <View style={[styles.countBadge, compact && styles.countBadgeCompact]}>
        <View style={styles.countTopRow}>
          <View style={styles.countDot} />
          <Text style={[styles.countLabel, compact && styles.countLabelCompact]}>STAMPS</Text>
        </View>
        <Text style={[styles.countValue, compact && styles.countValueCompact]}>{stampCount}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E1D79",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  iconPlane: { position: "absolute", left: 26, top: 122 },
  iconCompass: { position: "absolute", left: 38, top: 44 },
  iconLandmark: { position: "absolute", right: 28, top: 66 },
  book: {
    marginTop: 14,
    width: "66%",
    aspectRatio: 0.72,
    borderRadius: 24,
    backgroundColor: "#C98F7A",
    borderWidth: 3,
    borderColor: "#946151",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#070D34",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bookCompact: {
    width: "58%",
    marginTop: 6,
    borderRadius: 20,
  },
  passportLabel: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFF0DA",
    letterSpacing: 1.3,
  },
  passportLabelCompact: {
    fontSize: 20,
    letterSpacing: 0.8,
  },
  planet: {
    width: 118,
    height: 118,
    borderRadius: 60,
    backgroundColor: "#E7F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  planetCompact: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  brand: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF2E2",
    letterSpacing: 0.8,
    opacity: 0.95,
  },
  brandCompact: {
    fontSize: 13,
  },
  footerGhost: {
    width: "100%",
    alignItems: "flex-start",
    paddingBottom: 2,
  },
  footerGhostText: {
    fontSize: 54,
    fontWeight: "900",
    color: "rgba(255,255,255,0.15)",
    letterSpacing: 0.9,
  },
  footerGhostTextCompact: {
    fontSize: 28,
  },
  countBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    minWidth: 90,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(233, 238, 255, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-start",
  },
  countBadgeCompact: {
    minWidth: 74,
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D3DDFF",
  },
  countLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#DFE7FF",
    letterSpacing: 0.9,
  },
  countLabelCompact: {
    fontSize: 8,
  },
  countValue: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  countValueCompact: {
    fontSize: 17,
    lineHeight: 18,
  },
});
