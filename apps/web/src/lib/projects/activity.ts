import type { db as DbType } from "@/db"
import { projectActivity } from "@/db/schema"
import { generateUUID } from "@/lib/utils"

type Db = typeof DbType
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
type DbLike = Db | Tx

export type ProjectActivityType =
  | "comment"
  | "created"
  | "status-change"
  | "priority-change"
  | "lead-change"
  | "member-change"
  | "date-change"
  | "team-change"
  | "label-change"
  | "name-change"
  | "description-change"

export async function recordProjectActivity(
  database: DbLike,
  input: {
    projectId: string
    actorId: string
    type: ProjectActivityType
    message: string
  }
) {
  const id = generateUUID()
  await database.insert(projectActivity).values({
    id,
    projectId: input.projectId,
    type: input.type,
    userId: input.actorId,
    message: input.message,
  })
  return id
}
