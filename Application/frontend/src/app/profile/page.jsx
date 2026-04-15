import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserByClerkId } from "@/lib/users"
import ProfileActions from "@/app/components/ProfileActions"

export default async function ProfilePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  let clerkUser = null
  try {
    clerkUser = await currentUser()
  } catch (error) {
    console.error("Failed to load Clerk user:", error)
  }

  const dbUser = await getUserByClerkId(userId)
  const safeDbUser = dbUser ? JSON.parse(JSON.stringify(dbUser)) : null

  const name =
    safeDbUser?.name ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    clerkUser?.fullName ||
    "User"

  const email =
    safeDbUser?.email ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    "—"

  const username =
    safeDbUser?.username ||
    clerkUser?.username ||
    "—"

  const imageUrl =
    safeDbUser?.imageUrl ||
    clerkUser?.imageUrl ||
    ""

  const clerkUserId = safeDbUser?.clerkUserId || userId

  // Format dates — show both date and time clearly
  const createdAt = safeDbUser?.createdAt
    ? new Date(dbUser.createdAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not synced yet"

  const updatedAt = safeDbUser?.updatedAt
    ? new Date(dbUser.updatedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not synced yet"

  const isSynced = !!dbUser

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(to_bottom,#020617,#0f172a_55%,#111827)] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
            Profile
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Your account details
          </h1>

          {/* Sync status badge */}
          {isSynced ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Synced with database
            </span>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Not yet in database — webhook may be pending
            </span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">

          {/* Left — Avatar + Actions */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-col items-center text-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Profile"
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-white/10"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-sky-500/20 ring-4 ring-white/10 text-3xl font-bold text-sky-300">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="mt-5 text-2xl font-semibold">{name}</h2>
              <p className="mt-1 text-sm text-slate-300">{email}</p>
              <p className="mt-1 text-sm text-slate-400">@{username}</p>
            </div>

            <div className="mt-6">
              {/* Pass current values so edit form is pre-filled */}
              <ProfileActions
                initialName={name === "User" ? "" : name}
                initialUsername={username === "—" ? "" : username}
              />
            </div>
          </div>

          {/* Right — Info Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Clerk User ID"
              value={clerkUserId}
              readonly
              hint="Cannot be changed"
            />
            <InfoCard
              label="Email"
              value={email}
              readonly
              hint="Cannot be changed"
            />
            <InfoCard label="Name" value={name} />
            <InfoCard label="Username" value={username} />
            <InfoCard
              label="Account Created"
              value={createdAt}
              icon="📅"
              highlight={!safeDbUser?.createdAt}
            />
            <InfoCard
              label="Last Updated"
              value={updatedAt}
              icon="🔄"
              highlight={!safeDbUser?.updatedAt}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function InfoCard({ label, value, readonly, hint, icon, highlight }) {
  return (
    <div
      className={`rounded-3xl border p-5 backdrop-blur ${
        readonly
          ? "border-white/5 bg-white/3 opacity-70"
          : "border-white/10 bg-white/5"
      } ${highlight ? "border-amber-500/20 bg-amber-500/5" : ""}`}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">{label}</p>
        {readonly && (
          <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
            locked
          </span>
        )}
      </div>
      <p className="mt-3 break-all text-sm leading-7 text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}
