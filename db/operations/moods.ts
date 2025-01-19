import { getDrizzleDatabase } from "@/db/operations/setup";
import { moods } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getMood = async (name: string) => {
  const mood = await db.query.moods.findFirst({
    where: eq(moods.name, name),
  });
  return mood;
};

export const getMoodByID = async (id: number) => {
  const mood = await db.query.moods.findFirst({
    where: eq(moods.id, id),
  });
  return mood;
};

export const getAllMoods = async () => {
  const allMoods = await db.select().from(moods);
  return allMoods;
};

export const getAllVisibleMoods = async () => {
  const visibleMoods = await db
    .select()
    .from(moods)
    .where(eq(moods.visible, true));
  return visibleMoods;
};

export const updateMood = async (
  name: string,
  visible: boolean,
  description?: string,
) => {
  let updateData: object = { name, visible };
  if (description) {
    updateData = { ...updateData, description };
  }
  await db.update(moods).set(updateData).where(eq(moods.name, name));
};

export const updateMoodVisibility = async (name: string, visible: boolean) => {
  await db.update(moods).set({ visible }).where(eq(moods.name, name));
};

export const updateMoodDescription = async (
  name: string,
  description: string,
) => {
  await db.update(moods).set({ description }).where(eq(moods.name, name));
};

export const updateMoodName = async (oldName: string, newName: string) => {
  await db.update(moods).set({ name: newName }).where(eq(moods.name, oldName));
};

export const insertMood = async (
  name: string,
  visible: boolean,
  description?: string,
) => {
  const mood = await getMood(name);
  if (mood) {
    await updateMood(name, visible, description);
  } else {
    await db.insert(moods).values({ name, visible, description });
  }
};

export const deleteMood = async (name: string) => {
  await db.delete(moods).where(eq(moods.name, name));
};

export const deleteAllMoods = async () => {
  await db.delete(moods);
};
