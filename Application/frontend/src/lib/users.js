import { getDb } from "./mongodb"

const COLLECTION = "users"

async function getUsersCollection() {
  const db = await getDb()
  return db.collection(COLLECTION)
}

export async function ensureUserIndexes() {
  const users = await getUsersCollection()

  await users.createIndex({ clerkUserId: 1 }, { unique: true })
  await users.createIndex({ email: 1 }, { unique: true})
  await users.createIndex({ username: 1 }, { unique: true, sparse: true })
}

function getPrimaryEmail(clerkUser) {
  if (!clerkUser) return null

  const primaryId = clerkUser.primary_email_address_id

  const email =
    clerkUser.email_addresses?.find((item) => item.id === primaryId)
      ?.email_address ||
    clerkUser.email_addresses?.[0]?.email_address ||
    clerkUser.emailAddress ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    null

  return email
}

function getFullName(clerkUser) {
  if (!clerkUser) return "User"

  const fullName = clerkUser.full_name || clerkUser.fullName
  if (fullName && fullName.trim()) return fullName.trim()

  const name = [clerkUser.first_name, clerkUser.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || "User"
}

function getUsername(clerkUser, email) {
  if (!clerkUser) return null

  const username =
    clerkUser.username ||
    clerkUser.user_name ||
    clerkUser?.unsafeMetadata?.username ||
    null

  if (username && username.trim()) return username.trim()

  if (email && email.includes("@")) {
    return email.split("@")[0]
  }

  return null
}

export async function upsertUserFromClerk(clerkUser) {
    console.log("🚀 UPSERT FUNCTION CALLED")
  const users = await getUsersCollection()

  const email = getPrimaryEmail(clerkUser)

  // ❌ If email missing → throw error
  if (!email) {
    throw new Error("Email is required but missing from Clerk user")
  }

  const name = getFullName(clerkUser)
  const username = getUsername(clerkUser, email)
   console.log("🧠 Extracted:", { email, name, username })

  await users.updateOne(
    { clerkUserId: clerkUser.id },
    {
      $set: {
        clerkUserId: clerkUser.id,
        email,
        name,
        username,
        imageUrl: clerkUser.image_url || clerkUser.imageUrl || "",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  )

  console.log("💾 User saved:", email)
}

export async function getUserByClerkId(clerkUserId) {
  const users = await getUsersCollection()
  return users.findOne({ clerkUserId })
}

export async function deleteUserByClerkId(clerkUserId) {
  const users = await getUsersCollection()
  await users.deleteOne({ clerkUserId })
}