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

    // Get user email from session, fall back to test email
    let userEmail = "test@example.com";
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    } catch (sessionErr) {
      console.warn("Session lookup failed, using default email:", sessionErr.message);
    }

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const searchUrl = `${DB_API}/search?query=${encodeURIComponent(query)}&email=${encodeURIComponent(userEmail)}`;
    
    console.log(`[Search Route] Calling: ${searchUrl}`);

    const searchRes = await fetch(searchUrl);

    console.log(`[Search Route] Response status: ${searchRes.status}`);

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      console.error(`[Search Route] DB API error: ${errorText}`);
      throw new Error(`DB API search failed: ${searchRes.statusText}`);
    }

    let searchData = await searchRes.json();

    console.log(`[Search Route] Got ${searchData?.results?.length || 0} results`);

    // DB & BERT Infra's /search now internally calls Data Ingestion /fetch/all,
    // processes articles through BERT, and returns enriched results.
    // No need for a separate ingestion call here.

    return NextResponse.json(searchData);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to perform search", detail: error.message }, { status: 500 });
  }
}
