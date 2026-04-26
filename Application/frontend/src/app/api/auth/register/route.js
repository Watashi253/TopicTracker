import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

/**
 * POST /api/auth/register
 * Creates a new user account and persists it to MongoDB.
 * Expects JSON body: { name, email, password }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // --- Input validation ---
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 }
      )
    }

    const db = await getDb()
    const users = db.collection("users")

    // --- Duplicate check ---
    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // --- Hash password & insert ---
    const hashedPassword = await bcrypt.hash(password, 12)
    const username = name.trim().toLowerCase().replace(/\s+/g, "_")

    const newUser = {
      name: name.trim(),
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await users.insertOne(newUser)

    return NextResponse.json(
      {
        message: "Account created successfully.",
        userId: result.insertedId.toString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[register] Error:", error)
    return NextResponse.json(
      { message: "Internal server error. Please try again." },
      { status: 500 }
    )
  }
}
