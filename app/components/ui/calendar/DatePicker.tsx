import React from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { getCurrentMonthYear, getMonthName, isSameDay } from '~/lib/datetime';
import CalendarMonth from './CalendarMonth';
import { cn } from '~/lib/utils';

export type DatePickerProps = {
  value?: Date | undefined;
  onChange: (v: Date) => void;
  renderPlaceholder?: (d: Date) => React.ReactNode;
};

const DatePicker = ({ value, onChange, renderPlaceholder }: DatePickerProps) => {
  const [current, setCurrent] = React.useState(getCurrentMonthYear());
  const toPreviousMonth = React.useCallback(() => {
    setCurrent((p) => {
      let newMonth = p.month - 1;
      let newYear = p.year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
      return {
        month: newMonth,
        year: newYear,
      };
    });
  }, []);

  const toNextMonth = React.useCallback(() => {
    setCurrent((p) => {
      let newMonth = p.month + 1;
      let newYear = p.year;
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      return {
        month: newMonth,
        year: newYear,
      };
    });
  }, []);

  return (
    <div aria-label='Date Picker' className='text-xs sm:text-sm md:text-base relative w-full'>
      <button
        type='button'
        className='text-grey-800 absolute top-0 left-0'
        aria-label='Previous Month'
        onClick={toPreviousMonth}
      >
        <BiChevronLeft className='w-6 h-6 md:w-8 md:h-8' />
      </button>
      <button type='button' className='text-grey-800 absolute top-0 right-0' aria-label='Next Month'>
        <BiChevronRight className='w-6 h-6 md:w-8 md:h-8' onClick={toNextMonth} />
      </button>
      <div className='flex-1 min-w-[340px]'>
        <h2 className='text-base sm:text-xl md:text-2xl text-center mb-4'>
          {getMonthName(current.month)} {current.year}
        </h2>
        <CalendarMonth
          month={current.month}
          year={current.year}
          onChange={onChange}
          renderPlaceholder={renderPlaceholder}
          classNames={{
            dateCell: (d: Date) => {
              return cn(!isSameDay(value, d) && 'hover:bg-grey-dark/30', isSameDay(value, d) && 'bg-secondary');
            },
          }}
        />
      </div>
    </div>
  );
};

export default DatePicker;
