import { useState, Fragment, useImperativeHandle, useEffect } from 'react';
import { Combobox } from '@headlessui/react'
import { InputLabel } from "./Input";
import { cn } from '../../lib/utils';
import { IoWarningOutline } from 'react-icons/io5/index.js';

type Props = {
    label?: string;
    options?: {label: string, value: string}[];
    className?: string;
    disabled?: boolean;
    value?: any;
    id?: string;
    name?: string;
    error?: string;
    url?: string;
    placeholder?: string;
    onSelectChange: (opt: any) => void;
}

const classes = {
  base: 'relative text-inherit appearance-none relative block w-full px-4 py-2 border rounded-sm placeholder-grey-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 md:text-base md:placeholder:text-base text-sm placeholder:text-sm',
  disabled: 'opacity-30 cursor-default',
  error: 'border-error-500 placeholder:text-error-400',
  normal: 'border-grey-dark text-black',
} as const;

const SearchableDropdown = ({ className, disabled = false, error, label, options, url, placeholder, onSelectChange, value, ...props }: Props) => {
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [filteredOptions, setFilteredOptions] = useState<{ label: string; value: string; }[]>([])
  // const fetcher = useFetcher();

  useEffect(() => {
    const filteredOptions =
    query === ''
      ? []
      : options?.filter((option) => {
          return option.label.toString().toLowerCase().includes(query.toLowerCase())
        })
    setFilteredOptions(filteredOptions ?? [])
  }, [query])

  useEffect(() => {
    if (selected) {
      onSelectChange(selected)
    }
  }, [selected])
  

    return (
      <div className="flex flex-col w-full">
        {label && (
          <InputLabel className='mb-1.5' htmlFor={props.name}>
            {label}
          </InputLabel>
        )}
        <div className='relative w-full'>
          <Combobox value={selected} onChange={setSelected}>
            <Combobox.Input
              onChange={(event) => setQuery(event.target.value)}
              displayValue={(option: {label: string, value: string}) => option.label}
              className={cn(classes.base, disabled && classes.disabled, error ? classes.error : classes.normal, className)}
              placeholder={placeholder ?? ''}
              value={value}
            />
            <Combobox.Options className={'absolute left-0 top-full w-full mt-1 z-20 shadow-lg bg-white rounded py-1 max-h-64 overflow-auto'}>
              {filteredOptions ? 
                filteredOptions.map((option: any) => (
                  /* Use the `active` state to conditionally style the active option. */
                  /* Use the `selected` state to conditionally style the selected option. */
                  <Combobox.Option key={option.label} value={option} as={Fragment}>
                    {({ active, selected }) => (
                      <li
                        className={`px-3 py-2 w-full flex items-center text-left cursor-pointer ${active ? 'bg-blue-500 text-white' : 'text-gray-800'}`}
                      >
                        {/* {selected && <FaCheck />} */}
                        {option.label}
                      </li>
                    )}
                  </Combobox.Option>
                ))
                :
                <div>Not Found</div>
              }
            </Combobox.Options>
          </Combobox>
          {error && (
            <span className='absolute z-10 top-[50%] -translate-y-[50%] right-2 pointer-events-none text-error-500'>
              <IoWarningOutline />
            </span>
          )}
        </div>
        {error && <p className='text-error-500 text-sm text-right'>{error}</p>}
      </div>
    );
  }
  
  export default SearchableDropdown;