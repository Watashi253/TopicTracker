import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "test@example.com";

    // Perform semantic search via Database and Bert Infra (wait for it)
    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const searchRes = await fetch(`${DB_API}/search?query=${encodeURIComponent(query)}&email=${encodeURIComponent(userEmail)}`);

    if (!searchRes.ok) {
      throw new Error(`DB API search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();

    // Trigger data ingestion to fetch from all sources (fire and forget)
    // We don't await this so the UI doesn't block while fetching from RSS/Twitter/GDELT
    const INGESTION_API = process.env.DATA_INGESTION_URL || "http://localhost:8002";
    fetch(`${INGESTION_API}/fetch/all?query=${encodeURIComponent(query)}`).catch(err => {
      console.error("Failed to trigger data ingestion:", err);
    });

    return NextResponse.json(searchData);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
