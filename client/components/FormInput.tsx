'use client';

import { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export default function FormInput({
  label,
  error,
  required,
  className = '',
  ...props
}: FormInputProps) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        className={`w-full rounded-lg border ${
          error ? 'border-red-500' : 'border-gray-300'
        } px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

