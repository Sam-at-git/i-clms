import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class ContactPerson {
  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  email!: string | null;
}

@ObjectType()
export class AuthorizedSignatory {
  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  signatureDate!: string | null;
}

@ObjectType()
export class PartyInfo {
  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  legalEntityType!: string | null;

  @Field(() => String, { nullable: true })
  registrationNumber!: string | null;

  @Field(() => String, { nullable: true })
  registeredAddress!: string | null;

  @Field(() => String, { nullable: true })
  operationalAddress!: string | null;

  @Field(() => ContactPerson, { nullable: true })
  contactPerson!: ContactPerson | null;

  @Field(() => AuthorizedSignatory, { nullable: true })
  authorizedSignatory!: AuthorizedSignatory | null;
}

@ObjectType()
export class AdditionalParty {
  @Field(() => String)
  role!: string;

  @Field(() => PartyInfo)
  info!: PartyInfo;
}

@ObjectType()
export class PartiesInfoType {
  @Field(() => PartyInfo)
  firstParty!: PartyInfo;

  @Field(() => PartyInfo)
  secondParty!: PartyInfo;

  @Field(() => [AdditionalParty])
  additionalParties!: AdditionalParty[];
}

@ObjectType()
export class ContractIdentificationType {
  @Field(() => String, { nullable: true })
  contractNumber!: string | null;

  @Field(() => String, { nullable: true })
  contractTitle!: string | null;

  @Field(() => String, { nullable: true })
  contractType!: string | null;

  @Field(() => String, { nullable: true })
  subType!: string | null;

  @Field(() => String, { nullable: true })
  versionNumber!: string | null;

  @Field(() => String, { nullable: true })
  effectiveLanguage!: string | null;
}

@ObjectType()
export class Duration {
  @Field(() => Int)
  value!: number;

  @Field(() => String)
  unit!: string;
}

@ObjectType()
export class RenewalTerms {
  @Field(() => Boolean)
  automaticRenewal!: boolean;

  @Field(() => String, { nullable: true })
  renewalTerm!: string | null;

  @Field(() => Duration, { nullable: true })
  noticePeriod!: Duration | null;
}

@ObjectType()
export class ContractTermType {
  @Field(() => String, { nullable: true })
  executionDate!: string | null;

  @Field(() => String, { nullable: true })
  effectiveDate!: string | null;

  @Field(() => String, { nullable: true })
  commencementDate!: string | null;

  @Field(() => String, { nullable: true })
  terminationDate!: string | null;

  @Field(() => Duration, { nullable: true })
  duration!: Duration | null;

  @Field(() => RenewalTerms, { nullable: true })
  renewal!: RenewalTerms | null;
}

@ObjectType()
export class BasicExtractedFieldsType {
  @Field(() => ContractIdentificationType)
  identification!: ContractIdentificationType;

  @Field(() => PartiesInfoType)
  parties!: PartiesInfoType;

  @Field(() => ContractTermType)
  term!: ContractTermType;

  @Field(() => Float)
  extractionConfidence!: number;
}

@ObjectType()
export class ExtractionMetricsType {
  @Field(() => Float)
  identificationConfidence!: number;

  @Field(() => Float)
  partiesConfidence!: number;

  @Field(() => Float)
  termConfidence!: number;

  @Field(() => Float)
  overallConfidence!: number;

  @Field(() => Int)
  fieldsExtracted!: number;

  @Field(() => Int)
  totalFields!: number;
}
