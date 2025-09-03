import {useState, Fragment} from 'react';
import { Combobox, Transition } from '@headlessui/react'
import { FaAngleDown } from 'react-icons/fa6';

type Props = {
  label?: string;
  options: {label: string, value: string}[];
  onSelectChange: (opt: any) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean,
  value?: {label: string, value: string};
}

const Autocomplete = ({ className, disabled = false, label, options, onSelectChange, ...props }: Props) => {
  const [query, setQuery] = useState('')

  const filteredResults =
    query === ''
      ? options
      : options.filter((opt) =>
          opt.label
            .toLowerCase()
            .includes(query.toLowerCase())
        )

  return (
      <Combobox value={props.value?.label ?? ""} onChange={onSelectChange} nullable>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden bg-white text-left border border-gray-300">
            <Combobox.Input
              className={`w-full border-none py-2 pl-3 pr-10 text-sm leading-5 outline-none text-gray-900 ${className ?? ""}`}
              // displayValue={(opt) => opt}
              placeholder={props.placeholder ?? "Search"}
              required={props.required}
              onChange={(event) => setQuery(event.target?.value ?? '')}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <FaAngleDown
                className="h-3 w-3 mt-1 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md shadow-lg bg-white py-1 z-50">
              {filteredResults.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filteredResults.map((res) => (
                  <Combobox.Option
                    key={res.value}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 px-4 text-left ${
                        active ? 'bg-primary-500 text-white' : 'text-gray-900'
                      }`
                    }
                    value={res}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {res.label}
                        </span>
                        {/*selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-teal-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          ) : null*/}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
  )
}

export default Autocomplete;
