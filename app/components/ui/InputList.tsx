import React, { forwardRef, useEffect, useState } from 'react';
import { InputLabel } from "./Input";
import Button from "./Button";
import { cn } from '../../lib/utils';
import { IoWarningOutline, IoAdd, IoClose } from 'react-icons/io5/index.js';

const classes = {
    base: 'text-inherit appearance-none relative block w-full px-4 py-2 border rounded-sm placeholder-grey-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 md:text-base md:placeholder:text-base text-sm placeholder:text-sm',
    disabled: 'opacity-30 cursor-default',
    error: 'border-error-500 placeholder:text-error-400',
    normal: 'border-grey-dark text-black',
  } as const;

// interface Props extends React.ComponentPropsWithoutRef<'input'> {
//     error?: string;
//     label?: string;
//     value?: string[];
// }
type PropType = {
    name: string,
    label: string,
    value?: string[],
    onSet?: (val: string[])=>void,
    error?: string
}

const InputList: React.FC<PropType> = ({name, label, value, onSet, error}) => {

    let [dairyIds, setDairyIds] = useState(value? value: [])

    const setIds = (val: string[])=>{
        setDairyIds(val)
        if (onSet) {
            onSet(val)
        }
    }

    return (
        <div className='w-full'>
            <div className='flex justify-between items-center my-1'>
                {label && (
                    <InputLabel className='mb-1.5' htmlFor={name}>
                        {label}
                    </InputLabel>
                )}
                <Button
                    onClick={()=>{
                        const newIds = [...dairyIds, ""]
                        setIds(newIds);
                    }}
                >
                    <IoAdd/>
                </Button>
            </div>
            {error && <p className='text-error-500 text-sm text-left'>{error}</p>}

            <div className='relative w-full'>
                {dairyIds.map((val, index)=>(
                    <div key={index} className='my-1 flex justify-between'>
                        <input
                            name={name}
                            value={val}
                            autoComplete={'off'}
                            className={cn(classes.base, error ? classes.error : classes.normal)}
                            onChange={(e)=>{
                                const newIds = [...dairyIds]
                                newIds[index] = e.target.value
                                setIds(newIds);
                            }}
                        />
                        <button
                            className='px-4 py-2'
                            onClick={()=>{
                                const newIds = [...dairyIds]
                                newIds.splice(index, 1)
                                setIds(newIds);
                            }}
                        >
                            <IoClose/>
                        </button>
                    </div>    
                ))}
            </div>
            
        </div>
    )
}
InputList.displayName = 'TextInputList';
  
export default InputList;