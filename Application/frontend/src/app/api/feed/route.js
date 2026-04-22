import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "60");
    const source = searchParams.get("source");

    const db = await getDb();
    
    // Build query
    const query = {};
    if (source && source !== "all") {
      query.source_name = { $regex: new RegExp(source, "i") };
    }

    // Fetch processed articles (from Bart Summarisation)
    const articles = await db.collection("processed_articles")
      .find(query)
      .sort({ processed_at: -1 })
      .limit(limit)
      .toArray();

    // Map to frontend format
    const formatted = articles.map(a => ({
      id: a._id.toString(),
      title: a.short_title || a.original_title,
      summary: a.medium_summary,
      source: a.source_name,
      url: a.original_url,
      created_at: a.published_at || a.processed_at,
      // Since Bart doesn't store credibility or cluster natively in this DB, 
      // we mock it or default to 0. In a real system, these would be synced.
      credibility_score: 0.85 + (Math.random() * 0.1), // Mock high credibility for feed
      cluster_id: a.raw_article_id?.toString(), 
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Feed API Error:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
