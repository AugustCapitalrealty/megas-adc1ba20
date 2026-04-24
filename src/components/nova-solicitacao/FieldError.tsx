import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  message?: string;
  id?: string;
}

export function FieldError({ message, id }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-xs text-destructive flex items-center gap-1.5 mt-1.5 animate-fade-in"
    >
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}