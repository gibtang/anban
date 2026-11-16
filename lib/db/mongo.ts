/**
 * MongoDB data layer for Cloudflare Workers.
 *
 * Replaces Prisma (Prisma cannot run on Workers: the query engine requires
 * Node and there is no MongoDB driver adapter).
 *
 * Contract (matches the Prisma schema in prisma/schema.prisma):
 * - Model names are collection names (no @@map anywhere).
 * - `_id` is a BSON ObjectId; all id/FK fields are surfaced as strings.
 * - `@db.ObjectId` FK fields are stored as ObjectId and every QUERY filters
 *   by ObjectId (Prisma parity). Legacy documents exist where a FK was
 *   stored as a plain string (e.g. old Agent.ownerId docs) — readers
 *   normalize both forms, writers always emit ObjectId.
 * - `@default(now())` and `@updatedAt` timestamps are set explicitly by
 *   write sites (the driver has no Prisma-style field magic).
 */
import {
  MongoClient,
  ObjectId,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type FindOptions,
  type OptionalUnlessRequiredId,
  type UpdateFilter,
  type WithId,
} from 'mongodb';

const globalForMongo = globalThis as unknown as {
  mongoClient?: MongoClient;
};

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function getMongoDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(url);
  }
  return globalForMongo.mongoClient.db();
}

/** Convert an app-level id string to a BSON ObjectId; throws on malformed ids. */
export function toId(id: string): ObjectId {
  if (!OBJECT_ID_RE.test(id)) {
    throw new Error(`Invalid id format: ${id}`);
  }
  return new ObjectId(id);
}

/** Convert an optional id string; undefined/null stays null, malformed throws. */
export function toIdOrNull(id: string | null | undefined): ObjectId | null {
  if (id === undefined || id === null || id === '') return null;
  return toId(id);
}

/** Normalize a stored id-ish value (ObjectId | string | nullish) to string | null. */
export function idStr(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return value.toString();
}

export { ObjectId };

/* ------------------------------------------------------------------ *
 * Document shapes (app level — ids are strings, missing → null)
 * ------------------------------------------------------------------ */

export interface UserDoc {
  id: string;
  firebaseUid: string;
  email: string | null;
  shareToken: string | null;
  onboardingCompleted: boolean;
  lastFeedSeenAt: Date | null;
  createdAt: Date;
}

export interface BoardDoc {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  favorited: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDoc {
  id: string;
  name: string;
  token: string;
  ownerId: string | null;
  approvalToken: string | null;
  approvalExpiresAt: Date | null;
  lastAccessAt: Date | null;
  createdAt: Date;
}

export interface ColumnDoc {
  id: string;
  name: string;
  position: number;
  boardId: string;
  createdAt: Date;
}

export interface CardDoc {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  boardId: string;
  tags: string[];
  agentId: string | null;
  blocked: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfigDoc {
  id: string;
  name: string;
  openClawId: string;
  description: string | null;
  model: string | null;
  enabled: boolean;
  ownerId: string;
}

export interface OpenClawConnectionDoc {
  id: string;
  gatewayUrl: string;
  apiKey: string | null;
  enabled: boolean;
  boardId: string;
}

export interface AuditLogDoc {
  id: string;
  userId: string | null;
  agentId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  timestamp: Date;
}

export interface CommentDoc {
  id: string;
  cardId: string;
  boardId: string;
  authorId: string | null;
  authorName: string;
  authorType: string;
  content: string;
  createdAt: Date;
}

export interface ActivityDoc {
  id: string;
  cardId: string;
  boardId: string;
  type: string;
  authorId: string | null;
  authorName: string;
  authorType: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

/* ------------------------------------------------------------------ *
 * Readers — normalize a stored document into its Doc shape.
 * Optional FK/scalar fields stored as undefined or null both surface
 * as null so JSON responses keep Prisma-era shapes.
 * ------------------------------------------------------------------ */

const str = (v: unknown): string | null => (v === undefined || v === null ? null : String(v));
const bool = (v: unknown, fallback: boolean): boolean =>
  v === undefined || v === null ? fallback : Boolean(v);

function mapUser(d: WithId<Document>): UserDoc {
  return {
    id: d._id.toString(),
    firebaseUid: String(d.firebaseUid),
    email: str(d.email),
    shareToken: str(d.shareToken),
    onboardingCompleted: bool(d.onboardingCompleted, false),
    lastFeedSeenAt: d.lastFeedSeenAt instanceof Date ? d.lastFeedSeenAt : null,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  };
}

function mapBoard(d: WithId<Document>): BoardDoc {
  return {
    id: d._id.toString(),
    name: String(d.name),
    description: str(d.description),
    ownerId: idStr(d.ownerId) as string,
    favorited: bool(d.favorited, false),
    archived: bool(d.archived, false),
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt : new Date(),
  };
}

function mapAgent(d: WithId<Document>): AgentDoc {
  return {
    id: d._id.toString(),
    name: String(d.name),
    token: String(d.token),
    ownerId: idStr(d.ownerId),
    approvalToken: str(d.approvalToken),
    approvalExpiresAt: d.approvalExpiresAt instanceof Date ? d.approvalExpiresAt : null,
    lastAccessAt: d.lastAccessAt instanceof Date ? d.lastAccessAt : null,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  };
}

function mapColumn(d: WithId<Document>): ColumnDoc {
  return {
    id: d._id.toString(),
    name: String(d.name),
    position: Number(d.position ?? 0),
    boardId: idStr(d.boardId) as string,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  };
}

function mapCard(d: WithId<Document>): CardDoc {
  return {
    id: d._id.toString(),
    title: String(d.title),
    description: str(d.description),
    position: Number(d.position ?? 0),
    columnId: idStr(d.columnId) as string,
    boardId: idStr(d.boardId) as string,
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    agentId: idStr(d.agentId),
    blocked: str(d.blocked),
    archived: bool(d.archived, false),
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt : new Date(),
  };
}

function mapAgentConfig(d: WithId<Document>): AgentConfigDoc {
  return {
    id: d._id.toString(),
    name: String(d.name),
    openClawId: String(d.openClawId),
    description: str(d.description),
    model: str(d.model),
    enabled: bool(d.enabled, true),
    ownerId: idStr(d.ownerId) as string,
  };
}

function mapOpenClawConnection(d: WithId<Document>): OpenClawConnectionDoc {
  return {
    id: d._id.toString(),
    gatewayUrl: String(d.gatewayUrl),
    apiKey: str(d.apiKey),
    enabled: bool(d.enabled, true),
    boardId: idStr(d.boardId) as string,
  };
}

function mapAuditLog(d: WithId<Document>): AuditLogDoc {
  return {
    id: d._id.toString(),
    userId: idStr(d.userId),
    agentId: idStr(d.agentId),
    action: String(d.action),
    entityType: String(d.entityType),
    entityId: String(d.entityId),
    oldValues: (d.oldValues as Record<string, unknown>) ?? null,
    newValues: (d.newValues as Record<string, unknown>) ?? null,
    timestamp: d.timestamp instanceof Date ? d.timestamp : new Date(),
  };
}

function mapComment(d: WithId<Document>): CommentDoc {
  return {
    id: d._id.toString(),
    cardId: idStr(d.cardId) as string,
    boardId: idStr(d.boardId) as string,
    authorId: idStr(d.authorId),
    authorName: String(d.authorName),
    authorType: String(d.authorType ?? 'agent'),
    content: String(d.content),
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  };
}

function mapActivity(d: WithId<Document>): ActivityDoc {
  return {
    id: d._id.toString(),
    cardId: idStr(d.cardId) as string,
    boardId: idStr(d.boardId) as string,
    type: String(d.type),
    authorId: idStr(d.authorId),
    authorName: String(d.authorName),
    authorType: String(d.authorType ?? 'system'),
    details: (d.details as Record<string, unknown>) ?? null,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(),
  };
}

/* ------------------------------------------------------------------ *
 * Collection accessors — thin typed wrappers that apply the mappers.
 * ------------------------------------------------------------------ */

export interface FindManyOptions extends FindOptions {
  /** Convenience limit (FindOptions.limit also works). */
}

export interface MappedCollection<Doc> {
  /** Escape hatch for driver operations the wrapper does not cover (deleteMany, updateMany, ...). */
  raw(): Collection;
  findOne(filter: Filter<Document>, options?: FindOptions): Promise<Doc | null>;
  find(filter: Filter<Document>, options?: FindOptions): Promise<Doc[]>;
  count(filter: Filter<Document>): Promise<number>;
  insertOne(doc: OptionalUnlessRequiredId<Document>): Promise<string>;
  updateOne(filter: Filter<Document>, update: UpdateFilter<Document>): Promise<boolean>;
  deleteOne(filter: Filter<Document>): Promise<boolean>;
}

function mapped<Doc>(name: string, map: (d: WithId<Document>) => Doc): MappedCollection<Doc> {
  // Lazy: route modules import this module at build time without env vars.
  const raw = () => getMongoDb().collection(name) as Collection;
  return {
    raw,
    async findOne(filter, options) {
      // Driver guarantees `_id` on retrieved docs; its type doesn't.
      const d = (await raw().findOne(filter, options)) as WithId<Document> | null;
      return d ? map(d) : null;
    },
    async find(filter, options) {
      const docs = await raw().find(filter, options).toArray();
      return docs.map(map);
    },
    async count(filter) {
      return raw().countDocuments(filter);
    },
    async insertOne(doc: OptionalUnlessRequiredId<Document>) {
      const res = await raw().insertOne(doc);
      return res.insertedId.toString();
    },
    async updateOne(filter, update) {
      const res = await raw().updateOne(filter, update);
      return res.matchedCount > 0;
    },
    async deleteOne(filter) {
      const res = await raw().deleteOne(filter);
      return res.deletedCount > 0;
    },
  };
}

export const users = mapped<UserDoc>('User', mapUser);
export const boards = mapped<BoardDoc>('Board', mapBoard);
export const agents = mapped<AgentDoc>('Agent', mapAgent);
export const columns = mapped<ColumnDoc>('Column', mapColumn);
export const cards = mapped<CardDoc>('Card', mapCard);
export const agentConfigs = mapped<AgentConfigDoc>('AgentConfig', mapAgentConfig);
export const openClawConnections = mapped<OpenClawConnectionDoc>('OpenClawConnection', mapOpenClawConnection);
export const auditLogs = mapped<AuditLogDoc>('AuditLog', mapAuditLog);
export const comments = mapped<CommentDoc>('Comment', mapComment);
export const activities = mapped<ActivityDoc>('Activity', mapActivity);
