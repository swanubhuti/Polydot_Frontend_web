import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useRouteError, useFetcher} from "@remix-run/react";
import { callAPI, getUserAccessToken } from "~/session.server";
import type { GenericAPI, GraphQLReturn, GraphQLSingleReturn } from '~/lib/types';
import ErrorMessage from "~/components/ui/ErrorMessage";
import { useEffect, useRef, useState } from "react";
import Button from "~/components/ui/Button";
import { FaAngleLeft, FaPencil, FaX } from "react-icons/fa6";
import { FaSave } from "react-icons/fa";
import Input from "~/components/ui/Input";
import TableWidget from "~/components/TableWidget";
import moment from "moment";

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Admin - Reproduction Animal` },
    { name: "description", content: "Easy Dairy Admin - Reproduction Animal" },
  ];
};

export async function loader({request, params}: LoaderFunctionArgs) {
  const {userData, accessToken} = await getUserAccessToken(request, true);
  console.log('token', accessToken)
  const query = `
  {
    groupAnimalViews (condition: {animalUuid: "${params.id!}"}) 
    {
      nodes {
        animalUuid
        animalId
        herdUuid
        herdCode
        easyDairyName
        name
        breed
        status
        dateOfBirth
        damId
        sireId
      }
    }
  }
  `;
  const animalInfo = await callAPI<GraphQLReturn>(request, '/api/graphql', {query}, undefined, accessToken)
  if (!animalInfo.success || 'errors' in animalInfo.response) {
    console.error(`FATAL ERROR: Failed to retrieve animal data for ${params.id}`, `source: ${request.url}`, animalInfo.response, userData)
    throw new Response("Failed to retrieve animal data", {status: 400})
  }
  
  const childInfo = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `query {
      groupAnimalViews (condition: {damId: "${animalInfo.response.data.groupAnimalViews.nodes[0].animalId}"}) 
      {
        nodes {
          animalUuid
          animalId
          herdUuid
          herdCode
          easyDairyName
          name
          breed
          status
          dateOfBirth
          damId
          sireId
        }
      }
    }`
  }, undefined, accessToken)
    return json({
      animal: animalInfo.response.data.groupAnimalViews.nodes[0],
      child: childInfo.success && !('errors' in childInfo.response) ? childInfo.response.data.groupAnimalViews.nodes : []
      // list: response.data.sort((a, b) => a.EasyDairyID > b.EasyDairyID ? 1 : -1) as {EasyDairyID: string, Name: string}[]
    })
  }

export default function ReproductionAnimals() {
  const data = useLoaderData<typeof loader>()

  return (
    <div className="p-2 flex flex-col gap-4">
      <div className="py-4 whitespace-nowrap">
        <button type="button" onClick={() => window.history.back()} className="text-primary-500 underline gap-1 flex items-center font-bold">
          <FaAngleLeft />
          Back
        </button>
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-xl p-2">Animal {data.animal.animalId} Calves</h3>
        <div className="grid grid-cols-2 rounded-lg overflow-hidden">
          <div className="bg-gray-200 text-primary-500 text-xl px-4 py-2 text-center font-signika">Status</div>
          <div className="bg-primary-500 text-white text-xl font-bold px-4 py-2 text-center font-signika">{data.animal.status}</div>
        </div>
      </div>
      <div className="ml-2 lg:overflow-x-auto print:max-h-none min-h-[300px] scroll-smooth pb-4">
        <table className='min-w-full relative'>
          <thead className='font-signika text-lg'>
            <tr className='bg-primary-500 text-white'>
              <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left rounded-l">Animal ID</th>
              <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left">Animal Name</th>
              <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left">National ID</th>
              <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left">NLIS RF</th>
              <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left">Sire ID</th>
              <th className="bg-primary-500 px-3 py-4 whitespace-nowrap text-left rounded-r">Date of Birth</th>
            </tr>
          </thead>
          <tbody className='text-gray-600 [&_td]:py-3'>
            {data.child.length > 0 ? data.child.map((d, i) => (
              <tr className={`border-t whitespace-nowrap ${( i % 2 === 0 ? "bg-gray-100" : "")}`}>
                <td className="p-3">{d.animalId}</td>
                <td className="p-3">{d.name}</td>
                <td className="p-3">{d.nationalId}</td>
                <td className="p-3">{d.nlisElectronicId}</td>
                <td className="p-3">{d.sireId}</td>
                <td className="p-3">{moment(d.dateOfBirth).format('DD/MM/YYYY')}</td>
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
        <p className="font-bold">{data.child.length} total rows</p>
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

