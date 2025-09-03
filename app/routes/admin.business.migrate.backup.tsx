import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';
import { CheckmarkIcon } from 'react-hot-toast';
import { BiUpload } from 'react-icons/bi';
import DialogModal from '~/components/ui/Dialog';
import Input from '~/components/ui/Input';
import useFetcherWithReset from '~/hooks/useFetcherWithReset';
import { GenericAPI } from '~/lib/types';
import { callAPI } from '~/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const res = await callAPI<GenericAPI>(request, `/api/dev/admin/businesses?status=active`, undefined, 'GET');
  if (!res.success) {
    console.error('fail to get business');
    return json({ business: [] });
  }

  return json({ business: res.response.data as { BusinessID: string; BusinessName: string; EasyDraft: boolean }[] });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const businessId = formData.get('businessId')?.toString();
    const res = await callAPI<GenericAPI>(request, `/api/dev/admin/backup/business/${businessId}`);
    console.log(res);
    if (!res.success) {
      return {
        status: 'failure',
        error: 'Fail to backup',
      };
    }
    if (!res.response.success) {
      return {
        status: 'failure',
        error: res.response.message,
      };
    }
    return {
      status: 'success',
      message: 'Backup success',
    };
  } catch (error) {
    const e = error as any;
    return {
      status: 'failure',
      error: e.message ?? 'Unexpected error',
    };
  }
}

export default function BackupBusinessPage() {
  const loaderData = useLoaderData<typeof loader>();
  const [search, setSearch] = useState('');
  const businessList = useMemo(() => {
    return loaderData.business.filter((b) => b.BusinessName.toLowerCase().includes(search));
  }, [search, loaderData.business]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const fetcher = useFetcherWithReset<{ status: string; error?: string }>();

  const handleBackup = (businessId: string) => {
    const formData = new FormData();
    formData.append('businessId', businessId);
    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <div>
      <DialogModal
        isOpen={targetId != null}
        color='primary'
        title='Are you sure to proceed?'
        message='This will overwrite previously saved backup in the storage.'
        buttons={[
          {
            text: 'Yes',
            variant: 'black',
            className: 'mt-2',
            onClick: () => {
              if (targetId) {
                handleBackup(targetId);
                setTargetId(null);
              }
            },
          },
          {
            text: 'Cancel',
            variant: 'outline',
            className: 'mt-2',
            onClick: () => {
              setTargetId(null);
            },
          },
        ]}
      />
      <DialogModal
        isOpen={fetcher.state === 'submitting'}
        color='primary'
        title='Backing up business'
        message={'Backup in progress...'}
      />
      <DialogModal
        isOpen={fetcher.data?.status === 'success'}
        icon='success'
        color='primary'
        title='OK'
        message={'Backup success'}
        buttons={[
          {
            text: 'Close',
            variant: 'black',
            className: 'mt-2',
            onClick: () => {
              fetcher.reset();
            },
          },
        ]}
      />
      <DialogModal
        isOpen={fetcher.data?.status === 'failure'}
        icon='error'
        color='error'
        title='Error'
        message={fetcher.data?.error}
        buttons={[
          {
            text: 'Close',
            variant: 'black',
            className: 'mt-2',
            onClick: () => {
              fetcher.reset();
            },
          },
        ]}
      />
      <Input placeholder='Search name...' className='mb-3' value={search} onChange={(e) => setSearch(e.target.value)} />
      <table className='table-auto font-opensans w-full text-base lg:text-lg bg-white [&_td]:px-5 border'>
        <thead className='font-bold [&_th]:py-3'>
          <tr className='bg-primary-500 text-white border-b'>
            <th className='text-left px-5'>Business</th>
            <th className='px-5'>EasyDraft</th>
            <th className='px-5'>Backup</th>
          </tr>
        </thead>
        <tbody className='text-gray-600 [&_td]:py-3'>
          {businessList.map((b) => (
            <tr key={b.BusinessID} className='border-t'>
              <td>
                <div>
                  <p>{b.BusinessName}</p>
                  <p className='text-gray-500 text-sm'>{b.BusinessID}</p>
                </div>
              </td>
              <td className='w-12'>{b.EasyDraft === true ? <CheckmarkIcon className='mx-auto' /> : null}</td>
              <td className='w-12'>
                <button className='mx-auto block' onClick={() => setTargetId(b.BusinessID)}>
                  <BiUpload className='size-6' />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
