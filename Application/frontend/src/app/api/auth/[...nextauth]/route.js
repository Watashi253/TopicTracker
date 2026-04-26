import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const db = await getDb()
        const users = db.collection("users")

        const user = await users.findOne({ email: credentials.email.toLowerCase() })

        if (!user) {
          // No account found — direct the user to the sign-up page
          return null
        }

        if (user.password) {
          // Registered user: verify bcrypt hash
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) return null
        }
        // Legacy accounts (no password field) are allowed through so existing
        // users are not locked out. They should set a password via their profile.

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.imageUrl,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
      }
      // Support updating session data from frontend
      if (trigger === "update" && session) {
        token.name = session.name || token.name
        token.picture = session.image || token.picture
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_dev_12345",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

