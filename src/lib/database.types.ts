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
  due_date: string;
  recurrence: Recurrence;
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
        Insert: Omit<Transaction, "id" | "created_at"> & { id?: string; created_at?: string };
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
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
