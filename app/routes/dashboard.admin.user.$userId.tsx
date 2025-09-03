import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from '@remix-run/node';
import { useLoaderData, Form, useActionData } from '@remix-run/react';
import { callAPI, getUserAccessToken } from '~/session.server';
import { FaAngleLeft } from 'react-icons/fa6';
import type { GenericAPI, DropdownOpts, GraphQLReturn } from '~/lib/types';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import SelectDropdown from '~/components/ui/Dropdown';
import z from 'zod';
import { useEffect, useState, useRef, type ChangeEvent, useMemo } from 'react';
import { SwitchToggle } from '~/components/ui/Switch';
import Checkbox from '~/components/ui/Checkbox';
import { getVisibleHerdsFilter } from '~/lib/utils';

type Herd = {
  easyDairyId: string;
  herdUuid: string;
  herdCode: string;
  name: string;
};

type LoadDefault = {
  businessId: string;
  user: {
    BusinessID: string;
    BusinessName: string;
    CreatedAt: string;
    Email: string;
    FirstName: string;
    LastName: string;
    Role: 'admin' | 'user' | 'business-admin';
    Status: 'active' | 'archived';
    UpdatedAt: string;
    UserID: string;
    UserName: string;
    Herds: Array<string>;
    HerdPermissions:{ HerdUUID: string; Permission: string }[]
  };
  userRoleOptions: DropdownOpts;
  isApp: boolean;
  herds: Array<Herd>;
};

type UserDetailsType = {
  UserID: string;
  BusinessID: string;
  BusinessName: string;
  UserName: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Role: string;
};

type UserFormDataType = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  businessId: string;
  userId?: string;
  role: string;
};

const editUserSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  username: z.string().min(1, 'Username is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  userId: z.string().min(1, 'User ID is required'),
  role: z.string().min(1, 'Role is required'),
  herds: z.array(z.string()).default([]).optional(),
  herdPermissions: z.array(z.object({
    HerdUUID: z.string(),
    Permission: z.string()
  })).default([]).optional(),
});

type herdPermission = {
  HerdUUID: string;
  Permission: string;
}

export const meta: MetaFunction = (request) => {
  return [{ title: `Edit Users` }, { name: 'description', content: 'Edit Users' }];
};

async function getHerds(request: Request, accessToken: string) {
  let herds: Array<Herd> = [];
  const {userData} = await getUserAccessToken(request)

  const herdRes = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
            herds (${getVisibleHerdsFilter(userData as any)})
            {
                nodes {
                    herdUuid
                    herdCode
                    easyDairyId
                    name
                }
            }
        }`,
    },
    undefined,
    accessToken
  );
  if (herdRes.success && 'data' in herdRes.response) {
    herds = (herdRes.response.data.herds.nodes as Array<Herd>) || [];
  }
  return herds;
}
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userID = params.userId;
  const { accessToken, userData, headers, isApp } = await getUserAccessToken(request, true);
  const userList = await callAPI<GenericAPI>(request, `/api/admin/users?search=${userID}`, undefined, 'GET');
  if (userList.success && userList.response.data) {
    const user = userList.response.data.find((e: UserDetailsType) => e.UserID === userID);
    if (!user) {
      return redirect('/dashboard/admin', headers);
    }
    const userRoleOptions: DropdownOpts = [
      { label: 'user', value: 'user', hidden: userID === userData.UserID ? true : false },
      { label: 'admin', value: 'admin', hidden: true },
      { label: 'business-admin', value: 'business-admin', hidden: user.EasyDraftUser }, // Hide business-admin if user is EasyDraftUser
    ];
    const herds = await getHerds(request, accessToken);
    const herdPermissions = herds.map((herd) => {
      const permission = user.HerdPermissions?.find((hp:herdPermission) => hp.HerdUUID === herd.herdUuid);
      return {
        HerdUUID: herd.herdUuid,
        Permission: permission ? permission.Permission : 'none',
      };
    });
    return json({
      user: { ...user, HerdPermissions: herdPermissions },
      userRoleOptions: userRoleOptions,
      businessId: userData.BusinessID,
      isApp: isApp,
      herds,
    });
  }
  return redirect('/dashboard', headers);
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const requestData = Object.fromEntries(formData);

  const herds = JSON.parse(requestData.herds.toString());
  const herdPermissions = JSON.parse(requestData.herdPermissions.toString() || '[]');
  const validation = editUserSchema.safeParse({ ...requestData,
    herds,
    herdPermissions
   });
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
  const res = await callAPI<GenericAPI>(request, '/api/admin/account', validation.data, 'PATCH');
  if (!res.success || (res.success && !res.response.user)) {
    return json({
      status: 'api error',
      message: !res.success ? (res.response.errors as string) : res.response.message,
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

const SEARCH_HERD_OPTIONS = [
  {
    label: 'Easy Dairy ID',
    value: 'easydairy_id',
  },
  {
    label: 'Herd Code',
    value: 'herd_code',
  },
  {
    label: 'Herd ID',
    value: 'herd_id',
  },
  {
    label: 'Herd Name',
    value: 'herd_name',
  },
] as const;

export default function EditUser() {
  const data = useLoaderData<LoadDefault>();
  const actionData = useActionData<typeof action>();
  const [formData, setFormData] = useState<UserFormDataType>({
    username: data.user.UserName,
    firstName: data.user.FirstName,
    lastName: data.user.LastName,
    email: data.user.Email,
    businessId: data.user.BusinessID,
    userId: data.user.UserID,
    role: data.user.Role,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [userRoleSelection, setUserRoleSelection] = useState(data.user.Role);
  const [herdPermissions, setHerdPermissions] = useState<{ HerdUUID: string; Permission: string }[]>(data.user?.HerdPermissions);


  const [visibleHerds, setVisibleHerds] = useState<Array<string>>(
    data.user.Herds ? data.user.Herds || [] : data.herds.map((h) => h.herdUuid)
  );

  const [searchHerd, setSearchHerd] = useState('');
  const [searchHerdOption, setSearchHerdOption] = useState<(typeof SEARCH_HERD_OPTIONS)[number]['value']>('herd_code');

  const filteredHerds = useMemo<Array<Herd>>(() => {
    if (!searchHerd || !searchHerdOption) {
      return data.herds;
    }
    const sLower = searchHerd.toLowerCase();
    return data.herds.filter((h) => {
      return (
        (searchHerdOption === 'easydairy_id' && h.easyDairyId.toLowerCase().startsWith(sLower)) ||
        (searchHerdOption === 'herd_code' && h.herdCode.toLowerCase().startsWith(sLower)) ||
        (searchHerdOption === 'herd_id' && h.herdUuid.toLowerCase().startsWith(sLower)) ||
        (searchHerdOption === 'herd_name' && h.name.toLowerCase().startsWith(sLower))
      );
    });
  }, [data.herds, searchHerd, searchHerdOption]);

  useEffect(() => {
    setVisibleHerds(data.user.Herds ? data.user.Herds || [] : data.herds.map((h) => h.herdUuid));
  }, [data.user.Herds, data.herds]);

  useEffect(() => {
    if (data.user.HerdPermissions) {
      setHerdPermissions(data.user.HerdPermissions);
    }
  }, [data.user.HerdPermissions]);

  useEffect(() => {
    if (actionData?.status === 'success') {
      formRef.current?.reset();
    }
  }, [actionData?.status]);
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handlePermissionsChange = (herdUuid: string, value: string) => {
    setHerdPermissions((prevPermissions: any[]) => {
      const existingHerdIndex = prevPermissions.findIndex(p => p.HerdUUID === herdUuid);

      let updatedPermissions: herdPermission[];
      if (existingHerdIndex !== -1) {
        updatedPermissions = [...prevPermissions];
        updatedPermissions[existingHerdIndex].Permission = value;
      } else {
        updatedPermissions = [...prevPermissions, { HerdUUID: herdUuid, Permission: value }];
      }
      setFormData((prevData) => ({
        ...prevData,
        herdPermissions: updatedPermissions
      }));

      return updatedPermissions;
    });
  };

  const goBack = () => window.history.back();
  return (
    <div className='flex flex-col gap-5 m-auto p-5'>
      {!data.isApp && (
        <div className='px-8 py-2 whitespace-nowrap'>
          <button
            type='button'
            onClick={goBack}
            className='text-primary-500 underline gap-1 flex items-center font-bold'
          >
            <FaAngleLeft />
            Back to Admin
          </button>
        </div>
      )}
      <div className='bg-grey-100 md:px-6 py-6 px-2'>
        <div className='bg-white m-auto'>
          <div className='p-4 flex flex-col'>
            <h3 className='md:text-2xl text-xl p-2 pb-4'>Edit User</h3>
            <Form ref={formRef} method='post' className='ml-2 flex flex-col gap-3'>
              <Input
                type='text'
                label='User Name'
                name='username'
                error={actionData?.fieldErrors?.['username']?.[0]}
                value={formData.username}
                onChange={handleChange}
                disabled={data.user.Role === 'admin'}
              />
              <Input
                type='text'
                label='First Name'
                name='firstName'
                error={actionData?.fieldErrors?.['firstName']?.[0]}
                value={formData.firstName}
                onChange={handleChange}
                disabled={data.user.Role === 'admin'}
              />
              <Input
                type='text'
                label='Last Name'
                name='lastName'
                error={actionData?.fieldErrors?.['lastName']?.[0]}
                value={formData.lastName}
                onChange={handleChange}
                disabled={data.user.Role === 'admin'}
              />
              <Input
                type='text'
                label='Email'
                name='email'
                error={actionData?.fieldErrors?.['email']?.[0]}
                value={formData.email}
                onChange={handleChange}
                disabled={data.user.Role === 'admin'}
              />

                <SelectDropdown
                  type="single"
                  label="Role"
                  name="roleDropdown"
                  disabled={data.user.Role === 'admin'}
                  options={data.userRoleOptions}
                  value={userRoleSelection}
                  className="text-primary-500 w-full"
                  onSelectChange={(val) => {
                    setUserRoleSelection(val.value);
                  }}
                />
              <Input type='hidden' name='role' value={userRoleSelection} />
              <Input type='hidden' name='businessId' value={data.businessId} />
              <Input type='hidden' value={data.user.UserID} name='userId' />
              {(data.user.Role === 'user' || data.user.Role === 'business-admin') && (
                <>
                  <h3 className='text-xl'>Visible Herds ({visibleHerds.length})</h3>
                  <input className='hidden' name='herds' value={JSON.stringify(visibleHerds)} onChange={() => { }} />
                  <input type='hidden' name='herdPermissions' value={JSON.stringify(herdPermissions)} />

                  <div className='flex flex-col md:flex-row gap-3 justify-start mb-3'>
                    <div className='max-w-[600px] w-full'>
                      <Input
                        aria-label='Search for herds'
                        placeholder='Search'
                        value={searchHerd}
                        onChange={(e) => {
                          setSearchHerd(e.target.value);
                        }}
                      />
                    </div>
                    <SelectDropdown
                      className='lg:min-w-[300px]'
                      value={searchHerdOption}
                      options={SEARCH_HERD_OPTIONS as any}
                      type='single'
                      onSelectChange={(v) => {
                        setSearchHerdOption(v.value);
                      }}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setSearchHerd('');
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <table className='min-w-full table relative'>
                    <thead className='font-signika text-lg table-fixed w-full table'>
                      <tr className='bg-primary-500 text-white'>
                        <th className='bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left rounded-l hidden 2xl:table-cell'>
                          EasyDairy ID
                        </th>
                        <th className='bg-primary-500 hidden 2xl:table-cell px-3 py-4 sticky top-0 whitespace-nowrap text-left w-[370px]'>
                          Herd ID
                        </th>
                        <th className='bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left'>Herd Code</th>
                        <th className='bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left hidden md:table-cell'>
                          Herd Name
                        </th>
                        <th className='bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left md:w-[150px]'>Permissions</th>
                        <th className='bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left'>
                          <div className='flex flex-row gap-3 items-center'>

                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className='text-gray-600 [&_td]:py-3 max-h-[500px] overflow-y-auto block'>
                      {filteredHerds.length ? (
                        filteredHerds.map((h, i) => (
                          <tr
                            key={h.herdUuid}
                            className={`w-full table table-fixed border-t whitespace-nowrap ${i % 2 !== 0 ? 'bg-gray-100' : ''
                              }`}
                          >
                            <td className='p-3 hidden 2xl:table-cell'>{h.easyDairyId}</td>
                            <td className='p-3 hidden 2xl:table-cell w-[370px]'>{h.herdUuid}</td>
                            <td className='p-3'>{h.herdCode}</td>
                            <td className='p-3 hidden md:table-cell overflow-hidden text-ellipsis'>{h.name}</td>
                            <td className='p-3 md:w-[150px]'>
                              {userRoleSelection === 'user' && (
                                <SelectDropdown
                                  type="single"
                                  name={`permissionsDropdown-${h.herdUuid}`}
                                  options={[
                                    { label: 'None', value: 'none' },
                                    { label: 'Read', value: 'read' },
                                    { label: 'Read-Write', value: 'read-write' },
                                  ]}
                                  value={herdPermissions.find((p) => p.HerdUUID === h.herdUuid)?.Permission || 'none'}
                                  className="text-primary-500 w-full"
                                  onSelectChange={(val) => {
                                    handlePermissionsChange(h.herdUuid, val.value); // Update permissions when changed
                                  }}
                                />
                              )}
                            </td>
                            <td />
                          </tr>
                        ))
                      ) : (
                        <tr className='w-full table table-fixed'>
                          <td className='p-4'>No data found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <br />
                </>
              )}
              <Button type='submit' className='w-max ml-auto' disabled={data.user.Role === 'admin'}>
                Save
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
  );
}
