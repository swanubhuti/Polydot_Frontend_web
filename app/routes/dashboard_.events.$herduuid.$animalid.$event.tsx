import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, useActionData, useFetcher, useLoaderData, useRouteError } from '@remix-run/react';

import { type AllEvents, type CalvingEvent, eventFields, type MatingEvent, type PregTestEvent, type TreatmentEvent, type GenericAPI, type GraphQLReturn, DryOffEvent, VetCheckEvent, DiedEvent, SoldEvent, FlushEvent } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';

import ErrorMessage from '~/components/ui/ErrorMessage';
import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import moment from 'moment';
import TextArea from '~/components/ui/TextArea';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FaCheckSquare } from 'react-icons/fa';
import { FaRegSquare } from 'react-icons/fa6';
import { getVisibleHerdsFilter } from '~/lib/utils';
import Autocomplete from '~/components/ui/Autocomplete';

const defaultVals = {
  Calving: {
    type: 'CN',
    sex: {
      F: "L",
      M: "S",
      FF: "LL",
      MM: "SS",
      FM: "SS"
    },
    fate: {
      D: "U"
    }
  },
  Mating: {
    type: 'MN'
  },
  'Preg Test': {
    type: 'PC'
  },
  Treatment: {
    type: "TD"
  },
  'Dry Off': {
    type: 'D4'
  },
  Heat: {
    type: 'H'
  },
  Died: {
    type: 'XA'
  },
  Sold: {
    type: 'S4'
  },
  Flush: {
    type: 'F'
  },
  'Vet Check': {
    type: 'VN'
  }
}

type SexTypes = keyof typeof defaultVals.Calving.sex
type FateTypes = keyof typeof defaultVals.Calving.fate
type Events = keyof typeof eventFields
type ConceptionEvents = {eventUuid: string, date: string, sireUuid: string, sireId: string, sireNationalId: string, weeks: number, staffId: string}
type CalvingReturn = {
  eventType: "Calving",
  event: CalvingEvent,
  calfId: number
}
type MatingReturn = {
  eventType: "Mating",
  event: MatingEvent
}
type PregTestReturn = {
  eventType: "Preg Test",
  event: PregTestEvent
}
type TreatmentReturn = {
  eventType: "Treatment",
  event: TreatmentEvent
}
type DryOffReturn = {
  eventType: "Dry Off",
  event: DryOffEvent
}
type DiedReturn = {
  eventType: "Died",
  event: DiedEvent
}
type SoldReturn = {
  eventType: "Sold",
  event: SoldEvent
}
type FlushReturn = {
  eventType: "Flush",
  event: FlushEvent
}
type VetCheckReturn = {
  eventType: "Vet Check",
  event: VetCheckEvent
}
type BaseReturn = {
  animalUuid: string,
  animalId: string,
  status: string,
  lastMatingSireId: string | null,
  lastMatingDateDays: number,
  sireNationalId: string | null,
  donorHerd: string | null,
  donorId: number | null,
  donorUuid: string | null,
  sireList: Record<string, string>,
  bullList: Record<string, string>,
  bullNameList: Record<string, string>,
  herdList: {herdUuid: string, herdCode: string}[],
  staff: string[],
  vetCheck: string,
  conceptionEvents: ConceptionEvents[],
  diseases?: {diseaseId: number, name: string, enabled: boolean}[],
  drugs: {
    productId: number,
    shortName: string,
    whMeat: number,
    whMilk: number,
    measure: string,
    batch: string,
    expiry: string,
  }[],
}
type LoaderReturn = BaseReturn & (CalvingReturn | MatingReturn | PregTestReturn | TreatmentReturn | DryOffReturn | VetCheckReturn | DiedReturn | SoldReturn | FlushReturn)

async function loadData(request: Request, accessToken: string, herdUuid: string, userData: Record<string, string>, required: {
  easyDairyId?: boolean,
  bullTeam?: boolean,
  staff?: boolean,
  drugStock?: boolean,
  disease?: boolean,
  event?: {
    animalId: string,
    eventUuid?: string,
  }
}) {
  let easyDairyId = ''
  let herdList: {herdUuid: string, herdCode: string}[] = []
  let graphQlQuery: string[] = []
  if (required.easyDairyId) {
    let visibleFilter = getVisibleHerdsFilter(userData as any);
    let filter = visibleFilter ? `(${visibleFilter})` : '';
    const herdCall = await callAPI<GraphQLReturn>(
      request,
      '/api/graphql',
      {
        query: `{
          herds ${filter}
          {
            nodes {
              herdUuid
              herdCode
              easyDairyId
            }
          }
        }`,
      },
      undefined,
      accessToken
    );
    if (herdCall.success && !('errors' in herdCall.response)) {
      herdList = herdCall.response.data.herds.nodes as typeof herdList
      easyDairyId = herdCall.response.data.herds.nodes.find(n => n.herdUuid === herdUuid)?.easyDairyId
    }
  }
  if (required.bullTeam) {
    graphQlQuery.push(`bullTeamWithHerdViews (
      filter: {
        or: [
          {seenIn: {anyEqualTo: "${easyDairyId}"}}
          {herdUuid: {equalTo: "${herdUuid}"}}
        ]
      }
    )
    {
      nodes {
        bullId
        animalUuid
        nationalId
        name
      }
    }`)
  }
  if (required.staff) {
    graphQlQuery.push(`staffs (
      condition: {
        easyDairyId: "${easyDairyId}"
      }
    )
    {
      nodes {
        staffId
      }
    }`)
  }
  if (required.drugStock) {
    graphQlQuery.push(`drugStocks (
      condition: {
        easyDairyId: "${easyDairyId}"
      }
    )
    {
      nodes {
        productId
        shortName
        whMeat
        whMilk
        measure
      }
    }
    drugReceipts (
      condition: {
        easyDairyId: "${easyDairyId}"
      }
    )
    {
      nodes {
        productId
        batch
        expiry
        purchaseDate
        quantityAvailable
      }
    }`)
  }
  if (required.disease) {
    graphQlQuery.push(`diseases {
      nodes {
        diseaseId
        name
        enabled
      }
    }`)
  }
  if (required.event) {
    graphQlQuery.push(`animalEventViews (
      condition: {
        animalId: "${required.event.animalId}"
        herdUuid: "${herdUuid}"
      }
      filter: {
        or: [
          ${!required.event.eventUuid ? `{event: {likeInsensitive: "M%"}},` : ''}
          ${required.event.eventUuid ? `{eventUuid: {equalTo: "${required.event.eventUuid}"}}` : ""}
        ]
      }
      orderBy: EVENT_DATE_DESC
    )
    {
      nodes {
        animalUuid
        animalId
        eventUuid
        event
        eventDate
        conceptionDate
        sireId
        sireNationalId
        calfSize
        calfSex
        calfFate
        calfId
        calfId2
        vetCheck
        notes
        calvingDate
        staffId
        donorNationalId
        embryoRecovery
        drugId
        whMeat
        whMilk
        drugAmount
        drugSession
        diseaseId
        sireUuid
      }
    }`)
  }
  return {query: graphQlQuery, herdList}
}

function processData(data: Record<string, {nodes: Record<string, any>[]}>, eventUuid: string) {
  const animalInfo = data.groupAnimalViews.nodes[0] as {
    animalUuid: string,
    animalId: string,
    status: string,
    lastMatingSireId: string,
    sireNationalId: string,
    lastMatingDateDays: number,
    donorUuid: string
  }
  let returnVal: Record<string, any> = {...animalInfo}
  if (data.bullTeamWithHerdViews) {
    returnVal['bullList'] = {} as Record<string, string>
    returnVal['bullNameList'] = {} as Record<string, string>
    data.bullTeamWithHerdViews.nodes?.forEach((bt) => {
      returnVal['bullList'][bt.bullId] = bt.animalUuid
      returnVal['bullNameList'][bt.bullId] = bt.name
    })
  }
  returnVal['event'] = {} as AllEvents
  if (data.animalEventViews) {
    // let sires: Record<string, string> = {}
    returnVal['sireList'] = {} as Record<string, string>
    returnVal['conceptionEvents'] = [] as ConceptionEvents[]
    // let conceptionEvents: {eventUuid: string, date: string, sireId: string, sireNationalId: string, weeks: number, staffId: string}[] = []
    data.animalEventViews.nodes?.forEach((ec) => {
      if (ec.eventUuid === eventUuid) {
        returnVal['event'] = ec as AllEvents
      }
      if (ec.sireId) {
        returnVal['sireList'][ec.sireId] = ec.sireUuid
      }
      if (ec.sireId === animalInfo.lastMatingSireId) {
        returnVal.sireNationalId = ec.sireNationalId
      }
      if (ec.event.startsWith('M')) {
        returnVal['conceptionEvents'].push({
          eventUuid: ec.eventUuid,
          date: moment(ec.eventDate).format('YYYY-MM-DD'),
          sireId: ec.sireId,
          sireNationalId: ec.sireNationalId,
          sireUuid: ec.sireUuid,
          weeks: moment().diff(moment(ec.eventDate), 'weeks'),
          staffId: ec.staffId,
        })
      }
    })
  }
  if (data.drugStocks) {
    returnVal['drugs'] = data.drugStocks.nodes.sort((a, b) => a.shortName > b.shortName ? 1 : -1).map((ds) => {
      const receipt = data.drugReceipts.nodes.sort((a, b) => a.purchaseDate > b.purchaseDate ? -1 : 1).find((dr) => {
        const dates = dr.expiry.split('/')
        const currDate = new Date()
        return dr.productId === ds.productId && (currDate.getFullYear() > Number(dates[1]) || (currDate.getFullYear() === Number(dates[1]) && currDate.getMonth() >= Number(dates[0])))
      })
      return {
        ...ds,
        batch: receipt?.batch ?? '',
        expiry: receipt?.expiry ?? ''
      }
    })
  }
  if (data.diseases) {
    returnVal['diseases'] = data.diseases.nodes
  }
  if (data.staffs) {
    returnVal['staff'] = data.staffs.nodes?.map(stf => stf.staffId)
  }
  return returnVal
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, userData } = await getUserAccessToken(request, true);
  const searchParams = new URL(request.url).searchParams
  const eventUuid = searchParams.get('eventuuid') ?? ''
  
  const requiredData = {
    easyDairyId: ['Mating','Preg Test','Treatment','Dry Off','Calving'].includes(params.event ?? ''),
    bullTeam: ['Mating','Preg Test','Calving'].includes(params.event ?? ''),
    staff: ['Mating','Preg Test','Treatment','Dry Off'].includes(params.event ?? ''),
    drugStock: ['Treatment','Dry Off'].includes(params.event ?? ''),
    disease: ['Treatment'].includes(params.event ?? ''),
    event: ['Mating','Preg Test','Calving'].includes(params.event ?? '') || eventUuid ? {
      animalId: params.animalid!,
      eventUuid: eventUuid || undefined,
    } : undefined
  }
  const {query, herdList} = await loadData(request, accessToken, params.herduuid!, userData, requiredData)

  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
        groupAnimalViews (
          condition: {
            animalId: "${params.animalid}"
            herdUuid: "${params.herduuid}"
          }
        )
        {
          nodes {
            animalUuid
            animalId
            status
            lastMatingSireId
            lastMatingDateDays
            donorUuid
          }
        }
        ${query.join('')}
      }`,
    },
    undefined,
    accessToken
  );
  
  if (!success || 'errors' in response || response.data.groupAnimalViews.nodes.length === 0) {
    console.error(`FATAL ERROR: Failed to retrieve animal event data for ${params.animalid}`, `source: ${request.url}`, userData)
    throw new Response('Failed to retrieve animal event data', { status: 400 });
  }

  const returnData = processData(response.data, eventUuid)

  let extraParams: Record<string, string | number> = {}
  if (params.event === 'Calving') {
    const nextAnimal = await callAPI<GenericAPI>(request, `/api/animal/newId/${params.herduuid}`, undefined, 'GET')
    if (nextAnimal.success && nextAnimal.response.success) {
      extraParams['calfId'] = nextAnimal.response.animalId
    }
  }

  return json({
    ...returnData,
    eventType: params.event,
    herdList,
    ...extraParams
  })
}

// const sleep = (num: number) => new Promise(r => setTimeout(r, num))

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { accessToken } = await getUserAccessToken(request, true);
    const payload = await request.formData()
    let obj: {[key: string]: string | number[]} = {}
    for (const pair of payload.entries()) {
      obj[pair[0]] = pair[1] as string
    }
    if (obj['calfId']) {
      obj['calfIds'] = [Number(obj['calfId'])]
      delete obj['calfId']
      if (obj['calfId2']) {
        obj['calfIds'].push(Number(obj['calfId2']))
      }
      delete obj['calfId2']
    }
    // await sleep(5000)
    // return json({success: true, message: 'yay'})
    const {response, success} = await callAPI<GenericAPI>(request, '/api/event' + (obj.eventUuid ? `/${obj.eventUuid}` : ''), obj, obj.eventUuid ? 'PUT' : 'POST', accessToken)
    if (!success) {
      return json({success: false, message: response.errors, newIds: (response as any).data?.calfIds ?? []})
    }
    return json({success: success && response.success, message: response.message, newIds: obj.calfIds})
  } catch (e) {
    console.log(e)
    return json({success: false, message: e, newIds: []})
  }
}

export default function EventForm() {
  const data = useLoaderData<LoaderReturn>()
  const actionData = useActionData<{success: boolean, message: any, newIds: number[]}>()
  const [formData, setFormData] = useState<Record<string, string | number>>({
    ...data.event,
    sireId: ('sireId' in data.event ? data.event.sireId : data.lastMatingSireId) || '',
    notes: data.event.notes ?? '',
    eventCode: data.event.event ?? defaultVals[data.eventType].type
  })
  const [calfData, setCalfData] = useState<number[]>([])
  useEffect(() => {
    if (actionData?.success) {
      window.parent.postMessage({source: `${data.eventType.toLowerCase().replace(/\s/g, '')}-frame`, success: true, ids: actionData.newIds}, '/')
    } else if (actionData?.newIds) {
      let newCalfData: number[] = []
      newCalfData.push(Number(actionData.newIds[0]))
      if (actionData.newIds[1]) {
        newCalfData.push(Number(actionData.newIds[1]))
      }
      setCalfData(newCalfData)
    }
    window.scrollTo({top: 0})
  }, [actionData])
  
  return <Form method="POST" className="p-3 border border-gray-300 text-left min-w-[300px] flex flex-col gap-4">
    {!actionData?.success && !!actionData?.message && <div className="border border-red-500 bg-red-100 p-3">
      <span className="text-red-500">{actionData.message}</span>
      {actionData.newIds.length > 0 && <span className="text-red-500 block text-sm">The next valid ID starts at {actionData.newIds[0]}</span>}
    </div>}
    <EventDate data={data} setFormData={setFormData}  />
    <EventType data={data} setFormData={setFormData}  />
    {data.eventType === 'Calving' && <CalvingComponent data={data} formData={formData} setFormData={setFormData} calfData={calfData} />}
    {data.eventType === 'Mating' && <MatingComponent data={data} formData={formData} setFormData={setFormData} />}
    {data.eventType === 'Preg Test' && <PregTestComponent data={data} formData={formData} setFormData={setFormData} />}
    {data.eventType === 'Treatment' && <TreatmentComponent data={data} formData={formData} setFormData={setFormData} />}
    {data.eventType === 'Dry Off' && <DryOffComponent data={data} formData={formData} setFormData={setFormData} />}
    {data.eventType === 'Vet Check' && <VetCheckComponent data={data} />}
    <div>
      <label className="font-bold">Notes</label>
      <div className="mb-4">
        <TextArea name="notes" value={formData.notes ?? ""} onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))} />
      </div>
    </div>
    <input type="hidden" name="type" value={data.eventType.toLowerCase().replace(/\s/g, '')} />
    <input type="hidden" name="animalId" value={data.animalUuid} />
    {!!data.event.eventUuid && <input type="hidden" name="eventUuid" value={data.event.eventUuid} />}
    <Button type="submit" className="w-full">Save</Button>
  </Form>
}

function EventDate({data, setFormData}: {data: LoaderReturn, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  const [maxDate, setMaxDate] = useState("")
  useEffect(() => {
    //set it on the client side so there are no timezone issues
    setMaxDate(moment().format('YYYY-MM-DD'))
    if (!data.event.eventDate) {
      setFormData(prev => ({...prev, eventDate: moment().format('YYYY-MM-DD')}))
    }
  }, [])
  return <div>
    <label className="font-bold">Date</label>
    <div className="">
      <Input type={data.event.eventDate ? "text" : "date"} name="eventDate" max={maxDate} disabled={!!data.event.eventDate} defaultValue={moment(data.event.eventDate).format(data.event.eventDate ? 'DD/MM/YYYY' : 'YYYY-MM-DD')} onChange={(e) => {
        setFormData(prev => ({...prev, eventDate: e.target.value}))
      }} />
    </div>
  </div>
}

function EventType({data, setFormData}: {data: LoaderReturn, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  return <div>
    <label className="font-bold">Type</label>
    <div className="">
      <select 
        name="eventCode" 
        disabled={!!data.event.event} 
        defaultValue={data.event.event ? data.event.event.slice(0, 2) : defaultVals[data.eventType].type} 
        onChange={(e) => {
          setFormData(prev => {
            let copy = {...prev}
            copy.eventCode = e.target.value
            if (e.target.value === 'PE') {
              copy.notes = "NOT IN CALF"
            } else if (e.target.value !== "PE" && data.eventType === 'Preg Test') {
              copy.notes = (prev.conceptionWeeks ? `[${prev.conceptionWeeks}] ${prev.sireId}` : '')
            }
            return copy
          })
        }}
        className={`p-2 border-gray-300 rounded-sm text-sm border w-full ${data.event.event ? 'text-gray-400 border-gray-200' : 'border-gray-300'}`}
      >
        {Object.entries(eventFields[data.eventType].type).map(([k, v], i) => <option key={`type-${i}`} value={k}>{v}</option>)}
      </select>
    </div>
  </div>
}

function DrugList({data, formData, required, setFormData}: {data: BaseReturn & (TreatmentReturn | DryOffReturn), required: boolean, formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  return <>
    <div>
      <label className="font-bold">Drug</label>
      <div className="">
        <select name="drugId" disabled={!!data.event.drugId} required={required && !data.event.drugId} onChange={(e) => {
          const idx = data.drugs?.findIndex(d => Number(d.productId) === Number(e.target.value))
          
          setFormData(prev => ({
            ...prev,
            drugId: Number(e.target.value),
            measure: data.drugs[idx].measure,
            whMeat: data.drugs[idx].whMeat,
            whMilk: data.drugs[idx].whMilk,
            batch: data.drugs[idx].batch,
            expiry: data.drugs[idx].expiry,
            notes: idx > -1 ? `${data.drugs[idx].shortName.toUpperCase()} (${prev.drugAmount ?? 0} ${data.drugs[idx].measure} ${prev.when ? (prev.when === '1' ? 'AM' : 'PM') :""})` : prev.notes
          }))
        }} defaultValue={data.event.drugId ?? ""} className={`p-2 rounded-sm border text-sm w-full border-gray-300 ${data.event.drugId ? 'text-gray-400 border-gray-200' : 'border-gray-300'}`}>
          <option value="">Select</option>
          {data.drugs?.map((dr, i) => <option key={`type-${i}`} value={dr.productId}>{dr.shortName}</option>)}
        </select>
      </div>
    </div>
    <Input type="number" label="Amount" name="drugAmount" min={!!(required || formData.drugId) ? 1 : undefined} defaultValue={data.event.drugAmount ?? (required ? 0 : undefined)} required={!!(required || formData.drugId)} onChange={(e) => {
      const drug = data.drugs.find(d => Number(d.productId) === formData.drugId)
      setFormData(prev => ({
        ...prev,
        drugAmount: Number(e.target.value),
        notes: `${String(drug?.shortName.toUpperCase() ?? '').toUpperCase()} (${e.target.value} ${drug?.measure ?? ""} ${prev.when || prev.drugSession ? (prev.when === '1' || (!prev.when && prev.drugSession === '1') ? 'AM' : 'PM') :""})`
      }))
    }} />
    <Technician data={data} label="Treated By" formData={formData} required={!!(required || formData.drugId)} setFormData={setFormData} />
    <div>
      <label className="font-bold">When</label>
      <select name="drugSession" disabled={!!data.event.drugSession} required={!data.event.drugSession && !!(required || formData.drugId)} defaultValue={data.event.drugSession ?? formData.when} onChange={(e) => setFormData(prev => {
        const drug = data.drugs.find(d => Number(d.productId) === formData.drugId)
        return {
          ...prev, 
          when: e.target.value,
          notes: `${String(drug?.shortName.toUpperCase() ?? '').toUpperCase()} (${formData.drugAmount ?? 0} ${formData.measure ?? ''} ${e.target.value === '1' ? 'AM' : 'PM'})`
        }
      })} className={`text-sm p-2 rounded-sm border w-full ${data.event.staffId ? 'text-gray-400 border-gray-200' : 'border-gray-300'}`}>
        <option value="">Select</option>
        <option value="1">AM</option>
        <option value="2">PM</option>
      </select>
    </div>
    <Input type="number" readOnly={true} disabled={!!data.event.event} label="WH Meat Days" name="whMeat" value={data.event.whMeat ?? (formData.whMeat ?? 0)} />
    <Input type="number" readOnly={true} disabled={!!data.event.event} label="WH Milk Days" name="whMilk" value={data.event.whMilk ?? (formData.whMilk ?? 0)} />
    <input type="hidden" name="batch" value={formData.batch ?? ''} />
    <input type="hidden" name="expiry" value={formData.expiry ?? ''} />
  </>
}

function Technician({data, formData, setFormData, label, required}: {label?: string, required?: boolean, data: BaseReturn & (TreatmentReturn | PregTestReturn | MatingReturn | DryOffReturn), formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  return <div>
    <label className="font-bold">{label ?? 'Technician'}</label>
    <div className="mb-4">
      <select name="technicianId" required={required} defaultValue={data.event.staffId} value={formData.technician} onChange={(e) => setFormData(prev => ({...prev, technician: e.target.value}))} className={`p-2 rounded-sm border text-sm w-full border-gray-300`}>
        <option value="">Select</option>
        {data.staff?.map((st, i) => <option key={`type-${i}`} value={st}>{st}</option>)}
      </select>
    </div>
  </div>
}

function Sire({data, formData, setFormData, editable, hide}: {editable?: boolean, hide?: boolean, data: BaseReturn & (CalvingReturn | PregTestReturn | MatingReturn), formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  const [fullBull, setFullBull] = useState(data.eventType === 'Calving' ? false : true)
  const selectList = fullBull ? data.bullList : data.sireList
  return <div>
    <label className="font-bold">Sire</label>
    <div className="flex flex-col">
      {(!editable && data.event.sireId) ? <>
        <Input readOnly disabled={!!data.event.sireId} name="sireId" value={data.event.sireId ?? data.lastMatingSireId} />
        {/* <input type="hidden" name="sire" value={props.selectedSire} /> */}
      {/* </> : <SelectDropdown parentBlock={true} type="single" options={props.sireList.map((sl) => ({label: sl, value: sl}))} value={sire} onSelectChange={(opt) => setSire(opt.value)} />} */}
      </> : <>
        {!hide ? 
          <select name="sireId" required={true} value={formData.sireId} onChange={(e) => setFormData(prev => ({...prev, sireId: e.target.value }))} className="text-sm p-2 border-gray-300 rounded-sm border w-full">
            <option value="">Select</option>
            {Object.entries(selectList).map(([id, uid]) => <option key={uid} value={uid}>{id}</option>)}
          </select> 
          : <input type="hidden" name="sireId" value={formData.sireId} />
        }
        {data.eventType === 'Calving' && <Button variant="link" type="button" className="mt-1 self-end" onClick={() => {
          setFullBull(!fullBull)
          setFormData(prev => ({...prev, sireId: ''}))
        }}>
          {fullBull ? "Use Mating List" : "Use Full List"}
        </Button>}
      </>}
    </div>
  </div>
}

function VetCheckComponent({data}: {data: BaseReturn & VetCheckReturn}) {
  return <div>
    <label className="font-bold">Reason</label>
    <select name="reason" defaultValue={data.event.vetCheck} className="text-sm p-2 border-gray-300 rounded-sm border w-full">
      <option value="">Select</option>
      {eventFields[data.eventType].reason.map((v, i) => <option key={`type-${i}`} value={v}>{v}</option>)}
    </select>
  </div>
}

function DryOffComponent({data, formData, setFormData}: {data: BaseReturn & DryOffReturn, formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  return <>
    {formData.eventCode === 'D4' && <DrugList data={data} formData={formData} required={false} setFormData={setFormData} />}
  </>
}

function TreatmentComponent({data, formData, setFormData}: {data: BaseReturn & TreatmentReturn, formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  const reasonList = Object.keys(eventFields['Treatment'].reason).filter(k => k.includes(formData.eventCode as string))
  return <>
    {['TU','TL'].includes(formData.eventCode as string) && <div>
      <label className="font-bold">Reason</label>
      <select name="reason" required={true} onChange={(e) => setFormData(prev => ({
        ...prev, 
        reason: e.target.value 
      }))} className="text-sm p-2 border-gray-300 rounded-sm border w-full">
        <option value="">Select</option>
        {reasonList.map((k, i) => 
          <option key={`opt-${i}`} value={k}>{eventFields[data.eventType].reason[k as keyof typeof eventFields['Treatment']['reason']]}</option>
        )}
      </select>
    </div>}
    {formData.eventCode === 'TI' && <div>
      <label className="font-bold">Illness/Disease Type</label>
      <select name="diseaseId" required={true} defaultValue={data.event.diseaseId} onChange={(e) => setFormData(prev => ({...prev, diseaseId: Number(e.target.value)}))} className="text-sm p-2 border-gray-300 rounded-sm border w-full">
        <option value="">Select</option>
        {data.diseases?.filter(d => d.enabled || (!!data.event.event || d.diseaseId === data.event.diseaseId)).map((d, i) => <option key={`opt-${i}`} value={d.diseaseId} disabled={!d.enabled}>{d.name}</option>)}
      </select>
    </div>}
    <DrugList data={data} formData={formData} required={true} setFormData={setFormData} />
  </>
}

function PregTestComponent({data, formData, setFormData}: {data: BaseReturn & PregTestReturn, formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  const [custom, setCustom] = useState(false)
  return <>
    {!data.event.event && formData.eventCode !== 'PE' && <div>
        <label className="font-bold">Conception</label>
        <table className="w-full mt-2">
          <thead>
            <tr className="text-sm font-bold [&>th]:py-2 [&>th]:px-1 bg-grey-100">
              <th>&nbsp;</th>
              <th>Date</th>
              <th>Sire</th>
              <th>Weeks in Calf</th>
            </tr>
          </thead>
          <tbody>
            {data.conceptionEvents.map((ce, ix) => <tr key={`opt-${ix}`} className="text-sm">
              <td>
                <label className="relative">
                  <input type="radio" name="conceptionEvent" required className="absolute opacity-0 pointer-events-none peer" value={ix} defaultChecked={ix === 0} onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev, 
                      eventUuid: ce.eventUuid, 
                      conceptionDate: ce.date, 
                      conceptionWeeks: ce.weeks, 
                      sireNationalId: ce.sireNationalId, 
                      technician: ce.staffId,
                      sireId: ce.sireId,
                      sireUuid: ce.sireUuid,
                      notes: `[${ce.weeks} WEEKS] ${typeof ce.sireId === 'string' ? ce.sireId.toUpperCase() : ''}`
                    }))
                    setCustom(false)
                  }} />
                  <FaCheckSquare className="fill-primary-500 hidden peer-checked:block" />
                  <FaRegSquare className="block peer-checked:hidden" />
                </label>
              </td>
              <td className="p-2">{moment(ce.date).format('DD/MM/YYYY')}</td>
              <td className="p-2">{ce.sireId}</td>
              <td className="p-2">{ce.weeks}</td>
            </tr>)}
            <tr className="text-sm">
              <td className="py-2">
                <label className="relative">
                  <input type="radio" name="conceptionEvent" required className="absolute opacity-0 pointer-events-none peer" value={-1} onChange={(e) => {
                    setFormData(prev => ({
                      ...prev, 
                      conceptionDate: moment().subtract(1, 'weeks').format('YYYY-MM-DD'), 
                      conceptionWeeks: 1, 
                      technician: '',
                      eventUuid: '',
                      notes: ''
                    }))
                    setCustom(true)
                  }} />
                  <FaCheckSquare className="fill-primary-500 hidden peer-checked:block" />
                  <FaRegSquare className="peer-checked:hidden block" />
                </label>
              </td>
              <td colSpan={3} className="p-2">Not Listed</td>
            </tr>
          </tbody>
        </table>
        {!custom && <input type="hidden" name="sireId" value={formData.sireUuid ?? (data.conceptionEvents[0] ? data.conceptionEvents[0].sireUuid : '')} />}
        <input type="hidden" name="conceptionUuid" value={formData.eventUuid ?? (data.conceptionEvents[0] ? data.conceptionEvents[0].eventUuid : '')} />
      </div>}
      {custom && formData.eventCode !== 'PE' && <>
        <div>
          <label className="font-bold">Weeks in Calf</label>
          <div className="flex flex-col">
            {data.event.event ? 
              <Input type="text" disabled={true} readOnly={true} value={formData.conceptionWeeks} />
            : <><select name="conceptionWeeks" value={formData.conceptionWeeks} className="text-sm p-2 border-gray-300 rounded-sm border w-full"
              onChange={(e) => {
                setFormData(prev => ({...prev, conceptionWeeks: Number(e.target.value), conceptionDate: moment(formData.eventDate).subtract(Number(e.target.value), 'weeks').format('YYYY-MM-DD')}))
              }}>
              {Array(30).fill(0).map((ar, ix) => <option key={`cw-${ix}`}>{ix+1}</option>)}
            </select>
            </>}
            <input type="hidden" name="conceptionDate" readOnly value={formData.conceptionDate} />
          </div>
        </div>
        <Sire editable={!data.event.event} hide={!custom} data={data} formData={formData} setFormData={setFormData} />
        <Technician data={data} formData={formData} setFormData={setFormData} required={formData.eventCode !== 'PE'} />
      </>}
  </>
}

function MatingComponent({data, formData, setFormData}: {data: BaseReturn & MatingReturn, formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  return <>
    <Sire data={data} formData={formData} setFormData={setFormData} />
    {formData.eventCode === 'ME' && <>
      <AnimalSelector herdList={data.herdList} animalId={data.event.event ? data.donorUuid! : undefined} herd={data.donorHerd!} />
      <div>
        <label className="font-bold">Embryo Recovery</label>
        <div className="">
          <Input type="date" name="embryoRecovery" max={moment().format('YYYY-MM-DD')} defaultValue={moment(data.event.embryoRecovery).format('YYYY-MM-DD')} />
        </div>
      </div>
    </>}
    {['MS','MA'].includes(formData.eventCode as string) && <Technician data={data} formData={formData} setFormData={setFormData} required={true} />}
  </>
}

function CalvingComponent({data, calfData, formData, setFormData}: {data: BaseReturn & CalvingReturn, calfData: number[], formData: Record<string, string | number>, setFormData: Dispatch<SetStateAction<Record<string, string | number>>>}) {
  const [fate, setFate] = useState(data.event.calfFate ?? "L")
  const [sex, setSex] = useState(data.event.calfSex ?? "F")
  const [calfId, setCalfId] = useState(Number(data.event.calfId ?? data.calfId))
  const [calfId2, setCalfId2] = useState(Number(data.event.calfId2 ?? (data.calfId + 1)))
  const [touched, setTouched] = useState<string[]>(data.event.eventUuid ? ['calfSex','calfFate'] : [])

  useEffect(() => {
    setCalfId(calfData[0])
    if (calfData[1]) {
      setCalfId2(calfData[1])
    }
  }, [calfData])
  
  return <>
    <Sire data={data} editable={!data.event.event || (data.lastMatingDateDays < 293 && data.lastMatingDateDays > 273)} formData={formData} setFormData={setFormData} />
    <div>
      <label className="font-bold">Calf Sex</label>
      <div className="">
        <select name="calfSex" disabled={!!data.event.calfSex} value={sex} className={`p-2 rounded-sm border text-sm w-full ${data.event.calfSex ? 'text-gray-400 border-gray-200' : 'border-gray-300'}`} onChange={(event) => {
          if (data.eventType === 'Calving' && defaultVals[data.eventType].sex[event.target.value as SexTypes] && !touched.includes('calfFate')) {
            setFate(defaultVals[data.eventType].sex[event.target.value as SexTypes])
          }
          setSex(event.target.value)
          if (!touched.includes('calfSex')) {
            setTouched(prev => [...prev, 'calfSex'])
          }
        }}>
          {Object.entries(eventFields[data.eventType].sex).map(([k, v], i) => <option key={`type-${i}`} value={k}>{v}</option>)}
        </select>
      </div>
    </div>
    <div>
      <label className="font-bold">Calf Fate</label>
      <div className="">
        <select name="calfFate" disabled={!!data.event.calfFate} value={fate} className={`text-sm p-2 border-gray-300 rounded-sm border w-full ${data.event.calfFate ? 'text-gray-400 border-gray-200' : 'border-gray-300'}`} onChange={(event) => {
          setFate(event.target.value)
          if (data.eventType === 'Calving' && defaultVals[data.eventType].fate[event.target.value as FateTypes] && !touched.includes('calfSex')) {
            setSex(defaultVals[data.eventType].fate[event.target.value as FateTypes])
          }
          if (!touched.includes('calfFate')) {
            setTouched(prev => [...prev, 'calfFate'])
          }
        }}>
          {Object.entries(eventFields[data.eventType].fate).map(([k, v], i) => <option key={`type-${i}`} value={k}>{v}</option>)}
        </select>
      </div>
    </div>
    <div>
      <label className="font-bold">Calf Size</label>
      <div className="">
        <select name="calfSize" defaultValue={data.event.calfSize ?? "N"} className="text-sm p-2 border-gray-300 rounded-sm border w-full">
          {Object.entries(eventFields[data.eventType].size).map(([k, v], i) => <option key={`type-${i}`} value={k}>{v}</option>)}
        </select>
      </div>
    </div>
    <div className="flex justify-between gap-2">
      <div>
        <label className="font-bold">Calf ID</label>
        <Input readOnly={!!data.event.eventUuid} type="number" 
          disabled={!!data.event.eventUuid} 
          name="calfId" 
          value={data.event.calfId ?? (['FF','F'].includes(sex) && ['LL','LD','L'].includes(fate) ? calfId : '')} 
          onChange={(e) => {
            setCalfId(Number(e.target.value))
          }}
          />
      </div>
      <div>
        <label className="font-bold">Calf ID 2</label>
        <Input readOnly={!!data.event.eventUuid} type="number" 
          disabled={!!data.event.eventUuid} 
          name="calfId2" 
          value={data.event.calfId2 ?? (sex === 'FF' && fate === 'LL' ? calfId2 : '')} 
          onChange={(e) => {
            setCalfId2(Number(e.target.value))
          }}
          />
      </div>
    </div>
  </>
}

function AnimalSelector(props: {herdList: {herdUuid: string, herdCode: string}[], animalId?: string, herd?: string}) {
  const [herd, setHerd] = useState(props.herd ? props.herdList.find(hl => hl.herdCode === props.herd)?.herdUuid : props.herdList[0].herdUuid)
  const [nationalId, setNationalId] = useState("")
  const [uuid, setUuid] = useState("")
  const [name, setName] = useState("")
  const [animal, setAnimal] = useState<{label: string, value: string} | undefined>()
  const [animalList, setAnimalList] = useState<{label: string, value: string}[]>([])
  const [animalData, setAnimalData] = useState<{animalId: string, animalUuid: string, name: string, nationalId: string}[]>([])
  const fetcher = useFetcher<{animalUuid: string, animalId: string, nationalId: string, name: string}[]>()
  useEffect(() => {
    if (fetcher.data) {
      setAnimalList(fetcher.data.map((dt) => ({label: dt.animalId, value: dt.animalUuid})))
      setAnimalData(fetcher.data)
    }
  }, [fetcher.data])
  useEffect(() => {
    if (!props.animalId) {
      fetcher.load(`/animal/${props.herdList[0].herdUuid}`)
    }
  }, [])
  return <>
    <div className="flex gap-1">
        <div>
          <label className="font-bold">Donor Herd</label>
          <div className="mb-4">
            <select name="donorHerdUuid" disabled={!!props.herd} required={true} value={herd} className={`p-2 rounded-sm border text-sm border-gray-300`} onChange={(e) => {
                setHerd(e.target.value)
                setAnimal(undefined)
                fetcher.load(`/animal/${e.target.value}`)
              }}>
              {props.herdList.map((st, i) => <option key={`type-${i}`} value={st.herdUuid}>{st.herdCode}</option>)}
            </select>
            <input type="hidden" name="donorHerd" value={props.herdList.find(hl => hl.herdUuid === herd)?.herdCode ?? ""} />
          </div>
        </div>
        <div>
          <label className="font-bold">Donor ID</label>
          <div className="mb-4">
            {props.animalId ? 
              <Input type="text" disabled={true} value={props.animalId} />
            : <>
              <Autocomplete options={animalList} required={true} value={animal} onSelectChange={(opt) => {
                setUuid(opt.value)
                const chosen = animalData.find(al => al.animalUuid === opt.value)
                setNationalId(chosen?.nationalId ?? "")
                setName(chosen?.name ?? "")
                setAnimal(opt)
              }} />
              <input type="hidden" name="donorAnimalId" value={animal?.label ?? ""} />
              <input type="hidden" name="donorNationalId" value={nationalId} />
              <input type="hidden" name="donorId" value={uuid} />
            </>}
          </div>
        </div>
    </div>
    {(!props.animalId && name) && <div>
      <label className="font-bold">Donor Name</label>
      <div className="mb-4">
        <Input type="text" name="donorName" readOnly={true} value={name} />
      </div>
    </div>}
  </>
}

export function shouldRevalidate() {
  return false
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
