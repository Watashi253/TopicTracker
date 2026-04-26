import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/sign-in",
  },
});

export const config = {
  matcher: [
    /*
     * Protect all routes EXCEPT:
     * - api          (API routes — NextAuth handles its own auth)
     * - _next/static (static assets)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - /            (public landing page)
     * - /sign-in     (public sign-in page)
     * - /sign-up     (public sign-up page — must be public so new users can register)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|$).*)",
  ],
};
