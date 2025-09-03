import React from 'react';
import { dd_mm_yyyy, getDaysRange, getFirstDayOfMonth, getLastDayOfMonth } from '~/lib/datetime';
import { cn } from '~/lib/utils';

const classes = {
  colStart: {
    0: '',
    1: 'col-start-2',
    2: 'col-start-3',
    3: 'col-start-4',
    4: 'col-start-5',
    5: 'col-start-6',
    6: 'col-start-7',
  },
  gridCols: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarMonthProps = {
  month: number;
  year: number;
  classNames: {
    dateCell: (d: Date) => string;
  };
  onHoverDateChange?: (d: Date | null) => void;
  onChange: (d: Date) => void;
  renderPlaceholder?: (d: Date) => React.ReactNode;
};
const CalendarMonth = ({
  month,
  year,
  classNames,
  onHoverDateChange,
  onChange,
  renderPlaceholder,
}: CalendarMonthProps) => {
  const days = React.useMemo(() => {
    const range = getDaysRange(getFirstDayOfMonth(month, year), getLastDayOfMonth(month, year));
    return range;
  }, [month, year]);
  return (
    <div className='w-full'>
      <div className='grid grid-cols-7 font-opensans rounded bg-primary text-white font-semibold'>
        {WEEKDAYS.map((day) => (
          <span key={day} className='text-center p-1'>
            {day}
          </span>
        ))}
      </div>
      <div className='grid grid-cols-7 font-opensans'>
        {days.map((d) => (
          <button
            type='button'
            disabled={d.getUTCMonth() !== month}
            key={d.toDateString()}
            className={cn(
              classes.colStart[d.getUTCDay() as unknown as keyof typeof classes.colStart],
              'font-signika font-semibold flex flex-col items-center justify-between p-1 md:py-1.5 text-lg',
              classNames.dateCell(d),
              'disabled:text-grey-dark disabled:bg-transparent'
            )}
            onClick={() => onChange(d)}
            onMouseEnter={() => {
              onHoverDateChange?.(d);
            }}
            onMouseLeave={() => {
              onHoverDateChange?.(null);
            }}
          >
            <time dateTime={dd_mm_yyyy(d)} className="rounded-full grid place-items-center w-8 h-8">{d.getUTCDate()}</time>
            {d.getUTCMonth() === month && renderPlaceholder && renderPlaceholder(d)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarMonth;
