import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { cluster_id } = params;

    if (!cluster_id) {
      return NextResponse.json({ error: "Cluster ID parameter is required" }, { status: 400 });
    }

    const DB_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const evolutionRes = await fetch(`${DB_API}/evolution/${cluster_id}`, {
      cache: "no-store",
    });

    if (!evolutionRes.ok) {
      throw new Error(`DB API evolution failed: ${evolutionRes.statusText}`);
    }

    const evolutionData = await evolutionRes.json();

    return NextResponse.json(evolutionData);
  } catch (error) {
    console.error("Evolution API Error:", error);
    return NextResponse.json({ error: "Failed to fetch topic evolution" }, { status: 500 });
  }
}
