import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

// POST = subscribe, DELETE = unsubscribe
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { cluster_id } = await request.json();
    if (!cluster_id) {
      return NextResponse.json({ error: "cluster_id is required" }, { status: 400 });
    }

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(
      `${DB_API}/subscribe/${encodeURIComponent(userEmail)}/${cluster_id}`,
      { method: "POST" }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Subscribe Error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { cluster_id } = await request.json();
    if (!cluster_id) {
      return NextResponse.json({ error: "cluster_id is required" }, { status: 400 });
    }

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(
      `${DB_API}/unsubscribe/${encodeURIComponent(userEmail)}/${cluster_id}`,
      { method: "DELETE" }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unsubscribe Error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
