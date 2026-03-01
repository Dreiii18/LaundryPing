export { sendEmail, getEmailProvider } from './provider';
export type { SendEmailResult, EmailPayload, EmailProvider } from './provider';
export {
  buildWelcomeEmail,
  buildPlanActivatedEmail,
  buildPlanExpiryReminderEmail,
  buildPlanExpiredEmail,
  buildPlanCancelledEmail,
} from './templates';
