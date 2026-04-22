import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";

export async function GET(request) {
  try {
    const { userId } = auth();
    // Fallback email if no userId is available via Clerk during testing
    const userEmail = userId ? `${userId}@example.com` : "test@example.com";

    const db = await getDb();
    const subsCollection = db.collection("subscriptions");

    // Fetch subscriptions
    const subs = await subsCollection.find({ user_email: userEmail }).toArray();

    // Map to frontend expected format
    // Frontend expects: [{ cluster_id, topic_name, sources, articles, avg_credibility }]
    // For now we will fetch recent articles for each subscription if needed, or just return basic structure.

    const formattedSubs = [];

    // In a real system we would fetch the cluster details from postgres,
    // but here we just enrich the dummy subscriptions with recent processed articles matching the topic
    for (const sub of subs) {
      const articles = await db.collection("processed_articles")
        .find({
          $or: [
            { original_title: { $regex: new RegExp(sub.topic_name, "i") } },
            { short_title: { $regex: new RegExp(sub.topic_name, "i") } }
          ]
        })
        .sort({ processed_at: -1 })
        .limit(10)
        .toArray();

      const formattedArticles = articles.map(a => ({
        id: a._id.toString(),
        title: a.short_title || a.original_title,
        summary: a.medium_summary,
        source: a.source_name,
        url: a.original_url,
        created_at: a.published_at || a.processed_at,
        credibility_score: 0.90
      }));

      const uniqueSources = Array.from(new Set(formattedArticles.map(a => a.source).filter(Boolean)));

      formattedSubs.push({
        cluster_id: sub.cluster_id || sub._id.toString(),
        topic_name: sub.topic_name,
        sources: uniqueSources,
        articles: formattedArticles,
        avg_credibility: 0.90
      });
    }

    return NextResponse.json(formattedSubs);
  } catch (error) {
    console.error("Subscriptions API Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
