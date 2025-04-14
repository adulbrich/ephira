import { useData, usePillBtn } from "@/assets/src/calendar-storage";
import { MedEntries } from "@/constants/Interfaces";
import { getAllMedicationEntries, getMedication, getAllDays, getDayById } from "@/db/database";
import { useCallback } from "react";
import { useTheme } from "react-native-paper";

  const newday = new Date();
  const offset = newday.getTimezoneOffset();
  const localDate = new Date(newday.getTime() - offset * 60 * 1000);
  const today = localDate.toISOString().split("T")[0];

  const { data: pillData, show: showPillBtn, setShow, setPillEntries} = usePillBtn();

export function useRecentMedEntries(
    setPillEntries: (value: MedEntries[]) => void,
    pillData: MedEntries[],
    setShowPillBtn: (value: boolean) => void,
    showPillBtn: boolean
) {
    const fetchRecentMedEntries = async () => {
        const allMeds = await getAllMedicationEntries();
        const PillID = await getMedication("Pill");

        // if(PillID){
        //     const recentPillLogs = allMeds
        //     .filter((entry) => entry.medication_id == PillID.id)
        //     .sort((a, b) => a.id.valueOf() - b.id.valueOf())

        //     console.log(allMeds)
        //     console.log("-----------------------------------")
        
        // if(recentPillLogs){

        //     recentPillLogs.forEach(async (entry, index) => {
        //     const day = await getDayById(entry.day_id)
        //     if(day){
        //         const date = new Date(day.date)
        //         console.log("date from db", date)
        //         const todayDate = new Date(today)
        //         const bounds = new Date(todayDate.setDate(todayDate.getDate() - 7));
        //         console.log("bounds", bounds)
        //         if(date == todayDate){
        //         console.log("today!!!", date)
        //         }
        //         else if(date < bounds){
        //         console.log("not in range :/: ", date)
        //         }
        //         else{
        //         console.log("FOUND ONE BITCHHHHH", date)
        //         }
        //     }
        //     });   

//         console.log("recentPillLogs", recentPillLogs)
//         console.log("pillData inside fetch", pillData)
//       }
//     }
   }



    return { fetchRecentMedEntries }; 

}
