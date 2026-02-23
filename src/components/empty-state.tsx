import { WashingMachine, ListTodo, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: 'machines' | 'jobs' | 'sms';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = 'jobs', title, description, action }: EmptyStateProps) {
  const IconComponent = icon === 'machines' ? WashingMachine
    : icon === 'sms' ? MessageSquare
    : ListTodo;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <IconComponent className="size-8 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-4">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 min-h-11 min-w-11"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
