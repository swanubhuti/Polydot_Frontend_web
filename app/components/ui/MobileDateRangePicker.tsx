import React, { useCallback, useState } from 'react';
import { dd_mm_yyyy, toUTCDay } from '~/lib/datetime';
import CalendarRangePicker from './calendar/RangePicker';
import { BiChevronDown } from 'react-icons/bi';
import Button from './Button';
import DateInput from './DateInput';
import useScreenSize from '~/hooks/useScreenSize';
import { Dialog } from '@headlessui/react';
import moment from 'moment';

function today() {
  return new Date(toUTCDay(new Date()));
}

type DatePrangePickerProps = {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  onChange: (range: { startDate: Date; endDate: Date, error?: string }) => void;
  renderPlaceholder?: (d: Date) => React.ReactNode;
  validateFn?: (range: { startDate: Date; endDate: Date }) => (Error | null);
};

const MEDIUM_SCREEN_WIDTH = 768;

const MobileDateRangePicker = ({
  startDate = today(),
  endDate = today(),
  onChange,
  renderPlaceholder,
  validateFn
}: DatePrangePickerProps) => {
  const [calendarIsOpen, setCalendarIsOpen] = React.useState(false);
  const screenSize = useScreenSize();

  const handleOpenCalendar = () => {
    if (screenSize.width < MEDIUM_SCREEN_WIDTH) {
      setCalendarIsOpen(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const handleCloseCalendar = () => {
    setCalendarIsOpen(false);
    if (screenSize.width < MEDIUM_SCREEN_WIDTH) {
      document.body.style.overflow = 'auto';
    }
  };

  const [errorMessage, setErrorMessage] = useState('');

  const validateRange = useCallback(({startDate, endDate}:{startDate:Date; endDate:Date;}) => {
    if (moment(endDate).diff(startDate, 'day') < 0) {
      return new Error('Range is invalid.');
    }
    if (validateFn) {
      return validateFn({startDate, endDate});
    }
    return null;
  }, [validateFn]);

  return (
    <>
      <div
        aria-label='Select Start Date'
        id='startDate'
        className='grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-5 flex-1'
      >
        <div className='flex flex-col min-w-[150px]'>
          <label className='text-base text-black font-bold mb-2'>Start Date</label>
          <div className='relative'>
            <DateInput
              className='hidden md:block'
              id='startDate'
              onFocus={handleOpenCalendar}
              name='start'
              value={startDate}
              onChange={(d) => {
                const err = validateRange({startDate: d, endDate});
                setErrorMessage(err?.message ?? '');
                if (err !== null && !err.message.includes('Range')) {
                  return;
                }
                onChange({
                  startDate: d,
                  endDate: endDate,
                  error: err?.message ?? ''
                });
              }}
              error={!!errorMessage}
            />
            {
              !!errorMessage && <p className='mt-1 text-error text-sm'>{errorMessage}</p>
            }
            <div
              className='md:hidden rounded border px-3 py-2 outline-none w-full border-grey-dark'
              onClick={handleOpenCalendar}
            >
              {dd_mm_yyyy(startDate)}
            </div>
            {!calendarIsOpen && (
              <button type='button' className='absolute top-2 right-1 md:hidden' onClick={handleOpenCalendar}>
                <BiChevronDown className='w-6 h-6 fill-slate-300' />
              </button>
            )}
          </div>
        </div>
        <div className='flex flex-col min-w-[150px]'>
          <label className='text-base text-black font-bold mb-2'>End Date</label>
          <div className='relative'>
            <div
              className='md:hidden rounded border px-3 py-2 outline-none w-full border-grey-dark'
              onClick={handleOpenCalendar}
            >
              {dd_mm_yyyy(endDate)}
            </div>
            <DateInput
              className='hidden md:block'
              id='endDate'
              onFocus={handleOpenCalendar}
              name='end'
              value={endDate}
              onChange={(d) => {
                const err = validateRange({startDate, endDate: d});
                setErrorMessage(err?.message ?? '');
                if (err !== null && !err.message.includes('Range')) {
                  return;
                }
                onChange({
                  startDate: startDate,
                  endDate: d,
                  error: err?.message ?? ''
                });
              }}
              error={!!errorMessage}
            />
            {!calendarIsOpen && (
              <button type='button' className='absolute top-2 right-1 md:hidden' onClick={handleOpenCalendar}>
                <BiChevronDown className='w-6 h-6 fill-slate-300' />
              </button>
            )}
          </div>
        </div>
      </div>
      {screenSize.width < MEDIUM_SCREEN_WIDTH && (
        <Dialog
          open={calendarIsOpen}
          onClose={handleCloseCalendar}
          className={`md:hidden fixed inset-0 z-50 flex justify-center items-center bg-black/30 backdrop-blur-sm`}
        >
          <Dialog.Panel className='bg-white px-3 py-2 rounded-lg shadow-lg min-h-[98dvh] w-[98dvw]'>
            <section className='pt-2 pb-9 sm:pt-4 sm:pb-2'>
              <CalendarRangePicker
                onChange={(d) => {
                  onChange(d)
                  handleCloseCalendar()
                }}
                range={{ startDate, endDate }}
                numberOfMonths={1}
                renderPlaceholder={renderPlaceholder}
              />
            </section>
            <hr className='border-t border-t-grey-light mx-2 sm:mx-4 my-1' />
            <section className='flex flex-row gap-3 bg-grey-light md:bg-transparent px-5 py-2'>
              <Button
                type='button'
                variant='link'
                className='px-4 py-2 md:hidden'
                onClick={() => {
                  handleCloseCalendar();
                }}
              >
                Close
              </Button>
            </section>
          </Dialog.Panel>
        </Dialog>
      )}
    </>
  );
};

export default MobileDateRangePicker;
