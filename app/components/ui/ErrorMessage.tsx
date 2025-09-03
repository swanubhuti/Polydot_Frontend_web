import { Link } from '@remix-run/react';
import { FaTriangleExclamation } from 'react-icons/fa6';

const ErrorMessage = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col gap-8 items-center justify-center">
      <div className='flex justify-center items-center gap-2 p-10'>
        <FaTriangleExclamation className='w-5 h-5 text-red-600' />
        <h1 className='text-2xl'>{message}</h1> 
      </div>
      <p className="">If the error persists, try <Link to={'/logout'} className="underline text-primary-500">logging out</Link>.</p>
    </div>
  );
};

export default ErrorMessage;
