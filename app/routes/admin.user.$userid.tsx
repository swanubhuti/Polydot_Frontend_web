import React, { useState, type ChangeEvent, useCallback } from 'react';
import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import SelectDropdown from "~/components/ui/Dropdown";
import z from 'zod';
import { callAPI, getUserAccessToken } from '~/session.server';
import type { GenericAPI, DropdownOpts } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import { optionalPassValidation } from '~/lib/string';

const editAdminSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().optional().superRefine(optionalPassValidation),
    confirmPassword: z.string().optional(),
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    userId: z.string().min(1, 'User ID is required'),
    role: z.literal('admin'),
  })
  .passthrough()
  .refine((arg) => arg.confirmPassword === arg.password, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const editNonAdminSchema = z
  .object({
    businessId: z.string().min(1, 'Business ID is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().optional().superRefine(optionalPassValidation),
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    confirmPassword: z.string().optional(),
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    userId: z.string().min(1, 'User ID is required'),
    enterprise: z.boolean(),
    role: z.enum(['user', 'business-admin']),
    easyDraftUser: z.boolean(),
    userPermission: z.enum(['none', 'read', 'read-write']),
  })
  .refine((arg) => arg.confirmPassword === arg.password, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const editUserSchema = z.union([editAdminSchema, editNonAdminSchema]);

interface UserDetailsType {
  UserID: string;
  BusinessID: string;
  BusinessName: string;
  UserName: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Role: string;
  Enterprise: boolean;
}

interface UserFormDataType {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  businessId: string;
  userId?: string;
  role: string;
  enterprise: boolean;
  easyDraftUser: boolean;
}

type GetUserResponse = {
  user: {
    BusinessID: string,
    BusinessName: string,
    CreatedAt: string,
    Email: string,
    FirstName: string,
    LastName: string,
    Role: "admin"|"user"|"business-admin",
    Status: "active"|"archived",
    UpdatedAt: string,
    UserID: string,
    UserName: string,
    Enterprise: boolean,
    EasyDraftUser: boolean,
    UserPermission: string
  },
  userRoleOptions: DropdownOpts
}

enum roleTypes {
  USER = "user",
  ADMIN = "admin",
  BUSINESSADMIN = "business-admin"
}

export async function loader({request, params}: LoaderFunctionArgs) {
    const userID = params.userid
    const {accessToken, userData, headers} = await getUserAccessToken(request);
    const userList = await callAPI<GenericAPI>(request, `/api/dev/admin/users?search=${userID}`, undefined, 'GET', accessToken)
    if (userList.success && userList.response.data) {
        const user = userList.response.data.find((e: UserDetailsType) => e.UserID === userID)
        if (!user) {
            return redirect(userData && userData.Role === 'admin' ? "/admin" : "/dashboard", headers);
        }
        const userRoleOptions: DropdownOpts = [
          {label: 'user', value: 'user', hidden: (userID === userData.UserID ? true : false)},
          {label: 'admin', value: 'admin', hidden: true},
          {label: 'business-admin', value: 'business-admin', hidden: (userID === userData.UserID ? true : false)},
        ]
        return json({
            user,
            userRoleOptions: userRoleOptions
        })
    }
    return redirect(userData && userData.Role === 'admin' ? "/admin" : "/dashboard", headers);
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  let requestData: {[key: string]: FormDataEntryValue | boolean} = Object.fromEntries(formData);

  requestData.enterprise = requestData.enterprise === "true"
  requestData.easyDraftUser = requestData.easyDraftUser === "true"
  requestData.userPermission = requestData.role === 'admin' || requestData.role === 'business-admin' ? 'read-write' : requestData.userPermission;
  const validation = editUserSchema.safeParse(requestData);
  if (!validation.success) {
    const fieldErrors = validation.error.flatten()?.fieldErrors;
    return json({
      status: 'validation error',
      message: 'Invalid input',
      userId: null,
      errors: null,
      fieldErrors: fieldErrors,
    });
  }
  const res = await callAPI<GenericAPI>(request, '/api/admin/account', validation.data, 'PATCH');
  if (!res.success || (res.success && !res.response.user)) {
    return json({
      status: 'api error',
      message: !res.success ? res.response.errors as string : res.response.message,
      userId: null,
      errors: null,
      fieldErrors: null,
    });
  } else {
    return json({
      status: 'success',
      message: res.response.message,
      userId: res.response.user?.UserID,
      errors: null,
      fieldErrors: null,
    });
  }
}

function EditUser() {
  const actionData = useActionData<typeof action>();
  const data = useLoaderData<GetUserResponse>();
  const [formData, setFormData] = useState<UserFormDataType>({
    username: data.user.UserName,
    password: '',
    confirmPassword: '',
    firstName: data.user.FirstName,
    lastName: data.user.LastName,
    email: data.user.Email,
    businessId: data.user.BusinessID,
    userId: data.user.UserID,
    role: data.user.Role,
    enterprise: data.user.Enterprise,
    easyDraftUser: data.user.EasyDraftUser,
  });
  const [userRoleSelection, setUserRoleSelection] = React.useState(data.user.Role);
  const [permissions, setPermissions] = useState(data.user.UserPermission || 'none');

  const formRef = React.useRef<HTMLFormElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const toggleChangeEnterprise = useCallback((checked: boolean) => {
    if(checked){
      setFormData((prev) => ({...prev, enterprise: checked, easyDraftUser: false}))
    } else {
      setFormData((prev) => ({...prev, enterprise: checked}))
    }
  }, [])

  const toggleChangeEasyDraft = useCallback((checked: boolean) => {
    if(checked){
      setFormData((prev) => ({...prev, easyDraftUser: checked, enterprise: false}))
      setUserRoleSelection( roleTypes.USER )
    } else {
      setFormData((prev) => ({...prev, easyDraftUser: checked}))
    }
  }, [])

  return (
    <>
      <h2 className='text-xl lg:text-2xl mb-5'>Edit User</h2>
      <Form ref={formRef} method='post' className='max-w-xl flex flex-col gap-3'>
        <Input type='text' value={formData.username} onChange={handleChange} label='User Name' name='username' error={actionData?.fieldErrors?.['username']?.[0]} />
        <Input type='password' value={formData.password} onChange={handleChange} label='Password' name='password' error={actionData?.fieldErrors?.['password']?.[0]} />
        <Input type='password' value={formData.confirmPassword} onChange={handleChange} label='Confirm Password' name='confirmPassword' error={actionData?.fieldErrors?.['confirmPassword']?.[0]} />
        <Input type='text' value={formData.firstName} onChange={handleChange} label='First Name' name='firstName' error={actionData?.fieldErrors?.['firstName']?.[0]} />
        <Input type='text' value={formData.lastName} onChange={handleChange} label='Last Name' name='lastName' error={actionData?.fieldErrors?.['lastName']?.[0]} />
        <Input type='text' value={formData.email} onChange={handleChange} label='Email' name='email' error={actionData?.fieldErrors?.['email']?.[0]} />
        <Input type='text' value={formData.businessId} readOnly disabled={true} label='Business ID' />
        <input type='hidden' value={formData.businessId} name='businessId' />
        <input type='hidden' value={userRoleSelection} name='role' readOnly/>
        <input type='hidden' defaultValue={data.user.UserID} name='userId' readOnly/>
        <input type="hidden" value={String(formData.enterprise)} name="enterprise" />
        <div className="flex gap-4 mb-2 mt-2">
          <SwitchToggle enabled={!!formData.enterprise} setEnabled={toggleChangeEnterprise} />
          <label>Enterprise User</label>
        </div>
        <input type="hidden" value={String(formData.easyDraftUser)} name="easyDraftUser" />
        <div className="flex gap-4 mb-2 mt-2">
          <SwitchToggle enabled={!!formData.easyDraftUser} setEnabled={toggleChangeEasyDraft} />
          <label>Easy Draft User</label>
        </div>
        <div className="flex gap-4 mb-2 mt-2">
          <SwitchToggle enabled={!!formData.enterprise} setEnabled={toggleChangeEnterprise} />
          <label>User must change password at next login</label>
        </div>
        <input type="hidden" value={String(formData.easyDraftUser)} name="easyDraftUser" />
        <SelectDropdown type='single' label="Role" name='roleDropdown' options={data.userRoleOptions} value={userRoleSelection} className="text-primary-500" onSelectChange={(val) => {
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
        <Button type='submit' className='w-max ml-auto mt-3 px-6'>
          Save
        </Button>
      </Form>
      {actionData?.status === 'success' && (
        <div className='bg-green-200/50 mt-10 rounded p-5 max-w-xl'>
          <h5 className='text-xl'>{actionData.message}</h5>
          <p className='text-grey-700'>User ID: {actionData.userId}</p>
        </div>
      )}
      {(actionData?.status === 'api error' || actionData?.status === 'validation error') && (
        <div className='bg-error-100/50 mt-10 rounded p-5 max-w-xl'>
          <h5 className='text-xl mb-3'>An error occured</h5>
          <p className='text-grey-700'>{actionData.message}</p>
        </div>
      )}
    </>
  );
}

export default EditUser;
