export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      daily_records: {
        Row: {
          id: string;
          user_id: string;
          record_date: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          record_date: string;
          payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          record_date?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string | null;
          total_pages: number | null;
          status: string;
          started_at: string | null;
          finished_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author?: string | null;
          total_pages?: number | null;
          status?: string;
          started_at?: string | null;
          finished_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string | null;
          total_pages?: number | null;
          status?: string;
          started_at?: string | null;
          finished_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
