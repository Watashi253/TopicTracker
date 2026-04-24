import { NextResponse } from "next/server";
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

    // Perform semantic search via Database and Bert Infra (wait for it)
    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const searchRes = await fetch(`${DB_API}/search?query=${encodeURIComponent(query)}&email=${encodeURIComponent(userEmail)}`);

    if (!searchRes.ok) {
      throw new Error(`DB API search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();

    return NextResponse.json(searchData);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
