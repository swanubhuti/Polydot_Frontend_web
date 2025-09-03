import React, { useEffect, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useFetcher, useLoaderData, useSubmit } from '@remix-run/react';
import Button from '~/components/ui/Button';

import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import SelectDropdown from '~/components/ui/Dropdown';
import { Pagination } from '~/components/ui/Pagination';
import HoverCard from '~/components/ui/HoverCard';
import { LuArchiveRestore, LuTrash } from 'react-icons/lu';
import Spinner from '~/components/ui/Spinner';
import ConfirmationModal from '~/components/ui/ConfirmationModel';
import Checkbox from '~/components/ui/Checkbox';
import Input, { InputLabel } from '~/components/ui/Input';
import { BiSearch } from 'react-icons/bi';

type EasyDairyResponse = {
  data: string[];
  errors?: any;
};
type ActionData = {
  status: boolean;
  message: string;
  errors?: string;
};
const RESOURCE_URL = '/admin/resources/purgeHerd';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { success, response } = await callAPI(request, `/api/dev/admin/easydairyIds`, undefined, 'GET');
  if (!success) {
    return json({ error: response?.errors || 'Unknown error', easydairyIds: [] });
  }
  const easydairyIds = (response as EasyDairyResponse).data;
  return json({ easydairyIds });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const herdUUID = formData.get('herdUUID')?.toString();
  const action = formData.get('action')?.toString();
  if (!herdUUID) {
    return {
      status: 'failure',
      error: 'herdUUID is required',
    };
  }
  let res;
  if (action === 'purge') {
    res = await callAPI<GenericAPI>(request, `/api/dev/admin/easydairy/purgeHerd/${herdUUID}`, {}, 'DELETE');
  } else {
    res = await callAPI<GenericAPI>(request, `/api/dev/admin/easydairy/recoverHerd/${herdUUID}`, {}, 'POST');
  }
  if (!res.success) {
    return json({
      status: false,
      message: 'Error Purging Herd',
      errors: res.response.errors,
    });
  } else {
    return json({
      status: res.response.success,
      message: res.response.message,
    });
  }
}

const purgeHerd = ({ request }: { request: Request }) => {
  const { easydairyIds } = useLoaderData<{ easydairyIds: string[] }>();
  const fetcher = useFetcher<{ success: boolean; total: number; data: any }>();
  const actionData = useActionData<ActionData>();

  const submit = useSubmit();

  const [selectedId, setSelectedId] = useState<string | null>('All');
  const [herdData, setHerdData] = useState<
    {
      HerdUUID: string;
      HerdCode: string;
      BusinessIDs: string[];
      Address: string;
      Hidden: boolean;
      EasyDairyID: string;
      Purged: boolean;
    }[]
  >([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [spinnerActive, setSpinnerActive] = useState(false);
  const [purgeModal, setPurgeModal] = useState<{ herdUUID: string; action: string } | null>(null);
  const [isPurgeLoading, setIsPurgeLoading] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [purgedHerdFlag, setPurgedHerdsFlag] = useState(false);
  const [searchHerd, setSearchHerd] = useState('');

  const dropdownOptions = [
    { label: 'All', value: 'All' },
    ...easydairyIds.map((id) => ({
      label: id,
      value: id,
    })),
  ];

  useEffect(() => {
    if (fetcher.data?.success) {
      setHerdData(fetcher.data.data);
      setTotalCount(fetcher.data.total);
      setSpinnerActive(false);
    } else {
      setHerdData([]);
    }
  }, [fetcher.data]);

  useEffect(() => {
    setSpinnerActive(true);
    const params = new URLSearchParams({
      easyDairyId: 'All',
      page: page.toString(),
      limit: limit.toString(),
      purged: purgedHerdFlag.toString(),
      excludeHerds: `MERGE,UNIVERSAL,Reproduction,PURGE,PURGEHERD`,
    });
    if (searchHerd.trim().length) {
      params.append('search', searchHerd.trim());
    }

    fetcher.load(`${RESOURCE_URL}?${params.toString()}`);
  }, []);

  const handleSelectChangeId = (selectedOption: { label: string; value: string }) => {
    setSelectedId(selectedOption.value);
  };

  const handleApply = () => {
    setSpinnerActive(true);
    setPage(1);
    if (!selectedId) {
      alert('Please select easydairy');
      return;
    }
    const params = new URLSearchParams({
      easyDairyId: selectedId,
      page: '1',
      limit: limit.toString(),
      purged: purgedHerdFlag.toString(),
      excludeHerds: `MERGE,UNIVERSAL,Reproduction,PURGE,PURGEHERD`,
    });

    if (searchHerd.trim().length) {
      params.append('search', searchHerd.trim());
    }

    fetcher.load(`${RESOURCE_URL}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (!selectedId) {
      alert('Please select easydairy');
      return;
    }
    const params = new URLSearchParams({
      easyDairyId: selectedId,
      page: newPage.toString(),
      limit: limit.toString(),
      purged: purgedHerdFlag.toString(),
      excludeHerds: `MERGE,UNIVERSAL,Reproduction,PURGE,PURGEHERD`,
    });
    if (searchHerd.trim().length) {
      params.append('search', searchHerd.trim());
    }

    fetcher.load(`${RESOURCE_URL}?${params.toString()}`);
  };

  const handleConfirmPurge = async (request: Request, herdUUID: string, action: string) => {
    setIsPurgeLoading(true);
    try {
      const formData = new FormData();
      formData.append('herdUUID', herdUUID);
      formData.append('action', action);

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

  return (
    <>
      {actionData?.status && (
        <div className='bg-green-100/50 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData?.message}</h5>
        </div>
      )}
      {!actionData?.status && actionData?.errors && (
        <div className='bg-error-200/50 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData.message}</h5>
          <p className='text-grey-700'>{actionData.errors}</p>
        </div>
      )}
      <div className='flex flex-col gap-2 mt-3'>
        <h2 className='text-2xl font-bold'>Purge Herd </h2>
        <div className='flex gap-4'>
          <div className='flex gap-2 items-center'>
            <p className='font-semibold'>EasyDairy ID</p>
            <SelectDropdown
              options={dropdownOptions}
              type='single'
              value={selectedId || 'All'}
              onSelectChange={handleSelectChangeId}
              className='max-w-xl flex-1 min-w-[200px]'
              id='easyDairySelect'
            />
          </div>
          <div className='flex gap-2 items-center'>
            <InputLabel htmlFor='searchHerd' className='font-semibold block'>
              Herd
            </InputLabel>
            <Input
              id='searchHerd'
              leftIcon={<BiSearch className='text-gray-400' />}
              value={searchHerd}
              onChange={(e) => setSearchHerd(e.target.value)}
              placeholder='Search Herd Code or Herd UUID'
              className='min-w-96'
            />
          </div>
          <div className='flex gap-2 items-center'>
            <Checkbox
              id='purgedHerd'
              checked={purgedHerdFlag}
              onChange={(e) => {
                setPurgedHerdsFlag(e.currentTarget.checked);
              }}
            />
            <label htmlFor='purgedHerd'>Purged</label>
          </div>
          <Button type='button' onClick={handleApply} className='bg-blue-600 text-white px-4 py-2 rounded'>
            Apply
          </Button>
        </div>
      </div>
      <Form ref={formRef} method='post' className='flex flex-col gap-3'>
        <div className='overflow-auto w-full mt-5'>
          <table className='table-auto font-opensans w-full text-base lg:text-lg bg-white border'>
            <thead>
              <tr className='bg-primary-500 text-white font-bold [&>th]:p-3 text-left [&>th:first-child]:rounded-l [&>th:last-child]:rounded-r'>
                <th>Herd UUID</th>
                <th>Herd Code</th>
                <th>Businesses</th>
                <th>EasyDairyID</th>
                <th>Hidden</th>
                <th>{herdData[0]?.Purged ? 'Recover' : 'Purge'}</th>
              </tr>
            </thead>
            <tbody>
              {herdData.map((ed, i) => (
                <tr key={`ed-${i}`} className={`[&>td]:p-3 ${i % 2 === 0 ? '' : 'bg-gray-100'}`}>
                  <td>{ed.HerdUUID}</td>
                  <td>{ed.HerdCode}</td>
                  <td>
                    {!ed.BusinessIDs ? (
                      ''
                    ) : ed.BusinessIDs.length === 1 ? (
                      ed.BusinessIDs[0]
                    ) : (
                      <HoverCard openDelay={100}>
                        <HoverCard.Trigger asChild>
                          <span className='hover:text-sky-500 text-primary-500 cursor-default'>
                            {ed.BusinessIDs.length} Businesses
                          </span>
                        </HoverCard.Trigger>
                        <HoverCard.Content className='rounded p-5 text-sm'>
                          <ul className='list-disc pl-4'>
                            {ed.BusinessIDs.map((val, idx) => (
                              <li key={`row-${idx}`}>
                                <span className='block'>{val}</span>
                              </li>
                            ))}
                          </ul>
                        </HoverCard.Content>
                      </HoverCard>
                    )}
                  </td>
                  <td>{ed.EasyDairyID}</td>
                  <td>{ed.Hidden ? 'true' : 'false'}</td>
                  <td>
                    {ed.Purged ? (
                      <HoverCard closeDelay={0} openDelay={0}>
                        <HoverCard.Trigger asChild>
                          <button
                            aria-label='Restore Herd'
                            className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPurgeModal({
                                herdUUID: ed.HerdUUID,
                                action: 'restore',
                              });
                            }}
                          >
                            <LuArchiveRestore className='w-6 h-6' />
                          </button>
                        </HoverCard.Trigger>
                        <HoverCard.Content
                          role='tooltip'
                          className='rounded py-2 px-4 text-center pointer-events-none text-grey-800'
                          side='top'
                        >
                          Restore Herd
                        </HoverCard.Content>
                      </HoverCard>
                    ) : (
                      <HoverCard closeDelay={0} openDelay={0}>
                        <HoverCard.Trigger asChild>
                          <button
                            aria-label='Delete Herd'
                            className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600 enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPurgeModal({
                                herdUUID: ed.HerdUUID,
                                action: 'purge',
                              });
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
                          Purge
                        </HoverCard.Content>
                      </HoverCard>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            className='ml-auto mt-3 border border-gray-100 rounded'
            currentPage={page}
            pageSize={limit}
            totalCount={totalCount}
            onPageChange={handlePageChange}
          />
        </div>
      </Form>
      {purgeModal && (
        <ConfirmationModal
          isOpen={!!purgeModal}
          onClose={() => {
            if (!isPurgeLoading) {
              setPurgeModal(null);
            }
          }}
          onConfirm={() => {
            handleConfirmPurge(request, purgeModal?.herdUUID, purgeModal?.action);
            setPurgeModal(null);
          }}
          message={
            purgeModal.action === 'purge'
              ? `Are you sure you want to purge this Herd ${purgeModal.herdUUID}?`
              : `Are you sure you want to restore this Herd ${purgeModal.herdUUID}?`
          }
          confirmButtonProps={{
            disabled: isPurgeLoading, // Disable the confirm button while loading
            children: isPurgeLoading ? 'Processing...' : 'Confirm', // Show loading text or normal text
          }}
        />
      )}
      <Spinner active={spinnerActive} />
    </>
  );
};

export default purgeHerd;
