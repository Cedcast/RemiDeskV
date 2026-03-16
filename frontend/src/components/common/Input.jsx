import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  type = 'text',
  error,
  className = '',
  ...props
}, ref) => {
  const inputClasses = `block w-full rounded-lg border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 sm:text-sm ${
    error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
  } ${className}`;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
