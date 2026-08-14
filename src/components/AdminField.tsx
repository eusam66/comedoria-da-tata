import type { ReactNode } from 'react';

type AdminFieldProps = {
  label: string;
  help: string;
  children: ReactNode;
  className?: string;
};

export default function AdminField({ label, help, children, className = '' }: AdminFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-800">{label}</span>
      {children}
      <span className="mt-1 block text-xs leading-relaxed text-gray-500">{help}</span>
    </label>
  );
}
