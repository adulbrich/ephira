import { getDrizzleDatabase } from "@/db/operations/setup"
import { medications } from "@/db/schema"
import { eq, and } from "drizzle-orm"

const db = getDrizzleDatabase()

export const getMedication = async (name: string) => {
  const medication = await db.query.medications.findFirst({
    where: eq(medications.name, name),
  })
  return medication
}

export const getAllMedications = async () => {
  const allMedications = await db.select().from(medications)
  return allMedications
}

export const getAllVisibleMedications = async () => {
  const visibleMedications = await db
    .select()
    .from(medications)
    .where(eq(medications.visible, true))
  return visibleMedications
}

export const updateMedication = async (
  name: string,
  visible: boolean,
  type?: string,
  dose?: string,
  description?: string
) => {
  let updateData: Object = { name, visible }
  if (type) {
    updateData = { ...updateData, type }
  }
  if (dose) {
    updateData = { ...updateData, dose }
  }
  if (description) {
    updateData = { ...updateData, description }
  }
  await db.update(medications).set(updateData).where(eq(medications.name, name))
}

export const updateMedicationVisibility = async (
  name: string,
  visible: boolean
) => {
  await db
    .update(medications)
    .set({ visible })
    .where(eq(medications.name, name))
}

export const updateMedicationType = async (name: string, type: string) => {
  await db.update(medications).set({ type }).where(eq(medications.name, name))
}

export const updateMedicationDose = async (name: string, dose: string) => {
  await db.update(medications).set({ dose }).where(eq(medications.name, name))
}

export const updateMedicationDescription = async (
  name: string,
  description: string
) => {
  await db
    .update(medications)
    .set({ description })
    .where(eq(medications.name, name))
}

export const updateMedicationName = async (
  oldName: string,
  newName: string
) => {
  await db
    .update(medications)
    .set({ name: newName })
    .where(eq(medications.name, oldName))
}

export const insertMedication = async (
  name: string,
  visible: boolean,
  type?: string,
  dose?: string,
  description?: string
) => {
  const medication = await getMedication(name)
  if (medication) {
    await updateMedication(name, visible, type, dose, description)
  } else {
    await db
      .insert(medications)
      .values({ name, dose, visible, type, description })
  }
}

export const deleteMedication = async (name: string) => {
  await db.delete(medications).where(eq(medications.name, name))
}

export const deleteAllMedications = async () => {
  await db.delete(medications)
}
