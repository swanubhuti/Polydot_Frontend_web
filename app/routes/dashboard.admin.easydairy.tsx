import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useRouteError, useFetcher} from "@remix-run/react";
import { callAPI, getUserAccessToken } from "~/session.server";
import type { GenericAPI } from '~/lib/types';
import ErrorMessage from "~/components/ui/ErrorMessage";
import { useEffect, useRef, useState } from "react";
import Button from "~/components/ui/Button";
import { FaPencil, FaX } from "react-icons/fa6";
import { FaSave } from "react-icons/fa";
import Input from "~/components/ui/Input";

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Business Admin - Easy Dairy` },
    { name: "description", content: "Easy Dairy Business Admin - Easy Dairy" },
  ];
};

export async function loader({request}: LoaderFunctionArgs) {
  const {userData} = await getUserAccessToken(request, true);
  let params: string[] = []
  userData.EasyDairyID.forEach((ed: string) => {
    params.push(`ids=${ed}`)
  })
  //force it to be array
  if (userData.EasyDairyID.length === 1) {
    params.push('ids=')
  }
  
  const {success, response} = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings?${params.join('&')}`, undefined, 'GET');
  if (!success || !response.success) {
    throw new Error("No easy dairy ids found");
  }
  return json({
    list: response.data.sort((a, b) => a.EasyDairyID > b.EasyDairyID) as {EasyDairyID: string, Name: string}[]
  })
}

export async function action({request}: ActionFunctionArgs) {
  const data = await request.json()
  const {success, response} = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings`, {settings: [data]}, 'PUT');
  if (!success || !response.success) {
    throw new Error("No easy dairy ids found");
  }
  return json({success: true, edited: data})
}

export default function BusinessAdminEasyDairy() {
  const data = useLoaderData<typeof loader>()

  return (
    <div>
      <div className="flex flex-col gap-5 m-auto p-5">
        <div className="bg-grey-100 md:px-6 py-6 px-2">
          <div className="m-auto">
            <div className="p-4 flex flex-col gap-4 bg-white">
              <h3 className="md:text-2xl text-xl p-2">Easy Dairy Settings</h3>
              <div className="ml-2 lg:overflow-x-auto print:max-h-none min-h-[300px] scroll-smooth pb-4">
                <table className='min-w-full relative'>
                  <thead className='font-signika text-lg'>
                    <tr className='bg-primary-500 text-white'>
                      <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left rounded-l">Easy Dairy ID</th>
                      <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left">Name</th>
                      <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left rounded-r">Action</th>
                    </tr>
                  </thead>
                  <tbody className='text-gray-600 [&_td]:py-3'>
                    {data.list.length > 0 ? data.list.map((d, i) => (
                      <RowData key={`tr-${i}`} striped={i % 2 !== 0} EasyDairyID={d.EasyDairyID} Name={d.Name} />
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
                <p className="font-bold">{data.list.length} total rows</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RowData(props: {EasyDairyID: string, Name: string, striped: boolean}) {
  const [edit, setEdit] = useState(false)
  const [progress, setProgress] = useState(false)
  const [toChange, setToChange] = useState<{easyDairyId: string, name: string}>()
  const inputRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState({easyDairyId: props.EasyDairyID, name: props.Name})
  const fetcher = useFetcher<{success: boolean, edited: typeof toChange}>()

  useEffect(() => {
    if (fetcher.data && fetcher.data.success) {
      if (fetcher.data.edited) {
        setData(fetcher.data.edited)
      }
      setEdit(false)
      setProgress(false)
    }
  }, [fetcher.data])

  return <tr className={`border-t whitespace-nowrap ${( props.striped ? "bg-gray-100" : "")}`}>
    <td className="p-3">{data.easyDairyId}</td>
    <td className="p-3">{edit ? <Input ref={inputRef} value={toChange?.name ?? data.name} required onChange={(e) => {
      setToChange({easyDairyId: data.easyDairyId, name: e.target.value})
    }} /> : data.name}</td>
    <td className="p-3">
      {progress ? <div role="status" className="flex justify-start p-3 items-center">
                      <svg aria-hidden="true" className="w-6 h-6 animate-spin text-primary-500 fill-primary-100" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                      </svg>
                      <span className="ml-2">Saving...</span>
                  </div> 
      : (!edit ? 
        <Button variant="transparent" size="icon" onClick={() => setEdit(true)}><FaPencil /></Button> 
        :
          <>
            <Button variant="transparent" size="icon" onClick={() => {
              if (!inputRef.current?.checkValidity()) {
                inputRef.current?.reportValidity()
                return
              }
              setProgress(true)
              fetcher.submit(toChange!, {
                method: 'POST',
                encType: 'application/json'
              })
            }}><FaSave /></Button>
            <Button variant="transparent" size="icon" onClick={() => {
              setEdit(false)
              setToChange(undefined)
            }}><FaX /></Button>
          </>
      )}
    </td>
  </tr>
}

export function ErrorBoundary() {
  // Error or new Response
  const error = useRouteError() as { message: string; data: string };
  console.error(error.message || error.data);
  return <ErrorMessage message={error.message || error.data} />;
}

