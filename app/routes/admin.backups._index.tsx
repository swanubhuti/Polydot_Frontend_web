import { useEffect, useMemo, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import Button from '~/components/ui/Button';

import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import { ModalBox } from '~/components/ui/Dialog';
import Input from '~/components/ui/Input';
import { BiSearch } from 'react-icons/bi';

export async function loader({ request }: LoaderFunctionArgs) {
  const { success, response } = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings`, undefined, 'GET');
  if (!success) {
    return json({ error: response.errors, easydairy: [] });
  }
  const easydairy = ((response.data as { EasyDairyID: string; Exclude: boolean }[]) || [])?.sort((a, b) =>
    a.EasyDairyID.localeCompare(b.EasyDairyID)
  );
  return json({ easydairy: easydairy });
}

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();

  const { success, response } = await callAPI<GenericAPI>(
    request,
    '/api/admin/easydairy/settings',
    { settings: data.data },
    'PUT'
  );

  if (success && response.success) {
    return json({
      success: true,
      message: 'Settings updated',
    });
  } else {
    return json({
      success: false,
      message: 'Failed to update settings. ' + response.errors,
    });
  }
}

const BackupControl = () => {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean; message: string }>();

  const [exclude, setExclude] = useState(loaderData.easydairy.map((ed) => !!ed.Exclude));
  const [toUpdate, setToUpdate] = useState<string[]>([]);
  const [modalContent, setModalContent] = useState({ open: false, title: '', message: '' });
  const [search, setSearch] = useState('');
  const filteredData = useMemo(() => {
    return loaderData.easydairy.filter((e) => e.EasyDairyID.toLowerCase().includes(search.toLowerCase()));
  }, [loaderData.easydairy, search]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (toUpdate.length && fetcher.data?.success) {
      setModalContent({
        open: true,
        title: 'Reminder',
        message: `Please select herds to be processed for ${toUpdate.join(', ')}`,
      });
      setToUpdate([]);
    }
  }, [fetcher.data, toUpdate]);

  return (
    <>
      {fetcher.data?.success && (
        <div className='bg-green-100/50 mb-10 rounded p-5'>
          <h5 className='text-xl text-green-800'>{fetcher.data?.message}</h5>
        </div>
      )}
      {fetcher.data?.success === false && (
        <div className='bg-error-200/50 mb-10 rounded p-5'>
          <h5 className='text-xl text-red-500'>{fetcher.data?.message}</h5>
        </div>
      )}
      <h2 className='text-xl lg:text-2xl mb-5'>Edit Backup Settings</h2>
      <Input
        leftIcon={<BiSearch className='text-gray-400' />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search Easy Dairy ID'
        className='mb-3'
      />
      <fetcher.Form method='post' className='flex flex-col gap-3'>
        <table>
          <thead>
            <tr className='bg-primary-500 text-white font-bold [&>th]:p-3 text-left [&>th:first-child]:rounded-l [&>th:last-child]:rounded-r'>
              <th>Easy Dairy ID</th>
              <th>Exclude</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((ed, i) => (
              <tr key={`ed-${i}`} className={`[&>td]:p-3 ${i % 2 === 0 ? '' : 'bg-gray-100'}`}>
                <td>
                  <Link to={`/admin/backups/${ed.EasyDairyID}`} className='text-primary-500 underline'>
                    {ed.EasyDairyID}
                  </Link>
                </td>
                <td>
                  <SwitchToggle
                    enabled={exclude[i]}
                    setEnabled={(checked) => {
                      setExclude((prev) => {
                        let copy = [...prev];
                        copy[i] = checked;
                        return copy;
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type='button'
          disabled={fetcher.state !== 'idle'}
          className='w-max ml-auto mt-3 px-6'
          onClick={() => {
            let hasDiff = loaderData.easydairy.filter((ld, i) => ld.Exclude !== exclude[i] && !exclude[i]);
            if (hasDiff.length) {
              const ids = hasDiff.map((hd) => `"${hd.EasyDairyID}"`);
              setToUpdate(ids);
            }
            fetcher.submit(
              {
                data: loaderData.easydairy.map((ld, i) => ({
                  easyDairyId: ld.EasyDairyID,
                  exclude: exclude[i],
                })),
              },
              {
                method: 'POST',
                encType: 'application/json',
              }
            );
          }}
        >
          Update
        </Button>
      </fetcher.Form>
      <ModalBox
        isOpen={modalContent.open}
        onClose={() => {
          setModalContent((prev) => ({ ...prev, open: false }));
        }}
        title={modalContent.title}
      >
        <p className='py-5'>{modalContent.message}</p>
      </ModalBox>
    </>
  );
};

export default BackupControl;
