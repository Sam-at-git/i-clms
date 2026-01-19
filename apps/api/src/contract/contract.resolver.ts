import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { ContractService } from './contract.service';
import { Contract, ContractConnection } from './models';
import {
  CreateContractInput,
  UpdateContractInput,
  ContractFilterInput,
  ContractOrderInput,
  DuplicateCheckResult,
} from './dto';

@Resolver(() => Contract)
export class ContractResolver {
  constructor(private readonly contractService: ContractService) {}

  @Query(() => ContractConnection, {
    description: 'Get paginated list of contracts',
  })
  async contracts(
    @Args('filter', { nullable: true }) filter?: ContractFilterInput,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip?: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take?: number,
    @Args('orderBy', { nullable: true }) orderBy?: ContractOrderInput
  ): Promise<ContractConnection> {
    return this.contractService.findAll(filter, skip, take, orderBy);
  }

  @Query(() => Contract, {
    nullable: true,
    description: 'Get a single contract by ID',
  })
  async contract(
    @Args('id', { type: () => ID }) id: string
  ): Promise<Contract | null> {
    return this.contractService.findOne(id);
  }

  @Query(() => Contract, {
    nullable: true,
    description: 'Get a contract by contract number',
  })
  async contractByNo(
    @Args('contractNo') contractNo: string
  ): Promise<Contract | null> {
    return this.contractService.findByContractNo(contractNo);
  }

  @Query(() => DuplicateCheckResult, {
    description: 'Check if a contract number already exists',
  })
  async checkContractDuplicate(
    @Args('contractNo') contractNo: string
  ): Promise<DuplicateCheckResult> {
    return this.contractService.checkDuplicate(contractNo);
  }

  @Mutation(() => Contract, { description: 'Create a new contract' })
  async createContract(
    @Args('input') input: CreateContractInput
  ): Promise<Contract> {
    return this.contractService.create(input);
  }

  @Mutation(() => Contract, {
    description: 'Create a new contract or update existing one if duplicate',
  })
  async createOrUpdateContract(
    @Args('input') input: CreateContractInput,
    @Args('forceUpdate', { type: () => Boolean, nullable: true, defaultValue: false })
    forceUpdate?: boolean,
    @Args('operatorId', { type: () => ID, nullable: true })
    operatorId?: string
  ): Promise<Contract> {
    return this.contractService.createOrUpdate(input, { forceUpdate, operatorId });
  }

  @Mutation(() => Contract, { description: 'Update an existing contract' })
  async updateContract(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateContractInput
  ): Promise<Contract> {
    return this.contractService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete a contract' })
  async deleteContract(
    @Args('id', { type: () => ID }) id: string
  ): Promise<boolean> {
    return this.contractService.delete(id);
  }
}
