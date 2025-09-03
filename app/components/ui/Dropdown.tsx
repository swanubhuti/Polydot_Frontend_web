import {useEffect, useMemo, useRef, useState} from 'react';
import { Listbox } from '@headlessui/react'
import { FaAngleDown, FaCheck } from 'react-icons/fa6';
import { cn } from '~/lib/utils';

type Props = {
  label?: string;
  options: {label: string, value: string | number, count?: number, hidden?: boolean, tooltip?: React.ReactNode}[];
  onSelectChange: (opt: any) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  type?: 'multiple' | 'single';
  count?: boolean;
  value?: any;
  noMinWidth?: boolean;
  parentBlock?: boolean;
  placeholder?: string;
  labelClass?: string;
  selectAll?: string
} & ({
  type: 'multiple';
  value?: {label:string, value:string}[],
} | {
  type: 'single';
  value?: string;
})

const SelectDropdown = ({ className, disabled = false, label, labelClass, options, parentBlock, placeholder = 'Select', noMinWidth, onSelectChange, type = 'single', ...props }: Props) => {
  const displayValue = useMemo(() => {
    if (Array.isArray(props.value)) {
      if (props.value.length > 3) {
        return props.value.length + ' selected'
      }
      // return options.filter(v => props.value.includes(v.value)).map((v) => v.label).join(', ')
      return props.value.map((v) => v.label).join(', ')
    } else {
      return options.find(opt => opt.value === props.value)?.label
    }
  }, [props.value, options])
  return (
    <>
      {label && <label
        htmlFor={props.name}
        className={cn("block leading-6 font-bold text-sm md:text-base mb-1.5 text-black", labelClass)}
      >
        {label}
      </label>}
      <div className={`relative ${parentBlock ? '' : 'lg:inline-block'}`}>
        <Listbox as={'div'} value={props.value} onChange={(val) => {
          if (type === 'multiple' && props.selectAll) {
            const getAll = val.find((v: any) => v.value === '')
            if (val.length > options.length) {
              onSelectChange([])
              return
            } else if (getAll !== undefined) {
              onSelectChange(options.filter((v: any) => v.value !== ''))
              return
            }
          }
          onSelectChange(val)
        }} disabled={disabled} multiple={type === 'multiple'}>
          <Listbox.Button className={`bg-white border border-gray-300 items-center ${noMinWidth ? '' : 'min-w-[150px]'} rounded text-gray-800 py-2 px-3 flex w-full ${className}`}>
            {displayValue || placeholder}
            {type === 'single' && props.count ? 
              <div className="ml-2 px-1 rounded bg-primary-500 text-white">{options.find(opt => opt.value === props.value)?.count || 0}</div> 
              : ""}
            <FaAngleDown className="text-gray-600 ml-auto mt-1" />
          </Listbox.Button>
          <div className={`absolute left-0 top-full ${noMinWidth ? '' : 'min-w-[150px]'} mt-1 z-20`}>
            <Listbox.Options className="max-h-64 overflow-auto shadow-lg bg-white rounded py-1">
              {type === 'multiple' && !!props.selectAll && 
                <Listbox.Option value={{label: props.selectAll, value: ""}} className={({active}) => `px-3 py-2 w-full flex items-center text-left cursor-pointer ${active ? 'bg-blue-500 text-white' : 'text-gray-800'}`}>
                  {props.selectAll}
                </Listbox.Option>
              }
              {options.map((opt, i) => 
                (!opt.hidden && 
                <Listbox.Option key={`${props.name}-${opt.value}-${i}`} value={opt} className={({active}) => `px-3 py-2 w-full flex items-center text-left cursor-pointer ${active ? 'bg-blue-500 text-white' : 'text-gray-800'}`}>
                  {({selected, active}) => <>
                    {opt.label}
                    {props.count ? 
                    <span className="ml-2 px-1 rounded bg-primary-500 text-white inline-block">{opt.count ?? 0}</span> 
                    : ""}
                    {type === "multiple" && selected && 
                      <span className={`ml-auto ${active ? "text-white" : "text-primary-500"}`}>
                        <FaCheck className="h-4 w-4" aria-hidden="true" />
                      </span>}
                      {active && opt.tooltip && <Tooltip>{opt.tooltip}</Tooltip>}
                  </>}
                </Listbox.Option>)
              )}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>
    </>
  );
}

const Tooltip = ({children}: {children: React.ReactNode}) => {
  const [position, setPosition] = useState('left')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect && rect.left + rect.width > window.innerWidth) {
      setPosition('right')
    }
  }, [])
  return <div ref={ref} className={`absolute ${position === 'right' ? 'right-full mr-1' : 'left-full ml-1'} top-0 bg-white rounded shadow z-10 text-black p-2`}>{children}</div>
}

export default SelectDropdown;
