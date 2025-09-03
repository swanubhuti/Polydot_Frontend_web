import React from 'react';
import companyLogo from '~/images/easydairy-logo.jpg';
import { z } from 'zod';
import { redirect, type LoaderFunctionArgs, json, type ActionFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigate, useSubmit } from '@remix-run/react';
import { getUserAccessToken } from "~/session.server";

import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import Dialog from '~/components/ui/Dialog';
import { passValidation } from '~/lib/string';

const formInputSchema = z
  .object({
    password: z.string().min(1, 'New Password is required').superRefine(passValidation),
    confirmPassword: z.string().min(1, 'Confirm New Password is required'),
  })
  .refine(
    (d) => {
      return d.password === d.confirmPassword;
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  );

type FormInputError = {
  [k in keyof z.infer<typeof formInputSchema>]?: string;
} & {
  code?: string;
};

export const meta: MetaFunction = () => {
  return [
    { title: 'Easy Dairy | Set Password' },
    { name: "description", content: "Set your password" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // const {accessToken, userData, headers} = await getUserAccessToken(request);
  // if (accessToken) {
  //   return redirect(userData && userData.Role === 'admin' ? "/admin" : "/dashboard", headers);
  // }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const email = url.searchParams.get('email');
  const errorMessage = 'The Link is Expired or Invalid';
  if (!code || !email) {
    return json({
      status: 'code_invalid',
      error: errorMessage,
      code: '',
      email: '',
    });
  }

  const verifyUrl = new URL(`${process.env.BASE_URL}/api/auth/forgetPassword/verify`);

  verifyUrl.searchParams.set('code', code);
  verifyUrl.searchParams.set('email', email);
  try {
    const res = await fetch(verifyUrl.toString(), {
      method: 'GET',
    });
    const body = await res.json();
    console.log('verify reset body', body);
    if (res.status === 400) {
      return json({
        status: 'code_invalid',
        error: errorMessage,
        code: '',
        email: '',
      });
    } else if (res.status !== 200) {
      return json({
        status: 'code_invalid',
        error: (body?.message as string) || 'Something went wrong',
        code: '',
        email: '',
      });
    }
    return json({
      status: 'success',
      error: '',
      code,
      email,
      requiresForcePasswordChange: body.requiresForcePasswordChange || false
    });
  } catch (error) {
    console.log('error verify password', error);
    return json({
      status: 'code_invalid',
      error: 'Something went wrong',
      code: '',
      email: '',
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = formData.get('password')?.toString();
  const confirmPassword = formData.get('confirmPassword')?.toString();
  const code = formData.get('code')?.toString();
  const email = formData.get('email')?.toString();
  const requiresForcePasswordChange = formData.get('requiresForcePasswordChange') === 'true';

  if (!code || !email) {
    return json({ status: 'failure', errors: { code: 'Missing code and email' } });
  }

  // validate
  const validation = formInputSchema.safeParse({
    password: password,
    confirmPassword: confirmPassword,
  });
  if (validation.success === false) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    return json({
      status: 'failure',
      errors: {
        password: fieldErrors?.password?.[0],
        confirmPassword: fieldErrors?.confirmPassword?.[0],
      },
    });
  }

  try {
    const payload: Record<string, any> = {
      code,
      email,
      password,
    };

    if (requiresForcePasswordChange) {
      payload.resetForcePasswordChange = true;
    }

    const res = await fetch(`${process.env.BASE_URL}/api/auth/resetPassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (res.status !== 200) {
      return json({ status: 'failure', errors: { code: 'Failed to set password' } });
    }

    return json({ status: 'success', errors: {} });

  } catch (error) {
    console.log('error setting password', error);
    return json({ status: 'failure', errors: { code: 'Something went wrong. Fail to set password' } });
  }
}

export default function Invitation() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<{ status: string; errors?: FormInputError }>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [errors, setErrors] = React.useState<FormInputError>({
    password: undefined,
    confirmPassword: undefined,
  });
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    formData.append('code', loaderData.code);
    formData.append('email', loaderData.email);
    formData.append('requiresForcePasswordChange', String((loaderData as any).requiresForcePasswordChange || false));

    const validation = formInputSchema.safeParse({
      password: password,
      confirmPassword: confirmPassword,
    });
    if (validation.success === false) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors({
        password: fieldErrors?.password?.[0],
        confirmPassword: fieldErrors?.confirmPassword?.[0],
      });
      return;
    }
    submit(formData, { method: 'post' });
    setErrors({});
  };

  return (
    <>
      <Dialog
        isOpen={!actionData?.status && loaderData?.status === 'code_invalid'}
        color='error'
        icon='error'
        title={loaderData.error}
        buttons={[
          {
            text: 'Return to login',
            variant: 'black',
            className: 'mt-8 w-full font-bold text-lg',
            onClick: () => {
              navigate('/');
            },
          },
        ]}
      />
      <Dialog
        isOpen={actionData?.status === 'success'}
        color='primary'
        icon='success'
        title='Success'
        message='Password set successfully'
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
      <div className='flex flex-col min-h-screen justify-center'>
        <div className='flex-grow flex-col flex items-center justify-center space-y-8 px-4 sm:px-6 lg:px-8'>
          <img src={companyLogo} alt='Easy Dairy Logo' className='mx-auto md:h-32 md:w-64 w-44 h-20' />
          <h2 className='mt-10 text-center text-2xl leading-10'>Set your password</h2>
          {(loaderData as any).requiresForcePasswordChange ? (
            <div className="text-center mt-2 leading-6">
              <p className="text-yellow-600 font-medium">⚠️ Password Setup Required</p>
              <p>Set your password below. You'll be able to login immediately after setting it.</p>
            </div>
          ) : (
            <p className='text-center mt-2 leading-6'>Almost done. Enter your new password and you are good to go.</p>
          )}
          <Form className='space-y-6 mx-auto xs:min-w-[290px] min-w-0 pb-4' onSubmit={handleSubmit}>
            <div>
              <Input label='New Password' id='password' name='password' type='password' error={errors.password} />
            </div>
            <div className='mt-8 mb-8'>
              <Input
                label='Confirm New Password'
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                error={errors.confirmPassword}
              />
            </div>
            {actionData?.errors?.code && (
              <p className='my-2 text-error-500 text-sm text-center'>{actionData?.errors?.code}</p>
            )}
            <Button className='w-full' type='submit'>
              Set Password
            </Button>
            <p className="mt-3 text-center">*The password must have a minimum of 8 characters and;</p>
            <ul className="list-disc mt-1 list-inside p-1">
              <li>Contain at least one upper case alphabetical character.</li>
              <li>Contain at least one lowercase alphabetical character.</li>
              <li>Contain at least one numeric character.</li>
              <li>Contain at least one special character.</li>
            </ul>
          </Form>
        </div>
      </div>
    </>
  );
}
