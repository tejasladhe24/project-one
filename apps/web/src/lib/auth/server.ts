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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  trustedOrigins: [env.APP_URL, env.VITE_APP_URL].filter(
    (v, i, arr) => Boolean(v) && arr.indexOf(v) === i
  ),
  advanced: {
    database: {
      generateId: (_options) => generateUUID(),
    },
    ...(env.BETTER_AUTH_DOMAIN &&
    !["localhost", "127.0.0.1"].includes(env.BETTER_AUTH_DOMAIN)
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
        allowRemovingAllTeams: false,
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
