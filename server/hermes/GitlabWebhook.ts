import type express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../server/common/logging';
import { sql } from './Sql';

const logger = createLogger('hermes:gitlab');

const DEFAULT_WEBHOOK_PATH = '/integrations/gitlab/webhook';
const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]{1,10}-\d{1,10})\b/gi;

function normalizeBranchFromRef(ref: string): string {
  // GitLab Push Hook usually sends ref like `refs/heads/feature/BS-123-something`
  return ref.replace(/^refs\/heads\//, '');
}

function extractIssueKeysFromTexts(texts: Array<string | undefined | null>): string[] {
  const keys = new Set<string>();

  for (const text of texts) {
    if (!text) continue;

    ISSUE_KEY_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ISSUE_KEY_RE.exec(text)) !== null) {
      const key = match[1]?.toUpperCase();
      if (key) keys.add(key);
    }
  }

  return [...keys];
}

function computeFallbackEventKey(eventType: string, payload: any): string {
  const normalizedEventType = (eventType || 'unknown').trim().toLowerCase();
  const safeEventType = normalizedEventType.replace(/\s+/g, '_');

  const projectId =
    payload?.project?.id ??
    payload?.project_id ??
    payload?.object_attributes?.target_project_id ??
    payload?.object_attributes?.source_project_id ??
    null;

  if (normalizedEventType === 'push hook') {
    const ref = payload?.ref ?? '';
    const after = payload?.after ?? payload?.checkout_sha ?? '';
    return `gitlab:push:${projectId ?? 'unknown'}:${ref}:${after}`;
  }

  if (normalizedEventType === 'merge request hook') {
    const mrId = payload?.object_attributes?.id ?? payload?.object_attributes?.iid ?? '';
    const lastCommitId =
      payload?.object_attributes?.last_commit?.id ??
      payload?.object_attributes?.last_commit?.sha ??
      '';
    const action = payload?.object_attributes?.action ?? payload?.object_attributes?.state ?? '';
    return `gitlab:mr:${projectId ?? 'unknown'}:${mrId}:${lastCommitId}:${action}`;
  }

  const objId =
    payload?.object_attributes?.id ??
    payload?.object_attributes?.iid ??
    payload?.checkout_sha ??
    payload?.after ??
    '';

  return `gitlab:${safeEventType}:${projectId ?? 'unknown'}:${objId}`;
}

function computeEventKey(eventType: string, deliveryId: string | undefined, payload: any): string {
  if (deliveryId && deliveryId.trim()) {
    return `gitlab:${deliveryId.trim()}`;
  }
  return computeFallbackEventKey(eventType, payload);
}

async function resolveIssueUuidByKey(issueKey: string): Promise<string | null> {
  const match = /^([A-Z][A-Z0-9]{1,10})-(\d{1,10})$/.exec(issueKey);
  if (!match) return null;

  const prefix = match[1].toUpperCase();
  const num = Number(match[2]);
  if (!Number.isFinite(num)) return null;

  const rows = await sql<{ uuid: string }[]>`
    SELECT i.uuid
    FROM server.issues i
    JOIN server.projects p ON p.uuid = i.project_uuid
    WHERE p.short_name = ${prefix}
      AND i.num = ${num}
      AND i.deleted_at IS NULL
    LIMIT 1
  `;

  return rows?.[0]?.uuid ?? null;
}

function extractRelevantTexts(eventType: string, payload: any): string[] {
  const normalizedEventType = (eventType || '').trim().toLowerCase();

  if (normalizedEventType === 'push hook') {
    const ref = typeof payload?.ref === 'string' ? payload.ref : undefined;
    const branch = ref ? normalizeBranchFromRef(ref) : undefined;

    const commitMessages: Array<string | undefined> = Array.isArray(payload?.commits)
      ? payload.commits.map((c: any) => (typeof c?.message === 'string' ? c.message : undefined))
      : [];

    return extractIssueKeysFromTexts([ref, branch, ...commitMessages]);
  }

  if (normalizedEventType === 'merge request hook') {
    const oa = payload?.object_attributes ?? {};
    const sourceBranch = typeof oa?.source_branch === 'string' ? oa.source_branch : undefined;
    const title = typeof oa?.title === 'string' ? oa.title : undefined;
    const description = typeof oa?.description === 'string' ? oa.description : undefined;

    return extractIssueKeysFromTexts([sourceBranch, title, description]);
  }

  // Unsupported event types for MVP: we still try to parse (might be useful), but won't fail the request.
  const asText = (() => {
    try {
      return typeof payload === 'string' ? payload : JSON.stringify(payload);
    } catch {
      return undefined;
    }
  })();
  return extractIssueKeysFromTexts([asText]);
}

function extractProjectId(eventType: string, payload: any): number | null {
  const normalizedEventType = (eventType || '').trim().toLowerCase();

  const projectId =
    payload?.project?.id ??
    payload?.project_id ??
    payload?.object_attributes?.target_project_id ??
    payload?.object_attributes?.source_project_id ??
    null;

  if (typeof projectId === 'number' && Number.isFinite(projectId)) return projectId;
  if (typeof projectId === 'string' && projectId.trim() && Number.isFinite(Number(projectId))) {
    return Number(projectId);
  }

  // Some payloads might put id elsewhere; MVP: best-effort only
  return null;
}

function extractRef(eventType: string, payload: any): string | null {
  const normalizedEventType = (eventType || '').trim().toLowerCase();

  if (normalizedEventType === 'push hook') {
    if (typeof payload?.ref === 'string') return normalizeBranchFromRef(payload.ref);
    return null;
  }

  if (normalizedEventType === 'merge request hook') {
    const oa = payload?.object_attributes ?? {};
    if (typeof oa?.source_branch === 'string') return oa.source_branch;
    return null;
  }

  if (typeof payload?.ref === 'string') return payload.ref;
  return null;
}

export function registerGitlabWebhook(app: express.Express) {
  const path = process.env.GITLAB_WEBHOOK_PATH || DEFAULT_WEBHOOK_PATH;
  const token = process.env.GITLAB_WEBHOOK_TOKEN;

  logger.info({
    msg: 'Registering GitLab webhook handler',
    path,
    enabled: Boolean(token)
  });

  app.post(path, async (req: any, res: any) => {
    try {
      if (!token) {
        logger.warn({
          msg: 'GitLab webhook received but GITLAB_WEBHOOK_TOKEN is not configured',
          path
        });
        return res.status(503).send({ error: 'GitLab webhook is not configured' });
      }

      const providedToken = req.get('X-Gitlab-Token');
      if (providedToken !== token) {
        logger.warn({
          msg: 'GitLab webhook rejected: invalid token',
          path
        });
        return res.status(401).send('Invalid token');
      }

      const eventType: string = req.get('X-Gitlab-Event') || 'unknown';
      const deliveryId: string | undefined =
        req.get('X-Gitlab-Event-UUID') || req.get('X-Gitlab-Delivery') || undefined;

      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        logger.warn({
          msg: 'GitLab webhook rejected: invalid JSON payload',
          eventType
        });
        return res.status(400).send({ error: 'Invalid JSON payload' });
      }

      const eventKey = computeEventKey(eventType, deliveryId, payload);
      const projectId = extractProjectId(eventType, payload);
      const ref = extractRef(eventType, payload);

      const issueKeys = extractRelevantTexts(eventType, payload);

      const payloadJson = (() => {
        try {
          return JSON.stringify(payload);
        } catch (e: any) {
          logger.error({
            msg: 'Failed to serialize GitLab payload',
            eventType,
            eventKey,
            error: e?.message
          });
          return '{}';
        }
      })();

      const newEventUuid = uuidv4();
      const eventRows = await sql<{ uuid: string; inserted: boolean }[]>`
        INSERT INTO server.gitlab_events
          (uuid, event_key, event_type, delivery_id, project_id, ref, payload)
        VALUES
          (${newEventUuid}, ${eventKey}, ${eventType}, ${deliveryId ?? null}, ${projectId ?? null}, ${ref ?? null}, ${payloadJson}::jsonb)
        ON CONFLICT (event_key) DO UPDATE
          SET updated_at = now()
        RETURNING uuid, (xmax = 0) AS inserted
      `;

      const storedEventUuid = eventRows?.[0]?.uuid;
      const inserted = Boolean(eventRows?.[0]?.inserted);

      if (!storedEventUuid) {
        logger.error({
          msg: 'Failed to persist GitLab event (no uuid returned)',
          eventType,
          eventKey
        });
        return res.status(500).send({ error: 'Failed to persist webhook event' });
      }

      let linked = 0;
      let notFound = 0;

      for (const issueKey of issueKeys) {
        const issueUuid = await resolveIssueUuidByKey(issueKey);
        if (!issueUuid) {
          notFound++;
          logger.debug({
            msg: 'Issue key not found in DB (skipping link)',
            issueKey,
            eventKey
          });
          continue;
        }

        const linkInsert = await sql<{ ok: number }[]>`
          INSERT INTO server.gitlab_events_to_issues
            (event_uuid, issue_uuid, issue_key)
          VALUES
            (${storedEventUuid}, ${issueUuid}, ${issueKey})
          ON CONFLICT (event_uuid, issue_uuid) DO NOTHING
          RETURNING 1 AS ok
        `;
        if (linkInsert.length > 0) linked++;
      }

      logger.info({
        msg: 'GitLab webhook processed',
        eventType,
        eventKey,
        deliveryId: deliveryId ?? null,
        projectId,
        ref,
        keys: issueKeys.length,
        linked,
        notFound,
        duplicate: !inserted
      });

      return res.status(200).send({
        status: 'ok',
        event_uuid: storedEventUuid,
        duplicate: !inserted,
        linked
      });
    } catch (e: any) {
      logger.error({
        msg: 'GitLab webhook handler failed',
        error: e?.message ?? e
      });
      return res.status(500).send({ error: 'Internal error' });
    }
  });
}

// Lightweight unit-test helpers (so we can validate parsing/idempotency logic without spinning the whole service)
export const __test__ = {
  normalizeBranchFromRef,
  extractIssueKeysFromTexts,
  computeFallbackEventKey,
  computeEventKey
};


