import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB

console.log("📦 DB NAME:", dbName)

let clientPromise

if (!globalThis._mongoClientPromise) {
  console.log("🚀 Creating new MongoClient...")

  const client = new MongoClient(uri)

  globalThis._mongoClientPromise = client.connect()
    .then((client) => {
      console.log("✅ MongoDB CONNECTED")
      return client
    })
    .catch((err) => {
      console.error("❌ MongoDB CONNECTION FAILED:", err)
      throw err
    })
}

clientPromise = globalThis._mongoClientPromise

export async function getDb() {
  const client = await clientPromise
  return client.db(dbName)
}