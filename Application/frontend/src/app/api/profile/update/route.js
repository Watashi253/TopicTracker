import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

export async function PATCH(req) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Only allow editing these fields — never clerkUserId or email
  const allowedFields = ["name", "username"]
  const updates = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      const val = String(body[field]).trim()
      if (val.length > 0) {
        updates[field] = val
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  updates.updatedAt = new Date()

  try {
    const db = await getDb()
    const result = await db.collection("users").findOneAndUpdate(
      { clerkUserId: userId },
      { $set: updates },
      { returnDocument: "after" }
    )

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, user: result })
  } catch (err) {
    console.error("❌ Profile update failed:", err)

    // Handle duplicate username
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field"
      return NextResponse.json(
        { error: `That ${field} is already taken` },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}