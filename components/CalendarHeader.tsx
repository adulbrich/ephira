import { CalendarHeaderProps } from "react-native-calendars/src/calendar/header";
import { HEADER_HEIGHT } from "react-native-calendars/src/expandableCalendar/style";
import { useTheme, MD3Theme, IconButton } from "react-native-paper";
import { View, Text, StyleSheet } from "react-native";
import { formatNumbers } from "react-native-calendars/src/dateutils";

export default function Header(props: CalendarHeaderProps) {
  const theme = useTheme();
  const styles = makeStyles({ theme });
  const { month, addMonth } = props;
  const formattedMonth = formatNumbers(month?.toString("MMMM yyyy"));
  const changeMonth = (num: number) => {
    if (addMonth) {
      addMonth(num);
    }
  };

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron-left"
        iconColor={props.theme?.arrowColor}
        onPress={() => changeMonth(-1)}
        accessibilityLabel="Previous month"
      />
      <IconButton
        icon="calendar-end"
        onPress={() => console.log("jump to today")}
        iconColor={theme.colors.primary}
        accessibilityLabel="Jump to today"
      />
      <Text style={styles.title}>{formattedMonth}</Text>
      <IconButton
        icon="filter"
        iconColor={theme.colors.primary}
        onPress={() => console.log("filter")}
        accessibilityLabel="Filter calendar"
      />
      <IconButton
        icon="chevron-right"
        iconColor={props.theme?.arrowColor}
        onPress={() => changeMonth(1)}
        accessibilityLabel="Next month"
      />
    </View>
  );
}

const makeStyles = ({ theme }: { theme: MD3Theme }) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      height: HEADER_HEIGHT,
    },
    title: {
      fontSize: 16,
      color: theme.colors.primary,
      textAlign: "center",
      fontFamily: "monospace",
      flex: 1,
    },
  });
