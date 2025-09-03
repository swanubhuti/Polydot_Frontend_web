import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useFetcher, useActionData, useRouteError} from "@remix-run/react";
import { callAPI } from "~/session.server";
import type { GenericAPI } from '~/lib/types';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';
import { LuPencil, LuSave, LuX } from "react-icons/lu";
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from "~/components/ui/ErrorMessage";
import moment from "moment";
import Spinner from "~/components/ui/Spinner";

export async function loader({request, params}: LoaderFunctionArgs) {
  // const {userData, accessToken} = await getUserAccessToken(request, true);
  
  const {success, response} = await callAPI<GenericAPI>(request, `/api/business/matingdates?herdUuid=${params.id}`, undefined, 'GET');
  if (!success || !response.success) {
    throw new Error("No business found");
  }
  return json({
    type: params.type,
    herdUuid: params.id,
    list: (response.data?.sort((a, b) => (a.Date > b.Date ? -1 : 1)) || []) as {ID: number, HerdCode: string, HerdUUID: string, Date: string}[]
  })
}

export async function action({request, params}: ActionFunctionArgs) {
  const type = request.headers.get("Content-Type")
  const resp = await request.formData()
  const formDate = resp.get('date') as string
  let lastDate = resp.get('lastDate') as string
  const {success, response} = await callAPI<GenericAPI>(request, '/api/business/matingdates', {
    herdUuid: params.id,
    date: formDate,
    id: resp.get('id') ? Number(resp.get('id')) : undefined
  }, 'POST')
  if (moment(formDate).diff(moment(lastDate)) > 0) {
    lastDate = formDate
  }
  return json({
    success: success && response.success,
    herdUuid: params.id,
    date: lastDate
  })
}

export default function BusinessAdminMSDHistory() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const fetcher = useFetcher()
  const [editMode, setEditMode] = useState({idx: -1, val: ''})
  const [spinnerActive, setSpinnerActive] = useState(false)

  const latestDate = useMemo(() => {
    if (data.list?.length === 0) {
      return moment(0).format('YYYY-MM-DD')
    }
    const sorted = data.list?.sort((a, b) => a.Date > b.Date ? -1 : 1)
    if (moment(editMode.val).diff(moment(sorted[0].Date)) > 0) {
      return editMode.val
    }
    return moment(sorted[0].Date).format('YYYY-MM-DD')
  }, [editMode.val])

  useEffect(() => {
    if (actionData?.success) {
      window.parent.postMessage({success: true, herdUuid: actionData.herdUuid, date: actionData.date}, '/')
    }
    setSpinnerActive(false)
    window.scrollTo({top: 0})
  }, [actionData])

  return (
    <div className="flex flex-col gap-4">
      {data.type === 'add' &&
      <form className="flex flex-col gap-4" method="POST" onSubmit={() => setSpinnerActive(true)}>
        <Input type="date" name="date" label="Mating Start Date" required={true} />
        <input type="hidden" name="lastDate" value={data.list.length > 0 ? moment(data.list[0].Date).format('YYYY-MM-DD') : moment(0).format('YYYY-MM-DD')} />
        <Button type="submit">Add</Button>
      </form>}
      {data.type === 'edit' && <div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 font-signika">Date</th>
              <th className="p-2 font-signika">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.list.map((l, i) => <tr key={`list-${i}`}>
              <td className="px-2">
                {editMode.idx !== i 
                  ? <span className="block w-full p-1">{moment(l.Date).format('DD/MM/YYYY')}</span>
                  : <Input type="date" value={editMode.val} className="w-full px-2 py-1" required onChange={(e) => setEditMode({idx: i, val: e.target.value})} />}
              </td>
              <td className="px-2">
                <form method="POST" onSubmit={() => setSpinnerActive(true)}>
                  <input type="hidden" name="date" value={editMode.val} />
                  <input type="hidden" name="id" value={l.ID} />
                  <input type="hidden" name="lastDate" value={latestDate} />
                    {editMode.idx === i ? <>
                      <button aria-label='Save' type="submit" className='p-2 text-grey-600  hover:text-primary-500'><LuSave className="w-5 h-5" /></button>
                      <button aria-label='Cancel' type="button" className='p-2 text-grey-600  hover:text-primary-500' onClick={() => {
                        setEditMode({idx: -1, val: ''})
                      }}><LuX className="w-5 h-5" /></button>
                    </> :
                    <button type="button" onClick={() => {
                      setTimeout(() => {
                        setEditMode({idx: i, val: moment(l.Date).format('YYYY-MM-DD')})
                      }, 100)
                    }} aria-label='Edit' className='p-2 text-grey-600  hover:text-primary-500'><LuPencil className="w-5 h-5" /></button>}
                </form>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      <Spinner active={spinnerActive} />
    </div>
  )
}

export function ErrorBoundary() {
  // Error or new Response
  const error = useRouteError() as { message: string; data: string };
  console.error(error.message || error.data);
  return <ErrorMessage message={error.message || error.data} />;
}

