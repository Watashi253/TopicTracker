"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

export default function SubscribeButton({ clusterId }) {
  const { data: session } = useSession()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || !clusterId) {
      setLoading(false)
      return
    }

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/subscribe/status")
        const data = await res.json()
        setIsSubscribed(data.cluster_ids?.includes(clusterId) || false)
      } catch (err) {
        console.error("Failed to fetch sub status", err)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [session, clusterId])

  const toggleSubscription = async () => {
    if (!session) {
      alert("Please sign in to subscribe.")
      return
    }

    setLoading(true)
    try {
      if (isSubscribed) {
        // Unsubscribe
        await fetch("/api/subscribe/toggle", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cluster_id: clusterId })
        })
        setIsSubscribed(false)
      } else {
        // Subscribe
        await fetch("/api/subscribe/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cluster_id: clusterId })
        })
        setIsSubscribed(true)
      }
    } catch (err) {
      console.error("Toggle failed", err)
      alert("Failed to update subscription.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <button disabled className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/40">
        Loading...
      </button>
    )
  }

  return (
    <button
      onClick={toggleSubscription}
      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
        isSubscribed
          ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
          : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
      }`}
    >
      {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </button>
  )
}
