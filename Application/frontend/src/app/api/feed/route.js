import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "60");

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${DB_API}/articles/latest?limit=${limit}`);

    if (!res.ok) {
      throw new Error(`DB API feed fetch failed: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Data is already in the right format from api.py 
    // Format: {id, title, url, summary, source, credibility_score, cluster_id, created_at}
    return NextResponse.json(data);
  } catch (error) {
    console.error("Feed API Error:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
