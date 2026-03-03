import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtected = pathname.startsWith("/builder") || pathname.startsWith("/settings");

  if (isProtected && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/", req.url));
  }

  return undefined;
});

export const config = {
  matcher: ["/login", "/register", "/builder/:path*", "/settings"],
};
