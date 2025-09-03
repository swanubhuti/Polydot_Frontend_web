import { BiSolidCheckCircle } from 'react-icons/bi';
import { IoIosCloseCircle } from "react-icons/io";

import Button, { type ButtonProps } from './Button';
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from "react";
import { FaXmark } from 'react-icons/fa6';
import { cn } from '~/lib/utils';
import { IoWarning } from 'react-icons/io5';

enum ColorPresets {
  primary = 'text-primary-500',
  warn = 'text-yellow-500',
  error = 'text-error-500',
}

export type ColorPresetKeys = keyof typeof ColorPresets;
export interface DialogProps {
  isOpen: boolean;
  buttons?: {
    onClick: () => void;
    text: string;
    variant?: ButtonProps['variant'];
    className?: string;
  }[];
  title?: string;
  message?: string;
  icon?: string;
  color?: ColorPresetKeys;
}

const DialogModal :React.FC<DialogProps> =(
  ({ isOpen, title, message, icon, buttons, color }: DialogProps) => {
    const colorClass = ColorPresets[color as ColorPresetKeys];

    return (
      <Transition
        show={isOpen}
        enter="transition duration-1000 ease-out"
        enterFrom="transform scale-50 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-1000 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-50 opacity-0"
        as={Fragment}
      >
        <Dialog open={isOpen} onClose={() => {}} className={`fixed inset-0 z-50 flex justify-center items-center transition-opacity duration-500 ${isOpen ? "bg-black/30 backdrop-blur-sm" : "pointer-events-none bg-black/0"}`}>
          <Dialog.Panel className="bg-white px-24 py-12 rounded-lg shadow-lg text-center mx-auto max-w-xl">
            <div className="flex justify-center">
              {icon == 'success' && (<BiSolidCheckCircle className={`text-7xl ${colorClass}`}/>)}
              {icon == 'error' && <IoIosCloseCircle className={`text-8xl ${colorClass}`} />}
              {icon == 'warn' && <IoWarning className={`text-8xl ${colorClass}`} />}
            </div>
            <Dialog.Title className="mt-2 text-center font-semibold text-2xl font-signika">{title}</Dialog.Title>
            <Dialog.Description className="mt-1 mb-8 text-[16px]">
              {message}
            </Dialog.Description>
            <div className="flex gap-2 justify-center">
              {buttons?.map((bt, idx) => <Button className={cn("min-w-[130px]", bt.className)} variant={bt.variant} key={`modalButton-${idx}`} onClick={bt.onClick}>{bt.text}</Button>)}
            </div>
          </Dialog.Panel>
        </Dialog>
      </Transition>
    );
  }
);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string,
  title: string,
  classes?: string,
  updater?: (param: any) => void,
  children?: string | JSX.Element
}

export const ModalBox :React.FC<ModalProps> =(
  ({ isOpen, onClose, url, title, classes, children }: ModalProps) => {
    const [urlLoad, setUrlLoad] = useState(false)
    const [urlChange, setUrlChange] = useState(url)

    useEffect(() => {
      setUrlLoad(false)
      setUrlChange(url)
    }, [url])
    return (
      <Transition
        show={isOpen}
        enter="transition duration-1000 ease-out"
        enterFrom="transform scale-50 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-1000 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-50 opacity-0"
        as={Fragment}
      >
        <Dialog open={isOpen} onClose={() => {}} className={`fixed inset-0 z-40 flex justify-center items-center transition-opacity duration-500 ${isOpen ? "bg-black/30 backdrop-blur-sm" : "pointer-events-none bg-black/0"}`}>
          <Dialog.Panel className={`bg-white px-4 pb-4 rounded-lg shadow-lg text-center mx-auto max-w-4xl ${classes}`}>
            <div className="py-3 border-b flex justify-between gap-2 mb-3">
              <h3 className="text-2xl">{title}</h3>
              <button type="button" className='print:hidden' onClick={() => {
                setUrlLoad(false)
                onClose()
              }}>
                <FaXmark />
              </button>
            </div>
            {children}
            {urlChange && <div className="w-full h-[calc(100%-70px)] relative">
              <iframe className="w-full h-full" title={title} src={urlChange} onLoad={() => setUrlLoad(true)}></iframe>
              {!urlLoad && <div className="flex absolute inset-0 justify-center items-center z-10"><svg aria-hidden="true" className="w-8 h-8 animate-spin text-primary-500 fill-primary-100" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg></div>}
            </div>}
          </Dialog.Panel>
        </Dialog>
      </Transition>
    );
  }
);

export default DialogModal;
