import React, { useMemo, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useSubmit } from '@remix-run/react';
import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { Pagination } from '~/components/ui/Pagination';
import HoverCard from '~/components/ui/HoverCard';
import { ModalBox } from '~/components/ui/Dialog';
import BusinessHerdsComp from '~/components/AdminHerds';
import { HEAT_SYSTEM_LIST } from '~/lib/utils';
import { LuTrash } from 'react-icons/lu';
import ConfirmationModal from '~/components/ui/ConfirmationModel';
import Search from '~/components/ui/Search';
import Input from '~/components/ui/Input';
import { BiSearch } from 'react-icons/bi';

type LoaderResponse = {
  business: {
    BusinessID: string;
    EasyDairyID: string[];
    BusinessName: string;
    License: any;
    Status: string;
    EasyDraft: boolean;
  };
  easydairy: EasyDairyResponse[];
  heatSystemList: { label: (typeof HEAT_SYSTEM_LIST)[number]['label']; value: boolean }[];
};

type ActionData = {
  status: boolean;
  message: string;
  errors?: string; // Optional, only present if there's an error
};

export type EasyDairyResponse = {
  easyDairyId: string;
  herds: {
    code: string;
    id: string;
    licenseId: string;
    license: string;
    activeUntil: Date;
    visible: boolean;
    visibleAt: Date;
    note: string;
  }[];
  businesses: { id: string; name: string }[];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/easydairyid`, undefined, 'GET');
  if (!apiResult.success) {
    return json({ error: apiResult.response, easydairy: [], business: {} });
  }
  const easydairy = ((apiResult.response as EasyDairyResponse[]) || [])?.sort((a, b) =>
    a.easyDairyId.localeCompare(b.easyDairyId)
  );
  return json({ easydairy: easydairy, business: {}, heatSystemList: HEAT_SYSTEM_LIST });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const easyDairyId = formData.get('easyDairyId')?.toString();
  if (!easyDairyId) {
    return {
      status: 'failure',
      error: 'easyDairyId is required',
    };
  }

  const res = await callAPI<GenericAPI>(request, `/api/dev/admin/business/${easyDairyId}`, {}, 'DELETE');
  if (!res.success) {
    return json({
      status: false,
      message: 'Error Purging EasyDairy ID',
      errors: res.response.errors,
    });
  } else {
    return json({
      status: res.response.success,
      message: res.response.message,
    });
  }
}

export const pageLimit = 20;

type HerdType = {
  [key: string]: {
    visible: { [key: string]: boolean };
    note: { [key: string]: string };
    activeUntil: { [key: string]: string };
  };
};

const PurgeEasyDairy = ({ request }: { request: Request }) => {
  // const fetcher = useFetcher();
  const submit = useSubmit();
  const actionData = useActionData<ActionData>();
  const loaderData = useLoaderData<LoaderResponse>();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [query] = useState('');
  const [currPage, setCurrPage] = useState(1);
  const [modalContent, setModalContent] = useState({
    open: false,
    easyDairyId: '',
  });
  const [herds, setHerds] = useState<HerdType>(() => {
    let temp: HerdType = {};
    loaderData.easydairy.forEach((ed) => {
      temp[ed.easyDairyId] = { visible: {}, note: {}, activeUntil: {} };
    });
    return temp;
  });

  const [purgeModal, setPurgeModal] = useState<EasyDairyResponse | null>(null);
  const [isPurgeLoading, setIsPurgeLoading] = useState(false);

  const [searchEasyDairyId, setSearchEasyDairyId] = useState('');
  const filteredEasyDairyList = useMemo(() => {
    const target = searchEasyDairyId.toLowerCase();
    return loaderData.easydairy.filter((ed) => ed.easyDairyId.toLowerCase().includes(target));
  }, [searchEasyDairyId, loaderData.easydairy]);

  const handleConfirmPurge = async (request: Request, easyDairyId: string) => {
    setIsPurgeLoading(true);
    try {
      const formData = new FormData();
      formData.append('easyDairyId', easyDairyId);

      await submit(formData, { method: 'DELETE' });
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
      {actionData?.status && actionData.message && (
        <div className='bg-green-100/50 mb-10 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData?.message}</h5>
        </div>
      )}
      {!actionData?.status && actionData?.errors && (
        <div className='bg-error-200/50 mb-10 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData.message}</h5>
          <p className='text-grey-700'>{actionData.errors}</p>
        </div>
      )}
      <h2 className='text-xl lg:text-2xl mb-5'>{'Purge EasyDairy ID'}</h2>
      <Input
        leftIcon={<BiSearch className='text-gray-400' />}
        value={searchEasyDairyId}
        onChange={(e) => setSearchEasyDairyId(e.target.value)}
        placeholder='Search Easy Dairy ID'
        className='mb-3'
      />
      <Form ref={formRef} method='post' className='flex flex-col gap-3'>
        <table className='table-auto font-opensans w-full text-base lg:text-lg bg-white border text-left'>
          <thead className='font-bold'>
            <tr className='bg-primary-500 text-white border-b [&>th]:py-4 [&>th]:px-5'>
              <th>Easy Dairy ID</th>
              <th>Businesses Attached</th>
              <th>Total Herds</th>
              <th>Purge</th>
            </tr>
          </thead>
          <tbody className='text-gray-600'>
            {filteredEasyDairyList.map((ld, idx) => (
              <tr
                key={`row-${idx}`}
                className={`border-t [&>td]:align-top [&>td]:py-3 [&>td]:px-5 ${
                  (!query || ld.easyDairyId.toLowerCase().includes(query.toLowerCase())) &&
                  idx < pageLimit * currPage &&
                  idx >= (currPage - 1) * pageLimit
                    ? ''
                    : 'hidden'
                }`}
              >
                <td>{ld.easyDairyId}</td>
                <td>
                  <HoverCard openDelay={100}>
                    <HoverCard.Trigger asChild>
                      <span className='text-primary-500 cursor-pointer'>
                        {ld.businesses.length} Business{ld.businesses.length > 1 ? 'es' : ''}
                      </span>
                    </HoverCard.Trigger>
                    <HoverCard.Content className='rounded p-5 overflow-y-auto max-h-[500px]'>
                      <ul className='text-gray-700 space-y-1'>
                        {ld.businesses.map((b, i) => (
                          <li key={b.id}>
                            <span className='block'>{b.name}</span>
                          </li>
                        ))}
                      </ul>
                    </HoverCard.Content>
                  </HoverCard>
                </td>
                <td>
                  {ld.herds.length} Herd{ld.herds.length > 1 ? 's' : ''}
                </td>
                <td>
                  <HoverCard closeDelay={0} openDelay={0}>
                    <HoverCard.Trigger asChild>
                      <button
                        aria-label='Delete EasyDairyId'
                        className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600 enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the td click
                          setPurgeModal(ld as unknown as EasyDairyResponse);
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          className='ml-auto mt-3 border border-gray-100 rounded'
          currentPage={currPage}
          pageSize={pageLimit}
          totalCount={loaderData.easydairy.length}
          onPageChange={setCurrPage}
        />
      </Form>
      <ModalBox
        isOpen={modalContent.open}
        classes='w-full max-w-3xl h-2/3'
        onClose={() => {
          setModalContent((prev) => ({ ...prev, open: false }));
        }}
        title='Manage Herds'
      >
        {modalContent.easyDairyId && (
          <BusinessHerdsComp
            prevVisibility={herds[modalContent.easyDairyId].visible}
            prevNotes={herds[modalContent.easyDairyId].note}
            prevActiveUntil={herds[modalContent.easyDairyId].activeUntil}
            onChange={({ visible, notes, activeUntilList }) => {
              setHerds((prevState) => {
                return {
                  ...prevState,
                  [modalContent.easyDairyId]: { visible: visible, note: notes, activeUntil: activeUntilList },
                };
              });
            }}
            easyDairyId={modalContent.easyDairyId}
            businessId={loaderData.business?.BusinessID ?? '0'}
          />
        )}
      </ModalBox>
      {purgeModal ? (
        <ConfirmationModal
          isOpen={!!purgeModal}
          onClose={() => {
            if (!isPurgeLoading) {
              setPurgeModal(null);
            }
          }}
          onConfirm={() => {
            handleConfirmPurge(request, purgeModal?.easyDairyId);
          }}
          message={`Are you sure you want to purge this EasyDairy (${purgeModal.easyDairyId}) with associated ${purgeModal?.businesses?.length} businesses and ${purgeModal?.herds?.length} herds?`}
          confirmButtonProps={{
            disabled: isPurgeLoading, // Disable the confirm button while loading
            children: isPurgeLoading ? 'Processing...' : 'Confirm', // Show loading text or normal text
          }}
        />
      ) : null}
    </>
  );
};

export default PurgeEasyDairy;
