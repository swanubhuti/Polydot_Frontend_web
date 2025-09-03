import { MdCheck } from 'react-icons/md';
import { cn } from '~/lib/utils';

const classes = {
  base: 'w-max h-max grid place-items-center rounded-sm transition ring-offset-[3px] ring-offset-primary-500 [&:has(:focus-visible)]:ring-1 has-checked:scale-105 text-transparent ring-white',
  disabled: {
    primary: 'bg-primary-400',
    outline: 'bg-gray-200 border-primary-200',
  },
  variant: {
    primary: 'border border-primary-500 has-checked:bg-primary-500 has-checked:text-white',
    outline: 'border border-primary-500 bg-white has-checked:text-primary-500',
  },
} as const;

type ClassT = typeof classes;

type InputProp = Omit<React.ComponentPropsWithoutRef<'input'>, 'type' | 'key'>;

export interface CheckboxProps extends InputProp {
  variant?: keyof ClassT['variant'];
  disabled?: boolean;
}

const Checkbox = ({ variant = 'outline', disabled = false, className, ...props }: CheckboxProps) => (
  <label className={cn(classes.base, classes.variant[variant], disabled && classes.disabled[variant])}>
    <input {...props} type='checkbox' className='sr-only' disabled={disabled} />
    <MdCheck className={'w-4.5 h-4.5 text-inherit'} />
  </label>
);

export default Checkbox;
