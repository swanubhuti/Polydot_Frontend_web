import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Link } from '@remix-run/react';

const classes = {
  base: 'focus:outline-none enabled:hover:opacity-80 transition ease-in-out duration-100 focus-visible:ring-offset-2 border border-transparent font-signika',
  disabled: 'opacity-30 cursor-default',
  shape: {
    normal: 'rounded',
    pill: 'rounded-full',
  },
  size: {
    small: 'px-2 py-1',
    normal: 'px-4 py-2',
    large: 'px-8 py-3',
    icon: 'px-1 py-1',
  },
  variant: {
    primary: 'bg-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 text-white',
    outline: 'bg-white text-primary-500 border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500',
    error: 'bg-error text-white border-error-500',
    link: 'bg-transparent underline underline-offset-1 text-primary font-bold focus-visible:outline-primary',
    black: 'bg-black focus-visible:ring-2 focus-visible:ring-black text-white',
    transparent: "bg-transparent hover:bg-gray-100 hover:text-primary-400 text-primary-500"
  },
} as const;

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: keyof (typeof classes)['variant'];
  size?: keyof (typeof classes)['size'];
  shape?: keyof (typeof classes)['shape'];
  link?: string,
  download?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      type = 'button',
      className,
      variant = 'primary',
      size = 'normal',
      shape = 'normal',
      disabled = false,
      link,
      download,
      ...props
    },
    ref
  ) => {
    if (link) {
      return <Link 
        to={link}
        download={download}
        className={cn(
          classes.base,
          classes.size[size],
          classes.variant[variant],
          shape && classes.shape[shape],
          disabled && classes.disabled,
          className
        )}
      >
        {children}
      </Link>
    }
    return (
      <button
        ref={ref}
        disabled={disabled}
        type={type}
        className={cn(
          classes.base,
          classes.size[size],
          classes.variant[variant],
          shape && classes.shape[shape],
          disabled && classes.disabled,
          className
        )}
        {...props}
      >
        {children}
      </button>
  )}
);

Button.displayName = 'Button';

export default Button;
