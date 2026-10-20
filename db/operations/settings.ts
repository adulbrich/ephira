import { getDrizzleDatabase } from "@/db/operations/setup";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getAllSettings = async () => {
  const allSettings = await db.select().from(settings);
  return allSettings;
};

export const getSetting = async (name: string) => {
  const setting = await db.query.settings.findFirst({
    where: eq(settings.name, name),
  });
  return setting;
};

/**
 * For a caller that must not await. Both drivers are synchronous underneath
 * (expo-sqlite here, better-sqlite3 under Jest), so `.sync()` returns the row.
 */
export const getSettingSync = (name: string) =>
  db.query.settings
    .findFirst({
      where: eq(settings.name, name),
    })
    .sync();

export const updateSetting = async (name: string, value: string) => {
  const setting = await getSetting(name);
  if (!setting) await insertSetting(name, value);
  else await db.update(settings).set({ value }).where(eq(settings.name, name));
};

export const insertSetting = async (name: string, value: string) => {
  const existingSetting = await getSetting(name);
  if (existingSetting) {
    await updateSetting(name, value);
    return;
  } else await db.insert(settings).values({ name, value });
};

export const deleteSetting = async (name: string) => {
  await db.delete(settings).where(eq(settings.name, name));
};
