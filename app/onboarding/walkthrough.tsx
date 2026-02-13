import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Text, useTheme } from "react-native-paper";

import CalendarPreview from "../../components/previews/CalendarPreview";
import CyclePreview from "../../components/previews/CyclePreview";
import TrackPreview from "../../components/previews/TrackPreview";

type Slide = {
  key: string;
  title: string;
  body: string;
  Preview: React.ComponentType;
};

export default function OnboardingWalkthroughScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // IMPORTANT:
  // Your container has paddingHorizontal: 20, so the FlatList viewport is screenWidth - 40.
  // If we use full screenWidth per item, paging will be off and things will clip/peek.
  const slideWidth = Math.max(0, screenWidth - 40);

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "calendar",
        title: "Calendar",
        body: "See your cycle at a glance and spot patterns over time.",
        Preview: CalendarPreview,
      },
      {
        key: "cycle",
        title: "Cycle",
        body: "Quick overview of your cycle info and history.",
        Preview: CyclePreview,
      },
      {
        key: "track",
        title: "Track",
        body: "Log symptoms, notes, and routines fast so nothing gets buried.",
        Preview: TrackPreview,
      },
    ],
    []
  );

  const isLast = index === slides.length - 1;
  const cardBase = { backgroundColor: theme.colors.surface };

  const goToOverview = () => {
    router.push("/onboarding/overview");
  };

  const handleSkip = () => {
    goToOverview();
  };

  const handleNext = () => {
    const nextIndex = Math.min(index + 1, slides.length - 1);
    listRef.current?.scrollToOffset({
      offset: nextIndex * slideWidth,
      animated: true,
    });
    setIndex(nextIndex);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container}>
        <View style={styles.topSpacer} />

        <View style={styles.centerBlock}>
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            Walkthrough
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onBackground }]}
          >
            Here’s where the main stuff lives in Ephira.
          </Text>

          <View style={styles.spacerLg} />

          <FlatList
            ref={listRef}
            data={slides}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            getItemLayout={(_, i) => ({
              length: slideWidth,
              offset: slideWidth * i,
              index: i,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / slideWidth
              );
              setIndex(newIndex);
            }}
            renderItem={({ item }) => {
              const Preview = item.Preview;

              return (
                <View style={{ width: slideWidth }}>
                  <Card style={[styles.card, cardBase]}>
                    {/* We control padding ourselves so previews never overflow */}
                    <Card.Content style={styles.cardContent}>
                      <Text
                        variant="titleLarge"
                        style={[
                          styles.cardTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {item.title}
                      </Text>

                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.cardBody,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {item.body}
                      </Text>

                      <View style={styles.spacerMd} />

                      <View
                        style={[
                          styles.previewBox,
                          {
                            borderColor: theme.colors.outline,
                            backgroundColor: theme.colors.background,
                          },
                        ]}
                      >
                        <Preview />
                      </View>
                    </Card.Content>
                  </Card>
                </View>
              );
            }}
          />

          <View style={styles.spacerMd} />

          <Button
            mode="contained"
            onPress={isLast ? goToOverview : handleNext}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            {isLast ? "Done" : "Next"}
          </Button>
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.progressRow}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: theme.colors.onBackground },
                  i === index ? styles.dotActive : null,
                ]}
              />
            ))}
          </View>

          <View style={styles.bottomRow}>
            <Button
              mode="text"
              onPress={handleSkip}
              textColor={theme.colors.primary}
            >
              Skip
            </Button>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onBackground, opacity: 0.65 }}
            >
              You can explore anytime.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // This padding is the reason slideWidth must be screenWidth - 40
  container: { flex: 1, paddingHorizontal: 20 },

  topSpacer: { flex: 1 },
  centerBlock: { flexShrink: 0 },

  bottomArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 18,
  },

  title: { fontWeight: "700" },
  subtitle: { marginTop: 6, opacity: 0.85 },

  spacerLg: { height: 18 },
  spacerMd: { height: 14 },

  card: { borderRadius: 16, overflow: "hidden" },

  // Explicit padding so the preview box width is predictable
  cardContent: { paddingHorizontal: 16, paddingVertical: 16 },

  cardTitle: { fontWeight: "700" },
  cardBody: { marginTop: 8, opacity: 0.85, lineHeight: 20 },

  previewBox: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    padding: 0,
    height: 280,
  },

  primaryButton: { borderRadius: 999, marginTop: 2 },
  primaryButtonContent: { height: 48 },

  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    opacity: 0.25,
  },
  dotActive: { opacity: 0.9 },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
