import React, { useEffect, useState } from 'react';
import {
  type ActionFunctionArgs,
  json,
} from '@remix-run/node';
import { Form, useActionData, useFetcher, useSubmit } from '@remix-run/react';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import { z, ZodError } from 'zod';
import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import HoverCard from '~/components/ui/HoverCard';
import { AiOutlineRollback } from 'react-icons/ai';
import { Pagination } from '~/components/ui/Pagination';
import DialogModal, { ModalBox } from '~/components/ui/Dialog';
import { BiLoaderAlt } from 'react-icons/bi';
import moment from 'moment';

const RESOURCE_URL = '/admin/resources/nasis';
const csvColumnSchema = z.object({
  ProductID: z.string().nullable(),
  DrugName: z.string().nullable(),
  Archive: z.string().nullable(),
});
type DrugHistory = {
  id: string;
  filename: string;
  isRollback: boolean;
  uploadAt: Date;
};

export async function action({ request }: ActionFunctionArgs) {
  const clonedData = request.clone()
  const formData = await clonedData.formData()
  const action = formData.get("action");
  let apiProps: {url: string, body: any, method: 'POST' | 'PUT', contentType: string | null} = { url:'', body: undefined, method: 'POST', contentType: 'application/json'}
  if (action && action === 'rollback'){
    apiProps.url = '/api/dev/admin/upload/rollback'
    apiProps.body = {id: formData.get('id'), type: 'Drugs'}
    apiProps.method = 'PUT'
  } else {
    apiProps.url = '/api/dev/admin/import/Drugs'
    apiProps.contentType = request.headers.get('content-type')
  }
  const res = await callAPI<GenericAPI>(request, apiProps.url , apiProps.body, apiProps.method, undefined, apiProps.contentType ?? 'application/json');
  if (!res.success) {
    return json({
      status: 'failure',
      errors: !res.success ? res.response.errors as string : 'Update failed.'
    });
  } else if (res.success) {
    return json({
      status: 'success',
      errors: res.response.message
    });
  }
  
  return json({status: 'failure', errors: 'unknown'})
}

export default function DrugsList() {
  const actionData = useActionData<{ status: string; errors?: string }>();

  const submit = useSubmit();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvVal, setCsvVal] = useState<any>();
  const [page, setPage] = React.useState(1);
  const [initialLoaded, setInitialLoaded] = React.useState(false);
  const [pageSize] = React.useState<number>(10);
  const [modalBox, setModalBox] = React.useState({ open: false, url: '', title: '', classes: '' });
  const [openModal, setOpenModal] = React.useState(false);
  const fetcher = useFetcher<{
    data?: DrugHistory[];
    total: number;
    message?: string;
  }>();
  const [rollbackModal, setRollbackModal] = React.useState<{ isOpen: boolean; id: string; }>({
    isOpen: false,
    id: ''
  });
  const handlePageChange = (page: number) => {
    setPage(page);
    const params = buildQueryString({
      page: page,
      pageSize: pageSize,
    });

    let url = RESOURCE_URL;
    const queryString = params.toString();
    if (queryString.length) {
      url = `${url}?${queryString}`;
    }
    fetcher.load(url);
  };

  const handleRollback = async () => {
    const id = rollbackModal.id;

    const formData = new FormData();
    formData.append('id', id);
    formData.append('action', 'rollback');

    submit(formData, { method: 'post' });
    setRollbackModal({
      isOpen: false,
      id: ''
    });
  };
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const csvContent = await readFile(file);
        validateCsv(csvContent);
        setCsvError(null);
        setCsvVal(file);
      } catch (err) {
        if (err instanceof ZodError) {
          setCsvError(
            `Invalid CSV structure. ${err.errors
              .map((error) => 'Column ' + error.path[0] + ' ' + error.message)
              .join(', ')}`
          );
        } else {
          setCsvError(`Error reading the CSV file: ${err}`);
        }
      }
    }
  };
  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        resolve(textContent);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  };

  const validateCsv = (csvContent: string) => {
    const rows = csvContent.split('\n');
    const header = rows[0].split(',');
    csvColumnSchema.parse(Object.fromEntries(header.map((col) => [col.trim(), null])));
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].trim() === '') {
        continue
      }
      const rowData = rows[i].split(',');
      if (rowData.length < header.length) {
        throw new Error(`Row ${i + 1} has an incorrect number of columns.`);
      }
    }
  };

  function buildQueryString({ page, pageSize }: { page: number; pageSize: number }) {
    const params = new URLSearchParams();
    params.set('type', 'Drugs');
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());
    return params.toString();
  }

  useEffect(() => {
    if (!initialLoaded) {
      let url = RESOURCE_URL;
      const queryString = buildQueryString({
        page: 1,
        pageSize: pageSize,
      });
      if (queryString.length) {
        url = `${url}?${queryString}`;
      }
      fetcher.load(url);
      setInitialLoaded(true);
    }
  }, [fetcher, initialLoaded, pageSize]);

  useEffect(() => {
    if (actionData?.status) {
      setOpenModal(true);
    }
  }, [actionData?.status]);

  return (
    <>
      <DialogModal
        isOpen={openModal}
        icon={actionData?.status === 'success' ? 'success' : 'error'}
        color={actionData?.status === 'success' ? 'primary' : 'error'}
        title={actionData?.status === 'success' ? 'Success' : 'Error'}
        message={actionData?.errors}
        buttons={[
          {
            text: 'Return',
            variant: 'black',
            className: 'mt-2',
            onClick: () => {
              setOpenModal(false);
            },
          },
        ]}
      />
      <DialogModal
        isOpen={rollbackModal.isOpen}
        title='Rollback'
        message={`Are you sure you want to rollback this record?`}
        buttons={[
          {
            text: 'Confirm',
            variant: 'primary',
            className: 'mr-5 mt-6',
            onClick: handleRollback,
          },
          {
            text: 'Cancel',
            variant: 'outline',
            className: 'mt-6',
            onClick: () => {
              setRollbackModal({ isOpen: false, id: '' });
            },
          },
        ]}
      />
      <h2 className='text-xl lg:text-2xl mb-5'>Update Drugs List</h2>
      <Form ref={formRef} method='post' encType='multipart/form-data' className='max-w-xl flex gap-3'>
        <Input type='file' label='CSV' name='csv' error={csvError ?? ''} accept="text/csv" onChange={handleFileChange} className='' />
        <Button
          type='submit'
          className='w-max ml-auto mt-[30px] px-4 max-h-12'
          disabled={csvError || !csvVal ? true : false}
        >
          Add
        </Button>
      </Form>
      <div className='overflow-auto w-full mt-10'>
        <h2 className='text-xl lg:text-2xl mb-5'>Drugs Upload History</h2>
        {!fetcher.data?.data && fetcher.state === 'loading' && (
          <p className='mt-10 w-full flex flex-row justify-center'>
            <BiLoaderAlt className='w-8 h-8 animate-spin text-grey-600' />
          </p>
        )}
        <table className='table-auto font-opensans w-full mt-5 text-base lg:text-lg bg-white [&_td]:px-5 border'>
          <thead className='font-bold [&_td]:py-4'>
            <tr className='bg-primary-500 text-white border-b'>
              <td>ID</td>
              <td>Filename</td>
              <td>Uploaded At</td>
              <td>Rollback</td>
              <td>Actions</td>
            </tr>
          </thead>
          <tbody className='text-gray-600 [&_td]:py-3'>
            {!fetcher.data?.message &&
              !!fetcher.data?.data?.length &&
              fetcher.data?.data.map((d) => (
                <tr key={d.id} className='border-t'>
                  <td className='truncate max-w-[15ch] md:max-w-xs'>
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCard.Trigger asChild>
                        <span className='font-medium'>{d.id}</span>
                      </HoverCard.Trigger>
                      <HoverCard.Content className='rounded p-4 text-center'>{d.id}</HoverCard.Content>
                    </HoverCard>
                  </td>
                  <td>{d.filename}</td>
                  <td>{moment(d.uploadAt).format('DD/MM/YYYY')}</td>
                  <td>{d.isRollback ? 'Yes' : 'No'}</td>
                  <td>
                    <div className='flex gap-1'>
                      <HoverCard closeDelay={0} openDelay={0}>
                        <HoverCard.Trigger asChild>
                          <button
                            aria-label='Rollback record'
                            className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                            onClick={() => 
                              setRollbackModal({
                                isOpen: true,
                                id: d.id
                              })
                            }
                          >
                            <AiOutlineRollback className='w-6 h-6' />
                          </button>
                        </HoverCard.Trigger>
                        <HoverCard.Content
                          role='tooltip'
                          className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800'
                          side='top'
                        >
                          Rollback
                        </HoverCard.Content>
                      </HoverCard>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination
        className='ml-auto mt-3 border border-gray-100 rounded'
        disabled={fetcher.state === 'loading'}
        currentPage={page}
        pageSize={pageSize}
        totalCount={fetcher.data?.total || 0}
        onPageChange={handlePageChange}
      />
      <ModalBox
        isOpen={modalBox.open}
        classes={modalBox.classes}
        onClose={() => setModalBox((prev) => ({ ...prev, open: false }))}
        title={modalBox.title}
        url={modalBox.url}
      />
    </>
  );
}
