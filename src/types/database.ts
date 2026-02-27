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
          sms_plan_id: string | null;
          sms_plan_activated_at: string | null;
          sms_plan_expires_at: string | null;
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
          sms_plan_id?: string | null;
          sms_plan_activated_at?: string | null;
          sms_plan_expires_at?: string | null;
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
          sms_plan_id?: string | null;
          sms_plan_activated_at?: string | null;
          sms_plan_expires_at?: string | null;
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
          status: 'active' | 'inactive' | 'maintenance';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          laundromat_id: string;
          label: string;
          type: 'washer' | 'dryer';
          status?: 'active' | 'inactive' | 'maintenance';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          laundromat_id?: string;
          label?: string;
          type?: 'washer' | 'dryer';
          status?: 'active' | 'inactive' | 'maintenance';
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          laundromat_id: string;
          machine_id: string;
          customer_phone_encrypted: string | null;
          customer_phone_masked: string | null;
          notes: string | null;
          status: 'in_progress' | 'completed' | 'cancelled';
          started_at: string;
          completed_at: string | null;
          sms_sent: boolean;
          notify_sms: boolean;
          payment_method: 'cash' | 'ewallet' | 'card' | 'bank_transfer' | null;
          pay_amount: number | null;
          is_paid: boolean;
          is_overdue: boolean;
          overdue_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          laundromat_id: string;
          machine_id: string;
          customer_phone_encrypted?: string | null;
          customer_phone_masked?: string | null;
          notes?: string | null;
          status?: 'in_progress' | 'completed' | 'cancelled';
          started_at?: string;
          completed_at?: string | null;
          sms_sent?: boolean;
          notify_sms?: boolean;
          payment_method?: 'cash' | 'ewallet' | 'card' | 'bank_transfer' | null;
          pay_amount?: number | null;
          is_paid?: boolean;
          is_overdue?: boolean;
          overdue_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          laundromat_id?: string;
          machine_id?: string;
          customer_phone_encrypted?: string | null;
          customer_phone_masked?: string | null;
          notes?: string | null;
          status?: 'in_progress' | 'completed' | 'cancelled';
          started_at?: string;
          completed_at?: string | null;
          sms_sent?: boolean;
          notify_sms?: boolean;
          payment_method?: 'cash' | 'ewallet' | 'card' | 'bank_transfer' | null;
          pay_amount?: number | null;
          is_paid?: boolean;
          is_overdue?: boolean;
          overdue_reason?: string | null;
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
      sms_plans: {
        Row: {
          id: string;
          tier: 'starter' | 'growth' | 'scale';
          label: string;
          sms_limit: number;
          price_php: number;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tier: 'starter' | 'growth' | 'scale';
          label: string;
          sms_limit: number;
          price_php: number;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tier?: 'starter' | 'growth' | 'scale';
          label?: string;
          sms_limit?: number;
          price_php?: number;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          content: string;
          author: string;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string;
          content?: string;
          author?: string;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          content?: string;
          author?: string;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
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
      activate_sms_plan: {
        Args: { p_user_id: string; p_plan_tier: string; p_duration_days?: number };
        Returns: undefined;
      };
      mark_overdue_jobs: {
        Args: { p_laundromat_id: string };
        Returns: undefined;
      };
      decrement_sms_quota: {
        Args: { p_laundromat_id: string };
        Returns: undefined;
      };
    };
  };
}
