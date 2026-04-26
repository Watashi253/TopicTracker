import { getDb } from "./mongodb"

const COLLECTION = "users"

export async function getUsersCollection() {
  const db = await getDb()
  return db.collection(COLLECTION)
}

export async function ensureUserIndexes() {
  const users = await getUsersCollection()

  await users.createIndex({ email: 1 }, { unique: true})
  await users.createIndex({ username: 1 }, { unique: true, sparse: true })
}

export async function getUserByEmail(email) {
  const users = await getUsersCollection()
  return users.findOne({ email })
}

export async function deleteUserByEmail(email) {
  const users = await getUsersCollection()
  await users.deleteOne({ email })
}