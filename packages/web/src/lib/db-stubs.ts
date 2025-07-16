// Stub types for @sourcebot/db to allow building without Prisma

export type PrismaClient = any;

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum RepoIndexingStatus {
  PENDING = 'PENDING',
  INDEXING = 'INDEXING', 
  INDEXED = 'INDEXED',
  ERROR = 'ERROR'
}

export enum ConnectionSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED', 
  ERROR = 'ERROR'
}

export enum StripeSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
  UNPAID = 'UNPAID'
}

export type Prisma = any;

export type Org = {
  id: number;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiKey = {
  id: string;
  name: string;
  orgId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Repo = {
  id: number;
  name: string;
  orgId: number;
  connectionId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
};