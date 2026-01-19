import { Injectable, Logger } from '@nestjs/common';

export interface ContactPerson {
  name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
}

export interface AuthorizedSignatory {
  name: string | null;
  title: string | null;
  signatureDate: string | null;
}

export interface PartyInfo {
  name: string | null;
  legalEntityType: string | null;
  registrationNumber: string | null;
  registeredAddress: string | null;
  operationalAddress: string | null;
  contactPerson: ContactPerson | null;
  authorizedSignatory: AuthorizedSignatory | null;
}

export interface AdditionalParty {
  role: string;
  info: PartyInfo;
}

export interface PartiesInfo {
  firstParty: PartyInfo;
  secondParty: PartyInfo;
  additionalParties: AdditionalParty[];
}

@Injectable()
export class PartiesExtractor {
  private readonly logger = new Logger(PartiesExtractor.name);

  private readonly patterns = {
    firstParty: [
      /甲方[（(][^）)]*[）)][：:]\s*([^\n（(]+)/,
      /甲方[：:]\s*([^\n（(]+)/,
      /甲\s*方[：:]\s*([^\n]+)/,
      /Party\s*A[：:]\s*([^\n]+)/i,
      /买方[：:]\s*([^\n]+)/,
      /委托方[：:]\s*([^\n]+)/,
      /发包方[：:]\s*([^\n]+)/,
      /客户[：:]\s*([^\n]+)/,
    ],
    secondParty: [
      /乙方[（(][^）)]*[）)][：:]\s*([^\n（(]+)/,
      /乙方[：:]\s*([^\n（(]+)/,
      /乙\s*方[：:]\s*([^\n]+)/,
      /Party\s*B[：:]\s*([^\n]+)/i,
      /卖方[：:]\s*([^\n]+)/,
      /受托方[：:]\s*([^\n]+)/,
      /承包方[：:]\s*([^\n]+)/,
      /服务商[：:]\s*([^\n]+)/,
    ],
    registrationNumber: [
      /统一社会信用代码[：:]\s*([A-Z0-9]{15,18})/i,
      /社会信用代码[：:]\s*([A-Z0-9]{15,18})/i,
      /营业执照号[：:]\s*(\d+)/,
      /Registration\s*No[.:]?\s*([A-Z0-9]+)/i,
      /注册号[：:]\s*(\d+)/,
    ],
    address: [
      /地址[：:]\s*([^\n]+)/,
      /住所[：:]\s*([^\n]+)/,
      /注册地址[：:]\s*([^\n]+)/,
      /Address[：:]\s*([^\n]+)/i,
    ],
    operationalAddress: [
      /经营地址[：:]\s*([^\n]+)/,
      /办公地址[：:]\s*([^\n]+)/,
      /Operational\s*Address[：:]\s*([^\n]+)/i,
    ],
    phone: [
      /电话[：:]\s*([\d\-\s]+)/,
      /联系电话[：:]\s*([\d\-\s]+)/,
      /Tel[.:]?\s*([\d\-\s]+)/i,
      /Phone[.:]?\s*([\d\-\s]+)/i,
    ],
    email: [
      /邮箱[：:]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/,
      /电子邮件[：:]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/,
      /E-?mail[：:]\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i,
    ],
    contactPerson: [
      /联系人[：:]\s*([^\n，,]+)/,
      /Contact\s*Person[：:]\s*([^\n，,]+)/i,
    ],
    contactTitle: [
      /职务[：:]\s*([^\n，,]+)/,
      /职位[：:]\s*([^\n，,]+)/,
      /Title[：:]\s*([^\n，,]+)/i,
    ],
    signatory: [
      /(?:授权|法定)?代表人?[：:]\s*([^\n，,:：]+)/,
      /签字人[：:]\s*([^\n，,]+)/,
      /Authorized\s*Signatory[：:]\s*([^\n，,]+)/i,
    ],
    additionalParty: [
      /丙方[：:]\s*([^\n]+)/,
      /担保方[：:]\s*([^\n]+)/,
      /保证人[：:]\s*([^\n]+)/,
      /Party\s*C[：:]\s*([^\n]+)/i,
    ],
    legalEntityType: [
      /(有限公司|股份有限公司|有限责任公司|合伙企业|个体工商户)/,
      /(Ltd|Limited|Inc|Corporation|Corp|LLC)/i,
    ],
  };

  extract(text: string): PartiesInfo {
    const normalizedText = this.normalizeText(text);
    const sections = this.splitIntoPartySections(normalizedText);

    return {
      firstParty: this.extractPartyInfo(
        normalizedText,
        'firstParty',
        sections.firstParty,
      ),
      secondParty: this.extractPartyInfo(
        normalizedText,
        'secondParty',
        sections.secondParty,
      ),
      additionalParties: this.extractAdditionalParties(normalizedText),
    };
  }

  extractWithConfidence(text: string): {
    data: PartiesInfo;
    confidence: number;
  } {
    const data = this.extract(text);
    const confidence = this.calculateOverallConfidence(data);

    return { data, confidence };
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/：/g, ':');
  }

  private splitIntoPartySections(text: string): {
    firstParty: string;
    secondParty: string;
  } {
    const firstPartyIdx = text.search(/甲方|Party\s*A|买方|委托方|发包方/i);
    const secondPartyIdx = text.search(/乙方|Party\s*B|卖方|受托方|承包方/i);
    const additionalPartyIdx = text.search(/丙方|Party\s*C|担保方/i);

    const firstPartyStart = firstPartyIdx >= 0 ? firstPartyIdx : 0;
    const secondPartyStart = secondPartyIdx >= 0 ? secondPartyIdx : text.length;
    const additionalPartyStart = additionalPartyIdx >= 0 ? additionalPartyIdx : text.length;

    const firstPartyEnd = secondPartyStart < text.length ? secondPartyStart : text.length;
    const secondPartyEnd = additionalPartyStart < text.length && additionalPartyStart > secondPartyStart
      ? additionalPartyStart
      : text.length;

    return {
      firstParty: text.substring(firstPartyStart, firstPartyEnd),
      secondParty: secondPartyIdx >= 0 ? text.substring(secondPartyStart, secondPartyEnd) : '',
    };
  }

  private extractPartyInfo(
    fullText: string,
    partyType: 'firstParty' | 'secondParty',
    sectionText: string,
  ): PartyInfo {
    const searchText = sectionText || fullText;

    return {
      name: this.extractPartyName(fullText, partyType),
      legalEntityType: this.detectLegalEntityType(searchText),
      registrationNumber: this.extractField(
        searchText,
        this.patterns.registrationNumber,
      ),
      registeredAddress: this.extractField(searchText, this.patterns.address),
      operationalAddress: this.extractField(
        searchText,
        this.patterns.operationalAddress,
      ),
      contactPerson: this.extractContactPerson(searchText),
      authorizedSignatory: this.extractAuthorizedSignatory(
        searchText,
        fullText,
      ),
    };
  }

  private extractPartyName(
    text: string,
    partyType: 'firstParty' | 'secondParty',
  ): string | null {
    const patterns =
      partyType === 'firstParty'
        ? this.patterns.firstParty
        : this.patterns.secondParty;

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = this.cleanPartyName(match[1]);
        if (this.isValidPartyName(value)) {
          return value;
        }
      }
    }
    return null;
  }

  private cleanPartyName(value: string): string {
    return value
      .trim()
      .replace(/[（(][^）)]*[）)]/g, '')
      .replace(/地址.*$/, '')
      .replace(/法定.*$/, '')
      .replace(/统一.*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isValidPartyName(value: string): boolean {
    if (!value || value.length < 2 || value.length > 100) return false;
    if (value.includes('____') || value.includes('...')) return false;
    if (/^[0-9]+$/.test(value)) return false;
    return true;
  }

  private detectLegalEntityType(text: string): string | null {
    for (const pattern of this.patterns.legalEntityType) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private extractField(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value.length >= 2 && !value.includes('____')) {
          return value;
        }
      }
    }
    return null;
  }

  private extractContactPerson(text: string): ContactPerson | null {
    const name = this.extractField(text, this.patterns.contactPerson);
    if (!name) return null;

    const phone = this.extractField(text, this.patterns.phone);
    const email = this.extractEmail(text);

    return {
      name,
      title: this.extractField(text, this.patterns.contactTitle),
      phone: phone ? this.cleanPhoneNumber(phone) : null,
      email,
    };
  }

  private extractEmail(text: string): string | null {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailPattern);
    if (match) {
      const email = match[0].toLowerCase();
      if (this.isValidEmail(email)) {
        return email;
      }
    }
    return null;
  }

  private isValidEmail(email: string): boolean {
    if (!email || email.length < 5 || email.length > 100) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    if (parts[0].length < 1 || parts[1].length < 3) return false;
    return true;
  }

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/\s+/g, '').replace(/-/g, '-');
  }

  private extractAuthorizedSignatory(
    sectionText: string,
    fullText: string,
  ): AuthorizedSignatory | null {
    const name = this.extractField(sectionText, this.patterns.signatory);
    if (!name) return null;

    const signatureDate = this.extractSignatureDate(sectionText) ||
      this.extractSignatureDate(fullText);

    return {
      name: name.replace(/[（(][^）)]*[）)]/g, '').trim(),
      title: this.extractField(sectionText, this.patterns.contactTitle),
      signatureDate,
    };
  }

  private extractSignatureDate(text: string): string | null {
    const datePatterns = [
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return null;
  }

  private extractAdditionalParties(text: string): AdditionalParty[] {
    const additionalParties: AdditionalParty[] = [];

    const rolePatterns = [
      { pattern: /丙方[：:]\s*([^\n]+)/, role: '丙方' },
      { pattern: /担保方[：:]\s*([^\n]+)/, role: '担保方' },
      { pattern: /保证人[：:]\s*([^\n]+)/, role: '保证人' },
      { pattern: /Party\s*C[：:]\s*([^\n]+)/i, role: '丙方' },
    ];

    for (const { pattern, role } of rolePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = this.cleanPartyName(match[1]);
        if (this.isValidPartyName(name)) {
          additionalParties.push({
            role,
            info: {
              name,
              legalEntityType: this.detectLegalEntityType(match[1]),
              registrationNumber: null,
              registeredAddress: null,
              operationalAddress: null,
              contactPerson: null,
              authorizedSignatory: null,
            },
          });
        }
      }
    }

    return additionalParties;
  }

  private calculateOverallConfidence(data: PartiesInfo): number {
    let score = 0;
    let total = 0;

    const checkParty = (party: PartyInfo, weight: number) => {
      total += weight;
      if (party.name) score += weight * 0.5;
      if (party.registrationNumber) score += weight * 0.2;
      if (party.registeredAddress) score += weight * 0.15;
      if (party.contactPerson) score += weight * 0.15;
    };

    checkParty(data.firstParty, 0.5);
    checkParty(data.secondParty, 0.5);

    return total > 0 ? score / total : 0;
  }
}
