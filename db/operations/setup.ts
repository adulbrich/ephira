import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";
import { DATABASE_NAME } from "@/constants/Settings";

let expoDb: SQLite.SQLiteDatabase;

export const getDatabase = () => {
  if (!expoDb) {
    expoDb = SQLite.openDatabaseSync(DATABASE_NAME, {
      enableChangeListener: true,
    });
  }
  return expoDb;
};

let db = drizzle(getDatabase(), { schema });

export const getDrizzleDatabase = () => {
  return db;
};
