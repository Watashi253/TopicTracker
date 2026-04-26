"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

export default function ProfileActions({ initialName, initialUsername }) {
  const router = useRouter()

  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [name, setName] = useState(initialName || "")
  const [username, setUsername] = useState(initialUsername || "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSave() {
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to save changes")
      } else {
        setSuccess("Profile updated!")
        setShowEdit(false)
        router.refresh() // re-render server component with fresh DB data
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch("/api/profile/delete", { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to delete account")
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // Sign out and redirect after deletion
      await signOut({ callbackUrl: "/" })
    } catch {
      setError("Network error. Please try again.")
      setDeleting(false)
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {success && (
          <p className="rounded-xl bg-emerald-500/15 px-4 py-2 text-center text-sm text-emerald-400">
            {success}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-2 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={() => { setShowEdit(true); setError(""); setSuccess("") }}
          className="w-full rounded-2xl bg-sky-500/20 border border-sky-500/30 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/30 hover:text-sky-200 active:scale-95"
        >
          ✏️ Edit Profile
        </button>

        <button
          onClick={handleSignOut}
          className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          🚪 Sign Out
        </button>

        <button
          onClick={() => { setShowDeleteConfirm(true); setError("") }}
          className="w-full rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300 active:scale-95"
        >
          🗑️ Delete Account
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
            <p className="mt-1 text-sm text-slate-400">
              You can update your name and username. Email and User ID cannot be changed.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-sky-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500/50 focus:bg-white/8 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-sky-300">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500/50 focus:bg-white/8 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-400 disabled:opacity-50 active:scale-95"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0f172a] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Delete Account?</h2>
            <p className="mt-2 text-sm text-slate-400">
              This will permanently remove your account from the database. 
              <span className="text-red-400 font-medium"> This cannot be undone.</span>
            </p>

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-50 active:scale-95"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
