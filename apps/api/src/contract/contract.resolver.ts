import { Resolver, Query, Mutation, Args, Int, ID, registerEnumType } from '@nestjs/graphql';
import { ContractService } from './contract.service';
import { ContractVectorizationService, VectorizationMethod } from './contract-vectorization.service';
import { Contract, ContractConnection } from './models';
import {
  CreateContractInput,
  UpdateContractInput,
  ContractFilterInput,
  ContractOrderInput,
  DuplicateCheckResult,
  VectorizationResult,
  BatchVectorizationResult,
  CanVectorizeResult,
} from './dto';

// Register VectorizationMethod enum for GraphQL
registerEnumType(VectorizationMethod, {
  name: 'VectorizationMethod',
  description: 'Method used for contract vectorization',
});

@Resolver(() => Contract)
export class ContractResolver {
  constructor(
    private readonly contractService: ContractService,
    private readonly vectorizationService: ContractVectorizationService,
  ) {}

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
    // 先清理向量化数据
    await this.vectorizationService.removeVectorization(id);
    // 再删除合同记录
    return this.contractService.delete(id);
  }

  // ================================
  // 向量化相关 API
  // ================================

  @Mutation(() => VectorizationResult, {
    description: 'Vectorize a contract for RAG search',
  })
  async vectorizeContract(
    @Args('id', { type: () => ID }) id: string,
    @Args('method', { type: () => String, nullable: true, defaultValue: 'MANUAL' })
    method?: VectorizationMethod,
    @Args('force', { type: () => Boolean, nullable: true, defaultValue: false })
    force?: boolean
  ): Promise<VectorizationResult> {
    return this.vectorizationService.vectorizeContract(
      id,
      method || VectorizationMethod.MANUAL,
      force
    );
  }

  @Mutation(() => BatchVectorizationResult, {
    description: 'Vectorize multiple contracts',
  })
  async batchVectorizeContracts(
    @Args('ids', { type: () => [ID] }) ids: string[],
    @Args('method', { type: () => String, nullable: true, defaultValue: 'MANUAL' })
    method?: VectorizationMethod,
    @Args('force', { type: () => Boolean, nullable: true, defaultValue: false })
    force?: boolean
  ): Promise<BatchVectorizationResult> {
    return this.vectorizationService.batchVectorizeContracts(
      ids,
      method || VectorizationMethod.MANUAL,
      force
    );
  }

  @Mutation(() => Boolean, {
    description: 'Remove vectorization data from a contract',
  })
  async removeContractVectorization(
    @Args('id', { type: () => ID }) id: string
  ): Promise<boolean> {
    return this.vectorizationService.removeVectorization(id);
  }

  @Query(() => CanVectorizeResult, {
    description: 'Check if a contract can be vectorized',
  })
  async canVectorizeContract(
    @Args('id', { type: () => ID }) id: string
  ): Promise<CanVectorizeResult> {
    return this.vectorizationService.canVectorize(id);
  }
}
