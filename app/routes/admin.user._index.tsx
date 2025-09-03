import React from 'react';
import { useFetcher, Link, useSubmit, useLoaderData } from '@remix-run/react';
import { BiLoaderAlt, BiSearch } from 'react-icons/bi';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import { Pagination } from '~/components/ui/Pagination';
import { BsFilterLeft } from 'react-icons/bs';
import HoverCard from '~/components/ui/HoverCard';
import SelectDropdown from '~/components/ui/Dropdown';
import { LuArchive, LuArchiveRestore } from "react-icons/lu";
import DialogModal from '~/components/ui/Dialog';
import { callAPI } from '~/session.server';
import { type GenericAPI } from '~/lib/types';
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';


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
const RESOURCE_URL = '/admin/resources/user';

const ROLE_OPTIONS = [
  {
    value: 'admin',
    label: 'admin',
  },
  {
    value: 'user',
    label: 'user',
  },
  {
    value: 'business-admin',
    label: 'business-admin',
  },
];

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'All Statuses',
  },
  {
    value: 'active',
    label: 'Active',
  },
  {
    value: 'archived',
    label: 'Archived',
  },
  {
    value: 'disabled',
    label: 'Disabled'
  }
] as const;

export async function loader({request}: LoaderFunctionArgs) {
  const {success, response} = await callAPI<GenericAPI>(request, `/api/dev/admin/businesses?limit=99999`, undefined, 'GET');
  if (!success || !response.success) {
    return json({businesses: []})
  }

  return json({ businesses: response?.data as {BusinessName: string, BusinessID: string}[] || [], error: '' });
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
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
  
  // return null
  try {
    const res = await callAPI<GenericAPI>(request, `/api/dev/admin/user/status/${userId}`, {
      status: status
    }, 'PUT');
    console.log('res,', JSON.stringify(res, null, 2))
    if (!res.success) {
      return {
        status: 'failure',
        error: 'Fail to change user status'
      }
    }
    return {
      status: 'success',
      error: ''
    }
  } catch (error) {
    console.log('change user status error', error)
    return json({
      status: 'failure',
      error: 'Fail to change status'
    })
  }
}

function buildQueryString({
  search,
  page,
  pageSize,
  roles,
  status,
  businessId
}: {
  search: string;
  page: number;
  pageSize: number;
  roles?: string[];
  status: string;
  businessId?: string
}) {
  const params = new URLSearchParams();
  if (search.length) {
    params.set('search', search);
  }
  if (roles?.length) {
    params.set('roles', roles.join(','));
  }
  if (status?.length) {
    params.set('status', status)
  }
  if (businessId) {
    params.set('businessId', businessId)
  }

  params.set('page', page.toString());
  params.set('limit', pageSize.toString());
  return params.toString();
}

function date_yyyy_mm_dd(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

const UserList = () => {
  const submit = useSubmit();
  const loaderData = useLoaderData<typeof loader>()
  const [initialLoaded, setInitialLoaded] = React.useState(false);

  const [search, setSearch] = React.useState<string>('');
  const [pageSize] = React.useState<number>(10);
  const [page, setPage] = React.useState(1);
  const [roles, setRoles] = React.useState<{ value: string; label: string }[]>([]);
  const [businessId, setBusinessId] = React.useState('')
  const [status, setStatus] = React.useState<typeof STATUS_OPTIONS[number]['value']>('active');

  const fetcher = useFetcher<{
    data?: User[];
    total: number;
    message?: string;
  }>();

  const handlePageChange = (page: number) => {
    setPage(page);
    const params = buildQueryString({
      search: search,
      page: page,
      pageSize: pageSize,
      roles: roles.map((r) => r.value),
      status,
      businessId: businessId
    });

    let url = RESOURCE_URL;
    const queryString = params.toString();
    if (queryString.length) {
      url = `${url}?${queryString}`;
    }
    fetcher.load(url);
  };

  const [archiveModal, setArchiveModal] = React.useState<{ isOpen: boolean; userId: string; status: string }>({
    isOpen: false,
    userId: '',
    status: '',
  });

  const handleArchiveUser = async () => {
    const businessId = archiveModal.userId;
    const status = archiveModal.status;

    const newStatus = status === 'archived' ? 'active' : 'archived';

    const formData = new FormData();
    formData.append('userId', businessId);
    formData.append('status', newStatus);

    submit(formData, { method: 'post' });
    setArchiveModal({
      isOpen: false,
      userId: '',
      status: '',
    })
  }

  React.useEffect(() => {
    if (!initialLoaded) {
      let url = RESOURCE_URL;
      const queryString = buildQueryString({
        search: '',
        page: 1,
        pageSize: pageSize,
        status,
        businessId: ''
      });
      if (queryString.length) {
        url = `${url}?${queryString}`;
      }
      fetcher.load(url);
      setInitialLoaded(true);
    }
  }, [fetcher, initialLoaded, pageSize]);

  return (
    <>
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
      <h2 className='text-xl lg:text-2xl mb-5'>Registered Users</h2>
      <form
        className='flex flex-row gap-2'
        onSubmit={(e) => {
          e.preventDefault();
          const params = buildQueryString({
            search: search,
            page: 1,
            pageSize: pageSize,
            status,
            businessId: businessId
          });
          setRoles([]);
          setPage(1);

          let url = RESOURCE_URL;
          const queryString = params.toString();
          if (queryString.length) {
            url = `${url}?${queryString}`;
          }
          fetcher.load(url);
        }}
      >
        <Input
          id='name'
          aria-label='Business Name'
          placeholder='Search'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        <Button
          type='submit'
          disabled={fetcher.state === 'loading'}
          className='flex flex-row gap-1 items-center'
          aria-label='Search for Business'
        >
          <BiSearch className='w-6 h-6' /> Search
        </Button>
      </form>
      <div className='flex flex-row flex-wrap items-center gap-2 mt-3'>
        <label htmlFor='filterRoles' className='flex flex-row items-center gap-1 text-grey-700 shrink-0'>
          Filter
          <BsFilterLeft className='w-6 h-6' />
        </label>
        <SelectDropdown
          type="multiple" 
          options={ROLE_OPTIONS}
          placeholder="Select Role"
          selectAll="All Roles"
          className='max-w-xl flex-1 min-w-[200px]'
          id='filterRoles'
          value={roles}
          onSelectChange={(v) => {
            setRoles(v as any);
          }}
        />
        <SelectDropdown
          type="single" 
          options={STATUS_OPTIONS as any}
          className='max-w-xl flex-1 min-w-[200px]'
          id='filterStatus'
          value={status}
          onSelectChange={(v) => {
            setStatus(v.value);
          }}
        />
        <SelectDropdown
          type="single" 
          options={[{label: "All Businesses", value: ""}].concat(loaderData.businesses.map((dt) => ({label: dt!.BusinessName, value: dt!.BusinessID})))}
          placeholder="Select Business"
          className='max-w-xl flex-1 min-w-[200px]'
          id='filterBusiness'
          value={businessId}
          onSelectChange={(v) => {
            setBusinessId(v.value);
          }}
        />
        <Button
          type='button'
          disabled={fetcher.state === 'loading'}
          onClick={() => {
            const params = buildQueryString({
              search: search,
              page: 1,
              pageSize: pageSize,
              roles: roles.map((r) => r.value),
              status,
              businessId: businessId
            });

            let url = RESOURCE_URL;
            const queryString = params.toString();
            if (queryString.length) {
              url = `${url}?${queryString}`;
            }
            fetcher.load(url);
            setPage(1);
          }}
        >
          Apply
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={fetcher.state === 'loading'}
          onClick={() => {
            const params = buildQueryString({
              search: '',
              page: 1,
              pageSize: pageSize,
              roles: [],
              status: 'active',
              businessId: ''
            });
            setSearch('');
            setRoles([]);
            setBusinessId('')
            let url = RESOURCE_URL;
            const queryString = params.toString();
            if (queryString.length) {
              url = `${url}?${queryString}`;
            }
            fetcher.load(url);
            setPage(1);
          }}
        >
          Reset
        </Button>
      </div>
      {!fetcher.data?.data && fetcher.state === 'loading' && (
        <p className='mt-10 w-full flex flex-row justify-center'>
          <BiLoaderAlt className='w-8 h-8 animate-spin text-grey-600' />
        </p>
      )}
      <div className='overflow-auto w-full'>
        <table className='table-auto font-opensans w-full mt-5 text-base lg:text-lg bg-white [&_td]:px-5 border'>
          <thead className='font-bold [&_td]:py-4'>
            <tr className='bg-primary-500 text-white border-b'>
              <td>User ID</td>
              <td>Username</td>
              <td>First Name</td>
              <td>Last Name</td>
              <td>Email</td>
              <td>Business ID</td>
              <td>Business Name</td>
              <td>Created At</td>
              <td>Role</td>
              <td>Status</td>
              <td>Action</td>
            </tr>
          </thead>
          <tbody className='text-gray-600 [&_td]:py-3'>
            {!fetcher.data?.message && fetcher.data && "data" in fetcher.data && fetcher.data?.data?.map((d) => (
              <tr key={d.UserID} className='border-t'>
                <td className='truncate max-w-[15ch] md:max-w-xs'>
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCard.Trigger asChild>
                      <span className='font-medium text-primary-500'><Link to={'/admin/user/'+d.UserID}>{d.UserID}</Link></span>
                    </HoverCard.Trigger>
                    <HoverCard.Content className='rounded p-4 text-center'>{d.UserID}</HoverCard.Content>
                  </HoverCard>
                </td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.UserName}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.FirstName}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.LastName}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.Email}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>
                  <HoverCard openDelay={100}>
                    <HoverCard.Trigger asChild>
                      <span>{d.BusinessID}</span>
                    </HoverCard.Trigger>
                    <HoverCard.Content className='rounded p-5 text-center'>{d.BusinessID}</HoverCard.Content>
                  </HoverCard>
                </td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.BusinessName}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{date_yyyy_mm_dd(d.CreatedAt)}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.Role ?? ''}</td>
                <td className='truncate max-w-[15ch] md:max-w-xs'>{d.Status ?? ''}</td>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fetcher.data?.message && <div className='py-2 border border-t-0 bg-white text-center lg:text-lg text-grey-600'>{fetcher.data?.message}</div>}
      <Pagination
        className='ml-auto mt-3 border border-gray-100 rounded'
        disabled={fetcher.state === 'loading'}
        currentPage={page}
        pageSize={pageSize}
        totalCount={fetcher.data?.total || 0}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default UserList;
