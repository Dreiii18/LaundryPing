export type { Database } from './database';

import type { Database } from './database';

export type Laundromat = Database['public']['Tables']['laundromats']['Row'];
export type Machine = Database['public']['Tables']['machines']['Row'];
export type Job = Database['public']['Tables']['jobs']['Row'];
export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type SmsPlan = Database['public']['Tables']['sms_plans']['Row'];
export type EmailLog = Database['public']['Tables']['email_logs']['Row'];
export type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
