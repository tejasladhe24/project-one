/** Mentions encoded in body as @[Label](user:id) or @[Label](issue:id). */
const MENTION_RE = /@\[([^\]]+)\]\((user|issue):([^)]+)\)/g

export function parseMentionsFromBody(body: string) {
  const users: { userId: string; label: string }[] = []
  const issues: { issueId: string; label: string }[] = []
  for (const match of body.matchAll(MENTION_RE)) {
    const label = match[1]!
    const type = match[2]!
    const id = match[3]!
    if (type === "user") users.push({ userId: id, label })
    else issues.push({ issueId: id, label })
  }
  return { users, issues }
}

export function formatUserMention(name: string, userId: string) {
  return `@[${name}](user:${userId})`
}

export function formatIssueMention(label: string, issueId: string) {
  return `@[${label}](issue:${issueId})`
}
