import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useFetcher, Link, useActionData, useRouteError} from "@remix-run/react";
import { callAPI, getUserAccessToken, updateUserData } from "~/session.server";
import type { GenericAPI } from '~/lib/types';
import Button from '~/components/ui/Button';
import HoverCard from '~/components/ui/HoverCard';
import DialogModal, {type DialogProps} from '~/components/ui/Dialog';
import Dialog from '~/components/ui/Dialog';
import SelectDropdown from "~/components/ui/Dropdown";
import Input, {InputLabel} from '~/components/ui/Input';
import { LuArchive, LuArchiveRestore, LuMail } from "react-icons/lu";
import React from 'react';
import Checkbox from '~/components/ui/Checkbox';
import { HEAT_SYSTEM_LIST } from '~/lib/utils';
import ErrorMessage from "~/components/ui/ErrorMessage";

type Field = {
  label: string,
  value: any,
  dateField?: boolean,
  dateFormat?: string
}
type LoadDefault = {
  businessProfile: Field[],
  userList: {[key: string]: any},
  roleOptions: {label: string, value: any}[],
  statusOption: {label: string, value: any}[],
  isEasyDraft: boolean,
  heatSystem?: string,
}
type User = {
  UserID: string;
  BusinessID: string;
  BusinessName: string;
  UserName: string;
  FirstName: string;
  Email: string;
  LastName: string;
  CreatedAt: string;
  UpdatedAt: string;
  Role: string;
  Status: string;
};

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Business Admin` },
    { name: "description", content: "Easy Dairy Business Admin" },
  ];
};

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  let res = null;
  let headersResp: ResponseInit | undefined = undefined
  switch (formData.get('form')?.toString()) {
    case 'archive':
      const status = formData.get('status')?.toString();
      const userId = formData.get('userId')?.toString();
      if (!userId) {
        return {
          status: 'failure',
          error: "UserID is required"
        }
      }

      if (!status) {
        return {
          status: 'failure',
          error: "Status is required"
        }
      }
      try {
        res = await callAPI<GenericAPI>(request, `/api/admin/user/status/${userId}`, {
          status: status
        }, 'PUT');
      } catch (error) {
        return json({
          status: 'failure',
          error: 'Fail to change status'
        })
      }
      break;

    case 'reinvite':
      const email = formData.get('email')?.toString();
      if (!email) {
        return {
          status: 'failure',
          error: "Email is required"
        }
      }
      try {
        res = await callAPI<GenericAPI>(request, '/api/auth/forgetPassword', {
          email:email, 
          isInvite: true
        }, 'POST')
      } catch (error) {
        return json({
          status: 'failure',
          error: 'Fail to send email'
        })
      }
      break;
    
      case 'heatsystem':
        const heatsystem = formData.get('heatsystem')
        let businessDetails: {[key: string]: any} = {}
        const {userData} = await getUserAccessToken(request, true);
        const businessResult = await callAPI<GenericAPI>(request, `/api/admin/business?businessId=${userData.BusinessID}`, undefined, 'GET');
        businessDetails = businessResult.response
        try {
          res = await callAPI<GenericAPI>(request, `/api/admin/business/editDetails/${businessDetails.BusinessID}`, {
            heatSystem: heatsystem,
            businessName: businessDetails.BusinessName ,
            easyDairyIDs: businessDetails.EasyDairyID
          }, 'PUT')

          headersResp = await updateUserData(request, {HeatSystem: heatsystem})
        } catch (error) {
          return json({
            status: 'failure',
            error: 'Fail to configure heat system'
          })
        }
        break;
  }
  if (res && !res.success) {
    return {
      status: 'failure',
      error: res.response.errors
    }
  }
  return json({
    status: 'Success',
    message: `${formData.get('form')?.toString()} successfully`
  }, headersResp)
}

function date_yyyy_mm_dd(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export async function loader({request, params}: LoaderFunctionArgs) {
  const {accessToken, userData, headers} = await getUserAccessToken(request, true);
  let businessDetails: {[key: string]: any} = {}
  let userList: {[key: string]: any} = {}
  if (!userData || (userData && userData.Role !== 'business-admin')) {
    return redirect('/dashboard', headers)
  }
  const businessResult = await callAPI<GenericAPI>(request, `/api/admin/business?businessId=${userData.BusinessID}`, undefined, 'GET');
  if (!businessResult.success) {
    throw new Error("No business found");
  }
  businessDetails = businessResult.response
  const ROLE_OPTIONS = [
    {
      value: 'business-admin',
      label: 'Business Admin',
    },
    {
      value: 'user',
      label: 'User',
    },
  ];
  
  const STATUS_OPTIONS = [
    {
      value: '',
      label: 'All',
    },
    {
      value: 'active',
      label: 'Active',
    },
    {
      value: 'archived',
      label: 'Archived',
    },
  ] as const;
  let paramsEd: string[] = []
  userData.EasyDairyID.forEach((ed: string) => {
    paramsEd.push(`ids=${ed}`)
  })
  //force it to be array
  if (userData.EasyDairyID.length === 1) {
    paramsEd.push('ids=')
  }
  
  const {success, response} = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings?${paramsEd.join('&')}`, undefined, 'GET');

  return json({
    businessProfile: [
      {label: 'ID', value: businessDetails.BusinessID},
      {label: 'Name', value: businessDetails.BusinessName},
      {label: 'Easy Dairy Name/ID', value: businessDetails.EasyDairyID ? businessDetails.EasyDairyID.map((ed: string) => {
        if (success && response.data) {
          const renamed = response.data.find(dt => dt.EasyDairyID === ed)
          if (renamed && renamed['Name']) {
            return renamed['Name']
          }
          return ed
        }
      }).join(', ') : ''},
      {label: 'License', value: (businessDetails.License).length > 0 ? JSON.stringify(businessDetails.License) : '-'},
      {label: 'Status', value: businessDetails.Status}
    ],
    isEasyDraft: businessDetails.EasyDraft,
    roleOptions: ROLE_OPTIONS,
    statusOption: STATUS_OPTIONS,
    heatSystem: businessDetails.HeatSystem
  })
}

export default function BusinessAdmin() {
  const submit = useSubmit();
  const data = useLoaderData<LoadDefault>()
  const actionData = useActionData<{status: string, error?: string, message?: string}>();
  const fetcher = useFetcher<{
    data?: User[];
    total: number;
    message?: string;
  }>();
  function buildQueryString({
    search,
    roles,
    status
  }: {
    search?: string;
    roles?: string[];
    status?: string;
  }) {
    const params = new URLSearchParams();
    if (search?.length) {
      params.set('search', search);
    }
    if (roles?.length) {
      params.set('roles', roles.join(','));
    }
    if (status?.length) {
      params.set('status', status)
    }
    params.set('businessId', data.businessProfile[0].value)
    params.set('limit', '1000000')
    return params.toString();
  }
  const navigate = useNavigate()
  const [search, setSearch] = React.useState<string>('');
  const [roles, setRoles] = React.useState<{ value: string; label: string }[]>([]);
  const [status, setStatus] = React.useState<string>('');
  const [heatSystem, setHeatSystem] = React.useState(data.heatSystem);
  const [userList, setUserList] = React.useState<{[key: string]: any}[]>([]);
  const [archiveModal, setArchiveModal] = React.useState<{ isOpen: boolean; userId: string; status: string }>({
    isOpen: false,
    userId: '',
    status: '',
  });
  const [reinviteModal, setReinviteModal] = React.useState<{ isOpen: boolean; email: string;}>({
    isOpen: false,
    email: '',
  });
  const [dialogData, setDialogData] = React.useState<DialogProps>({isOpen: false})

  const handleArchiveUser = async () => {
    const businessId = archiveModal.userId;
    const status = archiveModal.status;

    const newStatus = status === 'archived' ? 'active' : 'archived';

    const formData = new FormData();
    formData.append('userId', businessId);
    formData.append('status', newStatus);
    formData.append('form', 'archive')

    submit(formData, { method: 'post' });
    setArchiveModal({
      isOpen: false,
      userId: '',
      status: '',
    })
  }

  const handleReinviteEmail = async () => {
    const email = reinviteModal.email;
    const formData = new FormData();
    formData.append('email', email);
    formData.append('form', 'reinvite')

    submit(formData, { method: 'post' });
    setReinviteModal({
      isOpen: false,
      email: '',
    })
  }

  React.useEffect(() => {
    const params = buildQueryString({
      search: search,
      roles: roles.length > 0 ? roles.map((r) => r.value) : data.roleOptions.map((r) => r.value),
      status
    });
    let url = `/dashboard/admin/resources/user`
    const queryString = params.toString();
    if (queryString.length) {
      url = `${url}?${queryString}`;
    }
    fetcher.load(url)
  }, [roles, status, search])

  React.useEffect(() => {
    if (fetcher.data?.data) {
      setUserList(fetcher.data.data)
    }
  }, [fetcher])

  React.useEffect(() => {
    if (actionData && actionData.status === 'success') {
      setDialogData({
        isOpen: true,
        title: "Success",
        icon: 'success',
        color: 'primary',
        message: actionData.message
      })
    } else if (actionData && actionData.status === 'failure') {
      setDialogData({
        isOpen: true,
        title: "Failed",
        icon: 'error',
        color: 'error',
        message: actionData.error
      })
    }
      setTimeout(() => {
        setDialogData({
          isOpen: false
        })
      }, 3000);
    
  }, [actionData])
  return (
    <div>
      <Dialog
        {...dialogData}
      />
      <DialogModal 
        isOpen={archiveModal.isOpen}
        title='Change user status'
        message={`Are you sure you want to ${archiveModal.status === 'archived' ? 'unarchive' : 'archive'} this user?`}
        buttons={[
          {
            text: 'Confirm',
            variant: 'primary',
            className: 'mr-5 mt-6',
            onClick: handleArchiveUser
          },
          {
            text: 'Cancel',
            variant: 'outline',
            className: 'mt-6',
            onClick: () => {
              setArchiveModal({isOpen: false, userId: '', status: ''})
            }
          }
        ]}
      />
      <DialogModal 
        isOpen={reinviteModal.isOpen}
        title='Resend invite email'
        message={`Are you sure you want to send invite email to this user?`}
        buttons={[
          {
            text: 'Confirm',
            variant: 'primary',
            className: 'mr-5 mt-6',
            onClick: handleReinviteEmail
          },
          {
            text: 'Cancel',
            variant: 'outline',
            onClick: () => {
              setReinviteModal({isOpen: false, email: ''})
            }
          }
        ]}
      />

      <div className="flex flex-col gap-5 m-auto p-5">
        <div className="bg-grey-100 md:px-6 py-6 px-2">
          <div className="m-auto">
            <div className="p-4 flex flex-col bg-white">
              <h3 className="md:text-2xl text-xl p-2">Business Profile</h3>
              <div className={`p-3 grid md:grid-cols-3 grid-cols-1 gap-10 pt-8 "pb-6"`}>
                {(data.businessProfile).map((sm, i) =>
                  <div key={`businessprofiledetail-${i}`}>
                    <p className="font-bold">{sm.label}</p>
                    <p className="mt-2">{sm.value}</p>
                  </div>
                )}
                { data.isEasyDraft && (<div>
                  <p className="font-bold">Heat System {heatSystem}</p>
                  <div className="mt-2 grid md:grid-cols-3 grid-cols-2">
                    {HEAT_SYSTEM_LIST.map((hs, i) => 
                      <div key={`hs-${i}`} className='flex gap-2 items-center'>
                          <input
                            type="radio" 
                            id={`check-${hs.label}`}
                            name="heatsystem"
                            checked={hs.label === heatSystem}
                            onChange={(e) => {
                              setHeatSystem(hs.label)
                              const formData = new FormData();
                              formData.append(`heatsystem`, hs.label);
                              formData.append('form', 'heatsystem')
                              submit(formData, { method: 'post' });
                            }}
                          />
                        <InputLabel htmlFor={`check-${hs.label}`} className='flex-none cursor-pointer'>
                          {hs.label}
                        </InputLabel>
                      </div>
                    )}
                  </div>
                </div>)}
              </div>
              <h3 className="md:text-2xl text-xl p-2 mt-8 mb-2">User List</h3>
              <div className="mb-4 ml-2 flex">
                <div className={`flex lg:gap-10 gap-5 flex-1 flex-col mb-2 md:flex-row`}>
                  <div className="flex-1 md:flex-initial">
                    <SelectDropdown type='multiple' label="Roles" name='roles' options={data.roleOptions} value={roles} onSelectChange={(val) => {
                        setRoles(val)
                      }} 
                    />
                  </div>
                  <div className="flex-1 md:flex-initial">
                    <SelectDropdown type='single' label="Status" name='status' options={data.statusOption} value={status} onSelectChange={(val) => {
                        setStatus(val.value)
                      }} 
                    />
                  </div>
                  <div className="flex-1 md:flex-initial">
                      <Input
                        label="Search"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value)
                        }}
                      />
                  </div>
                </div>
              </div>
              <div className="ml-2 overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4">
                <table className='min-w-full table-print relative'>
                  <thead className='font-signika text-lg'>
                    <tr className='bg-primary-500 text-white'>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left rounded-l">User ID</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Username</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">First Name</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Last Name</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Email</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Created At</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Role</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Status</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left rounded-r">Action</th>
                    </tr>
                  </thead>
                  <tbody className='text-gray-600 [&_td]:py-3'>
                    {userList.length ? userList?.map((d: {[key: string]: any}, i) => (
                      <tr key={d.UserID} className={`border-t whitespace-nowrap ${( i % 2 !== 0 ? "bg-gray-100" : "")}`}>
                        <td className='p-3'>
                          <HoverCard openDelay={100} closeDelay={100}>
                            <HoverCard.Trigger asChild>
                              <span className='font-medium text-primary-500'><Link to={'/dashboard/admin/user/'+d.UserID}>{d.UserID}</Link></span>
                            </HoverCard.Trigger>
                            <HoverCard.Content className='rounded p-4 text-center'>{d.UserID}</HoverCard.Content>
                          </HoverCard>
                        </td>
                        <td className='p-3'>{d.UserName}</td>
                        <td className='p-3'>{d.FirstName}</td>
                        <td className='p-3'>{d.LastName}</td>
                        <td className='p-3'>{d.Email}</td>
                        <td className='p-3'>{date_yyyy_mm_dd(d.CreatedAt)}</td>
                        <td className='p-3'>{d.Role ?? ''}</td>
                        <td className='p-3'>{d.Status ?? ''}</td>
                        <td>
                          <div className="flex gap-1">
                            <HoverCard closeDelay={0} openDelay={0}>
                              <HoverCard.Trigger asChild>
                                <button aria-label='Toggle business status' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                  onClick={() => {
                                    setArchiveModal({
                                      isOpen: true,
                                      userId: d.UserID,
                                      status: d.Status,
                                    })
                                  }}
                                >
                                  { d.Status === 'archived' ? <LuArchiveRestore className='w-6 h-6' /> : <LuArchive className='w-6 h-6' />}
                                </button>
                              </HoverCard.Trigger>
                              <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                                {d.Status === 'archived' ? 'Unarchive' : 'Archive'}
                              </HoverCard.Content>
                            </HoverCard>
                            {d.Status !== 'archived' ? 
                            <HoverCard closeDelay={0} openDelay={0}>
                              <HoverCard.Trigger asChild>
                                <button aria-label='Reinvite user' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                  onClick={() => {
                                    setReinviteModal({
                                      isOpen: true,
                                      email: d.Email
                                    })
                                  }}
                                >
                                  <LuMail className='w-6 h-6'/>
                                </button>
                              </HoverCard.Trigger>
                              <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                                Reinvite
                              </HoverCard.Content>
                            </HoverCard> : ''}
                          </div>
                        </td>
                      </tr>
                    )) :
                    <tr>
                      <td className="p-4">
                        No data found
                      </td>
                    </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div className="mt-6 pb-4 ml-2">
                <p className="font-bold">{userList?.length} total rows</p>
              </div>
              <Button
                type='button'
                className="ml-auto w-max"
                onClick={() => navigate("/dashboard/admin/user/add")}
              >
                Add User
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  // Error or new Response
  const error = useRouteError() as { message: string; data: string };
  console.error(error.message || error.data);
  return <ErrorMessage message={error.message || error.data} />;
}

