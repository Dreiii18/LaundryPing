export type { Database } from './database';

import type { Database } from './database';

export type Laundromat = Database['public']['Tables']['laundromats']['Row'];
export type Machine = Database['public']['Tables']['machines']['Row'];
export type Job = Database['public']['Tables']['jobs']['Row'];
export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
export type SmsTopupPackage = Database['public']['Tables']['sms_topup_packages']['Row'];
export type SmsTopupLog = Database['public']['Tables']['sms_topup_logs']['Row'];
