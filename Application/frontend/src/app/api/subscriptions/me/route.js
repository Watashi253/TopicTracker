import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request) {
  try {
    const { userId } = auth();
    // Fallback email if no userId is available via Clerk during testing
    const userEmail = userId ? `${userId}@example.com` : "test@example.com";

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    // Fetch subscriptions directly from the Database_and_bert_infra API
    const res = await fetch(`${DB_API}/subscriptions/${encodeURIComponent(userEmail)}`);
    
    if (!res.ok) {
      throw new Error(`DB API subscriptions fetch failed: ${res.statusText}`);
    }

    const data = await res.json();
    
    // The data is already in the exact format the frontend expects:
    // [{ cluster_id, topic_name, sources, articles, avg_credibility }]
    return NextResponse.json(data);
  } catch (error) {
    console.error("Subscriptions API Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
