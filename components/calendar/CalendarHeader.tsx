import { useTheme, MD3Theme, IconButton } from "react-native-paper";
import { View, Text, StyleSheet } from "react-native";
import CalendarFilterDialog from "@/components/calendar/CalendarFilterDialog";
import { useState } from "react";
const titleLength = 14;

export default function CalendarHeader({
  date,
  onJumpToToday,
}: {
  date: object;
  onJumpToToday: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles({ theme });
  const dateObject = new Date(date.toString());
  const month = dateObject.toLocaleString("default", { month: "long" });
  const year = dateObject.getFullYear();
  const [filterDialogVisible, setFilterDialogVisible] = useState(false);

  // we don't have access to the header component and setting the title to
  // width 100% doesn't work, so we need to pad the title to keep it center
  // and keep the buttons from shifting around
  const padTitle = (title: string) => {
    if (title.length < titleLength) {
      const diff = titleLength - title.length;
      const pad = " ".repeat(diff / 2);
      title = `${pad}${title}${pad}`;
      // if diff is odd, add one to beginning
      if (diff % 2 !== 0) {
        title = ` ${title}`;
      }
    }

    return title;
  };

  return (
    <View
      style={{
        alignSelf: "stretch",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <IconButton
        icon="calendar-end"
        onPress={onJumpToToday}
        iconColor={theme.colors.primary}
        accessibilityLabel="Jump to today"
      />

      <Text style={styles.calendarTitle}>{padTitle(`${month} ${year}`)}</Text>
      <IconButton
        icon="filter"
        iconColor={theme.colors.primary}
        onPress={() => setFilterDialogVisible(true)}
        accessibilityLabel="Filter calendar"
      />
      <CalendarFilterDialog
        visible={filterDialogVisible}
        setVisible={setFilterDialogVisible}
      />
    </View>
  );
}

const makeStyles = ({ theme }: { theme: MD3Theme }) =>
  StyleSheet.create({
    calendarButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 4,
      gap: 4,
    },
    calendarTitle: {
      fontSize: 16,
      color: theme.colors.primary,
      textAlign: "center",
      fontFamily: "monospace",
      paddingHorizontal: 8,
    },
  });
