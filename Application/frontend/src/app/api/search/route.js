import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const { userId } = auth();
    // Fallback email if no userId is available via Clerk during testing
    const userEmail = userId ? `${userId}@example.com` : "test@example.com";

    // 1. Trigger Data Ingestion in the background (fire and forget)
    // We don't await this because scraping takes time
    const INGESTION_API = process.env.NEXT_PUBLIC_INGESTION_API_URL || "http://localhost:8002";
    fetch(`${INGESTION_API}/fetch/all?query=${encodeURIComponent(query)}&limit=10`)
      .catch(err => console.error("Ingestion trigger failed:", err));

    // 2. Perform semantic search via Database and Bert Infra (wait for it)
    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const searchRes = await fetch(`${DB_API}/search?query=${encodeURIComponent(query)}&email=${encodeURIComponent(userEmail)}`);

    if (!searchRes.ok) {
      throw new Error(`DB API search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();

    // 3. Save dummy subscription to MongoDB for the frontend Subscriptions page
    if (searchData.clusters_matched > 0) {
      const db = await getDb();
      const subsCollection = db.collection("subscriptions");

      await subsCollection.updateOne(
        { user_email: userEmail, topic_name: query },
        {
          $set: {
            user_email: userEmail,
            topic_name: query,
            created_at: new Date()
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json(searchData);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
