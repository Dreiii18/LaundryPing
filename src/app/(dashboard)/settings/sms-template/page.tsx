import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { SmsTemplateEditor } from '@/components/sms-template-editor';
import { MessageSquare } from 'lucide-react';

export default async function SmsTemplatePage() {
  const { user, laundromat } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="size-7 text-[#0d968b]" />
          SMS Templates
        </h2>
        <p className="text-slate-500 mt-2">
          Customize the SMS your customers receive when you create and complete their orders.
          Use the variable chips to insert their name, your shop name, or the order ID.
        </p>
      </header>

      <SmsTemplateEditor
        initialQueue={laundromat.sms_queue_template}
        initialCompletion={laundromat.sms_completion_template}
        shopName={laundromat.name}
      />
    </div>
  );
}
