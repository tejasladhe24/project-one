import { createAuthClient } from "better-auth/react"
import { apiKeyClient } from "@better-auth/api-key/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      teams: {
        enabled: true,
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
    }),
    apiKeyClient(),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient
