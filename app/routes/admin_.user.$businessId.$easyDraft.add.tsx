import React, { useCallback, useEffect, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import SelectDropdown from "~/components/ui/Dropdown";
import z from 'zod';
import { callAPI } from '~/session.server';
import type { GenericAPI, DropdownOpts } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import { optionalPassValidation } from '~/lib/string';

const roleTypes = {
  USER: 'user',
  BUSINESSADMIN: 'business-admin'
}

const baseRegisterUserSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional().superRefine(optionalPassValidation),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  confirmPassword: z.string().optional(),
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  role: z.string().min(1, 'Role is required'),
  userPermission: z.enum(['none', 'read', 'read-write']).optional(),
  enterprise: z.boolean(),
  easyDraftUser: z.boolean(),
  forcePasswordChange: z.boolean().optional(),
}).refine((data) => {
  // If role is 'user', userPermission is required
  if (data.role === 'user') {
    return data.userPermission !== undefined;
  }
  return true; // If role is not 'user', skip the userPermission check
}, {
  path: ['userPermission'],
  message: 'User permission is required when role is user'
});

const registerUserSchemaUserRole = baseRegisterUserSchema.refine((arg) => arg.confirmPassword === arg.password, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

const userRoleOptions: DropdownOpts = [
  { label: roleTypes.USER, value: roleTypes.USER },
  { label: roleTypes.BUSINESSADMIN, value: roleTypes.BUSINESSADMIN },
]

const userRoleEasyDraftUserOptions: DropdownOpts = [
  { label: roleTypes.USER, value: roleTypes.USER },
]

export async function loader({ request, params }: LoaderFunctionArgs) {
  console.log('params', params);
  return json({ businessId: params.businessId, easyDraft: params.easyDraft });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  let requestData: { [key: string]: FormDataEntryValue | boolean } = Object.fromEntries(formData);
  requestData.enterprise = requestData.enterprise === "true"
  console.log('requestData', requestData);
  requestData.easyDraftUser = requestData.easyDraftUser === "true"
  requestData.forcePasswordChange = requestData.forcePasswordChange === "true"

  const validation = registerUserSchemaUserRole.safeParse(requestData);

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
    // Send email only if no password was provided (password fields were hidden or empty)
    if (!validation.data.password) {
      const resetRes = await callAPI<GenericAPI>(request, '/api/auth/forgetPassword', { email: validation.data.email, isInvite: true }, 'POST')
      if (!resetRes.success) {
        return json({
          status: 'api error',
          message: 'User added successfully, but email for password setup failed',
          userId: res.response.user?.UserID,
          errors: null,
          fieldErrors: null,
        });
      } else {
        const successMessage = validation.data.forcePasswordChange
          ? res.response.message + ' - User will be prompted to change password on first login'
          : res.response.message + ' - Email for password setup sent';

        return json({
          status: 'success',
          message: successMessage,
          userId: res.response.user?.UserID,
          errors: null,
          fieldErrors: null,
        });
      }
    }

    // If password was provided, don't send email
    const successMessage = validation.data.forcePasswordChange
      ? res.response.message + ' - User will be prompted to change password on first login'
      : res.response.message;

    return json({
      status: 'success',
      message: successMessage,
      userId: res.response.user?.UserID,
      errors: null,
      fieldErrors: null,
    });
  }
}

function RegisterUser() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [userRoleSelection, setUserRoleSelection] = React.useState(roleTypes.USER);
  const [enterprise, setEnterprise] = React.useState(false);
  const [easyDraftUser, setEasyDraftUser] = React.useState(false);
  const [forcePasswordChange, setForcePasswordChange] = React.useState(false);
  const [errors, setErrors] = React.useState(actionData?.fieldErrors ?? {})
  const [permissions, setPermissions] = useState('none');


  const updateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }, [])

  useEffect(() => {
    if (actionData?.status === 'success') {
      formRef.current?.reset();
      document.body.scrollTop = document.documentElement.scrollTop = 0
    }
  }, [actionData?.status]);
  useEffect(() => {
    if (actionData?.fieldErrors) {
      setErrors(actionData.fieldErrors)
    }
  }, [actionData?.fieldErrors])

  useEffect(() => {
    setEasyDraftUser(loaderData?.easyDraft === 'true');
  }, [loaderData.easyDraft]);

  return (
    <>
      {actionData?.status === 'success' && (
        <div className='bg-green-200/50 mb-10 rounded p-5 max-w-xl'>
          <h5 className='text-xl'>{actionData.message}</h5>
          <p className='text-grey-700'>User ID: {actionData.userId}</p>
        </div>
      )}
      {actionData?.status === 'api error' && (
        <div className='bg-error-100/50 mb-10 rounded p-5 max-w-xl'>
          <h5 className='text-xl mb-3'>An error occured</h5>
          <p className='text-grey-700'>{actionData.message}</p>
        </div>
      )}
      <Form ref={formRef} method='post' className='flex flex-col gap-3'>
        <Input type='text' label='User Name' name='username' error={errors['username']?.[0]} onChange={updateInput} />
        {!forcePasswordChange && (
          <>
            <Input type='password' label='Password' name='password' error={errors['password']?.[0]} onChange={updateInput} />
            <Input type='password' label='Confirm Password' name='confirmPassword' error={errors['confirmPassword']?.[0]} onChange={updateInput} />
          </>
        )}
        <Input type='text' label='First Name' name='firstName' error={errors['firstName']?.[0]} onChange={updateInput} />
        <Input type='text' label='Last Name' name='lastName' error={errors['lastName']?.[0]} onChange={updateInput} />
        <Input type='text' label='Email' name='email' error={errors['email']?.[0]} onChange={updateInput} />
        <label className="font-bold">Role</label>
        <SelectDropdown name='role-select' options={userRoleOptions} value={userRoleSelection} type='single' onSelectChange={(val) => {
          setUserRoleSelection(val.value)
        }} />
        {userRoleSelection === 'user' && (
          <>
          <SelectDropdown
            type="single"
            label="Permissions"
            name="permissionsDropdown"
            options={[
              { label: 'None', value: 'none' },
              { label: 'Read', value: 'read' },
              { label: 'Read-Write', value: 'read-write' },
            ]}
            value={permissions}
            className="text-primary-500 w-full"
            onSelectChange={(val) => {
              setPermissions(val.value);
            }}
          />
          <input type="hidden" name="userPermission" value={permissions} />
          </>
        )}
        <input type="hidden" value={String(enterprise)} name="enterprise" />
        <div className="flex gap-4 mt-2">
          <SwitchToggle
            enabled={!!enterprise}
            setEnabled={(checked) => {
              setEnterprise(checked)
              if (checked) {
                setEasyDraftUser(false);
              }
            }}
          />
          <label>Enterprise User</label>
        </div>
        <input type="hidden" value={String(easyDraftUser)} name="easyDraftUser" />
        <div className="flex gap-4 mb-2">
          <SwitchToggle
            enabled={!!easyDraftUser}
            setEnabled={(checked) => {
              setEasyDraftUser(checked);
              if (checked) {
                setEnterprise(false); // For EasyDraftUser - enterprise will be false
                setUserRoleSelection(roleTypes.USER) // For EasyDraftUser - reset role to user
              }
            }}
          />
          <label>Easy Draft User</label>
        </div>
        <div className="flex gap-4 mb-4">
          <SwitchToggle
            enabled={forcePasswordChange}
            setEnabled={setForcePasswordChange}
          />
          <label>User must change password at next login</label>
        </div>
        <input type="hidden" name='role' value={userRoleSelection} readOnly />
        <input type="hidden" name="businessId" value={loaderData.businessId} readOnly />
        <input type="hidden" name="forcePasswordChange" value={String(forcePasswordChange)} />
        <Button type='submit' className='w-max ml-auto mt-3 px-6'>
          Add
        </Button>
      </Form>
    </>
  );
}

export default RegisterUser;
