// ==================== Auth ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

// ==================== User ====================
export interface User {
  id: number;
  username: string;
  name: string;
  password?: string;
  roleId: number;
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

// ==================== Role ====================
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  resource: string;
  action: "create" | "read" | "update" | "delete";
  description?: string;
}

// ==================== Product Type ====================
export interface ProductType {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductTypeDto {
  name: string;
  description?: string;
}

// ==================== Customer ====================
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber1: string;
  phoneNumber2?: string;
  city: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  phoneNumber1: string;
  phoneNumber2?: string;
  city: string;
  amount: number;
}

export type CustomerHistoryEntryType = "invoice" | "payment" | "adjustment";

export interface CustomerHistoryEntry {
  id: number;
  type: CustomerHistoryEntryType;
  amount: number;
  note?: string | null;
  createdAt: string;
  invoice_id?: number | null;
  invoice_number?: string | null;
  balance_after: number;
}

export interface CustomerHistoryResponse {
  customer: Customer;
  history: CustomerHistoryEntry[];
  current_amount: number;
}

export interface CreateCustomerHistoryEntryDto {
  type: Extract<CustomerHistoryEntryType, "payment" | "adjustment">;
  amount: number;
  note?: string;
}

// ==================== Employee ====================
export interface Employee {
  id: number;
  name: string;
  phoneNumber: string;
  salary: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDto {
  name: string;
  phoneNumber: string;
  salary: number;
}

// ==================== Supplier ====================
export interface Supplier {
  id: number;
  name: string;
  phoneNumber: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierDto {
  name: string;
  phoneNumber: string;
  amount: number;
}

// ==================== Ceramic Item ====================
export interface CeramicItem {
  id: number;
  title: string;
  quantity: number;
  bag: string;
  bag_quantity: number;
  width: number;
  height: number;
  price: number;
  main_price: number;
  qr_code?: string;
  image_url?: string;
  type_id?: number;
  productType?: ProductType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCeramicItemDto {
  title: string;
  quantity: number;
  bag: string;
  bag_quantity: number;
  width: number;
  height: number;
  price: number;
  main_price: number;
  type_id?: number;
  image?: string;
}

// ==================== Healthy Item ====================
export interface HealthyItem {
  id: number;
  title: string;
  quantity: number;
  color: string;
  price: number;
  main_price: number;
  qr_code?: string;
  image_url?: string;
  type_id?: number;
  productType?: ProductType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthyItemDto {
  title: string;
  quantity: number;
  color: string;
  price: number;
  main_price: number;
  type_id?: number;
  image?: string;
}

// ==================== Invoice ====================
export type InvoiceType = "ceramic" | "healthy";

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  item_type: InvoiceType;
  ceramic_item_id?: number;
  ceramicItem?: CeramicItem;
  healthy_item_id?: number;
  healthyItem?: HealthyItem;
  quantity: number;
  place?: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  discount: number;
  delivery_price?: number;
  total_amount: number;
  type: InvoiceType;
  customer_id: number;
  customer?: Customer;
  items?: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}
// ==================== Expense ====================
export interface Expense {
  id: number;
  title: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  title: string;
  price: number;
}

// ==================== Balance ====================
export interface BalanceCategoryData {
  price: number;
  main_price: number;
  amount: number;
}

export interface BalanceSoldCategory extends BalanceCategoryData {
  quantity: number;
}

export interface BalanceData {
  ceramics: BalanceCategoryData;
  healthy: BalanceCategoryData;
  sold: {
    ceramics: BalanceSoldCategory;
    healthy: BalanceSoldCategory;
  };
  number_customer: number;
  new_customers: number;
  date_range: {
    from: string | null;
    to: string | null;
  };
}

// ==================== Notification ====================
export interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  read?: boolean;
}

// ==================== Employee Salary ====================
export interface EmployeeSalary {
  id: number;
  employee_id: number;
  employee?: Employee;
  year: number;
  month: number;
  amount: number;
  paid: boolean;
  paid_date?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeSalaryDto {
  employee_id: number;
  year: number;
  month: number;
  amount: number;
  paid?: boolean;
  notes?: string;
}

export interface UpdateEmployeeSalaryDto {
  employee_id?: number;
  year?: number;
  month?: number;
  amount?: number;
  paid?: boolean;
  notes?: string;
}
