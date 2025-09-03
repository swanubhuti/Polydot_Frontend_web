import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useRouteError, useActionData} from "@remix-run/react";
import { callAPI, getUserAccessToken } from "~/session.server";
import type { GenericAPI } from '~/lib/types';
import HoverCard from '~/components/ui/HoverCard';
import {ModalBox} from '~/components/ui/Dialog';
import Dialog from '~/components/ui/Dialog';
import { LuPencil } from "react-icons/lu";
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from "~/components/ui/ErrorMessage";
import Search from "~/components/ui/Search";
import Input from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import Spinner from "~/components/ui/Spinner";

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Business Admin - Herd Options` },
    { name: "description", content: "Easy Dairy Business Admin - Herd Options" },
  ];
};

export async function loader({request, params}: LoaderFunctionArgs) {
  // const {userData, accessToken} = await getUserAccessToken(request, true);
  
  const {success, response} = await callAPI<GenericAPI>(request, `/api/business/options`, undefined, 'GET');
  if (!success) {
    throw new Error("Failed to get herd options");
  }
  return json({
    list: response as {HerdCode: string, HerdUUID: string, Gestation: number, DaysDry: number, DaysLead: number}[]
  })
}

export async function action({request}: ActionFunctionArgs) {
  const {accessToken} = await getUserAccessToken(request, true)
  const formData = await request.formData()
  const {success, response} = await callAPI<GenericAPI>(request, `/api/business/options`, {
    herdUuid: formData.get('herdUuid'),
    gestation: Number(formData.get('gestation') ?? 0),
    daysDry: Number(formData.get('daysDry') ?? 0),
    daysLead: Number(formData.get('daysLead') ?? 0)
  }, 'POST', accessToken);
  if (!success) {
    throw new Error("Failed to get update options");
  }
  return json({
    success: success && response.success,
    message: response.message,
    error: response.error
  })
}

export default function BusinessAdminMSD() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, icon: 'success' | 'error', message: string}>({isOpen: false, title: '', message: '', icon: 'success'})
  const [modal, setModal] = useState({open: false, herdUuid: '', herdCode: '', gestation: 0, daysDry: 0, daysLead: 0})
  const [search, setSearch] = useState('')
  const [loading, setIsLoading] = useState(false)
  
  const dataList = useMemo(() => {
    return data.list.filter(dl => dl.HerdCode.toLowerCase().includes(search.toLowerCase()))
  }, [search, data.list])

  useEffect(() => {
    if (actionData?.success) {
      setDialog({isOpen: true, title: 'Success', message: '', icon: 'success'})
    } else if (actionData?.success === false) {
      setDialog({isOpen: true, title: 'Failed', message: actionData?.error ?? actionData?.message, icon: 'error'})
    }
    setIsLoading(false)
  }, [actionData?.success])

  return (
    <div>
      <Dialog
        {...dialog}
        color={dialog.icon === 'success' ? 'primary' : 'error'}
        buttons={[{
          text: 'Close',
          variant: 'primary',
          onClick: () => {
            setDialog(prev => ({...prev, isOpen: false}))
          }
        }]}
      />
      <ModalBox 
        isOpen={modal.open} 
        onClose={() => setModal(prev => ({...prev, open: false}))} 
        classes={""}
        title={`Edit ${modal.herdCode}`}>
        <form method="POST" className="p-2 flex flex-col gap-4 justify-center items-center text-left" onSubmit={() => setIsLoading(true)}>
          <Input name="gestation" label="Gestation" type="number" required={true} defaultValue={modal.gestation} />
          <Input name="daysDry" label="Days Dry" type="number" required={true} defaultValue={modal.daysDry} />
          <Input name="daysLead" label="Days Lead" type="number" required={true} defaultValue={modal.daysLead} />
          <input type="hidden" name="herdUuid" value={modal.herdUuid} />
          <Spinner active={loading} />
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </ModalBox>

      <div className="flex flex-col gap-5 m-auto p-5">
        <div className="bg-grey-100 md:px-6 py-6 px-2">
          <div className="m-auto">
            <div className="p-4 flex flex-col gap-4 bg-white">
              <h3 className="md:text-2xl text-xl p-2">Herds Options</h3>
              <div className="flex justify-between">
                <Search onChange={setSearch} placeholder="Search Herd Code..." />
              </div>
              <div className="ml-2 overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4">
                <table className='min-w-full relative'>
                  <thead className='font-signika text-lg'>
                    <tr className='bg-primary-500 text-white'>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Herd Code</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Gestation</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Days Dry</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Days Lead</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left rounded-r">Action</th>
                    </tr>
                  </thead>
                  <tbody className='text-gray-600 [&_td]:py-3'>
                    {dataList.length > 0 ? dataList.map((d, i) => (
                      <tr key={`tr-${i}`} className={`border-t whitespace-nowrap ${( i % 2 !== 0 ? "bg-gray-100" : "")}`}>
                        <td className='p-3'>{d.HerdCode}</td>
                        <td className='p-3'>{d.Gestation ?? 0}</td>
                        <td className='p-3'>{d.DaysDry ?? 0}</td>
                        <td className='p-3'>{d.DaysLead ?? 0}</td>
                        <td>
                          <div className="flex gap-1">
                            <HoverCard closeDelay={0} openDelay={0}>
                              <HoverCard.Trigger asChild>
                                <button aria-label='Edit' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                  onClick={() => {
                                    setModal({
                                      open: true,
                                      herdUuid: d.HerdUUID,
                                      herdCode: d.HerdCode,
                                      gestation: d.Gestation ?? 0,
                                      daysDry: d.DaysDry ?? 0,
                                      daysLead: d.DaysLead ?? 0
                                    })
                                  }}
                                >
                                  <LuPencil className="h-6 w-6" />
                                </button>
                              </HoverCard.Trigger>
                              <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                                Edit
                              </HoverCard.Content>
                            </HoverCard>
                          </div>
                        </td>
                      </tr>
                    )) :
                    <tr>
                      <td className="p-4">
                        No data found
                      </td>
                    </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div className="mt-6 pb-4 ml-2">
                <p className="font-bold">{dataList.length} total rows</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  // Error or new Response
  const error = useRouteError() as { message: string; data: string };
  console.error(error.message || error.data);
  return <ErrorMessage message={error.message || error.data} />;
}

