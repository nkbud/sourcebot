'use server';

import { prisma } from '@/prisma';
import { createLogger } from '@sourcebot/logger';
import { ServiceError } from '@/lib/serviceError';
import { ErrorCode } from '@/lib/errorCodes';
import { StatusCodes } from 'http-status-codes';

const logger = createLogger('audit-actions');

export interface AuditRecord {
  id: string;
  timestamp: Date;
  action: string;
  actorId: string;
  actorType: string;
  targetId: string;
  targetType: string;
  sourcebotVersion: string;
  metadata?: any;
}

export interface FetchAuditRecordsParams {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  action?: string;
  actorId?: string;
}

export interface FetchAuditRecordsResult {
  records: AuditRecord[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function fetchAuditRecords(
  domain: string,
  apiKey?: string,
  params: FetchAuditRecordsParams = {}
): Promise<FetchAuditRecordsResult | ServiceError> {
  try {
    logger.info(`Fetching audit records for domain: ${domain}`);

    // Find the organization by domain
    const org = await prisma.org.findFirst({
      where: { domain }
    });

    if (!org) {
      return {
        statusCode: StatusCodes.NOT_FOUND,
        errorCode: ErrorCode.NOT_FOUND,
        message: `Organization not found for domain: ${domain}`,
      };
    }

    // TODO: Add API key validation if needed
    // For now, we'll just log if an API key was provided
    if (apiKey) {
      logger.debug('API key provided for audit record fetch');
    }

    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      action,
      actorId
    } = params;

    // Build where clause
    const where: any = {
      orgId: org.id
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (action) {
      where.action = action;
    }

    if (actorId) {
      where.actorId = actorId;
    }

    // Get total count for pagination
    const totalCount = await prisma.audit.count({ where });

    // Fetch records with pagination
    const records = await prisma.audit.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        timestamp: true,
        action: true,
        actorId: true,
        actorType: true,
        targetId: true,
        targetType: true,
        sourcebotVersion: true,
        metadata: true,
      }
    });

    const hasMore = totalCount > page * limit;

    logger.info(`Retrieved ${records.length} audit records for org ${org.id} (${domain})`);

    return {
      records,
      totalCount,
      page,
      limit,
      hasMore
    };

  } catch (error) {
    logger.error(`Error fetching audit records for domain ${domain}:`, error);
    
    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to fetch audit records',
    };
  }
}