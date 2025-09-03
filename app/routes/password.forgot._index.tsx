import { json, type ActionFunctionArgs, type MetaFunction } from '@remix-run/node';
import companyLogo from '../images/easydairy-logo.jpg';
import { BiChevronLeft } from 'react-icons/bi';
import { Form, Link, useActionData, useNavigate } from '@remix-run/react';
import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import { z } from 'zod';
import Dialog from '~/components/ui/Dialog';

export const meta: MetaFunction = () => {
  return [
    { title: 'Easy Dairy | Forgot Password' },
    { name: "description", content: "Easy Dairy forgot password page" },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  if (!email) {
    return json({ status: 'failure', error: 'Email is required' });
  }

  if (z.string().email().safeParse(email).success == false) {
    return json({ status: 'failure', error: 'Invalid Email' });
  }

  try {
    const res = await fetch(`${process.env.BASE_URL}/api/auth/forgetPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
      }),
    });
    const body = await res.json();
    console.log('body', body, res.status);
    if (res.status === 400) {
      return json({ status: 'failure', error: 'Fail to send reset link' });
    }
    if (res.status !== 200) {
      return json({ status: 'failure', error: body?.message || 'Something went wrong' });
    }
    return json({ status: 'success', error: undefined, email: email });
  } catch (error) {
    console.log('forgetPassword error', error);
    return json({ status: 'failure', error: 'Something went wrong' });
  }
}

const ForgotPasswordPage = () => {
  const actionData = useActionData<{ status: string; error?: string; email?: string }>();
  const navigate = useNavigate();
  return (
    <>
      <Dialog
        isOpen={actionData?.status === 'success'}
        color='primary'
        icon='success'
        title={`Reset link sent to ${actionData?.email ?? ''}`}
        message="Please check your email inbox and click on the reset link to reset your password. If it doesn't show up soon, please check your spam folder."
        buttons={[
          {
            text: 'Return to login',
            variant: 'black',
            onClick: () => {
              navigate('/');
            },
          },
        ]}
      />
      <div className='px-8 flex-1 relative mb-10 flex flex-col'>
        <Link
          to='/'
          className='flex flex-row items-center mt-6 font-semibold underline hover:opacity-70 text-primary-500 absolute top-0 left-6'
        >
          <BiChevronLeft className='w-6 h-6 mr-1 inline-block' />
          Back to login
        </Link>
        <div className='my-auto'>
          <img src={companyLogo} alt='Easy Dairy Logo' className='mx-auto md:h-32 md:w-64 w-44 h-20' />
          <h2 className='mt-10 text-center text-2xl leading-10'>Forgot Password?</h2>
          <p className='text-center mt-2 leading-6'>
            Enter your account's email address and we will send you a link to reset your password
          </p>
          <Form className='flex flex-col px-6 mt-10' method='post'>
            <Input
              label='Email Address'
              name='email'
              type='email'
              required
              placeholder='Email Address'
              error={actionData && 'error' in actionData ? actionData?.error : undefined}
            />
            <Button type='submit' className='mx-auto mt-14 w-full'>
              Send Reset Link
            </Button>
          </Form>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
