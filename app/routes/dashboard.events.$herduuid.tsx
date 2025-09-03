import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/node';
import { useFetcher, useLoaderData, useLocation, useRouteError } from '@remix-run/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { GraphQLReturn } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';

import TableWidget from '~/components/TableWidget';
import ErrorMessage from '~/components/ui/ErrorMessage';
import { requireVisibleHerds } from '~/lib/middleware/herd';
import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import DialogModal, { ModalBox } from '~/components/ui/Dialog';
import SelectDropdown from '~/components/ui/Dropdown';

export const meta: MetaFunction = ({ matches }) => {
  const lastMatch = matches[matches.length - 1];
  return [
    { title: `Easy Dairy Events${lastMatch.params.herduuid ? ` - Herd ${lastMatch.params.herduuid}` : ''}` },
    { name: 'description', content: 'Easy Dairy Events' },
  ];
};

const eventList = ['Calving', 'Dry Off', 'Flush', 'Heat', 'Mating', 'Preg Test', 'Sold', 'Treatment', 'Died', 'Transfer', 'Vet Check', 'Condition Score']
const eventListOptions = eventList.map((ev) => ({label: ev, value: ev}))

const editableEventsArray = ['Calving', 'Mating', 'Preg Test', 'Treatment', 'Dry Off', 'Heat', 'Flush', 'Sold', 'Died', 'Vet Check']
const editableEvents = editableEventsArray.map((opt) => ({label: opt, value: opt}))

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, isApp, userData } = await getUserAccessToken(request, true);
  const { currentHerd, currentHerdCode, currentHerdPermission } = await requireVisibleHerds(request, userData as any, params.herduuid ?? '');
  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      eventCodes
      {
        nodes {
          eventNumber
					code
					description
        }
      }
    }`,
    },
    undefined,
    accessToken
  );

  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve event codes`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve event codes data', { status: 400 });
  }

  let eventCodes: { [key: string]: string[] } = {};
  let editableEventCodes: string[] = [];
  response.data.eventCodes.nodes?.forEach((ec) => {
    if (editableEventsArray.includes(eventList[ec.eventNumber - 1])) {
      editableEventCodes.push(ec.code)
    }
    if (ec.code === 'LC') {
      eventCodes['Condition Score'] = [ec.code]
      return
    }
    if (!eventCodes[eventList[ec.eventNumber - 1]]) {
      eventCodes[eventList[ec.eventNumber - 1]] = []
    }
    eventCodes[eventList[ec.eventNumber - 1]].push(ec.code)
  });
  const searchParams = new URL(request.url).searchParams

  return json({
    currentHerd: currentHerdCode,
    search: searchParams.get('animalId'),
    herdUuid: params.herduuid!,
    isApp,
    events: eventCodes,
    currentHerdPermission,
    editableEventCodes,
    userData
  });
}

const animalDefaultState = {
  success: false,
  type: 'animal',
  animalId: '0',
  animalUuid: '',
  status: 'pre',
  confirmPregnant: false,
  ageInMonths: 0,
  dryOffDate: '',
  calvingDate: '',
  sireList: [] as string[]
}
const preCheckAnimal = (animal: typeof animalDefaultState) => {
  return !['Dead','Sold'].includes(animal.status)
}
const checkAnimalEligible = (event: string, animal: typeof animalDefaultState) => {
  switch (event) {
    case "Calving":
      if (animal.ageInMonths < 22) {
        return {error: false, warn: true, title: `Cow is calving at ${animal.ageInMonths} months of age`}
      } else if (!((animal.status === 'Heifer' && !animal.calvingDate) || (animal.status === 'Dry' && !!animal.dryOffDate))) {
        return {error: true, warn: false, title: animal.status === 'Dry' ? "This animal does not have a Dry Off Date" : "This animal is already In Milk"}
      }
      break
    case "Mating":
    case "Preg Test":
      if (animal.status === 'Calf') {
        return {warn: true, error: false, title: "This animal is a calf"}
      } else if (animal.confirmPregnant) {
        return {warn: true, error: false, title: "Cow is Preg Tested in Calf"}
      } else if (animal.ageInMonths < 15) {
        return {warn: true, error: false, title: "Cow is less than 15 months old"}
      }
      break
  }
  return {warn: false, error: false, title: ""}
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { accessToken } = await getUserAccessToken(request, true);

    const payload = await request.formData()
    const herdUuid = payload.get('herdUuid')
    const animalId = payload.get('animalId')
    const { response, success } = await callAPI<GraphQLReturn>(
      request,
      '/api/graphql',
      {
        query: `{
          groupAnimalViews (
            condition: {
              animalId: "${animalId}"
              herdUuid: "${herdUuid}"
            }
          )
          {
            nodes {
              animalUuid
              animalId
              status
              confirmPregnant
              ageInMonths
              dryOffDate
              calvingDate
            }
          }
        }`,
      },
      undefined,
      accessToken
    );
    if (!success || 'errors' in response || response.data.groupAnimalViews.nodes.length === 0) {
      return json({success: false, type: 'animal'})
    }
    const animalInfo = response.data.groupAnimalViews.nodes[0]
    return json({
      success: true,
      ...animalInfo,
    })
  } catch (e) {
    return json({success: false})
  }
}

export default function Events() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation()
  const [modal, setModal] = useState({open: false, id: '', event: ''})
  const [dialog, setDialog] = useState<{open: boolean, title: string, callback?: () => void}>({open: false, title: '', callback: () => {}})
  const [updateTable, setUpdateTable] = useState(0)
  const [animal, setAnimal] = useState(animalDefaultState)
  const [animalEdit, setAnimalEdit] = useState({open: false, url: '', animalId: '0'})
  const submitBtn = useRef<HTMLButtonElement>(null)
  const [enabledEvents, setEnabledEvents] = useState(eventListOptions)
  const [addEvent, setAddEvent] = useState()
  const eventList = useMemo(() => {
    let list: string[] = []
    enabledEvents.forEach((ee) => {
      list = list.concat(data.events[ee.value])
    })
    return list
  }, [enabledEvents])

  const fetcher = useFetcher<typeof action>()

  useEffect(() => {
    if (fetcher.data) {
      setAnimal(fetcher.data as typeof animal)
    }
  }, [fetcher.data])
  useEffect(() => {
    const listener = (event: any) => {
      if (typeof event.data === 'object' && event.data.success) {
        if (event.data.source === 'animal-frame') {
          if (event.data.next) {
            setAnimalEdit({open: true, url: `/dashboard/animal/${data.herdUuid}/${event.data.next}`, animalId: event.data.next})
          } else {
            setAnimalEdit({open: false, url: '', animalId: '0'})
          }
        } else if (event.data.source.endsWith('-frame')) {
          setModal(prev => ({...prev, open: false}))
          const sourceType = event.data.source.split('-')[0]
          //update animal status
          if (['calving','dryoff','died','sold'].includes(sourceType)) {
            submitBtn.current?.click()
          } else {
            setUpdateTable(prev => prev+1)
          }
          if (event.data.ids) {
            setAnimalEdit({open: true, url: `/dashboard/animal/${data.herdUuid}/${event.data.ids[0]}?other=${event.data.ids[1] ?? ''}`, animalId: event.data.ids[0]})
          }
        }
      }
    }
    window.addEventListener('message', listener)
    if (data.search && submitBtn.current) {
      submitBtn.current.click()
    }
    return () => {
      window.removeEventListener('message', listener)
    }
  }, [])

  return (
    <div className='py-6 px-5'>
      <div className="mb-4 flex md:justify-between flex-col gap-2 md:flex-row">
        <fetcher.Form method="POST" className="relative md:w-1/3 flex items-start gap-1">
          <Input
            placeholder="Animal ID"
            defaultValue={data.search || ''}
            name="animalId"
            error={!animal.success && animal.status !== 'pre' ? 'Animal ID does not exist in this herd' : undefined}
            disabled={fetcher.state !== 'idle'}
            required
          />
          <input type="hidden" name="herdUuid" value={data.herdUuid} />
          <Button type="submit" ref={submitBtn} disabled={fetcher.state !== 'idle'} className="flex gap-2 text-sm md:text-base items-center" onClick={() => {
            setAnimal((prev) => ({...prev, status: 'pre', success: false}))
          }}>
            <span>Search</span>
            {fetcher.state !== 'idle' && fetcher.formEncType === 'application/x-www-form-urlencoded' && <div role="status" className="">
                <svg aria-hidden="true" className="w-4 h-4 animate-spin text-primary-400 fill-primary-100" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg>
            </div>}
          </Button>
        </fetcher.Form>
        {animal.success && fetcher.state === 'idle' && animal.status !== 'pre' && <div className={`font-bold grid m-auto rounded overflow-hidden grid-cols-1 lg:mx-0 w-full md:max-w-[664px] md:grid-cols-2 mt-4 md:mt-0`}>
          <div className="bg-primary-500 flex items-center justify-center p-2">
              <h4 className="text-white text-lg">Animal ID: {animal.animalId}</h4>
          </div>
          <div className="bg-gray-200 p-2 flex items-center justify-center">
            <h3 className="text-primary-500 text-lg">Status: {animal.status}</h3>
          </div>
        </div>}
      </div>
      {!!animal.success && <div className='flex flex-row justify-between mt-6 flex-wrap items-center gap-4'>
        <div className="flex items-center gap-4 flex-wrap">
          <SelectDropdown
            type="multiple" 
            label="Filter Events"
            labelClass='mb-0'
            options={eventListOptions}
            placeholder="Select Events"
            selectAll="All Events"
            className='flex-1 min-w-[200px]'
            id='filterEvents'
            value={enabledEvents}
            onSelectChange={(v) => setEnabledEvents(v)}
          />
          {(data.currentHerdPermission?.permission === 'READ_WRITE'  ||  data.userData.UserPermission === 'read-write' ) && preCheckAnimal(animal) && <div className='flex items-center whitespace-nowrap'>
            <SelectDropdown className="rounded-r-none border-r-0 whitespace-nowrap" placeholder='Event Type' value={addEvent} type="single" options={editableEvents} 
              onSelectChange={(opt) => {
                setAddEvent(opt.value)
              }}  />
            <Button type="button" disabled={!addEvent} className="rounded-l-none" onClick={() => {
              const {warn, error, ...rest} = checkAnimalEligible(addEvent ?? '', animal)
              if (error || warn) {
                setDialog({open: true, callback: warn ? () => setModal({open: true, event: addEvent!, id: ''}) : undefined, ...rest})
              } else {
                setModal({open: true, event: addEvent!, id: ''})
              }
            }}>Add Event</Button>
          </div>}
        </div>
        {data.isApp ? <Button type="button" onClick={() => {
            //@ts-ignore
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({actionData: {url: `/dashboard/animal/${animal.animalUuid}`, title: 'Profile'}, type: "openPage"}));
          }}>View Animal Profile</Button>
        : <Button link={`/dashboard/animal/${animal.animalUuid}`} variant="primary">View Animal Profile</Button>}
      </div>}
      {!!animal.success && <TableWidget
          type={`event-view`}
          isApp={data.isApp}
          key={`${animal.animalUuid}${updateTable}-${eventList.join(',')}`}
          hideColumnSettings={true}
          actions={(data.currentHerdPermission?.permission === 'READ_WRITE' || data.userData.UserPermission === 'read-write') && preCheckAnimal(animal) ? [{label: "Edit", type: "edit", func: (rowData: any) => {
            let eventName = ''
            Object.entries(data.events).forEach(([k, v]) => {
              if (v.includes(rowData.event)) {
                eventName = k
              }
            })
            setModal({open: true, event: eventName, id: rowData.eventUuid})
          }, filter: (row) => {
            return data.editableEventCodes.includes(row.event)
          }}] : undefined}
          addParams={{ animalUuid: String(animal.animalUuid), event: eventList.length ? eventList : [] }}
          print={false}
      />}
      <DialogModal
        isOpen={dialog.open}
        title={dialog.title}
        message={dialog.callback ? "Do you wish to continue?" : undefined}
        icon={dialog.callback ? "warn" : "error"}
        color={dialog.callback ? "warn" : "error"}
        buttons={[
          {text: dialog.callback ? 'No' : 'Close', variant: dialog.callback ? 'outline' : 'primary', onClick: () => setDialog(prev => ({...prev, open: false}))},
          //@ts-ignore
          ...(dialog.callback ? [{text: 'Yes', variant: 'primary', onClick: () => {
            dialog.callback && dialog.callback()
            setDialog(prev => ({...prev, open: false}))
          }}] : []),
        ]}
      />
      {!['Dead','Sold'].includes(animal.status) &&
        <ModalBox
          isOpen={modal.open}
          onClose={() => setModal(prev => ({...prev, open: false}))}
          classes="h-[calc(60vh+50px)]"
          url={`${location.pathname}/${animal.animalId}/${modal.event}${modal.id ? `?eventuuid=${modal.id}` : ''}`}
          title={`${modal.event} - Cow ID ${animal.animalId}`}></ModalBox>}
      {!['Dead','Sold'].includes(animal.status) &&
        <ModalBox
          isOpen={animalEdit.open}
          onClose={() => setAnimalEdit({open: false, url: '', animalId: '0'})}
          classes="h-[calc(60vh+50px)]"
          url={animalEdit.url}
          title={`Edit Calf ${animalEdit.animalId}`}></ModalBox>}
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
