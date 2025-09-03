import React, { useEffect, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useNavigation } from '@remix-run/react';
import Button from '~/components/ui/Button';

import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import { FaAngleLeft } from 'react-icons/fa6';
import Checkbox from '~/components/ui/Checkbox';

export async function loader({request, params}: LoaderFunctionArgs) {
    const {success, response} = await callAPI<GenericAPI>(request, `/api/dev/admin/easydairy/herd/settings?easyDairyId=${params.easydairyid}`, undefined, 'GET');
    if (!success) {
        return json({error: response.errors, rows: [], easyDairyId: ''})
    }
    const rows = (response as {HerdUUID: string, HerdCode: string, Name: string, Address: string, Hidden: boolean, Processing: boolean}[] || [])?.sort((a,b) => a.HerdCode.localeCompare(b.HerdCode))
    return json({rows, easyDairyId: params.easydairyid})
}


export async function action({ request, params }: ActionFunctionArgs) {
  const data = await request.json()
  console.log('entery', data, params.easydairyid)
  const {success, response} = await callAPI<GenericAPI>(request, '/api/dev/admin/easydairy/herd/settings', {easyDairyId: params.easydairyid, settings: data.data}, 'PUT');

  if (success && response.success) {
    return json({
      success: true,
      message: 'Settings updated',
    })
  } else {
    return json({
      success: false,
      message: 'Failed to update settings. ' + response.errors,
    })
  }
}

const HerdBackupControl = () => {
  const loaderData = useLoaderData<typeof loader>()
  const fetcher = useFetcher<{success: boolean, message: string}>()

  const [processing, setProcessing] = useState(loaderData.rows.map(ed => !!ed.Processing))
  
  useEffect(() => {
    window.scrollTo({top: 0})
  }, [fetcher.data])

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
      <Link to={`/admin/backups`} className="flex gap-2 items-center underline text-primary-500 py-2"><FaAngleLeft /> Back to All Easy Dairy IDs</Link>
      <div className="flex justify-between items-center">
        <h2 className='text-xl my-5'>Edit Backup Settings for {loaderData.easyDairyId}</h2>
        <label className="flex gap-2 items-center p-1 cursor-pointer">
          <Checkbox checked={processing.filter(p => p).length === loaderData.rows.length} onChange={(e) => {
            if (e.target.checked) {
              setProcessing(loaderData.rows.map(ed => true))
            } else {
              setProcessing(loaderData.rows.map(ed => false))
            }
          }} />
          <span>Select All Herds</span>
        </label>
      </div>
      <fetcher.Form method='post' className='flex flex-col gap-3'>
        <table>
          <thead>
            <tr className="bg-primary-500 text-white font-bold [&>th]:p-3 text-left [&>th:first-child]:rounded-l [&>th:last-child]:rounded-r">
              <th>Herd UUID</th>
              <th>Herd Code</th>
              <th>Name</th>
              <th>Address</th>
              <th>Hidden</th>
              <th>Processing</th>
            </tr>
          </thead>
          <tbody>
            {loaderData.rows.map((ed, i) => <tr key={`ed-${i}`} className={`[&>td]:p-3 ${i % 2 === 0 ? '' : 'bg-gray-100'}`}>
              <td>{ed.HerdUUID}</td>
              <td>{ed.HerdCode}</td>
              <td>{ed.Name}</td>
              <td>{ed.Address}</td>
              <td>{ed.Hidden ? 'true' : 'false'}</td>
              <td>
                <SwitchToggle 
                  enabled={processing[i]}
                  setEnabled={(checked) => {
                    setProcessing(prev => {
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
        {loaderData.rows.length > 0 && <Button type='button' disabled={fetcher.state !== 'idle'} className='w-max ml-auto mt-3 px-6' onClick={() => {
          fetcher.submit({
            data: loaderData.rows.map((ld, i) => ({
              ...ld,
              Processing: processing[i]
            }))
          }, {
            method: 'POST',
            encType: 'application/json'
          })
        }}>
          Update
        </Button>}
      </fetcher.Form>
    </>
  );
}

export default HerdBackupControl;
