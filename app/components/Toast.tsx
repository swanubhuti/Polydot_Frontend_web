import toast, { Toaster, type DefaultToastOptions } from 'react-hot-toast';
import { AnimatedErrorIcon } from './icons/AnimatedErrorIcon';
import { cn } from '~/lib/utils';
import { BiInfoCircle } from 'react-icons/bi';

const TOAST_OPTIONS: DefaultToastOptions = {
  error: {
    style: {
      background: '#c23e3e',
      color: 'white',
    },
    icon: <AnimatedErrorIcon />,
  },
};

export const Toast = () => {
  return <Toaster toastOptions={TOAST_OPTIONS} />;
};

export const toastInfo = (
  { title, message }: { title: string; message: string },
  options: DefaultToastOptions = { position: 'top-right', duration: 3000 }
) => {
  toast.custom(
    (t) => (
      <div
        className={cn(
          'max-w-md w-full bg-white  shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 p-4',
          options && options.position === 'top-right' && t.visible && 'animate-slideInFromRight',
          options && options.position === 'top-right' && !t.visible && 'animate-slideOutToLeft'
        )}
      >
        <div className='flex items-start'>
          <BiInfoCircle className='block size-10 text-blue-500' />
          <div className='ml-3 flex-1'>
            <p className='font-semibold text-blue-500'>{title}</p>
            <p className='mt-1 text-sm text-gray-500'>{message}</p>
          </div>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className='ml-auto mt-2 border border-transparent rounded py-2 px-8 flex items-center justify-center text-sm font-medium text-white hover:bg-blue-600 bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        >
          Close
        </button>
      </div>
    ),
    options
  );
};
