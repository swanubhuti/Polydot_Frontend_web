import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';
import { LuArchiveRestore } from 'react-icons/lu';
import DialogModal from '~/components/ui/Dialog';
import Input from '~/components/ui/Input';
import { GenericAPI } from '~/lib/types';
import { callAPI } from '~/session.server';
import useFetcherWithReset from '~/hooks/useFetcherWithReset';

export async function loader({ request }: LoaderFunctionArgs) {
  const res = await callAPI<GenericAPI>(request, `/api/dev/admin/backup/business`, undefined, 'GET');
  if (!res.success) {
    console.error('fail to get business');
    return json({ business: [] });
  }

  return json({ business: res.response as { env: string; id: string; name: string; date: string }[] });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const businessId = formData.get('businessId')?.toString();
    const env = formData.get('env')?.toString();
    const res = await callAPI<GenericAPI>(request, '/api/dev/admin/backup/business/write', {
      id: businessId,
      env,
    });
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
    return loaderData.business.filter((b) => b.name.toLowerCase().includes(search));
  }, [search, loaderData.business]);
  const fetcher = useFetcherWithReset<{ status: string; error?: string }>();
  const [targetId, setTargetId] = useState<{ id: string; env: string } | null>(null);

  const handleBackup = ({ id, env }: { id: string; env: string }) => {
    const formData = new FormData();
    formData.append('businessId', id);
    formData.append('env', env);
    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <div>
      <DialogModal
        isOpen={targetId != null}
        color='primary'
        title='Are you sure to proceed?'
        message='This will overwrite existing data in the database.'
        buttons={[
          {
            text: 'Restore',
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
        title='Restoring business'
        message={'Restore in progress...'}
      />
      <DialogModal
        isOpen={fetcher.data?.status === 'success'}
        icon='success'
        color='primary'
        title='OK'
        message={'Write backup success. Remember to change the password for all the users under this business'}
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
            <th className='px-5'>Source</th>
            <th className='px-5'>Last Updated</th>
            <th className='px-5'>Restore</th>
          </tr>
        </thead>
        <tbody className='text-gray-600 [&_td]:py-3'>
          {businessList.map((b) => (
            <tr key={b.id} className='border-t'>
              <td>
                <div>
                  <p>{b.name}</p>
                  <p className='text-gray-500 text-sm'>{b.id}</p>
                </div>
              </td>
              <td className='text-center'>{b.env}</td>
              <td className='text-center'>{new Date(b.date).toLocaleString()}</td>
              <td className='w-12'>
                <button className='mx-auto block' onClick={() => setTargetId({ id: b.id, env: b.env })}>
                  <LuArchiveRestore className='size-6' />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
