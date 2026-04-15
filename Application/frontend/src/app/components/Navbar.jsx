"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"

const navItems = [
  { label: "Home", href: "/" },
  { label: "Track Topic", href: "/track" },
  { label: "Live Feed", href: "/feed" },
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Dashboard", href: "/dashboard" },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, isSignedIn } = useUser()

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Topic Tracker
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-sky-400 text-black"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Profile Button */}
        <div className="flex items-center gap-3">
          {isSignedIn && (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur hover:bg-white/10 transition"
            >
              <img
                src={user?.imageUrl}
                alt="profile"
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="hidden text-sm text-white sm:block">
                {user?.firstName}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}