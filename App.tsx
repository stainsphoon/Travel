import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import { TripProvider } from "./src/context/TripContext";
import { ExploreScreen } from "./src/screens/ExploreScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { VoyageScreen } from "./src/screens/VoyageScreen";

type RootTabParamList = {
  Explore: undefined;
  Profile: undefined;
  Voyage: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIcons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Explore: "search-outline",
  Profile: "person-circle-outline",
  Voyage: "book-outline",
  Settings: "options-outline",
};

function RootTabs() {
  const { onboardingCompleted, hydrated, t } = useSettings();

  if (!hydrated) {
    return <View style={{ flex: 1 }} />;
  }

  if (!onboardingCompleted) {
    return <OnboardingScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#0A84FF",
        tabBarInactiveTintColor: "#9AA4B2",
        tabBarStyle: {
          height: 86,
          paddingTop: 8,
          paddingBottom: 24,
          backgroundColor: "#FAFCFF",
          borderTopColor: "#E6ECF2",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabIcons[route.name as keyof RootTabParamList]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: t.tabDiscover }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t.tabMyTrip }} />
      <Tab.Screen name="Voyage" component={VoyageScreen} options={{ title: t.tabVoyage }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t.tabSettings }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <TripProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootTabs />
        </NavigationContainer>
      </TripProvider>
    </SettingsProvider>
  );
}
