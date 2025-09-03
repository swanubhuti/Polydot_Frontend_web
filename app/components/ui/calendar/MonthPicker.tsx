import { useEffect, useRef, useState } from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { FaCalendar, FaRegCalendar } from 'react-icons/fa6';

export type DatePickerProps = {
  value?: string;
  onChange: (v: string) => void;
  minDate?: string,
  maxDate?: string
};

const monthList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const MonthPicker = ({ value, onChange, minDate, maxDate }: DatePickerProps) => {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(value ? Number(value.split('-')[1]) : new Date().getMonth() + 1)
  const [year, setYear] = useState(value ? Number(value.split('-')[0]) : new Date().getFullYear())
  const minMonth = minDate ? Number(minDate.split('-')[1]) : undefined
  const minYear = minDate ? Number(minDate.split('-')[0]) : undefined
  const maxMonth = maxDate ? Number(maxDate.split('-')[1]) : undefined
  const maxYear = maxDate ? Number(maxDate.split('-')[0]) : undefined

  const ref = useRef<null | HTMLDivElement>(null)

  useEffect(() => {
    function closeOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", closeOutside)
    return () => document.removeEventListener("click", closeOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="border border-gray-300 py-2 px-3 bg-white rounded-sm text-gray-800 flex justify-between items-center min-w-[130px]" onClick={() => setOpen(!open)}>
        <span>{monthList[month-1]} {year}</span>
        <FaRegCalendar className="text-gray-500" />
      </button>
      {open && <div aria-label='Date Picker' className='overflow-hidden absolute w-80 top-full mt-1 left-0 z-40 bg-white shadow rounded'>
        <div className="bg-gray-100 p-2 flex justify-between">
          <button
            type='button'
            disabled={minYear ? year === minYear : false}
            className={`${minYear && year === minYear ? 'text-grey-500' : 'text-grey-800'}`}
            aria-label='Previous Year'
            onClick={() => {
              setYear(year - 1)
              onChange(`${year - 1}-${month}`)
            }}
          >
            <BiChevronLeft className='w-6 h-6 md:w-8 md:h-8' />
          </button>
          <h2 className='text-center text-xl'>
            {year}
          </h2>
          <button type='button' 
            className={`${maxYear && year === maxYear ? 'text-grey-500' : 'text-grey-800'}`} 
            aria-label='Next Year'
            disabled={maxYear ? year === maxYear : false}
            onClick={() => {
              setYear(year + 1)
              onChange(`${year + 1}-${month}`)
            }}
          >
            <BiChevronRight className='w-6 h-6 md:w-8 md:h-8' />
          </button>
        </div>
        <div className="grid gap-2 grid-cols-4 p-2 pb-4">
          {monthList.map((ml, i) => <button type="button" 
            key={`month-${i}`} 
            disabled={(!!minMonth && (minYear === year && minMonth > i + 1)) 
                    || (!!maxMonth && (maxYear === year && maxMonth < i + 1))}
            className={`py-3 text-center ${month === i+1 ? 'bg-primary-100' : ''} ${(!!minMonth && (minYear === year && minMonth > i + 1)) 
              || (!!maxMonth && (maxYear === year && maxMonth < i + 1)) ? 'text-gray-400' : 'hover:bg-gray-100'}`}
            onClick={() => {
              setMonth(i + 1)
              onChange(`${year}-${i + 1}`)
            }}>{ml}</button>)}
        </div>
      </div>}
    </div>
  );
};

export default MonthPicker;
