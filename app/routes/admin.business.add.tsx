import React, { useEffect, useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import Button from '~/components/ui/Button';
import Input, { InputLabel } from '~/components/ui/Input';
import z  from 'zod';
import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { SwitchToggle } from '~/components/ui/Switch';
import Search from '~/components/ui/Search';
import { Pagination } from '~/components/ui/Pagination';
import HoverCard from '~/components/ui/HoverCard';
import { IoAddCircleOutline } from 'react-icons/io5';
import { ModalBox } from '~/components/ui/Dialog';
import BusinessHerdsComp from '~/components/AdminHerds';
import moment from 'moment';
import { HEAT_SYSTEM_LIST } from '~/lib/utils';

const registerBusinessSchema = z.object({
  businessName: z.string().min(1, 'Business Name is required'),
  easyDairyId: z.string().array().nonempty({
    message: "Easy Dairy ID is required",
  }),
  license: z.record(z.string().min(1, 'License cannot be blank')).default({}),
  isEasyDraft: z.boolean(),
  heatSystem: z.string().optional()
});

export type BusinessLoaderResponse = {
  business: {
    BusinessID: string,
    EasyDairyID: string[],
    BusinessName: string,
    License: any,
    Status: string,
    EasyDraft: boolean,
    HeatSystem?: string,
  }
  easydairy: EasyDairyResponse[],
}

export type EasyDairyResponse = {
  easyDairyId: string,
  herds: {
    herdCode: string,
    herdUuid: string,
    seenIn: string[] | null
  }[],
  businesses: {id: string, name: string}[]
}

export async function loader({request}: LoaderFunctionArgs) {
  const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/easydairyid`, undefined, 'GET');
  if (!apiResult.success) {
      return json({error: apiResult.response, easydairy: [], business: {}})
  }
  const easydairy = (apiResult.response as EasyDairyResponse[] || [])?.sort((a,b) => a.easyDairyId.localeCompare(b.easyDairyId))
  return json({easydairy: easydairy, business: {}})
}

export const formatHerdData = (formData: FormData) => {
  let noteFields: {[key: string]: string} = {}
  formData.getAll("notes").forEach((n) => {
    const note = (n as string).split('::')
    noteFields[note[0]] = note[1]
  });
  let activeUntilFields: {[key: string]: string} = {}
  formData.getAll("activeUntil").forEach((n) => {
    const activeUntil = (n as string).split('::')
    activeUntilFields[activeUntil[0]] = activeUntil[1]
  });
  let seenInFields: {[key: string]: {easyDairyId: string, seenIn: string[]}} = {}
  formData.getAll('seenIn').forEach((si) => {
    const [herdUuid, easyDairyId, seenIn] = (si as string).split('::')
    seenInFields[herdUuid] = {
      easyDairyId,
      seenIn: seenIn.split(',')
    }
  })
  const herdData = formData.getAll("visible").map((d) => {
    const data = (d as string).split('::')
    return {
      id: data[0],
      visible: data[1] === "true",
      note: noteFields[data[0]] ?? "",
      activeUntil: activeUntilFields[data[0]] ? moment(activeUntilFields[data[0]], "DD/MM/YYYY").format('YYYY-MM-DD') : "",
      seenIn: seenInFields[data[0]]
    }
  })
  return herdData
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  // const requestData = Object.fromEntries(formData);
  const isEasyDraft = formData.get('isEasyDraft') === 'true'
  const data = {
    businessName: formData.get("businessName"),
    easyDairyId: formData.getAll("easyDairyId"),
    isEasyDraft: isEasyDraft,
    heatSystem: isEasyDraft ? formData.get("heatsystem") : ''
  }

  const validation = registerBusinessSchema.safeParse(data);
  if (!validation.success) {
    const fieldErrors = validation.error.flatten()?.fieldErrors;
    return json({
      status: 'validation error',
      message: 'Invalid input',
      errors: `These inputs are invalid: ${Object.keys(fieldErrors).join(', ')}`,
      businessId: null,
      fieldErrors: fieldErrors,
      easyDairyIds: []
    });
  }

  const res = await callAPI<GenericAPI>(request, '/api/dev/business', validation.data, 'POST');
  if (!res.success || !res.response?.business) {
    return json({
      status: 'api error',
      message: 'Error',
      businessId: null,
      errors: !res.success ? res.response.errors as string : res.response.message,
      fieldErrors: null,
      easyDairyIds: []
    });
  }
  if (!isEasyDraft) {
    const herdData = formatHerdData(formData)
    const resp = await callAPI<GenericAPI>(request, `/api/dev/admin/business/herd`, {
      businessId: res.response.business.BusinessID,
      herds: herdData
    }, 'POST')
    if (!resp.success || resp.response.errors) {
      return json({
        status: 'api error',
        message: 'Error',
        businessId: res.response.business.BusinessID,
        errors: !resp.success ? resp.response.errors as string : resp.response.message,
        fieldErrors: null,
        easyDairyIds: []
      })
    }
  }
  return json({
    status: 'success',
    message: res.response.message,
    businessId: res.response.business.BusinessID,
    errors: null,
    fieldErrors: null,
    easyDairyIds: []
  });
}

export const pageLimit = 20

type HerdType = {
  [key: string]: {
    visible: {[key: string]: boolean},
    note: {[key: string]: string},
    activeUntil: {[key: string]: string},
  }
}

const RegisterBusiness = () => {
  const actionData = useActionData<typeof action>()
  const loaderData = useLoaderData<BusinessLoaderResponse>()
  const formRef = React.useRef<HTMLFormElement>(null)
  const [query, setQuery] = useState('')
  const [currPage, setCurrPage] = useState(1)
  const [easyDairyIds, setEasyDairyIds] = useState<(string | null)[]>(loaderData.business?.EasyDairyID ?? [])
  const [modalContent, setModalContent] = useState({
    open: false,
    easyDairyId: '',
  })
  const [isEasyDraft, setIsEasyDraft] = useState(loaderData.business.EasyDraft ?? false)
  const [heatSystem, setHeatSystem] = useState('');
  const [herds, setHerds] = useState<HerdType>(() => {
    let temp: HerdType = {}
    loaderData.easydairy.forEach((ed) => {
       temp[ed.easyDairyId] = {visible: {}, note: {}, activeUntil: {}}
    })
    return temp
  })
  const [tempH, setTempH] = useState<HerdType>(() => {
    let temp: HerdType = {}
    loaderData.easydairy.forEach((ed) => {
       temp[ed.easyDairyId] = {visible: {}, note: {}, activeUntil: {}}
    })
    return temp
  })
  const [herdSeen, setHerdSeen] = useState<{key: string, val: string}[]>([])
  const handleLoadedHerds = (newData: { [id: string]: boolean }) => {
    setTempH((prevState) => {
        return {
          ...prevState,
          [modalContent.easyDairyId]: {
              ...prevState[modalContent.easyDairyId],
              visible: newData
          }
        };
    })
  };
  useEffect(() => {
    if (actionData?.status === 'success') {
      formRef.current?.reset();
      setEasyDairyIds(actionData.easyDairyIds)
    }
  }, [actionData?.status, actionData?.easyDairyIds])
  useEffect(() => {
    setIsEasyDraft(loaderData.business.EasyDraft ?? false)
    setHeatSystem(loaderData.business.HeatSystem ?? '')
  }, [loaderData.business.HeatSystem, loaderData.business.EasyDraft])
  return (
    <>
      {actionData?.status === 'success' && actionData?.businessId && (
        <div className='bg-green-100/50 mb-10 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData.message}</h5>
          <p className='text-grey-700'>Business ID: {actionData.businessId}</p>
        </div>
      )}
      {actionData?.status !== 'success' && actionData?.errors && (
        <div className='bg-error-200/50 mb-10 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData.message}</h5>
          <p className='text-grey-700'>{actionData.errors}</p>
        </div>
      )}
      <h2 className='text-xl lg:text-2xl mb-5'>{loaderData.business?.BusinessID ? 'Edit Business Details' : 'Register a Business'}</h2>
            <Form ref={formRef} method='post' className='flex flex-col gap-3'>
        <div className="flex">
          <div className='flex-auto flex flex-col gap-4'>
            <Input
              id='businessName'
              type='text'
              label='Business Name'
              name='businessName'
              required={true}
              defaultValue={loaderData.business?.BusinessName}
              error={actionData?.fieldErrors?.['businessName']?.[0]}
            />
            {loaderData.business?.BusinessID && <Input
              value={loaderData.business.BusinessID}
              type='text'
              label='Business Id'
              id='businessId'
              name='businessId'
              readOnly
              disabled={true}
            />}
          </div>
        </div>
        <div className="flex gap-5 items-center">
          <div className="flex gap-1 items-center">
              <input id="easydairy" type="radio" name="easyDairy" disabled={!!loaderData.business?.BusinessID} checked={!isEasyDraft} onChange={(e) => {
                if (e.currentTarget.checked) {
                  setIsEasyDraft(false)
                }
              }} />
              <InputLabel htmlFor={'easydairy'}>
                Easy Dairy
              </InputLabel>
          </div>
          <div className="flex gap-1 items-center">
              <input id="easydraft" type="radio" name="easyDraft" disabled={!!loaderData.business?.BusinessID} checked={isEasyDraft} onChange={(e) => {
                if (e.currentTarget.checked) {
                  setIsEasyDraft(true)
                }
              }} />
              <InputLabel htmlFor={'easydraft'}>
                Easy Draft
              </InputLabel>
          </div>
          <input type="hidden" name="isEasyDraft" value={isEasyDraft.toString()} />
        </div>
        { isEasyDraft && <div className='flex flex-col gap-0.5'>
          <InputLabel>Heat System</InputLabel>
          <div className="flex gap-5">
            {HEAT_SYSTEM_LIST.map((hs, i) =>
                <div className='flex' key={hs.label}>
                  <div className='p-2'>
                    <input type="radio"
                      name="heatsystem"
                      id={`heat-${hs.label}`}
                      value={hs.label}
                      checked={hs.label === heatSystem}
                      onChange={(e) => {
                        setHeatSystem(hs.label)
                      }}
                    />
                  </div>
                  <InputLabel htmlFor={`heat-${hs.label}`} className='flex-none mt-1.5 cursor-pointer'>
                    {hs.label}
                  </InputLabel>
                </div>
              )
            }
          </div>
        </div>}
        {isEasyDraft ? <div>
          <input name="easyDairyId" type="hidden" defaultValue={loaderData.business?.EasyDairyID ? loaderData.business?.EasyDairyID[0] : `NZ${String(Math.round(Date.now()/1000)).replace(/(\d{3})(\d{5})(\d{2})/, '$1-$2-$3')}`} />
        </div>
        : <>
          <Search onChange={(val) => {
            setQuery(val)
            setCurrPage(1)
          }} placeholder='Search Easy Dairy ID...' />
          <div className="ml-auto">{actionData?.fieldErrors?.['easyDairyId']?.[0] || actionData?.fieldErrors?.['easyDairyIDs']?.[0] ? <span className='text-error-500 text-sm text-right'>Easy Dairy ID is required</span> : ""}</div>
          <table className='table-auto font-opensans w-full text-base lg:text-lg bg-white border text-left'>
            <thead className='font-bold'>
              <tr className='bg-primary-500 text-white border-b [&>th]:py-4 [&>th]:px-5'>
                <th>Easy Dairy ID</th>
                <th>Businesses Attached</th>
                <th>Total Herds</th>
                <th>Enable</th>
                {loaderData.business?.BusinessID && <th>Action</th>}
              </tr>
            </thead>
            <tbody className='text-gray-600'>
              {loaderData.easydairy.map((ld, idx) =>
              <tr key={`row-${idx}`} className={`border-t [&>td]:align-top [&>td]:py-3 [&>td]:px-5 ${((!query || ld.easyDairyId.toLowerCase().includes(query.toLowerCase()))
                && (idx < pageLimit * currPage)
                && (idx >= ((currPage - 1) * pageLimit))) ? '' : 'hidden'}`}>
                <td>{ld.easyDairyId}</td>
                <td>
                  <HoverCard openDelay={100}>
                    <HoverCard.Trigger asChild>
                      <span className="text-primary-500 cursor-pointer">{ld.businesses.length} Business{ld.businesses.length > 1 ? 'es' : ''}</span>
                    </HoverCard.Trigger>
                    <HoverCard.Content className='rounded p-5 overflow-y-auto max-h-[500px]'>
                      <ul className="text-gray-700 space-y-1">
                        {ld.businesses.map((b, i) => <li key={b.id}>
                          <span className="block">{b.name}</span>
                        </li>)}
                      </ul>
                    </HoverCard.Content>
                  </HoverCard>
                </td>
                <td>
                  {ld.herds.length} Herd{ld.herds.length > 1 ? 's' : ''}
                </td>
                <td onClick={() => {
                  setModalContent({
                    open: easyDairyIds.includes(ld.easyDairyId) ? false : true,
                    easyDairyId: easyDairyIds.includes(ld.easyDairyId) ? '' : ld.easyDairyId
                  })}}
                >
                  <SwitchToggle enabled={easyDairyIds.includes(ld.easyDairyId)} setEnabled={() => {
                    setEasyDairyIds(prev => {
                    let copy = [...prev]
                    if (copy.includes(ld.easyDairyId)) {
                      copy.splice(copy.indexOf(ld.easyDairyId), 1)
                    } else {
                      copy.push(ld.easyDairyId)
                    }
                    return copy
                  })
                }} />
                  <input type="hidden" name="easyDairyId" value={ld.easyDairyId} disabled={!easyDairyIds.includes(ld.easyDairyId)} />
                  {Object.entries(herds[ld.easyDairyId]?.visible || {}).map(([hc, v], idx) => <input key={`vh-${idx}`} type="hidden" name="visible" disabled={!easyDairyIds.includes(ld.easyDairyId)} readOnly value={`${hc}::${v}`} />)}
                  {Object.entries(herds[ld.easyDairyId]?.note || {}).map(([hc, n], idx) => <input key={`vc-${idx}`} type="hidden" name="notes" disabled={!easyDairyIds.includes(ld.easyDairyId)} readOnly value={`${hc}::${n}`} />)}
                  {Object.entries(herds[ld.easyDairyId]?.activeUntil || {}).map(([hc, n], idx) => <input key={`vc-${idx}`} type="hidden" name="activeUntil" disabled={!easyDairyIds.includes(ld.easyDairyId)} readOnly value={`${hc}::${n}`} />)}
                </td>
                {loaderData.business?.BusinessID && <td>
                  {easyDairyIds.includes(ld.easyDairyId) &&
                  <HoverCard closeDelay={0} openDelay={0}>
                    <HoverCard.Trigger asChild>
                      <button type="button" aria-label='Manage Herds' className='grid place-items-center text-2xl rounded-full transition outline-none text-grey-600  enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                        onClick={() => {
                          setModalContent({
                            open: true,
                            easyDairyId: ld.easyDairyId
                          })
                        }}
                      >
                        <IoAddCircleOutline />
                      </button>
                    </HoverCard.Trigger>
                    <HoverCard.Content role='tooltip' className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                      Add/Manage Herd
                    </HoverCard.Content>
                  </HoverCard>}
                </td>}
              </tr>)}
            </tbody>
          </table>
          <Pagination
            className='ml-auto mt-3 border border-gray-100 rounded'
            currentPage={currPage}
            pageSize={pageLimit}
            totalCount={loaderData.easydairy.length}
            onPageChange={setCurrPage}
          />
        </>}
        {herdSeen.map((hs, isx) => <input type="hidden" key={`hs-${isx}`} name={hs.key} value={hs.val} />)}
        <Button type='submit' className='w-max ml-auto mt-3 px-6'>
          {loaderData.business?.BusinessID ? 'Save' : 'Add'}
        </Button>
      </Form>
      <ModalBox isOpen={modalContent.open} classes="w-full max-w-3xl h-2/3" onClose={() => {setModalContent((prev) => ({...prev, open: false}))
      if ((tempH && tempH[modalContent.easyDairyId] && Object.keys(tempH[modalContent.easyDairyId].visible).filter(key => tempH[modalContent.easyDairyId].visible[key] === true).length <= 0)) {
        setEasyDairyIds(prev => {
          let copy = [...prev]
          if (copy.includes(modalContent.easyDairyId)) {
            copy.splice(copy.indexOf(modalContent.easyDairyId), 1)
          }
          return copy
        })
      }
      }} title="Manage Herds">
        {modalContent.easyDairyId &&
          <BusinessHerdsComp
            prevVisibility={herds[modalContent.easyDairyId].visible}
            prevNotes={herds[modalContent.easyDairyId].note}
            prevActiveUntil={herds[modalContent.easyDairyId].activeUntil}
            loadVisible={handleLoadedHerds}
            onChange={({visible, notes, activeUntilList, seenIn}) => {

              setHerds((prevState) => {
                let extra: HerdType = {}
                Object.keys(seenIn).forEach((herdUuid) => {
                  seenIn[herdUuid].seenIn.forEach((si) => {
                    extra[si] = {...prevState[si], visible: {...prevState[si].visible, [herdUuid]: false}}
                  })
                })
                return {
                  ...prevState,
                  ...extra,
                  [modalContent.easyDairyId]: {visible: visible, note: notes, activeUntil: activeUntilList}
                }
              })
              setEasyDairyIds(prev => {
                let copy = [...prev]

                // Check if current modal's EasyDairy ID should be disabled
                if ((Object.keys(visible).filter(key => visible[key] === true).length <= 0)) {
                  if (copy.includes(modalContent.easyDairyId)) {
                    copy.splice(copy.indexOf(modalContent.easyDairyId), 1)
                  }
                } else {
                  if (!copy.includes(modalContent.easyDairyId)) {
                    copy.push(modalContent.easyDairyId)
                  }
                  setModalContent((prev) => ({...prev, open: false}))
                }

                // Auto-disable EasyDairy IDs that have no visible herds after herd switches
                if (seenIn && Object.keys(seenIn).length > 0) {
                  setHerds((currentHerds) => {
                    // Check each EasyDairy ID that lost herds
                    const easyDairyIdsToCheck = new Set<string>()
                    Object.keys(seenIn).forEach((herdUuid) => {
                      seenIn[herdUuid].seenIn.forEach((easyDairyId) => {
                        easyDairyIdsToCheck.add(easyDairyId)
                      })
                    })

                    easyDairyIdsToCheck.forEach((easyDairyIdToCheck) => {
                      if (currentHerds[easyDairyIdToCheck]) {
                        const visibleHerds = Object.keys(currentHerds[easyDairyIdToCheck].visible).filter(
                          herdUuid => currentHerds[easyDairyIdToCheck].visible[herdUuid] === true
                        )

                        // If this EasyDairy ID has no visible herds, remove it from selected list
                        if (visibleHerds.length === 0 && copy.includes(easyDairyIdToCheck)) {
                          copy.splice(copy.indexOf(easyDairyIdToCheck), 1)
                        }
                      }
                    })

                    return currentHerds
                  })
                }

                return copy
              })
              if (seenIn && Object.keys(seenIn).length > 0) {
                setHerdSeen(Object.keys(seenIn).map((si) => ({key: 'seenIn', val: `${si}::${seenIn[si].easyDairyId}::${seenIn[si].seenIn.join(',')}`})))
              }
            }}
            easyDairyId={modalContent.easyDairyId}
            businessId={loaderData.business?.BusinessID ?? '0'} />}
      </ModalBox>
    </>
  );
}

export default function RegisterBusinessPage() {
  return <RegisterBusiness key={`addBusiness`} />
}
