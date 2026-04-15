import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { deleteUserByClerkId } from "@/lib/users"

export async function DELETE() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Delete from Clerk first
    const client = await clerkClient()
    await client.users.deleteUser(userId)
  } catch (err) {
    console.error("❌ Failed to delete from Clerk:", err)
    return NextResponse.json({ error: "Failed to delete from Clerk" }, { status: 500 })
  }

  try {
    // Delete from MongoDB
    await deleteUserByClerkId(userId)
  } catch (err) {
    console.error("❌ Failed to delete from MongoDB:", err)
    // User already deleted from Clerk, log but continue
    return NextResponse.json({ error: "Deleted from Clerk but failed on DB" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}