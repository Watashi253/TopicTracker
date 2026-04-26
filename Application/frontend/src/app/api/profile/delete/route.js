import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import { deleteUserByEmail } from "@/lib/users"

export async function DELETE() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Delete from MongoDB
    await deleteUserByEmail(session.user.email)
  } catch (err) {
    console.error("❌ Failed to delete from MongoDB:", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}