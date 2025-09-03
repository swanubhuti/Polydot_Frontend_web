import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { IoSearch } from 'react-icons/io5/index.js';
import SelectDropdown from './Dropdown';
import moment from "moment";

const classes = {
  base: 'text-inherit appearance-none rounded-lg relative block w-full px-4 py-2 border placeholder-grey-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-base placeholder:text-base',
  disabled: 'opacity-30 cursor-default',
  error: 'border-error-500',
  normal: 'border-grey-dark text-black',
  withOpt: 'rounded-r-none'
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

interface Props extends Omit<React.ComponentPropsWithoutRef<'input'>, 'onChange'> {
  error?: string;
  label?: string;
  options?: {label: string, value: string, isDateField?: boolean}[],
  defaultSearch?: string;
  onChange: (val: string, opt?: string) => void
  searchClick?: () => void
}

const Search = ({ className, disabled = false, error, defaultSearch, onChange, label, options, ...props }: Props) => {
  const currValue = useRef('')
  const [searchType, setSearchType] = useState(defaultSearch ?? "")
  const [isDateField, setIsDateField] = useState<boolean>(false)
  return (
    <div className='w-full'>
      {label && (
        <InputLabel className='mb-1.5' htmlFor={props.name}>
          {label}
        </InputLabel>
      )}
      <div className='relative w-full flex items-center'>
        <input
          id={`input-${props.name ?? 'search'}`}
          autoComplete={'off'}
          onChange={(e) => {
            let val = (isDateField && moment(e.target.value).isValid()) ? moment(e.target.value).format("DD/MM/YYYY") : e.target.value
            if (val && defaultSearch && isDateField && (searchType.toLowerCase().includes('date') || (searchType.includes('Due') && !searchType.includes('Days')))) {
              if (/^((\d{2}-\d{2}-\d{4})|(\d{2}\/\d{2}\/\d{4}))/.test(val)) {
                onChange(val, defaultSearch ? searchType : undefined)
              }
            } else {
              onChange(val, defaultSearch ? searchType : undefined)
            }
            currValue.current = val
          }}
          type={isDateField ? 'date' : ''}
          className={ isDateField ? 
            `text-inherit md:min-w-[260px] appearance-none min-h-[36px] rounded bg-white border-gray-300 text-dark relative block w-full px-3 py-[7px] border placeholder-grey-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 md:text-base md:placeholder:text-base text-sm placeholder:text-sm` : 
            cn(classes.base, props.searchClick ? 'pr-8' : 'pl-8', disabled && classes.disabled, error ? classes.error : classes.normal, options && classes.withOpt, className)}
          {...props}
        />
        {options && 
          <SelectDropdown className="rounded-l-none border-l-0 whitespace-nowrap" value={searchType} type="single" options={options} 
            onSelectChange={(opt) => {
              if (currValue.current) {
                onChange(currValue.current, opt.value)
              }
              setSearchType(opt.value)
              setIsDateField(opt.isDateField)
            }}  />}
        <label htmlFor={`input-${props.name ?? 'search'}`} className={`absolute top-2.5 text-gray-500 text-xl ${props.searchClick ? 'cursor-pointer right-2' : 'left-2'}`} onClick={() => {
          props.searchClick && props.searchClick()
        }}>
          <IoSearch />
        </label>
      </div>
      {error && <p className='text-error-500 text-sm text-right'>{error}</p>}
    </div>
  )
};

export default Search;
