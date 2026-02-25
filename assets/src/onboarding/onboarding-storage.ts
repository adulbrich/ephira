import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  hasSeenWalkthrough: "ephira.hasSeenWalkthrough",
  userName: "ephira.userName",
};

export async function getHasSeenWalkthrough(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.hasSeenWalkthrough);
  return v === "true";
}

export async function setHasSeenWalkthrough(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.hasSeenWalkthrough, value ? "true" : "false");
}

export async function getUserName(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.userName);
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.userName, name.trim());
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem("ephira.hasSeenWalkthrough");
}
