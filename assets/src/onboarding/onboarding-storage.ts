import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  hasSeenWalkthrough: "ephira.hasSeenWalkthrough",
};

export async function setHasSeenWalkthrough(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.hasSeenWalkthrough, value ? "true" : "false");
}

export async function getHasSeenWalkthrough(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.hasSeenWalkthrough);
  return v === "true";
}
