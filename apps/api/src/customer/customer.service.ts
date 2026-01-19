import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CustomerStatus, ContractStatus } from '@prisma/client';
import {
  CreateCustomerInput,
  CreateContactInput,
} from './dto/create-customer.input';
import { UpdateCustomerInput, UpdateContactInput } from './dto/update-customer.input';
import { CustomerFilterInput } from './dto/customer-filter.input';
import {
  Customer,
  CustomerContact,
  CustomerStats,
  PaginatedCustomers,
} from './entities/customer.entity';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: CustomerFilterInput): Promise<PaginatedCustomers> {
    const where: Prisma.CustomerWhereInput = {};

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { shortName: { contains: filter.search, mode: 'insensitive' } },
        { creditCode: { contains: filter.search } },
      ];
    }

    if (filter?.industry) {
      where.industry = filter.industry;
    }

    if (filter?.status) {
      where.status = filter.status as CustomerStatus;
    }

    const skip = filter?.skip || 0;
    const take = filter?.take || 20;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          contacts: true,
          contracts: { select: { id: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: items.map(this.mapToCustomer),
      total,
      hasMore: skip + items.length < total,
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        contracts: {
          include: { department: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.mapToCustomer(customer);
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    // Check credit code uniqueness
    if (input.creditCode) {
      const existing = await this.prisma.customer.findUnique({
        where: { creditCode: input.creditCode },
      });
      if (existing) {
        throw new ConflictException(
          'Customer with this credit code already exists',
        );
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: input.fullName,
        shortName: input.shortName,
        creditCode: input.creditCode,
        industry: input.industry,
        address: input.address,
        contacts: input.contacts
          ? {
              create: input.contacts.map((c) => ({
                name: c.name,
                title: c.title,
                phone: c.phone,
                email: c.email,
                isPrimary: c.isPrimary || false,
              })),
            }
          : undefined,
      },
      include: { contacts: true },
    });

    this.logger.log(`Created customer: ${customer.id} - ${customer.name}`);
    return this.mapToCustomer(customer);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    await this.findOne(id); // Ensure exists

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        name: input.fullName,
        shortName: input.shortName,
        industry: input.industry,
        address: input.address,
        status: input.status as CustomerStatus,
      },
      include: { contacts: true },
    });

    this.logger.log(`Updated customer: ${customer.id}`);
    return this.mapToCustomer(customer);
  }

  async delete(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        contracts: { select: { id: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Check for existing contracts
    if (customer.contracts?.length > 0) {
      throw new ConflictException(
        'Cannot delete customer with existing contracts',
      );
    }

    const deleted = await this.prisma.customer.delete({
      where: { id },
      include: { contacts: true },
    });

    this.logger.log(`Deleted customer: ${id}`);
    return this.mapToCustomer(deleted);
  }

  async getCustomerStats(id: string): Promise<CustomerStats> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contracts: {
          select: {
            id: true,
            amountWithTax: true,
            status: true,
            signedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const contracts = customer.contracts || [];
    const activeContracts = contracts.filter(
      (c) =>
        c.status === ContractStatus.ACTIVE ||
        c.status === ContractStatus.EXECUTING,
    );

    const totalValue = contracts.reduce(
      (sum, c) => sum + (c.amountWithTax?.toNumber() || 0),
      0,
    );

    const sortedByDate = [...contracts].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return {
      totalContracts: contracts.length,
      activeContracts: activeContracts.length,
      totalValue,
      averageContractValue:
        contracts.length > 0 ? totalValue / contracts.length : 0,
      firstContractDate: sortedByDate[0]?.createdAt || null,
      lastContractDate:
        sortedByDate[sortedByDate.length - 1]?.createdAt || null,
      lifetimeValueScore: this.calculateLifetimeValue(contracts),
      isActive: activeContracts.length > 0,
    };
  }

  private calculateLifetimeValue(
    contracts: Array<{
      amountWithTax: { toNumber(): number } | null;
      status: ContractStatus;
    }>,
  ): number {
    if (contracts.length === 0) return 0;

    const totalValue = contracts.reduce(
      (sum, c) => sum + (c.amountWithTax?.toNumber() || 0),
      0,
    );
    const activeCount = contracts.filter(
      (c) =>
        c.status === ContractStatus.ACTIVE ||
        c.status === ContractStatus.EXECUTING,
    ).length;
    const frequencyBonus = Math.min(contracts.length / 5, 2); // Up to 2x bonus

    return totalValue * (1 + activeCount * 0.1) * (1 + frequencyBonus * 0.1);
  }

  // Contact management
  async addContact(
    customerId: string,
    input: CreateContactInput,
  ): Promise<CustomerContact> {
    await this.findOne(customerId);

    if (input.isPrimary) {
      // Reset other primary contacts
      await this.prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.create({
      data: {
        customerId,
        name: input.name,
        title: input.title,
        phone: input.phone,
        email: input.email,
        isPrimary: input.isPrimary || false,
      },
    });

    this.logger.log(
      `Added contact ${contact.id} to customer ${customerId}`,
    );
    return this.mapToContact(contact);
  }

  async updateContact(
    contactId: string,
    input: UpdateContactInput,
  ): Promise<CustomerContact> {
    const contact = await this.prisma.customerContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    if (input.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: {
          customerId: contact.customerId,
          isPrimary: true,
          NOT: { id: contactId },
        },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.customerContact.update({
      where: { id: contactId },
      data: {
        name: input.name,
        title: input.title,
        phone: input.phone,
        email: input.email,
        isPrimary: input.isPrimary,
      },
    });

    this.logger.log(`Updated contact: ${contactId}`);
    return this.mapToContact(updated);
  }

  async removeContact(contactId: string): Promise<CustomerContact> {
    const contact = await this.prisma.customerContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const deleted = await this.prisma.customerContact.delete({
      where: { id: contactId },
    });

    this.logger.log(`Removed contact: ${contactId}`);
    return this.mapToContact(deleted);
  }

  private mapToCustomer = (customer: any): Customer => {
    return {
      ...customer,
      status: customer.status as any,
      contacts: customer.contacts?.map(this.mapToContact) || [],
    };
  };

  private mapToContact = (contact: any): CustomerContact => {
    return {
      id: contact.id,
      customerId: contact.customerId,
      name: contact.name,
      title: contact.title,
      phone: contact.phone,
      email: contact.email,
      isPrimary: contact.isPrimary,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  };
}
