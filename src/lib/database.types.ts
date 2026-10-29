export type TransactionType = "income" | "expense";
export type Recurrence = "once" | "weekly" | "monthly" | "yearly";

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  transaction_date: string;
  receipt_path: string | null;
  bill_id: string | null;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  month: number;
  year: number;
  amount: number;
  created_at: string;
};

export type Bill = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  recurrence: Recurrence;
  anchor_day: number;
  anchor_month: number;
  last_paid_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; currency: string; created_at: string };
        Insert: { id: string; display_name?: string; currency?: string };
        Update: { id?: string; display_name?: string; currency?: string };
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at" | "bill_id"> & {
          id?: string; created_at?: string; bill_id?: string | null;
        };
        Update: Partial<Omit<Transaction, "id" | "created_at">> & { id?: string; created_at?: string };
        Relationships: [];
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Budget, "id" | "created_at">> & { id?: string; created_at?: string };
        Relationships: [];
      };
      bills: {
        Row: Bill;
        Insert: Omit<Bill, "id" | "created_at" | "last_paid_at"> & {
          id?: string;
          created_at?: string;
          last_paid_at?: string | null;
        };
        Update: Partial<Omit<Bill, "id" | "created_at">> & { id?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      mark_bill_paid: {
        Args: { bill_id_input: string; expected_due_date: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
