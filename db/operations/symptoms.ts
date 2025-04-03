import { getDrizzleDatabase } from "@/db/operations/setup";
import { symptoms } from "@/db/schema";
import { deleteSymptomEntriesBySymptomId } from "@/db/operations/symptomEntries";
import { eq } from "drizzle-orm";

const db = getDrizzleDatabase();

export const getSymptom = async (name: string) => {
  const symptom = await db.query.symptoms.findFirst({
    where: eq(symptoms.name, name),
  });
  return symptom;
};

export const getSymptomByID = async (id: number) => {
  const symptom = await db.query.symptoms.findFirst({
    where: eq(symptoms.id, id),
  });
  return symptom;
};

export const getAllSymptoms = async () => {
  const allSymptoms = await db.select().from(symptoms);
  return allSymptoms;
};

export const getAllVisibleSymptoms = async () => {
  const visibleSymptoms = await db
    .select()
    .from(symptoms)
    .where(eq(symptoms.visible, true));
  return visibleSymptoms;
};

export const updateSymptom = async (
  name: string,
  visible: boolean,
  description?: string,
) => {
  let updateData: object = { name, visible };
  if (description) {
    updateData = { ...updateData, description };
  }
  await db.update(symptoms).set(updateData).where(eq(symptoms.name, name));
};

export const updateSymptomVisibility = async (
  name: string,
  visible: boolean,
) => {
  await db.update(symptoms).set({ visible }).where(eq(symptoms.name, name));
};

export const updateSymptomDescription = async (
  name: string,
  description: string,
) => {
  await db.update(symptoms).set({ description }).where(eq(symptoms.name, name));
};

export const updateSymptomName = async (oldName: string, newName: string) => {
  await db
    .update(symptoms)
    .set({ name: newName })
    .where(eq(symptoms.name, oldName));
};

export const insertSymptom = async (
  name: string,
  visible: boolean,
  description?: string,
) => {
  const symptom = await getSymptom(name);
  if (symptom) {
    await updateSymptom(name, visible, description);
  } else {
    await db.insert(symptoms).values({ name, visible, description }).execute();
  }
};

export const deleteSymptom = async (name: string) => {
  const symptom_id = (await getSymptom(name))?.id;

  // delete all entries associated with the symptom
  if (symptom_id) {
    await deleteSymptomEntriesBySymptomId(symptom_id);
  }

  // delete the symptom
  await db.delete(symptoms).where(eq(symptoms.name, name));
};

export const deleteAllSymptoms = async () => {
  await db.delete(symptoms);
};
