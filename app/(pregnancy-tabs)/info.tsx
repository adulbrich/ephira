import { ThemedView } from "@/components/ThemedView";
import FadeInView from "@/components/animations/FadeInView";
import { Text, useTheme, Card } from "react-native-paper";
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";

// The idea here is that this tab will eventually be up to date with whatever week the user is at
// Placeholder is week 5, but by the end of pregnancy tracking implementation, this tab *should* be providing information accurate
// ^From what users have entered for their information, and should continue to autonomously update per week with new insights

//currentWeek should update automatically based on the progression of the pregnancy, and trimester should be the same as well

const currentWeek = 5;

function getTrimester(week: number) {
  if (week <= 13) return "First Trimester";
  if (week <= 27) return "Second Trimester";
  return "Third Trimester";
}

const pregnancyWeeks = {
  1: {
    babyDevelopment:
      "Pregnancy dating begins from the first day of the last menstrual period, even though conception has not happened yet.",
    commonSymptoms: [
      "Period like symptoms",
      "Bloating",
      "Mild cramps",
      "Fatigue",
    ],
    tips: [
      "Track your cycle dates.",
      "Begin thinking about prenatal vitamins if recommended by a provider.",
    ],
  },
  2: {
    babyDevelopment:
      "Ovulation may occur around this time, and the body is preparing for possible fertilization.",
    commonSymptoms: [
      "Changes in cervical mucus",
      "Mild pelvic discomfort",
      "Increased energy or libido",
    ],
    tips: ["Stay hydrated.", "Avoid alcohol or smoking if trying to conceive."],
  },
  3: {
    babyDevelopment:
      "Fertilization and early cell division may occur, and the fertilized egg begins moving toward the uterus.",
    commonSymptoms: [
      "Very mild cramping",
      "Light spotting",
      "Fatigue",
      "No noticeable symptoms",
    ],
    tips: [
      "Take a pregnancy test after a missed period for more accurate results.",
    ],
  },
  4: {
    babyDevelopment:
      "Implantation may occur, and the body begins producing pregnancy hormones.",
    commonSymptoms: [
      "Missed period",
      "Light spotting",
      "Breast tenderness",
      "Fatigue",
      "Mild nausea",
    ],
    tips: [
      "Schedule a prenatal appointment if you have a positive pregnancy test.",
    ],
  },
  5: {
    babyDevelopment:
      "The brain, spinal cord, and early heart tissue are starting to develop.",
    commonSymptoms: [
      "Fatigue",
      "Breast tenderness",
      "Nausea",
      "Mood changes",
      "Frequent urination",
    ],
    tips: [
      "Try small frequent meals if nauseous.",
      "Rest when possible and stay hydrated.",
    ],
  },
  6: {
    babyDevelopment:
      "The heart may begin beating, and early facial features and limb buds are forming.",
    commonSymptoms: [
      "Morning sickness",
      "Fatigue",
      "Food aversions",
      "Mood swings",
      "Frequent urination",
    ],
    tips: [
      "Eat bland foods if nausea is strong.",
      "Contact a provider if you cannot keep fluids down.",
    ],
  },
  7: {
    babyDevelopment:
      "The brain is growing quickly, and tiny arms and legs continue to develop.",
    commonSymptoms: [
      "Nausea",
      "Bloating",
      "Breast tenderness",
      "Fatigue",
      "Excess saliva",
    ],
    tips: ["Keep snacks nearby.", "Continue prenatal vitamins if recommended."],
  },
  8: {
    babyDevelopment:
      "Major organs continue forming, and fingers, toes, and facial features are developing.",
    commonSymptoms: [
      "Nausea",
      "Fatigue",
      "Constipation",
      "Breast changes",
      "Vivid dreams",
    ],
    tips: [
      "Increase fiber and fluids.",
      "Try gentle movement if approved by your provider.",
    ],
  },
  9: {
    babyDevelopment:
      "The baby is starting to look more human, and muscles and nerves are developing.",
    commonSymptoms: [
      "Nausea",
      "Mood changes",
      "Headaches",
      "Food cravings",
      "Frequent urination",
    ],
    tips: ["Limit strong smells if they trigger nausea.", "Rest when needed."],
  },
  10: {
    babyDevelopment:
      "Vital organs are formed and continue maturing. Tiny fingers and toes are more defined.",
    commonSymptoms: [
      "Fatigue",
      "Nausea",
      "Bloating",
      "Visible veins",
      "Mood swings",
    ],
    tips: [
      "Wear comfortable clothing.",
      "Discuss safe medications with your provider.",
    ],
  },
  11: {
    babyDevelopment:
      "The baby’s bones are beginning to harden, and external features continue developing.",
    commonSymptoms: [
      "Less nausea for some",
      "Fatigue",
      "Constipation",
      "Breast tenderness",
    ],
    tips: [
      "Keep up with prenatal care.",
      "Eat nutrient dense meals when possible.",
    ],
  },
  12: {
    babyDevelopment:
      "Reflexes begin developing, and the baby can make small movements even if they cannot be felt yet.",
    commonSymptoms: [
      "Fatigue",
      "Headaches",
      "Constipation",
      "Increased appetite",
    ],
    tips: ["Stay hydrated.", "Ask your provider about upcoming screenings."],
  },
  13: {
    babyDevelopment:
      "The first trimester is ending, and the baby’s organs continue to mature.",
    commonSymptoms: [
      "Improving nausea",
      "More energy",
      "Round ligament discomfort",
      "Breast changes",
    ],
    tips: [
      "Continue regular prenatal visits.",
      "Consider gentle exercise if approved.",
    ],
  },
  14: {
    babyDevelopment:
      "The baby may begin making facial expressions, and growth becomes more noticeable.",
    commonSymptoms: [
      "Increased energy",
      "Less nausea",
      "Stuffy nose",
      "Mild aches",
    ],
    tips: ["Use supportive clothing if needed.", "Keep eating balanced meals."],
  },
  15: {
    babyDevelopment:
      "The baby’s skeleton and muscles continue developing, and movement is increasing.",
    commonSymptoms: [
      "Heartburn",
      "Nasal congestion",
      "Mild swelling",
      "Increased appetite",
    ],
    tips: [
      "Eat smaller meals to help with heartburn.",
      "Stay active as recommended.",
    ],
  },
  16: {
    babyDevelopment:
      "The baby’s muscles are stronger, and some people may soon feel early movement.",
    commonSymptoms: [
      "Backaches",
      "Constipation",
      "Round ligament pain",
      "Glowing skin or acne",
    ],
    tips: ["Stretch gently.", "Use pillows for support while resting."],
  },
  17: {
    babyDevelopment:
      "The baby is developing fat stores and continuing to practice movement.",
    commonSymptoms: [
      "Back pain",
      "Leg cramps",
      "Heartburn",
      "Increased appetite",
    ],
    tips: ["Hydrate often.", "Try light stretching for leg cramps."],
  },
  18: {
    babyDevelopment:
      "The baby’s ears are developing, and they may begin hearing sounds.",
    commonSymptoms: ["Dizziness", "Backaches", "Swelling", "Trouble sleeping"],
    tips: ["Stand up slowly.", "Sleep on your side if comfortable."],
  },
  19: {
    babyDevelopment:
      "A protective coating called vernix may begin forming on the baby’s skin.",
    commonSymptoms: [
      "Round ligament pain",
      "Heartburn",
      "Leg cramps",
      "Skin changes",
    ],
    tips: [
      "Use moisturizer for itchy skin.",
      "Avoid lying flat if it causes dizziness.",
    ],
  },
  20: {
    babyDevelopment:
      "You are around the halfway point, and the baby is growing rapidly.",
    commonSymptoms: [
      "More noticeable movement",
      "Back pain",
      "Heartburn",
      "Mild swelling",
    ],
    tips: [
      "Discuss anatomy scan results with your provider.",
      "Wear supportive shoes.",
    ],
  },
  21: {
    babyDevelopment:
      "The baby’s digestive system is developing, and movements may become stronger.",
    commonSymptoms: [
      "Leg cramps",
      "Braxton Hicks",
      "Back pain",
      "Increased appetite",
    ],
    tips: ["Rest when cramps occur.", "Keep water nearby throughout the day."],
  },
  22: {
    babyDevelopment:
      "The baby’s senses are developing, including touch and hearing.",
    commonSymptoms: ["Stretch marks", "Backaches", "Swelling", "Heartburn"],
    tips: [
      "Elevate feet when possible.",
      "Use gentle skincare for itchy areas.",
    ],
  },
  23: {
    babyDevelopment:
      "The baby’s lungs continue developing, and movement patterns may become more regular.",
    commonSymptoms: [
      "Braxton Hicks",
      "Swelling",
      "Back pain",
      "Trouble sleeping",
    ],
    tips: [
      "Note movement patterns.",
      "Contact your provider for painful or regular contractions.",
    ],
  },
  24: {
    babyDevelopment:
      "The baby’s lungs and brain continue maturing, and growth is steady.",
    commonSymptoms: ["Heartburn", "Leg cramps", "Swelling", "Skin changes"],
    tips: ["Ask about gestational diabetes screening.", "Keep meals balanced."],
  },
  25: {
    babyDevelopment:
      "The baby is gaining weight, and hair growth may continue.",
    commonSymptoms: [
      "Back pain",
      "Pelvic pressure",
      "Heartburn",
      "Trouble sleeping",
    ],
    tips: [
      "Use pillows for support.",
      "Take breaks if standing for long periods.",
    ],
  },
  26: {
    babyDevelopment:
      "The baby’s eyes may begin opening, and brain activity continues increasing.",
    commonSymptoms: ["Braxton Hicks", "Headaches", "Swelling", "Back pain"],
    tips: [
      "Rest in a comfortable position.",
      "Report severe headaches or vision changes.",
    ],
  },
  27: {
    babyDevelopment:
      "The second trimester is ending, and the baby’s lungs and nervous system continue developing.",
    commonSymptoms: [
      "Shortness of breath",
      "Back pain",
      "Leg cramps",
      "Heartburn",
    ],
    tips: ["Practice good posture.", "Plan ahead for the third trimester."],
  },
  28: {
    babyDevelopment:
      "The baby is gaining more body fat and may start opening and closing their eyes.",
    commonSymptoms: ["Fatigue", "Back pain", "Swelling", "Braxton Hicks"],
    tips: [
      "Begin monitoring movement as directed.",
      "Rest more often if needed.",
    ],
  },
  29: {
    babyDevelopment:
      "The baby’s muscles and lungs continue maturing, and movements may feel stronger.",
    commonSymptoms: [
      "Pelvic pressure",
      "Heartburn",
      "Constipation",
      "Trouble sleeping",
    ],
    tips: ["Eat fiber rich foods.", "Use side sleeping support."],
  },
  30: {
    babyDevelopment:
      "The baby’s brain is growing quickly, and body fat continues increasing.",
    commonSymptoms: ["Fatigue", "Backaches", "Shortness of breath", "Swelling"],
    tips: [
      "Take breaks during the day.",
      "Call your provider about sudden swelling.",
    ],
  },
  31: {
    babyDevelopment:
      "The baby continues practicing breathing movements and gaining weight.",
    commonSymptoms: [
      "Braxton Hicks",
      "Leaky breasts",
      "Pelvic pressure",
      "Trouble sleeping",
    ],
    tips: [
      "Review birth preferences.",
      "Stay hydrated to reduce false contractions.",
    ],
  },
  32: {
    babyDevelopment:
      "The baby’s bones are fully formed but still soft, and weight gain continues.",
    commonSymptoms: ["Fatigue", "Heartburn", "Back pain", "Swelling"],
    tips: ["Eat smaller meals.", "Elevate feet when resting."],
  },
  33: {
    babyDevelopment:
      "The baby’s immune system is developing, and the body continues storing fat.",
    commonSymptoms: [
      "Pelvic pain",
      "Shortness of breath",
      "Trouble sleeping",
      "Braxton Hicks",
    ],
    tips: [
      "Use support pillows.",
      "Ask your provider about warning signs of preterm labor.",
    ],
  },
  34: {
    babyDevelopment:
      "The baby’s lungs are continuing to mature, and movements may feel more like rolls.",
    commonSymptoms: ["Fatigue", "Pelvic pressure", "Swelling", "Heartburn"],
    tips: [
      "Prepare hospital or birth center items.",
      "Rest when your body needs it.",
    ],
  },
  35: {
    babyDevelopment:
      "The baby is gaining weight quickly and may begin moving lower into the pelvis.",
    commonSymptoms: [
      "Pelvic pressure",
      "Frequent urination",
      "Back pain",
      "Braxton Hicks",
    ],
    tips: [
      "Know when to call your provider.",
      "Keep important contacts ready.",
    ],
  },
  36: {
    babyDevelopment:
      "The baby is close to full term and continues gaining weight.",
    commonSymptoms: [
      "Pelvic pressure",
      "Trouble sleeping",
      "Braxton Hicks",
      "Swelling",
    ],
    tips: [
      "Ask about group B strep testing.",
      "Finalize your birth plan if using one.",
    ],
  },
  37: {
    babyDevelopment:
      "The baby is considered early term and continues practicing breathing and feeding reflexes.",
    commonSymptoms: [
      "More pressure",
      "Frequent urination",
      "Mucus discharge",
      "Back pain",
    ],
    tips: [
      "Watch for labor signs.",
      "Call your provider if your water breaks.",
    ],
  },
  38: {
    babyDevelopment:
      "The baby’s organs are ready for life outside the womb, and weight gain continues.",
    commonSymptoms: [
      "Pelvic pressure",
      "Contractions",
      "Fatigue",
      "Trouble sleeping",
    ],
    tips: ["Time contractions if they become regular.", "Keep your bag ready."],
  },
  39: {
    babyDevelopment:
      "The baby is full term and continuing final growth before birth.",
    commonSymptoms: [
      "Contractions",
      "Pelvic pressure",
      "Backache",
      "Nesting urges",
    ],
    tips: [
      "Rest as much as possible.",
      "Follow your provider’s labor instructions.",
    ],
  },
  40: {
    babyDevelopment:
      "The due date is here, though many pregnancies naturally go before or after this week.",
    commonSymptoms: [
      "Contractions",
      "Pelvic pressure",
      "Fatigue",
      "Possible fluid leakage",
    ],
    tips: [
      "Contact your provider with labor signs.",
      "Ask about next steps if pregnancy continues past the due date.",
    ],
  },
};

const selectedWeek = pregnancyWeeks[currentWeek as keyof typeof pregnancyWeeks];

const pregnancyWeekInfo = {
  week: currentWeek,
  trimester: getTrimester(currentWeek),
  babyDevelopment: selectedWeek.babyDevelopment,
  commonSymptoms: selectedWeek.commonSymptoms,
  tips: selectedWeek.tips,
  reminder:
    "Every pregnancy is different. Contact a healthcare provider if symptoms feel severe or concerning.",
};

function PregnancyStatusCard() {
  const theme = useTheme();

  return (
    <Card style={styles.heroCard} mode="outlined">
      <Card.Content style={styles.heroContent}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
          Week {pregnancyWeekInfo.week}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          {pregnancyWeekInfo.trimester}
        </Text>
      </Card.Content>
    </Card>
  );
}

function BabyDevelopmentCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Baby Development
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          {pregnancyWeekInfo.babyDevelopment}
        </Text>
      </Card.Content>
    </Card>
  );
}

function SymptomsCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Common Symptoms This Week
        </Text>
        {pregnancyWeekInfo.commonSymptoms.map((symptom) => (
          <Text
            key={symptom}
            variant="bodyMedium"
            style={[styles.listItem, { color: theme.colors.onSurfaceVariant }]}
          >
            • {symptom}
          </Text>
        ))}
      </Card.Content>
    </Card>
  );
}

function TipsCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Tips
        </Text>
        {pregnancyWeekInfo.tips.map((tip) => (
          <Text
            key={tip}
            variant="bodyMedium"
            style={[styles.listItem, { color: theme.colors.onSurfaceVariant }]}
          >
            • {tip}
          </Text>
        ))}
      </Card.Content>
    </Card>
  );
}

function ReminderCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Reminder
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          {pregnancyWeekInfo.reminder}
        </Text>
      </Card.Content>
    </Card>
  );
}

function SourcesCard() {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Sources
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.cardText, { color: theme.colors.onSurfaceVariant }]}
        >
          ACOG, Mayo Clinic, CDC, Cleveland Clinic
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function PregnancyInfo() {
  const theme = useTheme();

  return (
    <FadeInView duration={200} backgroundColor={theme.colors.background}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <IconSymbol
                size={64}
                name="info.circle"
                color={theme.colors.primary}
              />
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onBackground }]}
              >
                Pregnancy Insights
              </Text>
            </View>

            <PregnancyStatusCard />
            <BabyDevelopmentCard />
            <SymptomsCard />
            <TipsCard />
            <ReminderCard />
            <SourcesCard />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    paddingTop: StatusBar.currentHeight,
    paddingBottom: Platform.select({
      ios: 60,
      default: 0,
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
  },
  heroCard: {
    borderRadius: 16,
  },
  heroContent: {
    padding: 16,
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 8,
  },
  cardText: {
    marginTop: 8,
    lineHeight: 20,
  },
  listItem: {
    marginTop: 8,
    lineHeight: 20,
  },
});
