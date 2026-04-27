import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ cluster_ids: [] });
    }

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${DB_API}/subscribed-cluster-ids/${encodeURIComponent(userEmail)}`);

    if (!res.ok) {
      return NextResponse.json({ cluster_ids: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Subscription status Error:", error);
    return NextResponse.json({ cluster_ids: [] });
  }
}
