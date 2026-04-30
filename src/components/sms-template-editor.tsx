'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Inbox,
  CheckCircle2,
  Loader2,
  Save,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  renderSmsTemplate,
  getMessageSegmentCount,
  DEFAULT_QUEUE_TEMPLATE,
  DEFAULT_COMPLETION_TEMPLATE,
  ALLOWED_VARS,
} from '@/lib/sms/templates';
import { fetchWithAuth } from '@/lib/utils/fetch';

const MAX_LEN = 480;

const SAMPLE_VARS = {
  customer_name: 'Maria Santos',
  job_id: 'abc12345',
} as const;

interface SmsTemplateEditorProps {
  initialQueue: string | null;
  initialCompletion: string | null;
  shopName: string;
}

interface SectionState {
  value: string;
  initial: string;
}

export function SmsTemplateEditor({
  initialQueue,
  initialCompletion,
  shopName,
}: SmsTemplateEditorProps) {
  const [queue, setQueue] = useState<SectionState>({
    value: initialQueue ?? DEFAULT_QUEUE_TEMPLATE,
    initial: initialQueue ?? DEFAULT_QUEUE_TEMPLATE,
  });
  const [completion, setCompletion] = useState<SectionState>({
    value: initialCompletion ?? DEFAULT_COMPLETION_TEMPLATE,
    initial: initialCompletion ?? DEFAULT_COMPLETION_TEMPLATE,
  });
  const [saving, setSaving] = useState(false);

  const hasChanges = queue.value !== queue.initial || completion.value !== completion.initial;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    if (queue.value.length > MAX_LEN) {
      toast.error('Queue template exceeds 480 characters');
      return;
    }
    if (completion.value.length > MAX_LEN) {
      toast.error('Completion template exceeds 480 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_queue_template: queue.value,
          sms_completion_template: completion.value,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to save templates');
        return;
      }

      toast.success('SMS templates saved');
      setQueue((s) => ({ ...s, initial: s.value }));
      setCompletion((s) => ({ ...s, initial: s.value }));
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section
        id="queue"
        title="Drop-off confirmation"
        subtitle="Sent when you create a new order for a customer."
        icon={<Inbox className="size-5 text-[#0d968b]" />}
        value={queue.value}
        onChange={(v) => setQueue((s) => ({ ...s, value: v }))}
        fallback={DEFAULT_QUEUE_TEMPLATE}
        shopName={shopName}
      />

      <Section
        id="completion"
        title="Pickup ready"
        subtitle="Sent when you mark an order as complete."
        icon={<CheckCircle2 className="size-5 text-[#0d968b]" />}
        value={completion.value}
        onChange={(v) => setCompletion((s) => ({ ...s, value: v }))}
        fallback={DEFAULT_COMPLETION_TEMPLATE}
        shopName={shopName}
      />

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving || !hasChanges}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-md min-h-11"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            <>
              <Save className="size-4" />
              Save changes
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Saved
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
  shopName: string;
}

function Section({ id, title, subtitle, icon, value, onChange, fallback, shopName }: SectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const preview = useMemo(
    () =>
      renderSmsTemplate(value, fallback, {
        shop_name: shopName,
        customer_name: SAMPLE_VARS.customer_name,
        job_id: SAMPLE_VARS.job_id,
      }),
    [value, fallback, shopName],
  );

  const segments = getMessageSegmentCount(preview);
  const overLimit = value.length > MAX_LEN;
  const counterClass =
    overLimit || segments > 3
      ? 'text-red-600'
      : segments > 1
        ? 'text-amber-600'
        : 'text-slate-500';

  function insertVariable(varName: string) {
    const el = textareaRef.current;
    const token = `{{${varName}}}`;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // Restore caret after React reconciles.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </header>

      <div className="p-6 space-y-4">
        <div>
          <Label htmlFor={`${id}-template`} className="text-sm font-semibold text-slate-700 mb-2">
            Message template
          </Label>
          <Textarea
            id={`${id}-template`}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={MAX_LEN}
            rows={4}
            className="min-h-11 font-mono text-sm"
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 flex-wrap">
              {ALLOWED_VARS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="ml-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Reset to default
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This replaces your current {title.toLowerCase()} template with the default. Any
                      unsaved changes will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onChange(fallback)}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className={`text-xs font-medium ${counterClass}`}>
              {value.length}/{MAX_LEN} · {segments} SMS segment{segments === 1 ? '' : 's'}
            </p>
          </div>
          {segments > 1 && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Info className="size-3" />
              Long messages use multiple SMS credits ({segments}× per send).
            </p>
          )}
        </div>

        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2">Preview</Label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">From:</span>
              <span
                className="text-slate-400"
                title="Custom sender name coming to Pro plan"
              >
                LaundryPing
              </span>
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">
              {preview || <span className="text-slate-400 italic">Empty preview</span>}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Sender name is fixed to &ldquo;LaundryPing&rdquo; for now. Your shop name appears in the
            message body instead.
          </p>
        </div>
      </div>
    </section>
  );
}
