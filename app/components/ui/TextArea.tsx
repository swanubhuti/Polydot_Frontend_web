import React, { Children, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { IoWarningOutline } from 'react-icons/io5/index.js';

const classes = {
  base: 'text-inherit appearance-none relative block w-full px-4 py-2 border rounded-sm placeholder-grey-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 md:text-base md:placeholder:text-base text-sm placeholder:text-sm',
  disabled: 'opacity-30 cursor-default',
  error: 'border-error-500 placeholder:text-error-400',
  normal: 'border-grey-dark text-black',
} as const;

export const InputLabel = ({
  children,
  htmlFor,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block leading-6 font-bold text-sm md:text-base text-black', className)}
    >
      {children}
    </label>
  );
};

interface Props extends React.ComponentPropsWithoutRef<'textarea'> {
  error?: string;
  label?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, Props>(({ className, disabled = false, error, label, children, ...props }, ref) => (
  <div className='w-full h-full'>
    {label && (
      <InputLabel className='mb-1.5' htmlFor={props.name}>
        {label}
      </InputLabel>
    )}
    <div className='relative w-full h-full'>
      <textarea
        ref={ref}
        autoComplete={'off'}
        className={cn(classes.base, disabled && classes.disabled, error ? classes.error : classes.normal, className)}
        {...props}
      />
      {error && (
        <span className='absolute z-10 top-[50%] -translate-y-[50%] right-2 pointer-events-none text-error-500'>
          <IoWarningOutline />
        </span>
      )}
    </div>
    {error && <p className='text-error-500 text-sm text-right'>{error}</p>}
  </div>
));
TextArea.displayName = 'TextInput';

export default TextArea;
