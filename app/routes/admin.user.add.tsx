import React, { useCallback, useEffect } from 'react';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import z from 'zod';
import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { optionalPassValidation } from '~/lib/string';

const baseRegisterUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional().superRefine(optionalPassValidation),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  confirmPassword: z.string().optional(),
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  role: z.string().min(1, 'Role is required'),
})

// For users with Admin role, businessId will be empty string
const registerUserSchemaAdminRole = baseRegisterUserSchema.refine((arg) => arg.confirmPassword === arg.password, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  let requestData: {[key: string]: FormDataEntryValue | boolean} = Object.fromEntries(formData);
  requestData.enterprise = requestData.enterprise === "true"

  const validation = registerUserSchemaAdminRole.safeParse(requestData);

  if (!validation.success) {
    const fieldErrors = validation.error.flatten()?.fieldErrors;
    return json({
      status: 'validation error',
      message: null,
      userId: null,
      errors: null,
      fieldErrors: fieldErrors,
    });
  }

  const res = await callAPI<GenericAPI>(request, '/api/dev/user', validation.data, 'POST');

  if (!res.success || (res.success && !res.response.user)) {
    return json({
      status: 'api error',
      message: !res.success ? res.response.errors as string : res.response.message,
      userId: null,
      errors: null,
      fieldErrors: null,
    });
  } else {
    if (!validation.data.password) {
      const resetRes = await callAPI<GenericAPI>(request, '/api/auth/forgetPassword', {email:validation.data.email,isInvite: true} , 'POST')
      if (!resetRes.success) {
        return json({
          status: 'api error',
          message: 'Admin added successfully, but email for password setup failed',
          userId: null,
          errors: null,
          fieldErrors: null,
        });
      } else {
        return json({
            status: 'success',
            message: res.response.message+', email for password setup sent',
            userId: res.response.user?.UserID,
            errors: null,
            fieldErrors: null,
          });
      }
    }
    return json({
      status: 'success',
      message: res.response.message,
      userId: res.response.user?.UserID,
      errors: null,
      fieldErrors: null,
    });
  }
}

function RegisterUser() {
  const actionData = useActionData<typeof action>();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState(actionData?.fieldErrors ?? {})

  const updateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors(prev => ({...prev, [e.target.name]: undefined}))
  }, [])

  useEffect(() => {
    if (actionData?.status === 'success') {
      formRef.current?.reset();
    }
  }, [actionData?.status]);
  useEffect(() => {
    if (actionData?.fieldErrors) {
      setErrors(actionData.fieldErrors)
    }
  }, [actionData?.fieldErrors])

  return (
    <>
      {actionData?.status === 'success' && (
        <div className='bg-green-200/50 mb-10 rounded p-5 max-w-xl'>
          <h5 className='text-xl'>{actionData.message.replace('user','admin')}</h5>
          <p className='text-grey-700'>Admin ID: {actionData.userId}</p>
        </div>
      )}
      {actionData?.status === 'api error' && (
        <div className='bg-error-100/50 mb-10 rounded p-5 max-w-xl'>
          <h5 className='text-xl mb-3'>An error occured</h5>
          <p className='text-grey-700'>{actionData.message.replace('user','admin')}</p>
        </div>
      )}
      <h2 className='text-xl lg:text-2xl mb-5'>Register an Admin</h2>
      <Form ref={formRef} method='post' className='max-w-xl flex flex-col gap-3'>
        <Input type='text' label='User Name' name='username' error={errors['username']?.[0]} onChange={updateInput} />
        <Input type='password' label='Password' name='password' error={errors['password']?.[0]} onChange={updateInput} />
        <Input type='password' label='Confirm Password' name='confirmPassword' error={errors['confirmPassword']?.[0]} onChange={updateInput} />
        <Input type='text' label='First Name' name='firstName' error={errors['firstName']?.[0]} onChange={updateInput} />
        <Input type='text' label='Last Name' name='lastName' error={errors['lastName']?.[0]} onChange={updateInput} />
        <Input type='text' label='Email' name='email' error={errors['email']?.[0]} onChange={updateInput} />
        <input type="hidden" name='role' value="admin" readOnly />
        <Button type='submit' className='w-max ml-auto mt-3 px-6'>
          Add
        </Button>
      </Form>
    </>
  );
}

export default RegisterUser;
