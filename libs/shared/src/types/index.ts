// Contract types
export interface Contract {
  id: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  customerId: string;
  amount: number;
  currency: string;
  signedAt?: Date;
  effectiveAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractType = 'STAFF_AUGMENTATION' | 'PROJECT_OUTSOURCING' | 'PRODUCT_SALES';

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'TERMINATED'
  | 'EXPIRED';

// Customer types
export interface Customer {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  department: Department;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type Department =
  | 'FINANCE'
  | 'DELIVERY'
  | 'SALES'
  | 'MARKETING'
  | 'LEGAL'
  | 'EXECUTIVE';

export type UserRole = 'USER' | 'ADMIN';
