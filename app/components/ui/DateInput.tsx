import moment from 'moment';
import React from 'react';
import { dd_mm_yyyy, toUTCDay } from '~/lib/datetime';
import { cn } from '~/lib/utils';

function maskDate(v: string) {
  if (v.match(/[^\d|^/]+/) !== null) {
    return v.slice(0, v.length - 1);
  }
  return v;
}

function toDate(dd_mm_yyyy: string) {
  const dateParts = dd_mm_yyyy.split('/');
  if (dateParts.length !== 3) {
    return new Date('invalid');
  }
  if (dateParts[0].length < 2 || dateParts[1].length < 2 || dateParts[2].length < 4) {
    return new Date('invalid');
  }
  const mm = moment(dd_mm_yyyy,"DD/MM/YYYY")
  if (!mm.isValid()) {
    return mm.toDate()
  }
  return new Date(toUTCDay(mm.toDate()))
}

function isValidDate(dd_mm_yyyy: string) {
  const d = toDate(dd_mm_yyyy);
  try {
    return typeof d.toISOString() === 'string';
  } catch (e) {
    return false;
  }
}

type DateInputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'value' | 'onChange'> & {
  value: Date;
  onChange: (v: Date) => void;
  error?: boolean;
};

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, name, className, error, ...props }, ref) => {
    const [text, setText] = React.useState(dd_mm_yyyy(value));
    const [isValid, setIsValid] = React.useState(text.length === 0 || isValidDate(text));
    React.useEffect(() => {
      const str = dd_mm_yyyy(value);
      setText(str);
    }, [value]);

    return (
      <>
        <input
          ref={ref}
          className={cn(
            'rounded border  px-3 py-2 outline-none w-full',
            isValid && !error && 'border-grey-dark focus:border-primary',
            (!isValid || error) && 'border-error',
            className
          )}
          placeholder='dd/mm/yyyy'
          value={text}
          onChange={(e) => {
            const text = maskDate(e.target.value);
            setText(text);
            const isValid = isValidDate(text);
            setIsValid(isValid);
            if (isValid) {
              const d = toDate(text);
              onChange(d);
            }
          }}
          {...props}
        />
        {name && <input type="hidden" name={name} value={error || !isValid ? '' : text.split('/').reverse().join('-')} /> }
      </>
    );
  }
);

DateInput.displayName = 'DateInput';
export default DateInput;
