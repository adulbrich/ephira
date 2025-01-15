import { create } from 'zustand';
import type { DayData, MarkedDates } from "../constants/Interfaces";

const selectedDay : DayData = {
    id: 0,
    date: '',
    flow_intensity: 0
}

const allDays : DayData[] = []

const markedDates : MarkedDates = {}

export const useDate = create((set) => ({
    selectedDay : {
        id: 0,
        date: "",
        flow_intensity: 0
    },

    markedDates,
    
    setSelectedDay: (day : DayData) => set((state) => ({selectedDay: day})),

    setSelectedDate: (dateString : string) => 
        set((state) => ({
            selectedDay:{
                ...state.selectedDay,
                date: dateString,
            },
        })),
    allDays,
    setDays: (days: DayData) => set((state) => ({allDays: days})),
    setMarkedDates: (days : MarkedDates []) => set((state) => ({markedDates: days})),
    today : "",
    setToday: (date: string) => set((state) => ({today: date}))
}));



 