import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { DeliveryService } from './delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let prismaService: DeepMockProxy<PrismaClient>;

  const mockDecimal = (value: number) => ({
    toString: () => value.toString(),
  });

  const mockCustomer = {
    id: 'customer-1',
    name: 'Test Customer',
  };

  const mockContract = {
    id: 'contract-1',
    contractNo: 'CT-2024-001',
    name: 'Test Project',
    type: 'PROJECT_OUTSOURCING',
    status: 'ACTIVE',
    customerId: 'customer-1',
    amountWithTax: mockDecimal(100000),
    effectiveAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-12-31'),
    customer: mockCustomer,
  };

  const mockStaffContract = {
    id: 'staff-1',
    contractNo: 'ST-2024-001',
    type: 'STAFF_AUGMENTATION',
    status: 'ACTIVE',
    amountWithTax: mockDecimal(120000),
    effectiveAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-12-31'),
    staffAugmentation: {
      id: 'sa-1',
      contractId: 'staff-1',
      monthlyHoursCap: 160,
      rateItems: [
        {
          id: 'rate-1',
          detailId: 'sa-1',
          role: 'Senior Developer',
          rate: mockDecimal(800),
          quantity: 1,
        },
      ],
    },
  };

  const mockMilestone = {
    id: 'milestone-1',
    name: 'Phase 1 Delivery',
    detailId: 'detail-1',
    plannedDate: new Date('2024-02-01'),
    actualDate: null,
    status: 'PENDING',
    amount: mockDecimal(50000),
    detail: {
      contract: {
        contractNo: 'CT-2024-001',
        customer: {
          name: 'Test Customer',
        },
      },
    },
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectOverview', () => {
    it('should return project overview statistics', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockContract] as any);

      const result = await service.getProjectOverview();

      expect(result).toBeDefined();
      expect(result.totalProjects).toBe(1);
      expect(result.byStatus).toBeDefined();
      expect(result.byCustomer).toBeDefined();
      expect(result.completionRate).toBeDefined();
    });

    it('should count projects by status correctly', async () => {
      const contracts = [
        { ...mockContract, status: 'ACTIVE' },
        { ...mockContract, id: 'contract-2', status: 'ACTIVE' },
        { ...mockContract, id: 'contract-3', status: 'COMPLETED' },
        { ...mockContract, id: 'contract-4', status: 'DRAFT' },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getProjectOverview();

      expect(result.byStatus).toHaveLength(3);
      expect(result.byStatus.find((s) => s.status === 'ACTIVE')?.count).toBe(2);
      expect(result.byStatus.find((s) => s.status === 'COMPLETED')?.count).toBe(1);
      expect(result.byStatus.find((s) => s.status === 'DRAFT')?.count).toBe(1);
    });

    it('should group projects by customer', async () => {
      const contracts = [
        mockContract,
        { ...mockContract, id: 'contract-2', customerId: 'customer-2', customer: { name: 'Customer 2' } },
        { ...mockContract, id: 'contract-3', status: 'COMPLETED' },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getProjectOverview();

      expect(result.byCustomer).toHaveLength(2);
      expect(result.byCustomer[0]).toMatchObject({
        customerId: expect.any(String),
        customerName: expect.any(String),
        projectCount: expect.any(Number),
        activeCount: expect.any(Number),
      });
    });

    it('should calculate completion rate correctly', async () => {
      const contracts = [
        { ...mockContract, status: 'COMPLETED' },
        { ...mockContract, id: 'contract-2', status: 'COMPLETED' },
        { ...mockContract, id: 'contract-3', status: 'ACTIVE' },
        { ...mockContract, id: 'contract-4', status: 'ACTIVE' },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getProjectOverview();

      expect(result.completionRate).toBe(50); // 2 out of 4 completed
    });

    it('should count active projects correctly', async () => {
      const contracts = [
        { ...mockContract, status: 'ACTIVE' },
        { ...mockContract, id: 'contract-2', status: 'EXECUTING' },
        { ...mockContract, id: 'contract-3', status: 'COMPLETED' },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getProjectOverview();

      expect(result.byCustomer[0].activeCount).toBe(2);
    });

    it('should return zero completion rate when no projects', async () => {
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getProjectOverview();

      expect(result.totalProjects).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should handle projects without customer info', async () => {
      const contract = { ...mockContract, customer: { name: 'Unknown Customer' } };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getProjectOverview();

      expect(result.byCustomer[0].customerName).toBe('Unknown Customer');
    });
  });

  describe('getMilestoneOverview', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return milestone overview', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([mockMilestone] as any);

      const result = await service.getMilestoneOverview();

      expect(result).toBeDefined();
      expect(result.totalMilestones).toBe(1);
      expect(result.completedCount).toBe(0);
      expect(result.pendingCount).toBe(1);
    });

    it('should count completed milestones', async () => {
      const milestones = [
        { ...mockMilestone, status: 'ACCEPTED' },
        { ...mockMilestone, id: 'milestone-2', status: 'ACCEPTED' },
        { ...mockMilestone, id: 'milestone-3', status: 'PENDING' },
      ];
      prismaService.projectMilestone.findMany.mockResolvedValue(milestones as any);

      const result = await service.getMilestoneOverview();

      expect(result.completedCount).toBe(2);
      expect(result.pendingCount).toBe(1);
    });

    it('should identify overdue milestones', async () => {
      const overdueMilestone = {
        ...mockMilestone,
        plannedDate: new Date('2024-01-01'),
        status: 'PENDING',
      };
      prismaService.projectMilestone.findMany.mockResolvedValue([overdueMilestone] as any);

      const result = await service.getMilestoneOverview();

      expect(result.overdueCount).toBe(1);
      expect(result.overdueMilestones).toHaveLength(1);
      expect(result.overdueMilestones[0].daysOverdue).toBeGreaterThan(0);
    });

    it('should identify upcoming milestones', async () => {
      const upcomingMilestone = {
        ...mockMilestone,
        plannedDate: new Date('2024-04-01'),
        status: 'PENDING',
      };
      prismaService.projectMilestone.findMany.mockResolvedValue([upcomingMilestone] as any);

      const result = await service.getMilestoneOverview();

      expect(result.upcomingMilestones).toHaveLength(1);
      expect(result.upcomingMilestones[0].daysOverdue).toBeNull();
    });

    it('should sort overdue milestones by days overdue descending', async () => {
      const milestones = [
        { ...mockMilestone, id: 'm1', plannedDate: new Date('2024-02-15'), status: 'PENDING' },
        { ...mockMilestone, id: 'm2', plannedDate: new Date('2024-01-01'), status: 'PENDING' },
        { ...mockMilestone, id: 'm3', plannedDate: new Date('2024-02-01'), status: 'PENDING' },
      ];
      prismaService.projectMilestone.findMany.mockResolvedValue(milestones as any);

      const result = await service.getMilestoneOverview();

      expect(result.overdueMilestones[0].daysOverdue).toBeGreaterThan(
        result.overdueMilestones[1].daysOverdue || 0
      );
    });

    it('should limit upcoming milestones to 10', async () => {
      const milestones = Array.from({ length: 15 }, (_, i) => ({
        ...mockMilestone,
        id: `milestone-${i}`,
        plannedDate: new Date(`2024-04-${String(i + 1).padStart(2, '0')}`),
      }));
      prismaService.projectMilestone.findMany.mockResolvedValue(milestones as any);

      const result = await service.getMilestoneOverview();

      expect(result.upcomingMilestones.length).toBeLessThanOrEqual(10);
    });

    it('should not include accepted milestones in overdue', async () => {
      const milestone = {
        ...mockMilestone,
        plannedDate: new Date('2024-01-01'),
        status: 'ACCEPTED',
      };
      prismaService.projectMilestone.findMany.mockResolvedValue([milestone] as any);

      const result = await service.getMilestoneOverview();

      expect(result.overdueCount).toBe(0);
      expect(result.completedCount).toBe(1);
    });

    it('should handle milestones without planned date', async () => {
      const milestone = { ...mockMilestone, plannedDate: null };
      prismaService.projectMilestone.findMany.mockResolvedValue([milestone] as any);

      const result = await service.getMilestoneOverview();

      expect(result.overdueCount).toBe(0);
      expect(result.upcomingMilestones).toHaveLength(0);
    });
  });

  describe('getResourceUtilization', () => {
    it('should return resource utilization overview', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockStaffContract] as any);

      const result = await service.getResourceUtilization();

      expect(result).toBeDefined();
      expect(result.totalStaffContracts).toBe(1);
      expect(result.byRole).toBeDefined();
      expect(result.monthlyTrend).toBeDefined();
    });

    it('should group resources by role', async () => {
      const contracts = [
        mockStaffContract,
        {
          ...mockStaffContract,
          id: 'staff-2',
          staffAugmentation: {
            id: 'sa-2',
            contractId: 'staff-2',
            monthlyHoursCap: 160,
            rateItems: [
              {
                id: 'rate-2',
                detailId: 'sa-2',
                role: 'Junior Developer',
                rate: mockDecimal(500),
                quantity: 1,
              },
            ],
          },
        },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getResourceUtilization();

      expect(result.byRole).toHaveLength(2);
      expect(result.byRole.find((r) => r.role === 'Senior Developer')).toBeDefined();
      expect(result.byRole.find((r) => r.role === 'Junior Developer')).toBeDefined();
    });

    it('should calculate total value by role', async () => {
      const contract = {
        ...mockStaffContract,
        staffAugmentation: {
          id: 'sa-1',
          contractId: 'staff-1',
          monthlyHoursCap: 160,
          rateItems: [
            {
              id: 'rate-1',
              detailId: 'sa-1',
              role: 'Senior Developer',
              rate: mockDecimal(800),
              quantity: 1,
            },
            {
              id: 'rate-2',
              detailId: 'sa-1',
              role: 'Senior Developer',
              rate: mockDecimal(750),
              quantity: 1,
            },
          ],
        },
      };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getResourceUtilization();

      const seniorDev = result.byRole.find((r) => r.role === 'Senior Developer');
      expect(seniorDev?.count).toBe(2);
      expect(seniorDev?.totalValue).toBe(1550);
    });

    it('should generate monthly trend for last 6 months', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockStaffContract] as any);

      const result = await service.getResourceUtilization();

      expect(result.monthlyTrend).toHaveLength(6);
      expect(result.monthlyTrend[0].month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should calculate hours allocated per month', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));

      const contract = {
        ...mockStaffContract,
        effectiveAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-12-31'),
        staffAugmentation: {
          ...mockStaffContract.staffAugmentation,
          monthlyHoursCap: 160,
        },
      };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getResourceUtilization();

      expect(result.monthlyTrend.every((m) => m.hoursAllocated === 160)).toBe(true);

      jest.useRealTimers();
    });

    it('should handle contracts without staff augmentation details', async () => {
      const contract = { ...mockStaffContract, staffAugmentation: null };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getResourceUtilization();

      expect(result.byRole).toHaveLength(0);
    });

    it('should return zero when no staff contracts', async () => {
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getResourceUtilization();

      expect(result.totalStaffContracts).toBe(0);
      expect(result.byRole).toHaveLength(0);
    });

    it('should only include active contracts', async () => {
      const contracts = [
        mockStaffContract,
        { ...mockStaffContract, id: 'staff-2', status: 'COMPLETED' },
        { ...mockStaffContract, id: 'staff-3', status: 'DRAFT' },
      ];
      prismaService.contract.findMany.mockResolvedValue([mockStaffContract] as any);

      const result = await service.getResourceUtilization();

      expect(result.totalStaffContracts).toBe(1);
    });
  });

  // ==================== 里程碑状态管理测试 ====================

  describe('updateMilestoneStatus', () => {
    const mockUser = { id: 'user-1', name: 'Admin User' };
    const mockMilestoneWithHistory = {
      ...mockMilestone,
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update milestone status successfully', async () => {
      const mockUpdatedMilestone = {
        ...mockMilestoneWithHistory,
        status: 'IN_PROGRESS',
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'IN_PROGRESS' as any, notes: 'Started work' },
        mockUser.id
      );

      expect(result.status).toBe('IN_PROGRESS');
      expect(prismaService.projectMilestone.update).toHaveBeenCalled();
      expect(prismaService.milestoneStatusHistory.create).toHaveBeenCalledWith({
        data: {
          milestoneId: 'milestone-1',
          fromStatus: 'PENDING',
          toStatus: 'IN_PROGRESS',
          changedBy: mockUser.id,
          notes: 'Started work',
        },
      });
    });

    it('should set actualDate when status changes to DELIVERED', async () => {
      const mockDeliveredMilestone = {
        ...mockMilestoneWithHistory,
        status: 'DELIVERED',
        actualDate: new Date(),
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockDeliveredMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'DELIVERED' as any },
        mockUser.id
      );

      expect(prismaService.projectMilestone.update).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          actualDate: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when milestone not found', async () => {
      prismaService.projectMilestone.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMilestoneStatus(
          { id: 'non-existent', status: 'IN_PROGRESS' as any },
          mockUser.id
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for invalid status transition', async () => {
      const acceptedMilestone = { ...mockMilestone, status: 'ACCEPTED' };
      prismaService.projectMilestone.findUnique.mockResolvedValue(acceptedMilestone as any);

      await expect(
        service.updateMilestoneStatus(
          { id: 'milestone-1', status: 'PENDING' as any },
          mockUser.id
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadDeliverable', () => {
    const mockUser = { id: 'user-1', name: 'Admin User' };
    const mockMilestoneWithHistory = {
      ...mockMilestone,
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should upload deliverable and change status to DELIVERED', async () => {
      const mockUpdatedMilestone = {
        ...mockMilestoneWithHistory,
        status: 'DELIVERED',
        deliverableFileUrl: 'https://storage.example.com/file.pdf',
        deliverableFileName: 'deliverable.pdf',
        deliverableUploadedAt: new Date(),
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.uploadDeliverable(
        {
          milestoneId: 'milestone-1',
          fileUrl: 'https://storage.example.com/file.pdf',
          fileName: 'deliverable.pdf',
          description: 'Phase 1 deliverable',
        },
        mockUser.id
      );

      expect(result.status).toBe('DELIVERED');
      expect(result.deliverableFileUrl).toBe('https://storage.example.com/file.pdf');
      expect(result.deliverableFileName).toBe('deliverable.pdf');
      expect(prismaService.projectMilestone.update).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        data: {
          deliverableFileUrl: 'https://storage.example.com/file.pdf',
          deliverableFileName: 'deliverable.pdf',
          deliverableUploadedAt: expect.any(Date),
          status: 'DELIVERED',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when milestone not found', async () => {
      prismaService.projectMilestone.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadDeliverable(
          {
            milestoneId: 'non-existent',
            fileUrl: 'https://example.com/file.pdf',
            fileName: 'file.pdf',
          },
          mockUser.id
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptMilestone', () => {
    const mockUser = { id: 'user-1', name: 'Admin User' };
    const mockMilestoneWithHistory = {
      ...mockMilestone,
      status: 'DELIVERED',
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should accept delivered milestone successfully', async () => {
      const mockAcceptedMilestone = {
        ...mockMilestoneWithHistory,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: mockUser.id,
        rejectedAt: null,
        rejectedBy: null as string | null,
        rejectionReason: null as string | null,
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestoneWithHistory as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockAcceptedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.acceptMilestone(
        { id: 'milestone-1', notes: 'Looks good!' },
        mockUser.id
      );

      expect(result.status).toBe('ACCEPTED');
      expect(result.acceptedBy).toBe(mockUser.id);
      expect(result.acceptedAt).toBeDefined();
      expect(prismaService.projectMilestone.update).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        data: {
          status: 'ACCEPTED',
          acceptedAt: expect.any(Date),
          acceptedBy: mockUser.id,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        },
        include: expect.any(Object),
      });
    });

    it('should accept rejected milestone (re-accept)', async () => {
      const mockRejectedMilestone = {
        ...mockMilestoneWithHistory,
        status: 'REJECTED',
      };
      const mockAcceptedMilestone = {
        ...mockRejectedMilestone,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: mockUser.id,
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockRejectedMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockAcceptedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.acceptMilestone(
        { id: 'milestone-1', notes: 'Fixed issues, accepting' },
        mockUser.id
      );

      expect(result.status).toBe('ACCEPTED');
    });

    it('should throw ForbiddenException when milestone is not DELIVERED or REJECTED', async () => {
      const pendingMilestone = { ...mockMilestone, status: 'PENDING' };
      prismaService.projectMilestone.findUnique.mockResolvedValue(pendingMilestone as any);

      await expect(
        service.acceptMilestone({ id: 'milestone-1' }, mockUser.id)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rejectMilestone', () => {
    const mockUser = { id: 'user-1', name: 'Admin User' };
    const mockMilestoneWithHistory = {
      ...mockMilestone,
      status: 'DELIVERED',
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should reject delivered milestone successfully', async () => {
      const mockRejectedMilestone = {
        ...mockMilestoneWithHistory,
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: mockUser.id,
        rejectionReason: 'Missing requirements',
        acceptedAt: null as Date | null,
        acceptedBy: null as string | null,
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestoneWithHistory as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockRejectedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.rejectMilestone(
        { id: 'milestone-1', reason: 'Missing requirements' },
        mockUser.id
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectedBy).toBe(mockUser.id);
      expect(result.rejectionReason).toBe('Missing requirements');
      expect(prismaService.projectMilestone.update).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        data: {
          status: 'REJECTED',
          rejectedAt: expect.any(Date),
          rejectedBy: mockUser.id,
          rejectionReason: 'Missing requirements',
          acceptedAt: null,
          acceptedBy: null,
        },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when milestone is not DELIVERED', async () => {
      const pendingMilestone = { ...mockMilestone, status: 'PENDING' };
      prismaService.projectMilestone.findUnique.mockResolvedValue(pendingMilestone as any);

      await expect(
        service.rejectMilestone(
          { id: 'milestone-1', reason: 'Not ready' },
          mockUser.id
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMilestoneDetail', () => {
    it('should return milestone detail with status history', async () => {
      const mockMilestoneWithHistory = {
        ...mockMilestone,
        statusHistory: [
          {
            id: 'history-1',
            milestoneId: 'milestone-1',
            fromStatus: 'PENDING',
            toStatus: 'IN_PROGRESS',
            changedBy: 'user-1',
            changedAt: new Date(),
            notes: 'Started',
            user: { id: 'user-1', name: 'Admin User' },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestoneWithHistory as any);

      const result = await service.getMilestoneDetail('milestone-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('milestone-1');
      expect(result.statusHistory).toHaveLength(1);
      expect(result.statusHistory[0].changedByName).toBe('Admin User');
    });

    it('should throw NotFoundException when milestone not found', async () => {
      prismaService.projectMilestone.findUnique.mockResolvedValue(null);

      await expect(service.getMilestoneDetail('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getMilestoneStatusHistory', () => {
    it('should return status history for milestone', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          milestoneId: 'milestone-1',
          fromStatus: 'PENDING',
          toStatus: 'IN_PROGRESS',
          changedBy: 'user-1',
          changedAt: new Date(),
          notes: 'Started',
          user: { id: 'user-1', name: 'Admin User' },
        },
        {
          id: 'history-2',
          milestoneId: 'milestone-1',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'DELIVERED',
          changedBy: 'user-1',
          changedAt: new Date(),
          notes: 'Completed',
          user: { id: 'user-1', name: 'Admin User' },
        },
      ];

      prismaService.projectMilestone.findUnique.mockResolvedValue(mockMilestone as any);
      prismaService.milestoneStatusHistory.findMany.mockResolvedValue(mockHistory as any);

      const result = await service.getMilestoneStatusHistory('milestone-1');

      expect(result).toHaveLength(2);
      expect(result[0].changedByName).toBe('Admin User');
      expect(result[0].fromStatus).toBe('PENDING');
      expect(result[0].toStatus).toBe('IN_PROGRESS');
    });

    it('should throw NotFoundException when milestone not found', async () => {
      prismaService.projectMilestone.findUnique.mockResolvedValue(null);

      await expect(
        service.getMilestoneStatusHistory('non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isValidStatusTransition', () => {
    // Test via the updateMilestoneStatus method
    it('should allow PENDING to IN_PROGRESS transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'PENDING' };
      const mockUpdatedMilestone = { ...testMilestone, status: 'IN_PROGRESS', statusHistory: [], createdAt: new Date(), updatedAt: new Date() };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'IN_PROGRESS' as any },
        'user-1'
      );

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should allow PENDING to DELIVERED transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'PENDING' };
      const mockUpdatedMilestone = { ...testMilestone, status: 'DELIVERED', statusHistory: [], createdAt: new Date(), updatedAt: new Date() };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'DELIVERED' as any },
        'user-1'
      );

      expect(result.status).toBe('DELIVERED');
    });

    it('should allow DELIVERED to ACCEPTED transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'DELIVERED', statusHistory: [], createdAt: new Date(), updatedAt: new Date() };
      const mockUpdatedMilestone = { ...testMilestone, status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: 'user-1' };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'ACCEPTED' as any },
        'user-1'
      );

      expect(result.status).toBe('ACCEPTED');
    });

    it('should allow DELIVERED to REJECTED transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'DELIVERED', statusHistory: [], createdAt: new Date(), updatedAt: new Date() };
      const mockUpdatedMilestone = { ...testMilestone, status: 'REJECTED', rejectedAt: new Date(), rejectedBy: 'user-1', rejectionReason: 'Not good' };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'REJECTED' as any },
        'user-1'
      );

      expect(result.status).toBe('REJECTED');
    });

    it('should allow REJECTED to DELIVERED transition (re-deliver)', async () => {
      const testMilestone = { ...mockMilestone, status: 'REJECTED', statusHistory: [], createdAt: new Date(), updatedAt: new Date() };
      const mockUpdatedMilestone = { ...testMilestone, status: 'DELIVERED' };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);
      prismaService.projectMilestone.update.mockResolvedValue(mockUpdatedMilestone as any);
      prismaService.milestoneStatusHistory.create.mockResolvedValue({} as any);

      const result = await service.updateMilestoneStatus(
        { id: 'milestone-1', status: 'DELIVERED' as any },
        'user-1'
      );

      expect(result.status).toBe('DELIVERED');
    });

    it('should not allow ACCEPTED to any other transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'ACCEPTED' };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);

      await expect(
        service.updateMilestoneStatus(
          { id: 'milestone-1', status: 'PENDING' as any },
          'user-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow PENDING to ACCEPTED transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'PENDING' };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);

      await expect(
        service.updateMilestoneStatus(
          { id: 'milestone-1', status: 'ACCEPTED' as any },
          'user-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow PENDING to REJECTED transition', async () => {
      const testMilestone = { ...mockMilestone, status: 'PENDING' };

      prismaService.projectMilestone.findUnique.mockResolvedValue(testMilestone as any);

      await expect(
        service.updateMilestoneStatus(
          { id: 'milestone-1', status: 'REJECTED' as any },
          'user-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
