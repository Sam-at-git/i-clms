import { Injectable } from '@nestjs/common';
import {
  CONTRACT_FIELD_CONFIGS,
  ContractFieldConfig,
  getFieldConfig,
  getDisplayName,
  getRagSupportedFields,
  getFieldsByGroup,
  getFieldRagQuery,
  getFieldConservativeThreshold,
  isRagSupported,
  FieldGroup,
} from '@i-clms/shared';
import { FieldMetadataDto } from './dto/field-metadata.dto';

/**
 * 字段元数据服务
 * 使用共享的字段配置，为前后端提供统一的字段信息
 */
@Injectable()
export class FieldMetadataService {
  /**
   * 获取所有字段配置
   */
  getAllFieldConfigs(): FieldMetadataDto[] {
    return CONTRACT_FIELD_CONFIGS.map(this.toDto);
  }

  /**
   * 获取所有支持RAG修正的字段
   */
  getRagSupportedFields(): FieldMetadataDto[] {
    return getRagSupportedFields().map(this.toDto);
  }

  /**
   * 根据字段名获取配置
   */
  getFieldConfig(fieldName: string): ContractFieldConfig | undefined {
    return getFieldConfig(fieldName);
  }

  /**
   * 获取字段显示名称
   */
  getDisplayName(fieldName: string): string {
    return getDisplayName(fieldName);
  }

  /**
   * 获取字段的RAG查询模板
   */
  getRagQuery(fieldName: string): string | undefined {
    return getFieldRagQuery(fieldName);
  }

  /**
   * 获取字段的保守阈值
   */
  getConservativeThreshold(fieldName: string): number {
    return getFieldConservativeThreshold(fieldName);
  }

  /**
   * 检查字段是否支持RAG修正
   */
  isRagSupported(fieldName: string): boolean {
    return isRagSupported(fieldName);
  }

  /**
   * 根据分组获取字段
   */
  getFieldsByGroup(group: FieldGroup): FieldMetadataDto[] {
    return getFieldsByGroup(group).map(this.toDto);
  }

  /**
   * 将配置转换为DTO
   */
  private toDto(config: ContractFieldConfig): FieldMetadataDto {
    return {
      fieldName: config.fieldName,
      displayName: config.displayName,
      fieldType: config.fieldType,
      group: config.group,
      editable: config.editable,
      ragSupported: config.ragSupported,
      ragQuery: config.ragQuery,
      conservativeThreshold: config.conservativeThreshold,
    };
  }
}
