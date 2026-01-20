import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CustomerService } from './customer.service';
import {
  Customer,
  CustomerContact,
  CustomerStats,
  PaginatedCustomers,
} from './entities/customer.entity';
import {
  CreateCustomerInput,
  CreateContactInput,
} from './dto/create-customer.input';
import { UpdateCustomerInput, UpdateContactInput } from './dto/update-customer.input';
import { CustomerFilterInput } from './dto/customer-filter.input';

@Resolver(() => Customer)
@UseGuards(GqlAuthGuard, RolesGuard)
export class CustomerResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Query(() => PaginatedCustomers, { name: 'customers' })
  async getCustomers(
    @Args('filter', { type: () => CustomerFilterInput, nullable: true })
    filter?: CustomerFilterInput,
  ): Promise<PaginatedCustomers> {
    return this.customerService.findAll(filter);
  }

  @Query(() => Customer, { name: 'customer' })
  async getCustomer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.findOne(id);
  }

  @Query(() => CustomerStats, { name: 'customerStats' })
  async getCustomerStats(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomerStats> {
    return this.customerService.getCustomerStats(id);
  }

  @Query(() => [CustomerContact], { name: 'customerContacts' })
  async getCustomerContacts(
    @Args('customerId', { type: () => ID }) customerId: string,
  ): Promise<CustomerContact[]> {
    return this.customerService.getCustomerContacts(customerId);
  }

  @Mutation(() => Customer)
  async createCustomer(
    @Args('input') input: CreateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.create(input);
  }

  @Mutation(() => Customer)
  async updateCustomer(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.update(id, input);
  }

  @Mutation(() => Customer)
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async deleteCustomer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.delete(id);
  }

  @Mutation(() => CustomerContact)
  async addCustomerContact(
    @Args('customerId', { type: () => ID }) customerId: string,
    @Args('input') input: CreateContactInput,
  ): Promise<CustomerContact> {
    return this.customerService.addContact(customerId, input);
  }

  @Mutation(() => CustomerContact)
  async updateCustomerContact(
    @Args('contactId', { type: () => ID }) contactId: string,
    @Args('input') input: UpdateContactInput,
  ): Promise<CustomerContact> {
    return this.customerService.updateContact(contactId, input);
  }

  @Mutation(() => CustomerContact)
  async removeCustomerContact(
    @Args('contactId', { type: () => ID }) contactId: string,
  ): Promise<CustomerContact> {
    return this.customerService.removeContact(contactId);
  }

  @Mutation(() => CustomerContact)
  async setPrimaryContact(
    @Args('contactId', { type: () => ID }) contactId: string,
  ): Promise<CustomerContact> {
    return this.customerService.setPrimaryContact(contactId);
  }
}
