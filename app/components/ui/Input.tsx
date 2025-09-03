import React, { forwardRef, ReactNode } from 'react';
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
    <label htmlFor={htmlFor} className={cn('block leading-6 font-bold text-sm md:text-base text-black', className)}>
      {children}
    </label>
  );
};

interface Props extends React.ComponentPropsWithoutRef<'input'> {
  error?: string;
  label?: string;
  parentClass?: string;
  leftIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, error, label, parentClass, leftIcon, ...props }, ref) => (
    <div className={cn(`w-full`, parentClass)}>
      {label && (
        <InputLabel className='mb-1.5' htmlFor={props.id}>
          {label}
        </InputLabel>
      )}
      <div className='relative w-full'>
        <span className='z-[1] absolute top-[50%] select-none pointer-events-none -translate-y-1/2 left-2 [&>svg]:size-5'>
          {leftIcon}
        </span>
        <input
          ref={ref}
          autoComplete={'off'}
          className={cn(
            classes.base,
            props.disabled && classes.disabled,
            error ? classes.error : classes.normal,
            leftIcon != null && 'pl-8',
            className
          )}
          {...props}
        />
        {error && (
          <span className='absolute z-[1] top-[50%] -translate-y-1/2 right-2 pointer-events-none text-error-500'>
            <IoWarningOutline />
          </span>
        )}
      </div>
      {error && <p className='text-error-500 text-sm text-right'>{error}</p>}
    </div>
  )
);
Input.displayName = 'TextInput';

export default Input;
