export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      laundromats: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          sms_limit: number;
          sms_used_this_month: number;
          billing_cycle_start: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address?: string | null;
          sms_limit?: number;
          sms_used_this_month?: number;
          billing_cycle_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string | null;
          sms_limit?: number;
          sms_used_this_month?: number;
          billing_cycle_start?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      machines: {
        Row: {
          id: string;
          laundromat_id: string;
          label: string;
          type: 'washer' | 'dryer';
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          laundromat_id: string;
          label: string;
          type: 'washer' | 'dryer';
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          laundromat_id?: string;
          label?: string;
          type?: 'washer' | 'dryer';
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          laundromat_id: string;
          machine_id: string;
          customer_phone_encrypted: string;
          customer_phone_masked: string;
          notes: string | null;
          status: 'in_progress' | 'completed' | 'cancelled';
          started_at: string;
          completed_at: string | null;
          sms_sent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          laundromat_id: string;
          machine_id: string;
          customer_phone_encrypted: string;
          customer_phone_masked: string;
          notes?: string | null;
          status?: 'in_progress' | 'completed' | 'cancelled';
          started_at?: string;
          completed_at?: string | null;
          sms_sent?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          laundromat_id?: string;
          machine_id?: string;
          customer_phone_encrypted?: string;
          customer_phone_masked?: string;
          notes?: string | null;
          status?: 'in_progress' | 'completed' | 'cancelled';
          started_at?: string;
          completed_at?: string | null;
          sms_sent?: boolean;
          created_at?: string;
        };
      };
      sms_logs: {
        Row: {
          id: string;
          job_id: string;
          laundromat_id: string;
          provider: string;
          sent_at: string;
          status: 'sent' | 'failed' | 'delivered';
          provider_message_id: string | null;
          provider_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          laundromat_id: string;
          provider: string;
          sent_at?: string;
          status: 'sent' | 'failed' | 'delivered';
          provider_message_id?: string | null;
          provider_response?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          laundromat_id?: string;
          provider?: string;
          sent_at?: string;
          status?: 'sent' | 'failed' | 'delivered';
          provider_message_id?: string | null;
          provider_response?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      ensure_billing_cycle: {
        Args: { p_laundromat_id: string };
        Returns: undefined;
      };
      check_and_increment_sms_quota: {
        Args: { p_laundromat_id: string };
        Returns: boolean;
      };
    };
  };
}
