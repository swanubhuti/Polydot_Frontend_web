import { useEffect, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import Button from '~/components/ui/Button';

import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import DialogModal, { DialogProps } from '~/components/ui/Dialog';
import Spinner from '~/components/ui/Spinner';

export async function loader({request}: LoaderFunctionArgs) {
  if (!process.env.BASE_URL?.includes('dev.')) {
    return redirect('/admin')
  }
  const {success, response} = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings`, undefined, 'GET');
  if (!success) {
      return json({error: response.errors, easydairy: []})
  }
  const easydairy = (response.data as {EasyDairyID: string, Exclude: boolean}[] || [])?.sort((a,b) => a.EasyDairyID.localeCompare(b.EasyDairyID))
  return json({easydairy: easydairy})
}

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json()
  const {success, response} = await callAPI<GenericAPI>(request, '/api/dev/admin/db/reset', {easyDairyIds: data.data}, 'POST');

  if (success && response.success) {
    return json({
      success: true,
      message: 'Database reset. You may proceed to repopulate data.',
    })
  } else {
    return json({
      success: false,
      message: 'Failed to reset database. ' + response.errors,
    })
  }
}

const ResetDB = () => {
  const loaderData = useLoaderData<typeof loader>()
  const fetcher = useFetcher<{success: boolean, message: string}>()

  const [include, setInclude] = useState(Array(loaderData.easydairy.length).fill(true))
  const [loading, setLoading] = useState(false)
  const [modalContent, setModalContent] = useState<DialogProps>({isOpen: false, icon: 'warn', color: 'warn', title: '', message: '', buttons: []})

  useEffect(() => {
    setLoading(false)
    setInclude(Array(loaderData.easydairy.length).fill(true))
    window.scrollTo({top: 0})
  }, [fetcher.data])
  return (
    <>
      {fetcher.data?.success && fetcher.data.message && (
        <div className='bg-green-100/50 mb-10 rounded p-5'>
          <h5 className='text-xl text-green-800'>{fetcher.data?.message}</h5>
        </div>
      )}
      {fetcher.data?.success === false && (
        <div className='bg-error-200/50 mb-10 rounded p-5'>
          <h5 className='text-xl text-red-500'>{fetcher.data?.message}</h5>
        </div>
      )}
      <h2 className='text-xl lg:text-2xl mb-1'>Reset Database</h2>
      <p className="mb-5 text-gray-400">Select the EasyDairyIDs to populate into the backup settings table:</p>
      <fetcher.Form method='post' className='flex flex-col gap-3' onSubmit={(e) => {
        e.preventDefault()
        setModalContent({
          isOpen: true,
          icon: 'warn',
          title: 'Did you think this through properly?',
          color: 'warn',
          message: `Have you checked with everyone if it's OK to do this?`,
          buttons: [
            {variant: 'error', text: 'Yes, erase all data', onClick: () => {
              setLoading(true)
              fetcher.submit({
                data: loaderData.easydairy.filter((ed, i) => include[i])
              }, {
                method: 'POST',
                encType: 'application/json'
              })
              setModalContent(prev => ({...prev, isOpen: false}))
            }},
            {variant: 'outline', text: 'No, take me back!', onClick: () => {
              setModalContent(prev => ({...prev, isOpen: false}))
            }}
          ]
        })
      }}>
        <table>
          <thead>
            <tr className="bg-primary-500 text-white font-bold [&>th]:p-3 text-left [&>th:first-child]:rounded-l [&>th:last-child]:rounded-r">
              <th>Easy Dairy ID</th>
              <th>Repopulate</th>
            </tr>
          </thead>
          <tbody>
            {loaderData.easydairy.map((ed, i) => <tr key={`ed-${i}`} className={`[&>td]:p-3 ${i % 2 === 0 ? '' : 'bg-gray-100'}`}>
              <td>{ed.EasyDairyID}</td>
              <td>
                <SwitchToggle 
                  enabled={include[i]}
                  setEnabled={(checked) => {
                    setInclude(prev => {
                      let copy = [...prev]
                      copy[i] = checked
                      return copy
                    })
                  }}
                />
              </td>
            </tr>)}
          </tbody>
        </table>
        <Button type='submit' variant="error" disabled={fetcher.state !== 'idle'} className='w-max ml-auto mt-3 px-6'>
          Reset
        </Button>
      </fetcher.Form>
      <Spinner active={loading} />
      <DialogModal {...modalContent}/>
    </>
  );
}

export default ResetDB;
