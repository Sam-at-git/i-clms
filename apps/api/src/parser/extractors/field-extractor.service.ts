import { Injectable, Logger } from '@nestjs/common';
import {
  IdentificationExtractor,
  ContractIdentification,
} from './basic/identification.extractor';
import { PartiesExtractor, PartiesInfo } from './basic/parties.extractor';
import { TermExtractor, ContractTerm } from './basic/term.extractor';

export interface BasicExtractedFields {
  identification: ContractIdentification;
  parties: PartiesInfo;
  term: ContractTerm;
  extractionConfidence: number;
}

export interface ExtractionMetrics {
  identificationConfidence: number;
  partiesConfidence: number;
  termConfidence: number;
  overallConfidence: number;
  fieldsExtracted: number;
  totalFields: number;
}

@Injectable()
export class FieldExtractorService {
  private readonly logger = new Logger(FieldExtractorService.name);

  constructor(
    private readonly identificationExtractor: IdentificationExtractor,
    private readonly partiesExtractor: PartiesExtractor,
    private readonly termExtractor: TermExtractor,
  ) {}

  /**
   * Extract all basic fields from contract text
   */
  extractBasicFields(textContent: string): BasicExtractedFields {
    if (!textContent || textContent.trim().length === 0) {
      return this.getEmptyResult();
    }

    const startTime = Date.now();

    const identificationResult =
      this.identificationExtractor.extractWithConfidence(textContent);
    const partiesResult =
      this.partiesExtractor.extractWithConfidence(textContent);
    const termResult = this.termExtractor.extractWithConfidence(textContent);

    const overallConfidence = this.calculateOverallConfidence(
      identificationResult.confidence,
      partiesResult.confidence,
      termResult.confidence,
    );

    const elapsed = Date.now() - startTime;
    this.logger.debug(
      `Basic field extraction completed in ${elapsed}ms, confidence: ${(overallConfidence * 100).toFixed(1)}%`,
    );

    return {
      identification: identificationResult.data,
      parties: partiesResult.data,
      term: termResult.data,
      extractionConfidence: overallConfidence,
    };
  }

  /**
   * Extract fields with detailed metrics
   */
  extractWithMetrics(textContent: string): {
    data: BasicExtractedFields;
    metrics: ExtractionMetrics;
  } {
    const identificationResult =
      this.identificationExtractor.extractWithConfidence(textContent);
    const partiesResult =
      this.partiesExtractor.extractWithConfidence(textContent);
    const termResult = this.termExtractor.extractWithConfidence(textContent);

    const overallConfidence = this.calculateOverallConfidence(
      identificationResult.confidence,
      partiesResult.confidence,
      termResult.confidence,
    );

    const { fieldsExtracted, totalFields } = this.countFields({
      identification: identificationResult.data,
      parties: partiesResult.data,
      term: termResult.data,
      extractionConfidence: overallConfidence,
    });

    return {
      data: {
        identification: identificationResult.data,
        parties: partiesResult.data,
        term: termResult.data,
        extractionConfidence: overallConfidence,
      },
      metrics: {
        identificationConfidence: identificationResult.confidence,
        partiesConfidence: partiesResult.confidence,
        termConfidence: termResult.confidence,
        overallConfidence,
        fieldsExtracted,
        totalFields,
      },
    };
  }

  /**
   * Convert basic extracted fields to flat record for completeness checking
   */
  toFlatRecord(fields: BasicExtractedFields): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    // Identification fields
    if (fields.identification.contractNumber) {
      record.contractNumber = fields.identification.contractNumber;
    }
    if (fields.identification.contractTitle) {
      record.title = fields.identification.contractTitle;
    }
    if (fields.identification.contractType) {
      record.contractType = fields.identification.contractType;
    }

    // Parties fields
    if (fields.parties.firstParty.name) {
      record.firstPartyName = fields.parties.firstParty.name;
    }
    if (fields.parties.firstParty.registrationNumber) {
      record.firstPartyRegistrationNumber =
        fields.parties.firstParty.registrationNumber;
    }
    if (fields.parties.secondParty.name) {
      record.secondPartyName = fields.parties.secondParty.name;
    }
    if (fields.parties.secondParty.registrationNumber) {
      record.secondPartyRegistrationNumber =
        fields.parties.secondParty.registrationNumber;
    }

    // Term fields
    if (fields.term.executionDate) {
      record.signDate = fields.term.executionDate;
    }
    if (fields.term.commencementDate) {
      record.startDate = fields.term.commencementDate;
    }
    if (fields.term.terminationDate) {
      record.endDate = fields.term.terminationDate;
    }
    if (fields.term.duration) {
      record.duration = `${fields.term.duration.value}${this.translateUnit(fields.term.duration.unit)}`;
    }

    return record;
  }

  private translateUnit(unit: 'day' | 'month' | 'year'): string {
    switch (unit) {
      case 'year':
        return '年';
      case 'month':
        return '月';
      case 'day':
        return '日';
    }
  }

  private getEmptyResult(): BasicExtractedFields {
    return {
      identification: {
        contractNumber: null,
        contractTitle: null,
        contractType: null,
        subType: null,
        versionNumber: null,
        effectiveLanguage: null,
      },
      parties: {
        firstParty: {
          name: null,
          legalEntityType: null,
          registrationNumber: null,
          registeredAddress: null,
          operationalAddress: null,
          contactPerson: null,
          authorizedSignatory: null,
        },
        secondParty: {
          name: null,
          legalEntityType: null,
          registrationNumber: null,
          registeredAddress: null,
          operationalAddress: null,
          contactPerson: null,
          authorizedSignatory: null,
        },
        additionalParties: [],
      },
      term: {
        executionDate: null,
        effectiveDate: null,
        commencementDate: null,
        terminationDate: null,
        duration: null,
        renewal: null,
      },
      extractionConfidence: 0,
    };
  }

  private calculateOverallConfidence(
    identificationConfidence: number,
    partiesConfidence: number,
    termConfidence: number,
  ): number {
    // Weighted average with identification being most important
    return (
      identificationConfidence * 0.3 +
      partiesConfidence * 0.4 +
      termConfidence * 0.3
    );
  }

  private countFields(fields: BasicExtractedFields): {
    fieldsExtracted: number;
    totalFields: number;
  } {
    let extracted = 0;
    let total = 0;

    // Count identification fields
    const idFields = [
      'contractNumber',
      'contractTitle',
      'contractType',
      'subType',
      'versionNumber',
      'effectiveLanguage',
    ];
    for (const field of idFields) {
      total++;
      if (
        fields.identification[field as keyof ContractIdentification] !== null
      ) {
        extracted++;
      }
    }

    // Count party fields (first and second party)
    const parties = [fields.parties.firstParty, fields.parties.secondParty];
    for (const party of parties) {
      total += 4; // name, legalEntityType, registrationNumber, registeredAddress
      if (party.name !== null) extracted++;
      if (party.legalEntityType !== null) extracted++;
      if (party.registrationNumber !== null) extracted++;
      if (party.registeredAddress !== null) extracted++;
    }

    // Count term fields
    const termFields = [
      'executionDate',
      'effectiveDate',
      'commencementDate',
      'terminationDate',
      'duration',
      'renewal',
    ];
    for (const field of termFields) {
      total++;
      if (fields.term[field as keyof ContractTerm] !== null) {
        extracted++;
      }
    }

    return { fieldsExtracted: extracted, totalFields: total };
  }
}
