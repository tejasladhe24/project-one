import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq, notInArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import {
  issueActivity,
  issueComment,
  issueSubscriber,
  user,
} from "@/db/schema"
import { subscribeToIssue } from "@/lib/issues/activity"
import { requireTeamIssueAccess } from "@/lib/server/access"
import { requireOrgSession } from "@/lib/server/session"

const actor = alias(user, "activity_actor")
const subscriberUser = alias(user, "subscriber_user")
const author = alias(user, "timeline_comment_author")

/** System / metadata events for the Activity timeline (comments come from issue_comment). */
export const listIssueActivities = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    return db
      .select({
        id: issueActivity.id,
        issueId: issueActivity.issueId,
        type: issueActivity.type,
        message: issueActivity.message,
        oldValue: issueActivity.oldValue,
        newValue: issueActivity.newValue,
        createdAt: issueActivity.createdAt,
        actorId: actor.id,
        actorName: actor.name,
        actorImage: actor.image,
      })
      .from(issueActivity)
      .leftJoin(actor, eq(issueActivity.userId, actor.id))
      .where(
        and(
          eq(issueActivity.issueId, data.issueId),
          notInArray(issueActivity.type, ["comment", "mention"])
        )
      )
      .orderBy(asc(issueActivity.createdAt))
  })

export const listIssueSubscribers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    const rows = await db
      .select({
        userId: subscriberUser.id,
        name: subscriberUser.name,
        image: subscriberUser.image,
        reason: issueSubscriber.reason,
      })
      .from(issueSubscriber)
      .innerJoin(subscriberUser, eq(issueSubscriber.userId, subscriberUser.id))
      .where(eq(issueSubscriber.issueId, data.issueId))
      .orderBy(asc(subscriberUser.name))

    return {
      subscribers: rows,
      isSubscribed: rows.some((r) => r.userId === session.user.id),
    }
  })

/** One access check + comments, activities, and subscribers for the issue page. */
export const getIssueTimeline = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    const [comments, activities, subscribers] = await Promise.all([
      db
        .select({
          id: issueComment.id,
          issueId: issueComment.issueId,
          parentId: issueComment.parentId,
          body: issueComment.body,
          createdAt: issueComment.createdAt,
          updatedAt: issueComment.updatedAt,
          authorId: author.id,
          authorName: author.name,
          authorImage: author.image,
        })
        .from(issueComment)
        .innerJoin(author, eq(issueComment.authorId, author.id))
        .where(eq(issueComment.issueId, data.issueId))
        .orderBy(asc(issueComment.createdAt)),
      db
        .select({
          id: issueActivity.id,
          issueId: issueActivity.issueId,
          type: issueActivity.type,
          message: issueActivity.message,
          oldValue: issueActivity.oldValue,
          newValue: issueActivity.newValue,
          createdAt: issueActivity.createdAt,
          actorId: actor.id,
          actorName: actor.name,
          actorImage: actor.image,
        })
        .from(issueActivity)
        .leftJoin(actor, eq(issueActivity.userId, actor.id))
        .where(
          and(
            eq(issueActivity.issueId, data.issueId),
            notInArray(issueActivity.type, ["comment", "mention"])
          )
        )
        .orderBy(asc(issueActivity.createdAt)),
      db
        .select({
          userId: subscriberUser.id,
          name: subscriberUser.name,
          image: subscriberUser.image,
          reason: issueSubscriber.reason,
        })
        .from(issueSubscriber)
        .innerJoin(subscriberUser, eq(issueSubscriber.userId, subscriberUser.id))
        .where(eq(issueSubscriber.issueId, data.issueId))
        .orderBy(asc(subscriberUser.name)),
    ])

    return {
      comments,
      activities,
      subscribers,
      isSubscribed: subscribers.some((r) => r.userId === session.user.id),
    }
  })

export const setIssueSubscription = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
      subscribe: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    if (data.subscribe) {
      await subscribeToIssue(db, {
        issueId: data.issueId,
        userId: session.user.id,
        reason: "manual",
      })
    } else {
      await db
        .delete(issueSubscriber)
        .where(
          and(
            eq(issueSubscriber.issueId, data.issueId),
            eq(issueSubscriber.userId, session.user.id)
          )
        )
    }

    return { ok: true as const, subscribed: data.subscribe }
  })
