export type { Database } from './database';

import type { Database } from './database';

export type Laundromat = Database['public']['Tables']['laundromats']['Row'];
export type Machine = Database['public']['Tables']['machines']['Row'];
export type Job = Database['public']['Tables']['jobs']['Row'];
export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
