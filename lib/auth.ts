import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.hashedPassword) return null;

        const isValid = await compare(password, user.hashedPassword);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user && account?.provider === "google" && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, subscriptionTier: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.subscriptionTier = dbUser.subscriptionTier;
        }
      } else if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { subscriptionTier: true },
        });
        token.subscriptionTier = dbUser?.subscriptionTier ?? "FREE";
      }

      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionTier: true },
        });
        token.subscriptionTier = dbUser?.subscriptionTier ?? "FREE";
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.subscriptionTier = (token.subscriptionTier as string) ?? "FREE";
      }
      return session;
    },
  },
});
