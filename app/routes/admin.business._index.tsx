import React from 'react';
import { useActionData, Link, useFetcher, useSubmit } from '@remix-run/react';
import { json, type ActionFunctionArgs } from '@remix-run/node';

import { BiSearch, BiLoaderAlt } from 'react-icons/bi';
import { BsFilterLeft } from 'react-icons/bs';
import { LuArchive, LuArchiveRestore, LuTrash } from "react-icons/lu";
import { MdEdit } from 'react-icons/md';

import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import { Pagination } from '~/components/ui/Pagination';
import SelectDropdown from '~/components/ui/Dropdown';
import DialogModal, { ModalBox } from '~/components/ui/Dialog';
import { callAPI } from '~/session.server';
import { type GenericAPI } from '~/lib/types';
import HoverCard from '~/components/ui/HoverCard';
import { FaUserPlus } from 'react-icons/fa6';
import toast, { Toaster } from 'react-hot-toast';
import { Toast } from '~/components/Toast';
import ConfirmationModal from '~/components/ui/ConfirmationModel';

const RESOURCE_URL = '/admin/resources/business';

type Business = {
  BusinessID: string;
  EasyDairyID: string[];
  BusinessName: string;
  Status: string;
  LicenseCount: number;
  License: Array<Record<string, string>>;
  EasyDraft: boolean,
  HeatSystem: string
};

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

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const status = formData.get('status')?.toString();
  const businessId = formData.get('businessId')?.toString();
  const action = formData.get('action')?.toString();

  if (!businessId) {
    return {
      status: 'failure',
      error: "BusinessID is required"
    }
  }
  if (action === 'purge') {
    try {
      const res = await callAPI<GenericAPI>(request, `/api/dev/admin/purgeBusiness/${businessId}`, {
        status: status
      }, 'DELETE');
      if (!res.success) {
        return {
          status: 'failure',
          error: 'Fail to Purge Business'
        }
      }
      return {
        status: 'success',
        message: res.response.message

      }
    } catch(error) {
      console.log('Fail to Purge Business', error)
      return json({
        status: 'Failure',
        error: 'Fail to Purge Business'
      })
    }
  }

  if (!status) {
    return {
      status: 'failure',
      error: "Status is required"
    }
  }


  try {
    const res = await callAPI<GenericAPI>(request, `/api/dev/admin/businesses/status/${businessId}`, {
      status: status
    }, 'PUT');
    console.log('res,', JSON.stringify(res, null, 2))
    if (!res.success) {
      return {
        status: 'failure',
        error: 'Fail to change business status'
      }
    }
    return {
      status: 'success',
      message: 'Successfully changed business status'
    }
  } catch (error) {
    console.log('change business status error', error)
    return json({
      status: 'failure',
      error: 'Fail to change status'
    })
  }
}

function buildQueryString({
  search,
  status,
  herdCode,
  easyDairyId,
  page,
  pageSize,
}: {
  search: string;
  status?: string;
  herdCode?: string;
  easyDairyId?: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  if (search.length) {
    params.set('search', search);
  }

  if (status?.length) {
    params.set('status', status)
  }

  if (herdCode?.length) {
    params.set('herdCode', herdCode)
  }

  if (easyDairyId?.length) {
    params.set('easyDairyId', easyDairyId)
  }

  params.set('page', page.toString());
  params.set('limit', pageSize.toString());
  return params.toString();
}

const BusinessList = () => {
  const actionData = useActionData<{status: string; error?: string; message?:string }>();
  const submit = useSubmit();


  const [initialLoaded, setInitialLoaded] = React.useState(false);

  const [search, setSearch] = React.useState<string>('');
  const [pageSize] = React.useState<number>(10);
  const [page, setPage] = React.useState(1);
  const [herdCode, setHerdCode] = React.useState('')
  const [easyDairyId, setEasyDairyId] = React.useState('')
  const [status, setStatus] = React.useState<typeof STATUS_OPTIONS[number]['value']>('active');
  const [openErrorModal, setOpenErrorModal] = React.useState(false);
  const [modalBox, setModalBox] = React.useState({open: false, url: '', title: '', classes: ''})
  const [purgeModal, setPurgeModal] = React.useState<any>(null);
  const [isPurgeLoading, setIsPurgeLoading] = React.useState(false);


  const [archiveModal, setArchiveModal] = React.useState<{ isOpen: boolean; businessId: string; status: string }>({
    isOpen: false,
    businessId: '',
    status: '',
  });

  const fetcher = useFetcher<{
    data?: Business[];
    total: number;
    message?: string;
  }>();

  const handlePageChange = (page: number) => {
    setPage(page);
    const params = buildQueryString({
      search: search,
      page: page,
      herdCode: herdCode,
      easyDairyId: easyDairyId,
      pageSize: pageSize,
      status: status,
    });

    let url = RESOURCE_URL;
    const queryString = params.toString();
    if (queryString.length) {
      url = `${url}?${queryString}`;
    }
    fetcher.load(url);
  };

  const handleConfirmPurge = async (businessId: string) => {
    setIsPurgeLoading(true);
    try {
      const formData = new FormData();
      formData.append('businessId', businessId);
      formData.append('action', 'purge');

      submit(formData, { method: 'DELETE' });
      if (actionData) {
        setPurgeModal(null);
      }
    } catch (error) {
      console.error('Error during purge:', error);
    } finally {
      setIsPurgeLoading(false); // Reset loading state
    }
  };

  // toggle archive status
  const handleArchiveBusiness = async () => {
    const businessId = archiveModal.businessId;
    const status = archiveModal.status;

    const newStatus = status === 'archived' ? 'active' : 'archived';

    const formData = new FormData();
    formData.append('businessId', businessId);
    formData.append('status', newStatus);

    submit(formData, { method: 'post' });
    setArchiveModal({
      isOpen: false,
      businessId: '',
      status: '',
    })
  }

  React.useEffect(() => {
    if (!initialLoaded) {
      let url = RESOURCE_URL;
      const queryString = buildQueryString({
        search: '',
        page: 1,
        herdCode: '',
        easyDairyId: '',
        pageSize: pageSize,
        status: 'active',
      });
      if (queryString.length) {
        url = `${url}?${queryString}`;
      }
      fetcher.load(url);
      setInitialLoaded(true);
    }
  }, [fetcher, initialLoaded, pageSize]);

  React.useEffect(() => {
    if (fetcher.state !== 'idle') {
      return;
    }
    if (actionData?.status === 'failure') {
      setOpenErrorModal(true);
    }
  }, [actionData?.status, fetcher.state]);

  return (
    <>
        {actionData?.status && (
                <div className='bg-green-100/50 mb-10 rounded p-5'>
                    <h5 className='text-xl mb-3'>{actionData?.message}</h5>
                </div>
            )}
            {!actionData?.status && actionData?.error && (
                <div className='bg-error-200/50 mb-10 rounded p-5'>
                    <h5 className='text-xl mb-3'>{actionData.message}</h5>
                    <p className='text-grey-700'>{actionData.error}</p>
                </div>
            )}
      <DialogModal
        isOpen={openErrorModal}
        icon='error'
        color='error'
        title='Error'
        message={actionData?.error}
        buttons={[
          {
            text: 'Return',
            variant: 'black',
            className: 'mt-2',
            onClick: () => {
              setOpenErrorModal(false);
            }
          }
        ]}
      />
      <DialogModal
        isOpen={archiveModal.isOpen}
        title='Change business status'
        message={`Are you sure you want to ${archiveModal.status === 'archived' ? 'unarchive' : 'archive'} this business?`}
        buttons={[
          {
            text: 'Confirm',
            variant: 'primary',
            className: 'mr-5 mt-6',
            onClick: handleArchiveBusiness
          },
          {
            text: 'Cancel',
            variant: 'outline',
            className: 'mt-6',
            onClick: () => {
              setArchiveModal({isOpen: false, businessId: '', status: ''})
            }
          }
        ]}
      />
      <Toast />
      <h2 className='text-xl lg:text-2xl mb-5'>Business List</h2>
      <form
        aria-label='Search businesses by name'
        className='flex flex-row gap-2 items-end'
        onSubmit={(e) => {
          e.preventDefault();
          const params = buildQueryString({
            search: search,
            page: 1,
            herdCode: herdCode,
            easyDairyId: easyDairyId,
            pageSize: pageSize,
            status: status,
          });
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
          label='Business Name'
          placeholder='Search Business Name/ID...'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        <Input id="easyDairyId" label="Easy Dairy ID" placeholder="Search Easy Dairy ID" value={easyDairyId} onChange={(e) => setEasyDairyId(e.target.value)} />
        <Input id="herdCode" label="Herd Code" placeholder="Search Herd Code" value={herdCode} onChange={(e) => setHerdCode(e.target.value)} />
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
        <p className='flex flex-row items-center gap-1 text-grey-700 shrink-0'>
          Filter
          <BsFilterLeft className='w-6 h-6' />
        </p>
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
        <Button
          aria-label='Apply Filter'
          type='button'
          disabled={fetcher.state === 'loading'}
          onClick={() => {
            const params = buildQueryString({
              search: search,
              page: 1,
              herdCode: herdCode,
              easyDairyId: easyDairyId,
              pageSize: pageSize,
              status: status,
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
          arial-label='Reset Filter'
          type='button'
          variant='outline'
          disabled={fetcher.state === 'loading'}
          onClick={() => {
            const params = buildQueryString({
              search: '',
              page: 1,
              herdCode: '',
              easyDairyId: '',
              pageSize: pageSize,
              status: 'active'
            });
            setStatus('active');
            setSearch('');
            setHerdCode('')
            setEasyDairyId('')
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
          <BiLoaderAlt className="w-8 h-8 animate-spin text-grey-600" />
        </p>
      )}
      <div className='overflow-auto w-full'>
        <table className='table-auto font-opensans w-full mt-5 text-base lg:text-lg bg-white [&_td]:px-5 border'>
          <thead className='font-bold [&_td]:py-4'>
            <tr className='bg-primary-500 text-white border-b'>
              <td>Business ID</td>
              <td>Business Name</td>
              <td>Easy Dairy ID</td>
              <td>Status</td>
              <td>Easy Draft</td>
              <td>License</td>
              <td>Actions</td>
            </tr>
          </thead>
          <tbody className='text-gray-600 [&_td]:py-3'>
            {!fetcher.data?.message && !!fetcher.data?.data?.length && fetcher.data?.data.map((d) => (
              <tr key={d.BusinessID} className='border-t'>
                <td><button type="button" className="text-left whitespace-nowrap" onClick={() => {
                  navigator.clipboard.writeText(d.BusinessID);
                  toast.success('ID Copied!')
                }}>{d.BusinessID}</button></td>
                <td>{d.BusinessName}</td>
                <td>{d.EasyDairyID?.join(', ') ?? ''}</td>
                <td>{d.Status}</td>
                <td>
                  {d.EasyDraft ?
                  <HoverCard openDelay={100}>
                    <HoverCard.Trigger asChild>
                      <span className="hover:text-sky-500 cursor-default decoration-dotted underline underline-offset-4">Y</span>
                    </HoverCard.Trigger>
                    <HoverCard.Content className='rounded p-5 text-sm'>
                      {d.HeatSystem}
                    </HoverCard.Content>
                  </HoverCard> : 'N'}
                </td>
                <td>
                  {d.EasyDraft ? 'N/A' :
                  <HoverCard openDelay={100}>
                    <HoverCard.Trigger asChild>
                      <span className="hover:text-sky-500 cursor-default decoration-dotted underline underline-offset-4">{d.LicenseCount > 0 ? d.LicenseCount : ''}</span>
                    </HoverCard.Trigger>
                    <HoverCard.Content className='rounded p-5 text-sm'>
                      <ul className="list-disc pl-4">
                        {d.License.map((val, idx) => <li key={`row-${idx}`}>
                          <span className="block">{val?.HerdCode} - {val?.EasyDairyID}</span>
                        </li>)}
                      </ul>
                    </HoverCard.Content>
                  </HoverCard>}
                </td>
                <td>
                  <div className="flex gap-1">
                    <HoverCard closeDelay={0} openDelay={0}>
                      <HoverCard.Trigger asChild>
                      <Link to={`/admin/business/edit/${d.BusinessID}`} className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'>
                        <MdEdit className='w-6 h-6' />
                      </Link>
                      </HoverCard.Trigger>
                      <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none text-grey-800' side='top' >
                        Edit Business Details
                      </HoverCard.Content>
                    </HoverCard>
                    {d.Status !== 'archived' && <HoverCard closeDelay={0} openDelay={0}>
                      <HoverCard.Trigger asChild>
                      <button type="button" aria-label='Add User' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500' onClick={() => {
                        setModalBox({
                          open: true,
                          url: `/admin/user/${d.BusinessID}/${d.EasyDraft}/add`,
                          title: 'Add User',
                          classes: 'w-[480px] h-2/3 overflow-hidden'
                        })
                      }}>
                        <FaUserPlus className="w-6 h-6" />
                      </button>
                      </HoverCard.Trigger>
                      <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none text-grey-800' side='top' >
                        Add User
                      </HoverCard.Content>
                    </HoverCard>}
                    <HoverCard closeDelay={0} openDelay={0}>
                      <HoverCard.Trigger asChild>
                      <button aria-label='Toggle business status' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                      onClick={() => {
                        setArchiveModal({
                          isOpen: true,
                          businessId: d.BusinessID,
                          status: d.Status,
                        })
                      }}
                    >
                      { d.Status === 'archived' ? <LuArchiveRestore className='w-6 h-6' /> : <LuArchive className='w-6 h-6' />}
                    </button>
                      </HoverCard.Trigger>
                      <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none text-grey-800' side='top' >
                        {d.Status === 'archived' ? 'Unarchive' : 'Archive'}
                      </HoverCard.Content>
                    </HoverCard>
                    <HoverCard closeDelay={0} openDelay={0}>
                      <HoverCard.Trigger asChild>
                        <button
                          aria-label='Delete EasyDairyId'
                          className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600 enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the td click
                            setPurgeModal(d);
                          }}
                        >
                          <LuTrash className='w-6 h-6' />
                        </button>
                      </HoverCard.Trigger>
                      <HoverCard.Content
                        role='tooltip'
                        className='rounded py-2 px-4 text-center pointer-events-none text-grey-800'
                        side='top'
                      >
                        Delete
                      </HoverCard.Content>
                    </HoverCard>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fetcher.data?.message && <p className='py-2 border border-t-0 bg-white text-center lg:text-lg text-grey-600'>{fetcher.data?.message}</p>}
      <Pagination
        className='ml-auto mt-3 border border-gray-100 rounded'
        disabled={fetcher.state === 'loading'}
        currentPage={page}
        pageSize={pageSize}
        totalCount={fetcher.data?.total || 0}
        onPageChange={handlePageChange}
      />
      <ModalBox isOpen={modalBox.open} classes={modalBox.classes} onClose={() => setModalBox((prev) => ({...prev, open: false}))} title={modalBox.title} url={modalBox.url} />
      {purgeModal && (<ConfirmationModal
                isOpen={!!purgeModal}
                onClose={() => {
                    if (!isPurgeLoading) {
                        setPurgeModal(null);
                    }
                }}
                onConfirm={() => {
                    handleConfirmPurge(purgeModal?.BusinessID);
                    setPurgeModal(null);
                }}
                message={`Are you sure you want to purge this Business ${purgeModal.BusinessID}?`}
                confirmButtonProps={{
                    disabled: isPurgeLoading, // Disable the confirm button while loading
                    children: isPurgeLoading ? 'Processing...' : 'Confirm', // Show loading text or normal text
                }}
            />)}
    </>
  );
};

export default BusinessList;
