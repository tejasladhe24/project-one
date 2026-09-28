import { env } from "@/env"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { organization } from "better-auth/plugins/organization"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { createHash } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import { db, redis } from "@/db"
import * as schema from "@/db/schema"
import { generateUUID } from "@/lib/utils"
import { emailClient } from "@/email"
import {
  ForgotPasswordEmail,
  OrganizationInvitationEmail,
  VerifyEmail,
} from "@/email/templates"
import { isProduction } from "@/lib/constants"

function teamMembershipKey(teamId: string, userId: string) {
  return createHash("sha256")
    .update(JSON.stringify([teamId, userId]))
    .digest("base64url")
}

/** Derive a Linear-style 2–4 char team key from a name/slug. */
function teamIdentifierFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  if (clean.length >= 2) return clean.slice(0, 4)
  if (clean.length === 1) return `${clean}TM`
  return "TEAM"
}

async function uniqueTeamIdentifier(preferred: string): Promise<string> {
  const base = teamIdentifierFromName(preferred)
  const existing = await db
    .select({ identifier: schema.team.identifier })
    .from(schema.team)
  const taken = new Set(existing.map((row) => row.identifier.toUpperCase()))

  if (!taken.has(base)) return base

  const prefix = base.slice(0, 3)
  for (let i = 2; i <= 9; i++) {
    const candidate = `${prefix}${i}`
    if (!taken.has(candidate)) return candidate
  }

  for (let i = 0; i < 36; i++) {
    const suffix = i.toString(36).toUpperCase()
    const candidate = `${prefix.slice(0, 3)}${suffix}`.slice(0, 4)
    if (!taken.has(candidate)) return candidate
  }

  return `${prefix.slice(0, 2)}${Date.now().toString(36).slice(-2).toUpperCase()}`.slice(
    0,
    4
  )
}

const appHost = (() => {
  try {
    return new URL(env.APP_URL).host
  } catch {
    return null
  }
})()

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  // Derive OAuth redirect_uri from the request host so start + callback stay
  // same-origin across Vercel production aliases (avoids state cookie mismatch).
  baseURL: {
    allowedHosts: [
      "localhost:*",
      "127.0.0.1:*",
      ...(appHost ? [appHost] : []),
      "project-one-tejas-ladhes-projects.vercel.app",
      "project-one-one-zeta.vercel.app",
      "project-one-tejas-dev.vercel.app",
      "project-one-tejas.vercel.app",
      "project-one-git-dev-tejas-ladhes-projects.vercel.app",
      "*.vercel.app",
    ],
    fallback: env.APP_URL,
    protocol: isProduction ? "https" : "auto",
  },
  trustedOrigins: [
    env.APP_URL,
    env.VITE_APP_URL,
    "http://localhost:*",
    "http://127.0.0.1:*",
    // Vercel assigns per-deployment + project aliases; allow the request host.
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    "https://project-one-tejas-ladhes-projects.vercel.app",
    "https://project-one-one-zeta.vercel.app",
    "https://project-one-tejas-dev.vercel.app",
    "https://project-one-tejas.vercel.app",
    "https://project-one-git-dev-tejas-ladhes-projects.vercel.app",
    "https://*.vercel.app",
  ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i),
  advanced: {
    database: {
      generateId: (_options) => generateUUID(),
    },
    // Vercel terminates TLS; honor x-forwarded-host/proto for dynamic baseURL.
    trustedProxyHeaders: Boolean(process.env.VERCEL),
    // Only share cookies across real custom domains — not *.vercel.app aliases.
    ...(env.BETTER_AUTH_DOMAIN &&
    !["localhost", "127.0.0.1"].includes(env.BETTER_AUTH_DOMAIN) &&
    !env.BETTER_AUTH_DOMAIN.endsWith(".vercel.app")
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: env.BETTER_AUTH_DOMAIN,
          },
        }
      : {}),
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await emailClient.emails.send({
        from: `${env.EMAIL_SENDER_NAME} <${env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: "Verify your email",
        react: VerifyEmail({
          username: user.name,
          verifyUrl: url,
          senderName: env.EMAIL_SENDER_NAME,
        }),
      })
    },
    sendOnSignUp: isProduction,
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await emailClient.emails.send({
        from: `${env.EMAIL_SENDER_NAME} <${env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: "Reset your password",
        react: ForgotPasswordEmail({
          username: user.name,
          resetUrl: url,
          userEmail: user.email,
        }),
      })
    },
    requireEmailVerification: isProduction,
  },
  secondaryStorage: {
    get: async (key) => redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, "EX", ttl)
      else await redis.set(key, value)
    },
    delete: async (key) => {
      await redis.del(key)
    },
    getAndDelete: async (key) => {
      const value = await redis.get(key)
      if (value !== null) await redis.del(key)
      return value
    },
    increment: async (key, ttl) => {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, ttl)
      return count
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      teams: {
        enabled: true,
        // Orgs can exist with zero teams; users create teams explicitly.
        defaultTeam: { enabled: false },
        allowRemovingAllTeams: true,
      },
      schema: {
        team: {
          additionalFields: {
            identifier: {
              type: "string",
              required: true,
              input: true,
            },
            description: {
              type: "string",
              required: false,
              input: true,
            },
          },
        },
      },
      organizationHooks: {
        // createTeam may omit identifier (e.g. older clients) — fill required field.
        beforeCreateTeam: async ({ team, organization }) => {
          const provided =
            typeof team.identifier === "string" ? team.identifier.trim() : ""
          if (provided) {
            return {
              data: { identifier: provided.toUpperCase().slice(0, 4) },
            }
          }

          const seed =
            (typeof organization.slug === "string" && organization.slug) ||
            team.name ||
            "TEAM"
          const identifier = await uniqueTeamIdentifier(seed)
          return { data: { identifier } }
        },
        // Better Auth createTeam does not auto-add the creator — do it here.
        afterCreateTeam: async ({ team, user }) => {
          if (!user) return

          const [already] = await db
            .select({ id: schema.teamMember.id })
            .from(schema.teamMember)
            .where(
              and(
                eq(schema.teamMember.teamId, team.id),
                eq(schema.teamMember.userId, user.id)
              )
            )
            .limit(1)
          if (already) return

          await db.insert(schema.teamMember).values({
            id: generateUUID(),
            teamId: team.id,
            userId: user.id,
            membershipKey: teamMembershipKey(team.id, user.id),
            createdAt: new Date(),
          })
          await db
            .update(schema.team)
            .set({ memberCount: sql`${schema.team.memberCount} + 1` })
            .where(eq(schema.team.id, team.id))
        },
      },
      async sendInvitationEmail(data) {
        const inviteLink = `${env.APP_URL}/accept-invitation/${data.id}`

        await emailClient.emails.send({
          from: `${env.EMAIL_SENDER_NAME} <${env.EMAIL_SENDER_ADDRESS}>`,
          to: data.email,
          subject: "You've been invited to join our organization",
          react: OrganizationInvitationEmail({
            email: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            organizationName: data.organization.name,
            inviteLink,
          }),
        })
      },
    }),
    tanstackStartCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
