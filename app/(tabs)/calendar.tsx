import { useState, useEffect } from "react"
import { StyleSheet, View, ScrollView, Platform, StatusBar } from "react-native"
import { Calendar } from "react-native-calendars"
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context"
import DayView from "@/components/DayView"
import { getOneDay, getAllDays } from "@/db/database"
import type { DayData } from "@/constants/Interfaces"
import { Button } from "react-native-paper"
import { useTheme, Divider } from "react-native-paper"
import { FlowColors } from "@/constants/Colors"

export default function FlowCalendar() {
  const theme = useTheme()
  // get today's date
  const today = new Date().toISOString().split("T")[0]
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
  }
  const [todayData, setTodayData] = useState<DayData | null>(null)
  const [markedDatesObj, setMarkedDates] = useState<any>({})

  // Since iOS bar uses absolute positon for blur affect, we have to adjust padding to bottom of container
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingTop: StatusBar.currentHeight,
      paddingBottom: Platform.select({
        ios: 70,
        default: 0,
      }),
    },
  })

  async function refreshCalendar() {
    const allDays = await getAllDays()
    const newMarkedDates: {
      [key: string]: { marked: boolean; dotColor: string }
    } = {}
    if (allDays) {
      const newMarkedDates: any = {}
      allDays.forEach((day: any) => {
        newMarkedDates[day.date] = {
          marked: true,
          dotColor:
            day.flow_intensity > 0
              ? FlowColors[day.flow_intensity]
              : "transparent",
          selected: day.date === today,
        }
      })
      setMarkedDates(newMarkedDates)
      console.log("Marked dates: ", markedDatesObj)
      setSelectedDate(today)
    }
  }

  // get all days and create markedDates on mount
  useEffect(() => {
    refreshCalendar()
  }, [])

  // get data for selected date on calendar (when user presses a different day)
  useEffect(() => {
    if (!selectedDate) return

    async function fetchData(selectedDate: string) {
      const day = await getOneDay(selectedDate)
      const newMarkedDates = { ...markedDatesObj }

      //reset old selected date
      Object.keys(newMarkedDates).forEach((date) => {
        newMarkedDates[date] = {
          ...newMarkedDates[date],
          selected: false,
        }
      })

      // set new selected date
      newMarkedDates[selectedDate] = {
        ...newMarkedDates[selectedDate],
        selected: true,
      }
      setMarkedDates(newMarkedDates)

      if (day) {
        setTodayData(day as DayData)
      } else {
        setTodayData(null)
      }
    }
    fetchData(selectedDate)
  }, [selectedDate])

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={{ backgroundColor: theme.colors.background, padding: 4 }}>
          <Button mode="elevated" onPress={refreshCalendar}>
            Refresh Calendar
          </Button>
          <Calendar
            key={markedDatesObj}
            maxDate={today}
            markedDates={markedDatesObj}
            onDayPress={(day: { dateString: string }) =>
              handleSelectDate(day.dateString)
            }
            theme={{
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.secondary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: theme.colors.onPrimary,
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.onBackground,
              textDisabledColor: theme.colors.surfaceVariant,
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.primary,
              textDayFontFamily: "monospace",
              textMonthFontFamily: "monospace",
              textDayHeaderFontFamily: "monospace",
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 16,
            }}
          />
          <Divider />
        </View>
        <ScrollView>
          <View>
            {selectedDate && (
              <DayView
                date={selectedDate}
                dateFlow={
                  todayData?.flow_intensity ? todayData.flow_intensity : 0
                }
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}
