import { headers } from "next/headers"
import { Webhook } from "svix"
import {
  upsertUserFromClerk,
  deleteUserByClerkId,
  ensureUserIndexes,
} from "@/lib/users"

export async function POST(req) {
  const secret = process.env.CLERK_WEBHOOK_SECRET

  if (!secret) {
    console.error("❌ Missing CLERK_WEBHOOK_SECRET")
    return new Response("Server error", { status: 500 })
  }

  const payload = await req.text()
  const hdrs =await headers()

  const svix_id = hdrs.get("svix-id")
  const svix_timestamp = hdrs.get("svix-timestamp")
  const svix_signature = hdrs.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ Missing svix headers")
    return new Response("Bad request", { status: 400 })
  }

  let evt

  try {
    evt = new Webhook(secret).verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    console.error("❌ Webhook verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }
  try {
    // ensure indexes (safe to call multiple times)
    await ensureUserIndexes()

    if (evt.type === "user.created" || evt.type === "user.updated") {
      await upsertUserFromClerk(evt.data)
      console.log("✅ User upserted in MongoDB")
    }

    if (evt.type === "user.deleted") {
      await deleteUserByClerkId(evt.data.id)
      console.log("🗑️ User deleted from MongoDB")
    }
  } catch (err) {
    console.error("❌ Database operation failed:", err)
    return new Response("Database error", { status: 500 })
  }
  return new Response("OK", { status: 200 })
}