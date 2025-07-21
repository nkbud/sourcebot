import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAuditRecords, FetchAuditRecordsParams } from '@/ee/features/audit/actions';
import { StatusCodes } from 'http-status-codes';
import { ErrorCode } from '@/lib/errorCodes';

// Mock the prisma client
vi.mock('@/prisma', () => ({
  prisma: {
    org: {
      findFirst: vi.fn(),
    },
    audit: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock the logger
vi.mock('@sourcebot/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('fetchAuditRecords', () => {
  let mockPrisma: any;
  
  beforeEach(async () => {
    mockPrisma = await import('@/prisma');
    vi.clearAllMocks();
  });

  it('should return NOT_FOUND error when organization does not exist', async () => {
    // Setup
    const domain = 'nonexistent.com';
    mockPrisma.prisma.org.findFirst.mockResolvedValue(null);

    // Execute
    const result = await fetchAuditRecords(domain);

    // Verify
    expect(result).toEqual({
      statusCode: StatusCodes.NOT_FOUND,
      errorCode: ErrorCode.NOT_FOUND,
      message: `Organization not found for domain: ${domain}`,
    });
    
    expect(mockPrisma.prisma.org.findFirst).toHaveBeenCalledWith({
      where: { domain }
    });
  });

  it('should return audit records successfully when organization exists', async () => {
    // Setup
    const domain = 'example.com';
    const mockOrg = { id: 1, name: 'Test Org', domain };
    const mockAuditRecords = [
      {
        id: 'audit_1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        action: 'user.performed_code_search',
        actorId: 'user_001',
        actorType: 'user',
        targetId: 'search_123',
        targetType: 'search',
        sourcebotVersion: '1.0.0',
        metadata: null,
      },
    ];
    
    mockPrisma.prisma.org.findFirst.mockResolvedValue(mockOrg);
    mockPrisma.prisma.audit.count.mockResolvedValue(1);
    mockPrisma.prisma.audit.findMany.mockResolvedValue(mockAuditRecords);

    // Execute
    const result = await fetchAuditRecords(domain);

    // Verify
    expect(result).toEqual({
      records: mockAuditRecords,
      totalCount: 1,
      page: 1,
      limit: 50,
      hasMore: false,
    });
    
    expect(mockPrisma.prisma.org.findFirst).toHaveBeenCalledWith({
      where: { domain }
    });
  });

  it('should handle pagination parameters correctly', async () => {
    // Setup
    const domain = 'example.com';
    const mockOrg = { id: 1, name: 'Test Org', domain };
    const params: FetchAuditRecordsParams = {
      page: 2,
      limit: 25,
    };
    
    mockPrisma.prisma.org.findFirst.mockResolvedValue(mockOrg);
    mockPrisma.prisma.audit.count.mockResolvedValue(100);
    mockPrisma.prisma.audit.findMany.mockResolvedValue([]);

    // Execute
    await fetchAuditRecords(domain, undefined, params);

    // Verify
    expect(mockPrisma.prisma.audit.findMany).toHaveBeenCalledWith({
      where: { orgId: mockOrg.id },
      orderBy: { timestamp: 'desc' },
      skip: 25, // (page - 1) * limit = (2 - 1) * 25
      take: 25,
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
  });

  it('should filter by action when provided', async () => {
    // Setup
    const domain = 'example.com';
    const mockOrg = { id: 1, name: 'Test Org', domain };
    const params: FetchAuditRecordsParams = {
      action: 'user.performed_code_search',
    };
    
    mockPrisma.prisma.org.findFirst.mockResolvedValue(mockOrg);
    mockPrisma.prisma.audit.count.mockResolvedValue(10);
    mockPrisma.prisma.audit.findMany.mockResolvedValue([]);

    // Execute
    await fetchAuditRecords(domain, undefined, params);

    // Verify
    expect(mockPrisma.prisma.audit.count).toHaveBeenCalledWith({
      where: {
        orgId: mockOrg.id,
        action: 'user.performed_code_search',
      }
    });
  });

  it('should filter by date range when provided', async () => {
    // Setup
    const domain = 'example.com';
    const mockOrg = { id: 1, name: 'Test Org', domain };
    const startDate = new Date('2024-01-01T00:00:00Z');
    const endDate = new Date('2024-01-31T23:59:59Z');
    const params: FetchAuditRecordsParams = {
      startDate,
      endDate,
    };
    
    mockPrisma.prisma.org.findFirst.mockResolvedValue(mockOrg);
    mockPrisma.prisma.audit.count.mockResolvedValue(5);
    mockPrisma.prisma.audit.findMany.mockResolvedValue([]);

    // Execute
    await fetchAuditRecords(domain, undefined, params);

    // Verify
    expect(mockPrisma.prisma.audit.count).toHaveBeenCalledWith({
      where: {
        orgId: mockOrg.id,
        timestamp: {
          gte: startDate,
          lte: endDate,
        }
      }
    });
  });

  it('should calculate hasMore correctly', async () => {
    // Setup
    const domain = 'example.com';
    const mockOrg = { id: 1, name: 'Test Org', domain };
    const params: FetchAuditRecordsParams = {
      page: 1,
      limit: 10,
    };
    
    mockPrisma.prisma.org.findFirst.mockResolvedValue(mockOrg);
    mockPrisma.prisma.audit.count.mockResolvedValue(25); // Total 25 records
    mockPrisma.prisma.audit.findMany.mockResolvedValue([]);

    // Execute
    const result = await fetchAuditRecords(domain, undefined, params);

    // Verify - hasMore should be true because 25 > (1 * 10)
    expect(result).toMatchObject({
      totalCount: 25,
      page: 1,
      limit: 10,
      hasMore: true,
    });
  });

  it('should handle database errors gracefully', async () => {
    // Setup
    const domain = 'example.com';
    mockPrisma.prisma.org.findFirst.mockRejectedValue(new Error('Database connection failed'));

    // Execute
    const result = await fetchAuditRecords(domain);

    // Verify
    expect(result).toEqual({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to fetch audit records',
    });
  });
});