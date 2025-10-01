'use client';

import { SelectHTMLAttributes } from 'react';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  options: { value: string; label: string }[];
}

export default function FormSelect({
  label,
  error,
  required,
  options,
  className = '',
  ...props
}: FormSelectProps) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        className={`w-full rounded-lg border ${
          error ? 'border-red-500' : 'border-gray-300'
        } px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${className}`}
        {...props}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

