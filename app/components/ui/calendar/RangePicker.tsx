import React from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { dd_mm_yyyy, getCurrentMonthYear, getMonthName, isBetweenDates, isSameDay, today } from '~/lib/datetime';
import { cn } from '~/lib/utils';
import CalendarMonth from './CalendarMonth';

export type RangePickerProps = {
  range: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  };
  onChange: (range: { startDate: Date; endDate: Date }) => void;
  renderPlaceholder?: (d: Date) => React.ReactNode;
  numberOfMonths?: number;
};

const RangePicker = ({ range, onChange, renderPlaceholder, numberOfMonths = 2 }: RangePickerProps) => {
  const [current, setCurrent] = React.useState(getCurrentMonthYear());
  const months = React.useMemo(() => {
    return Array.from({ length: numberOfMonths }, (_, i) => {
      let newMonth = (current.month + i) % 12;
      let newYear = current.year + Math.floor((current.month + i) / 12);
      return {
        month: newMonth,
        monthName: getMonthName(newMonth),
        year: newYear,
      };
    });
  }, [current.month, current.year, numberOfMonths]);

  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);
  const [dateRange, setDateRange] = React.useState<{ startDate: Date | undefined; endDate: Date | undefined }>(range);

  const handleSelectDate = (d: Date) => {
    if (!dateRange.endDate && !dateRange.startDate) {
      setDateRange((p) => {
        return {
          startDate: d,
          endDate: p.endDate,
        };
      });
    } else if (!!dateRange.startDate && !!dateRange.endDate) {
      setDateRange({
        startDate: d,
        endDate: undefined,
      });
    } else if (!!dateRange.startDate && !dateRange.endDate && dateRange.startDate.getTime() < d.getTime()) {
      setDateRange((p) => {
        return {
          startDate: p.startDate,
          endDate: d,
        };
      });
      onChange({
        startDate: dateRange.startDate,
        endDate: d,
      });
    } else if (!!dateRange.startDate && !dateRange.endDate && dateRange.startDate.getTime() > d.getTime()) {
      setDateRange((p) => {
        return {
          startDate: d,
          endDate: p.startDate,
        };
      });
      onChange({
        startDate: d,
        endDate: dateRange.startDate,
      });
    } else if (!!dateRange.startDate && !dateRange.endDate && isSameDay(dateRange.startDate, d)) {
      setDateRange({
        startDate: d,
        endDate: d,
      });
      onChange({
        startDate: d,
        endDate: d,
      });
    }
  };

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

  React.useEffect(() => {
    if (range.startDate && range.endDate && range.startDate <= range.endDate) {
      setDateRange(range);
      setCurrent((current) => {
        if (!range.startDate) {
          return current;
        }
        const diffYear = range.startDate.getUTCFullYear() - current.year;
        const totalDiff = diffYear * 12 + range.startDate.getUTCMonth() - current.month;
        // console.log({
        //   from: { y: current.year, m: current.month },
        //   to: { y: range.startDate.getUTCFullYear(), m: range.startDate.getUTCMonth() },
        //   diffYear,
        //   totalDiff,
        // });
        if (totalDiff > 0 && totalDiff <= numberOfMonths - 1) {
          return current;
        }
        return {
          month: range.startDate.getUTCMonth(),
          year: range.startDate.getUTCFullYear(),
        };
      });
    }
  }, [range, numberOfMonths]);

  return (
    <div aria-label='Date Range Picker' className='text-xs sm:text-sm md:text-base w-full'>
      <div className='px-3 mb-3 md:hidden'>
        <p className='text-grey-500 text-sm font-signika'>SELECT DATE RANGE</p>
        <div className='text-xl font-semibold text-grey-700 font-signika'>
          <time aria-label='start date'>{dateRange.startDate ? dd_mm_yyyy(dateRange.startDate) : ''}</time>
          <span className='mx-2'>&ndash;</span>
          {!!dateRange.endDate && <time aria-label='end date'>{dd_mm_yyyy(dateRange.endDate)}</time>}
        </div>
      </div>
      <div className='relative'>
        <button
          type='button'
          className='text-grey-800 absolute -top-1 sm:top-[-2px] left-0'
          aria-label='Previous Month'
          onClick={toPreviousMonth}
        >
          <BiChevronLeft className='w-8 h-8' />
        </button>
        <button type='button' className='text-grey-800 absolute -top-1 sm:top-[-2px] right-0' aria-label='Next Month'>
          <BiChevronRight className='w-8 h-8' onClick={toNextMonth} />
        </button>
        <div
          className={cn(
            'grid sm:gap-4 lg:gap-6 grid-cols-1',
            Math.max(numberOfMonths, 3) == 3 && 'md:grid-cols-3',
            Math.max(numberOfMonths, 2) == 2 && 'md:grid-cols-2'
          )}
        >
          {months.map(({ month, monthName, year }) => (
            <div
              key={`${month}-${year}`}
              className='flex-1 min-w-[340px] [&:not(:first-child)]:hidden md:[&:not(:first-child)]:block'
            >
              <h4 className='text-xl text-center mb-2 font-semibold'>
                {monthName} {year}
              </h4>
              <CalendarMonth
                month={month}
                year={year}
                onHoverDateChange={setHoveredDate}
                onChange={handleSelectDate}
                renderPlaceholder={renderPlaceholder}
                classNames={{
                  dateCell: (d) => dateCellClass(d, dateRange, hoveredDate),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function dateCellClass(
  d: Date,
  dateRange: { startDate: Date | undefined; endDate: Date | undefined },
  hoveredDate: Date | null
) {
  const classNames = cn(
    'text-grey-500 font-semibold',
    !!dateRange.startDate &&
      !dateRange.endDate &&
      !!hoveredDate &&
      isBetweenDates({ start: dateRange.startDate, end: hoveredDate }, d) &&
      'bg-grey-dark/30',
    !!dateRange.startDate &&
      !!dateRange.endDate &&
      isBetweenDates({ start: dateRange.startDate, end: dateRange.endDate }, d) &&
      'bg-grey-dark/30',
    isSameDay(today(), d) && '[&_>time]:bg-sky-400 [&_time]:text-gray-100',
    dateRange?.startDate && isSameDay(dateRange?.startDate, d) && 'bg-secondary-500 text-grey-500',
    dateRange?.endDate && isSameDay(dateRange?.endDate, d) && 'bg-secondary-500 text-grey-500'
  );
  return classNames;
}

export default RangePicker;
