import * as SQLite from "expo-sqlite"

let db: SQLite.SQLiteDatabase

export const openDatabase = async () => {
  db = await SQLite.openDatabaseAsync("test.db")

  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS days (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, flow_intensity INTEGER);`
  )

  if (db) {
    console.log("Database opened")
    return db
  } else {
    console.log("Error opening database")
  }
}

export const insertDay = async (date: string, flowIntensity: number) => {
  if (!db) {
    await openDatabase()
  }
  // first check if the day already exists
  const result = await getOneDay(date)

  if (result) {
    // if it does, update the day
    await updateDay(date, flowIntensity)
  } else {
    await db.execAsync(
      `INSERT INTO days (date, flow_intensity) VALUES ("${date}", ${flowIntensity});`
    )
  }

  console.log("Inserted day into database")
}

export const getAllDays = async () => {
  if (!db) {
    await openDatabase()
  }
  const result = await db.getAllAsync(`SELECT * FROM days;`)
  return result
}

export const getOneDay = async (date: string) => {
  if (!db) {
    await openDatabase()
  }
  const result = await db.getFirstAsync(
    `SELECT * FROM days WHERE date = "${date}";`
  )
  return result
}

export const updateDay = async (date: string, flowIntensity: number) => {
  if (!db) {
    await openDatabase()
  }
  await db.execAsync(
    `UPDATE days SET flow_intensity = ${flowIntensity} WHERE date = "${date}";`
  )

  console.log("Updated day in database")
}

export const deleteAllDays = async () => {
  if (!db) {
    await openDatabase()
  }
  await db.execAsync(`DELETE FROM days;`)
  console.log("Deleted all days from database")
}
