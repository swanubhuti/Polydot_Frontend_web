import { type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useRouteError, useLocation, useFetcher} from "@remix-run/react";
import { callAPI } from "~/session.server";
import type { GenericAPI } from '~/lib/types';
import HoverCard from '~/components/ui/HoverCard';
import DialogModal, {ModalBox, type DialogProps} from '~/components/ui/Dialog';
import Dialog from '~/components/ui/Dialog';
import { LuEye, LuPlusCircle } from "react-icons/lu";
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from "~/components/ui/ErrorMessage";
import moment from "moment";
import Search from "~/components/ui/Search";

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Business Admin - Mating Start Dates` },
    { name: "description", content: "Easy Dairy Business Admin - Mating Start Dates" },
  ];
};

export async function loader({request, params}: LoaderFunctionArgs) {
  // const {userData, accessToken} = await getUserAccessToken(request, true);
  
  const {success, response} = await callAPI<GenericAPI>(request, `/api/business/matingdates`, undefined, 'GET');
  if (!success || !response.success) {
    throw new Error("No business found");
  }
  return json({
    list: response.data as {HerdCode: string, HerdUUID: string, LastMatingDate: string}[]
  })
}

export default function BusinessAdminMSD() {
  const data = useLoaderData<typeof loader>()
  const location = useLocation()
  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, callback?: () => void}>({isOpen: false, title: ''})
  const [modal, setModal] = useState({open: false, id: '', code: '', type: ''})
  const [search, setSearch] = useState('')
  const [loadedData, setLoadedData] = useState(data.list ?? [])
  const fetcher = useFetcher()
  const dataList = useMemo(() => {
    return loadedData.filter(dl => dl.HerdCode.toLowerCase().includes(search.toLowerCase()))
  }, [search, loadedData])

  useEffect(() => {
    const listener = (event: any) => {
      if (typeof event.data === 'object' && event.data.success) {
        setLoadedData(prev => {
          let copy = [...prev]
          const idx = copy.findIndex(cp => cp.HerdUUID === event.data.herdUuid)
          copy[idx].LastMatingDate = event.data.date
          return copy
        })
        setModal(prev => ({...prev, open: false}))
      }
    }
    window.addEventListener('message', listener)
    return () => {
      window.removeEventListener('message', listener)
    }
  }, [])

  return (
    <div>
      <Dialog
        {...dialog}
      />
      <ModalBox 
          isOpen={modal.open} 
          onClose={() => setModal(prev => ({...prev, open: false}))} 
          classes={modal.type === 'edit' ? "h-[calc(50vh)]" : ""}
          url={`${location.pathname}/${modal.id}/${modal.type}`} 
          title={`Mating Start Date for ${modal.code}`}></ModalBox>

      <div className="flex flex-col gap-5 m-auto p-5">
        <div className="bg-grey-100 md:px-6 py-6 px-2">
          <div className="m-auto">
            <div className="p-4 flex flex-col gap-4 bg-white">
              <h3 className="md:text-2xl text-xl p-2">Herds & Mating Start Date</h3>
              <div className="flex justify-between">
                <Search onChange={setSearch} placeholder="Search Herd Code..." />
              </div>
              <div className="ml-2 overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4">
                <table className='min-w-full relative'>
                  <thead className='font-signika text-lg'>
                    <tr className='bg-primary-500 text-white'>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left rounded-l">Herd UUID</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Herd Code</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left">Latest Mating Start Date</th>
                      <th className="bg-primary-500 px-3 py-4 sticky top-0 whitespace-nowrap text-left rounded-r">Action</th>
                    </tr>
                  </thead>
                  <tbody className='text-gray-600 [&_td]:py-3'>
                    {dataList.length > 0 ? dataList.map((d, i) => (
                      <tr key={`tr-${i}`} className={`border-t whitespace-nowrap ${( i % 2 !== 0 ? "bg-gray-100" : "")}`}>
                        <td className='p-3'>{d.HerdUUID}</td>
                        <td className='p-3'>{d.HerdCode}</td>
                        <td className='p-3'>{d.LastMatingDate ? moment(d.LastMatingDate).format('DD/MM/YYYY') : 'None'}</td>
                        <td>
                          <div className="flex gap-1">
                            <HoverCard closeDelay={0} openDelay={0}>
                              <HoverCard.Trigger asChild>
                                <button aria-label='Add Mating Start Date' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                  onClick={() => {
                                    setModal({
                                      open: true,
                                      id: d.HerdUUID,
                                      code: d.HerdCode,
                                      type: 'add'
                                    })
                                  }}
                                >
                                  <LuPlusCircle className="h-6 w-6" />
                                </button>
                              </HoverCard.Trigger>
                              <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                                Add Mating Start Date
                              </HoverCard.Content>
                            </HoverCard>
                            {d.LastMatingDate && <HoverCard closeDelay={0} openDelay={0}>
                              <HoverCard.Trigger asChild>
                                <button aria-label='View Mating Dates History' className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                  onClick={() => {
                                    setModal({
                                      open: true,
                                      id: d.HerdUUID,
                                      code: d.HerdCode,
                                      type: 'edit'
                                    })
                                  }}
                                >
                                  <LuEye className="h-6 w-6" />
                                </button>
                              </HoverCard.Trigger>
                              <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                                View Mating Dates History
                              </HoverCard.Content>
                            </HoverCard>}
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

