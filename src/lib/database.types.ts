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

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string; currency: string; created_at: string },
        { id: string; display_name?: string; currency?: string }
      >;
      transactions: Table<
        Transaction,
        Omit<Transaction, "id" | "created_at"> & { id?: string; created_at?: string }
      >;
      budgets: Table<
        Budget,
        Omit<Budget, "id" | "created_at"> & { id?: string; created_at?: string }
      >;
      bills: Table<
        Bill,
        Omit<Bill, "id" | "created_at"> & { id?: string; created_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
