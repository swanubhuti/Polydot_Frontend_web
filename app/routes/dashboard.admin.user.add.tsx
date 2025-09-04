import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, Form, useActionData } from "@remix-run/react";
import { callAPI, getUserAccessToken } from "~/session.server";
import { FaAngleLeft } from "react-icons/fa6";
import type { GenericAPI, DropdownOpts } from '~/lib/types';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import SelectDropdown from "~/components/ui/Dropdown";
import { SwitchToggle } from '~/components/ui/Switch';
import z from 'zod';
import React, { useEffect } from 'react';

type LoadDefault = {
    businessId: string,
    isApp: boolean
}

const roleTypes = {
    USER: 'user',
    // ADMIN: 'admin',
    BUSINESSADMIN: 'business-admin'
}

const baseRegisterUserSchema = z.object({
    businessId: z.string().min(1, 'Business ID is required'),
    username: z.string().min(1, 'Username is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    role: z.string().min(1, 'Role is required'),
    forcePasswordChange: z.boolean().optional(),
})

const userRoleOptions: DropdownOpts = [
    {label: roleTypes.USER, value: roleTypes.USER},
    // {label: roleTypes.ADMIN, value: roleTypes.ADMIN},
    {label: roleTypes.BUSINESSADMIN, value: roleTypes.BUSINESSADMIN},
]

export const meta: MetaFunction = (request) => {
    return [
        { title: `Add Users` },
        { name: "description", content: "Add Users" },
    ];
};

export async function loader({request, params}: LoaderFunctionArgs) {
    const {accessToken, userData, headers, isApp} = await getUserAccessToken(request, true);
    if (!userData || (userData && userData.Role !== 'business-admin')) {
        return redirect('/dashboard', headers)
    }
    return json({
        businessId: userData.BusinessID,
        isApp: isApp
    })
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    // Convert forcePasswordChange string to boolean
    const requestData = {
        ...rawData,
        forcePasswordChange: rawData.forcePasswordChange === 'true'
    };

    console.log('Request data:', requestData); // Debug log

    const validation = baseRegisterUserSchema.safeParse(requestData);

    if (!validation.success) {
        console.log('Validation errors:', validation.error.flatten()); // Debug log
        const fieldErrors = validation.error.flatten()?.fieldErrors;
        return json({
          status: 'validation error',
          message: 'Validation failed: ' + JSON.stringify(validation.error.flatten()),
          userId: null,
          errors: null,
          fieldErrors: fieldErrors,
        });
    }

    console.log('Calling API with:', validation.data); // Debug log

    try {
        const res = await callAPI<GenericAPI>(request, '/api/admin/user', validation.data, 'POST');

        console.log('API response:', res); // Debug log

        if (!res.success || (res.success && !res.response.user)) {
            return json({
              status: 'api error',
              message: !res.success ? res.response.errors as string : res.response.message,
              userId: null,
              errors: null,
              fieldErrors: null,
            });
        } else {
            // Always send password setup email since this form never has password fields
            const resetRes = await callAPI<GenericAPI>(request, '/api/auth/forgetPassword', {email:validation.data.email,isInvite: true} , 'POST')
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
    } catch (error) {
        console.error('API call error:', error);
        return json({
          status: 'api error',
          message: 'Failed to create user: ' + (error instanceof Error ? error.message : 'Unknown error'),
          userId: null,
          errors: null,
          fieldErrors: null,
        });
    }
}

export default function AddUser() {
    const data = useLoaderData<LoadDefault>()
    const actionData = useActionData<typeof action>();
    const formRef = React.useRef<HTMLFormElement>(null);
    const [userRoleSelection, setUserRoleSelection] = React.useState(roleTypes.USER);
    const [forcePasswordChange, setForcePasswordChange] = React.useState(false);
    useEffect(() => {
        if (actionData?.status === 'success') {
          formRef.current?.reset();
        }
    }, [actionData?.status]);
    const goBack = () => window.history.back()
    return (
        <div className="flex flex-col gap-5 m-auto p-5">
            {!data.isApp && <div className="px-8 py-2 whitespace-nowrap">
              <button type="button" onClick={goBack} className="text-primary-500 underline gap-1 flex items-center font-bold">
                <FaAngleLeft />
                Back to Admin
              </button>
            </div>}
            <div className="bg-grey-100 md:px-6 py-6 px-2">
                <div className="bg-white m-auto">
                    <div className="p-4 flex flex-col">
                        <h3 className="md:text-2xl text-xl p-2 pb-4">Add User</h3>
                        <Form ref={formRef} method='post' className='ml-2 flex flex-col gap-3'>
                            <Input
                                type='text'
                                label='User Name'
                                name='username'
                                error={actionData?.fieldErrors?.['username']?.[0]}
                            />
                            <Input
                                type='text'
                                label='First Name'
                                name='firstName'
                                error={actionData?.fieldErrors?.['firstName']?.[0]}
                            />
                            <Input
                                type='text'
                                label='Last Name'
                                name='lastName'
                                error={actionData?.fieldErrors?.['lastName']?.[0]}
                            />
                            <Input
                                type='text'
                                label='Email'
                                name='email'
                                error={actionData?.fieldErrors?.['email']?.[0]}
                            />
                            <SelectDropdown type='single' label="Role" name='roleDropdown' options={userRoleOptions} value={userRoleSelection} className="text-primary-500" onSelectChange={(val) => {
                                setUserRoleSelection(val.value)
                            }} />
                            <Input
                                type="hidden"
                                name='role'
                                value={userRoleSelection}
                            />
                            <Input
                                type='hidden'
                                name='businessId'
                                value={data.businessId}
                            />
                            <div className="flex gap-4 mb-4">
                                <SwitchToggle
                                    enabled={forcePasswordChange}
                                    setEnabled={setForcePasswordChange}
                                />
                                <label>User must change password at next login</label>
                            </div>
                            <input type="hidden" name="forcePasswordChange" value={String(forcePasswordChange)} />
                            <Button type='submit' className='w-max ml-auto'>
                                Add
                            </Button>
                        </Form>
                        {actionData?.status === 'success' && (
                            <div className='bg-green-200/50 mt-10 rounded p-5 max-w-xl'>
                            <h5 className='text-xl'>{actionData.message}</h5>
                            <p className='text-grey-700'>User ID: {actionData.userId}</p>
                            </div>
                        )}
                        {actionData?.status === 'api error' && (
                            <div className='bg-error-100/50 mt-10 rounded p-5 max-w-xl'>
                            <h5 className='text-xl mb-3'>An error occured</h5>
                            <p className='text-grey-700'>{actionData.message}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}