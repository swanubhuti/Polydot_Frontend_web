import React, { useEffect, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import Button from '~/components/ui/Button';

import { callAPI } from '~/session.server';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import { ModalBox } from '~/components/ui/Dialog';
import Input from '~/components/ui/Input';

export async function loader({request}: LoaderFunctionArgs) {
  const {success, response} = await callAPI<GraphQLReturn>(
    request, 
    '/api/graphql',
    {
      query: `{
        diseases
        {
          nodes {
            diseaseId
            name
            enabled
          }
        }
      }`
    });
  if (!success || 'errors' in response) {
      return json({error: response.errors, diseases: []})
  }
  
  return json({diseases: response.data.diseases.nodes as {diseaseId: number, name: string, enabled: boolean}[]})
}


export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json()

  const {success, response} = await callAPI<GenericAPI>(request, '/api/dev/admin/disease', data, 'POST');

  if (success && response.success) {
    return json({
      success: true,
      message: 'Disease updated',
    })
  } else {
    return json({
      success: false,
      message: 'Failed to update disease. ' + response.errors,
    })
  }
}

const DiseaseControl = () => {
  const loaderData = useLoaderData<typeof loader>()
  const fetcher = useFetcher<{success: boolean, message: string}>()

  const [enabled, setEnabled] = useState(loaderData.diseases.map(ed => !!ed.enabled))
  const [dialog, setDialog] = useState({open: false, title: ''})
  const [addDisease, setAddDisease] = useState('')
  
  useEffect(() => {
    window.scrollTo({top: 0})
    if (fetcher.data) {
      setDialog(prev => ({...prev, open: false}))
    }
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
      <div className="flex justify-between items-center">
        <h2 className='text-xl lg:text-2xl mb-5'>Edit Diseases List</h2>
        <Button onClick={() => {
          setDialog({open: true, title: 'Add Disease/Illness'})
        }}>Add Disease</Button>
      </div>
      <fetcher.Form method='post' className='flex flex-col gap-3'>
        <table>
          <thead>
            <tr className="bg-primary-500 text-white font-bold [&>th]:p-3 text-left [&>th:first-child]:rounded-l [&>th:last-child]:rounded-r">
              <th>Disease ID</th>
              <th>Name</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {loaderData.diseases.map((ed, i) => <tr key={`ed-${i}`} className={`[&>td]:p-3 ${i % 2 === 0 ? '' : 'bg-gray-100'}`}>
              <td>{ed.diseaseId}</td>
              <td>{ed.name}</td>
              <td>
                <SwitchToggle 
                  enabled={enabled[i] !== undefined ? enabled[i] : ed.enabled}
                  setEnabled={(checked) => {
                    setEnabled(prev => {
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
        <Button type='button' disabled={fetcher.state !== 'idle'} className='w-max ml-auto mt-3 px-6' onClick={() => {
          fetcher.submit({
            diseases: loaderData.diseases.map((ld, i) => ({
              diseaseId: ld.diseaseId,
              name: ld.name,
              enabled: enabled[i]
            }))
          }, {
            method: 'POST',
            encType: 'application/json'
          })
        }}>
          Update
        </Button>
        <ModalBox
          isOpen={dialog.open}
          title={dialog.title}
          // message={dialog.callback ? "Do you wish to continue?" : undefined}
          // icon={dialog.callback ? "warn" : "error"}
          // color={dialog.callback ? "warn" : "error"}
          onClose={() => setDialog(prev => ({...prev, open: false}))}
        >
          <div className="flex items-start min-w-72 flex-col justify-start text-left">
            <Input name="name" label="Disease/Illness Name" value={addDisease} onChange={(e) => setAddDisease(e.target.value)} />
            <Button type="button" onClick={() => {
              fetcher.submit({
                diseases: [{
                  name: addDisease,
                  enabled: true
                }]
              }, {
                method: 'POST',
                encType: 'application/json'
              })
            }} disabled={fetcher.state !== 'idle'} className='w-full mt-3 px-6'>Save</Button>
          </div>
        </ModalBox>
      </fetcher.Form>
    </>
  );
}

export default DiseaseControl;
