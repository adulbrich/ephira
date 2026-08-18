import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import FadeInView from "@/components/animations/FadeInView";
import ContractionTimer from "@/components/pregnancy/ContractionTimer";
import PregnancyProgressRing from "@/components/pregnancy/PregnancyProgressRing";
import PregnancySetupDialog from "@/components/pregnancy/PregnancySetupDialog";
import { getSetting } from "@/db/database";
import { SettingsKeys } from "@/constants/Settings";
import { getBabySizeForWeek, PREGNANCY_WEEKS } from "@/constants/Pregnancy";
import { usePregnancySetup } from "@/hooks/usePregnancySetup";
import {
  formatDueDate,
  gestationalAge,
  startOfLocalDay,
} from "@/utils/pregnancyDates";

export default function PregnancyHome() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [startDateIso, setStartDateIso] = useState<string | null>(null);
  const [gestationOffsetDays, setGestationOffsetDays] = useState(14);

  const today = useMemo(() => startOfLocalDay(), []);

  const {
    setSetupVisible,
    hydrateFromSettings,
    setupVisible,
    setupMethod,
    setSetupMethod,
    notSurePath,
    setNotSurePath,
    setWeeksInput,
    setDaysInput,
    parsedWeekValue,
    parsedDayValue,
    dueDateInput,
    lastPeriodInput,
    conceptionDateInput,
    positiveTestDateInput,
    activeDateField,
    showDatePicker,
    setShowDatePicker,
    dueDateMin,
    dueDateMax,
    saving,
    setupError,
    handleSaveSetup,
    openDatePicker,
    onDateChange,
  } = usePregnancySetup({
    today,
    onSaved: (isoDate, offsetDays) => {
      setStartDateIso(isoDate);
      setGestationOffsetDays(offsetDays);
    },
  });

  const loadPregnancySettings = useCallback(async () => {
    try {
      const startSetting = await getSetting(SettingsKeys.pregnancyStartDate);

      if (startSetting?.value) {
        setStartDateIso(startSetting.value);
        setSetupVisible(false);
      } else {
        setSetupVisible(true);
      }

      const { gestationOffsetDays: offset } = await hydrateFromSettings(
        !!startSetting?.value,
      );
      setGestationOffsetDays(offset);
    } finally {
      setLoading(false);
    }
  }, [hydrateFromSettings, setSetupVisible]);

  useEffect(() => {
    loadPregnancySettings();
  }, [loadPregnancySettings]);

  // One derivation, from utils/pregnancyDates.ts, rather than seven memos
  // retyping the rule that also lives in usePregnancySetup and the info route.
  const age = useMemo(
    () =>
      startDateIso
        ? gestationalAge(startDateIso, gestationOffsetDays, today)
        : null,
    [startDateIso, gestationOffsetDays, today],
  );

  const babySize = age ? getBabySizeForWeek(age.weekNumber) : "";

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {loading ? (
            <View style={styles.content}>
              <Text
                variant="bodyLarge"
                style={{ color: theme.colors.onSurface }}
              >
                Loading your progress...
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.progressSection}>
                <View style={styles.progressContent}>
                  <PregnancyProgressRing
                    weekNumber={age?.weekNumber ?? 0}
                    babySize={babySize}
                    ringProgress={age?.progress ?? 0}
                  />

                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSurface }}
                  >
                    Week {age?.weekNumber ?? 0} • Day{" "}
                    {(age?.dayInWeek ?? 0) + 1}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {age?.trimesterLabel ?? ""}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Due Date: {age ? formatDueDate(age.dueDate) : "-"}
                  </Text>
                </View>

                <Text
                  variant="bodyMedium"
                  style={[
                    styles.subText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {age
                    ? `${age.dueDaysRemaining} days until week ${PREGNANCY_WEEKS}.`
                    : "Set up your pregnancy details to see progress."}
                </Text>

                <ContractionTimer />

                <Button
                  mode="outlined"
                  onPress={() => setSetupVisible(true)}
                  style={styles.actionButton}
                >
                  Edit Pregnancy Start
                </Button>
              </View>
            </View>
          )}
        </SafeAreaView>

        <PregnancySetupDialog
          visible={setupVisible}
          dismissable={!!startDateIso}
          onDismiss={() => {
            if (startDateIso) setSetupVisible(false);
          }}
          startDateIso={startDateIso}
          setupMethod={setupMethod}
          setSetupMethod={setSetupMethod}
          notSurePath={notSurePath}
          setNotSurePath={setNotSurePath}
          setWeeksInput={setWeeksInput}
          setDaysInput={setDaysInput}
          parsedWeekValue={parsedWeekValue}
          parsedDayValue={parsedDayValue}
          dueDateInput={dueDateInput}
          lastPeriodInput={lastPeriodInput}
          conceptionDateInput={conceptionDateInput}
          positiveTestDateInput={positiveTestDateInput}
          activeDateField={activeDateField}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          dueDateMin={dueDateMin}
          dueDateMax={dueDateMax}
          today={today}
          saving={saving}
          setupError={setupError}
          onSave={handleSaveSetup}
          openDatePicker={openDatePicker}
          onDateChange={onDateChange}
        />
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 4,
    gap: 10,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  progressSection: {
    width: "100%",
    alignItems: "center",
    marginTop: -8,
  },
  progressContent: {
    alignItems: "center",
    gap: 18,
    paddingVertical: 4,
    width: "100%",
  },
  subText: {
    textAlign: "center",
  },
  actionButton: {
    width: "100%",
    marginTop: 8,
  },
});
