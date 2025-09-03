import { ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, useActionData, useFetcher, useLoaderData, useRouteError, useSubmit } from '@remix-run/react';
import moment from 'moment';
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { BsArrowUpLeftCircle, BsArrowUpLeftCircleFill, BsArrowUpRightCircle, BsArrowUpRightCircleFill, BsExclamationTriangle } from 'react-icons/bs';
import { FaTrash } from 'react-icons/fa';
import { FiXCircle } from 'react-icons/fi';
import TableWidget from '~/components/TableWidget';
import Accordion, { type AccordionRef } from '~/components/ui/Accordion';
import Button from '~/components/ui/Button';
import DialogModal, { ColorPresetKeys, DialogProps, ModalBox } from '~/components/ui/Dialog';

import ErrorMessage from '~/components/ui/ErrorMessage';
import Input from '~/components/ui/Input';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';

type DraftType = {animalId: string, name: string, rfid: string, direction: number, reason: string, draftDate: string, draftedDate?: string, draftSession: string}

const gates = ['Left', 'Center', 'Right']

export function shouldRevalidate() {
    return false
}

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { userData, accessToken, isApp } = await getUserAccessToken(request, true);
    const edId = userData.EasyDairyID[0]
    const currSession = await callAPI<GenericAPI>(request, `/api/draft/session/${edId}`, undefined, 'GET', accessToken)
    
    return json({
        gates,
        gateOnline: currSession.success && currSession.response.gateOnline,
        listenerUrl: `${process.env.BASE_URL}/api/notifications/draft/web/${edId}?token=${accessToken}`,
        heatType: userData.HeatSystem,
        edId: edId,
        isApp: isApp
    })
}

export async function action({params, request}: ActionFunctionArgs) {
    //animals: {animalUuid: string, direction: number, reason: string}[], session: number, easyDairyId: string
    const { userData, accessToken } = await getUserAccessToken(request, true);
    
    const data = await request.formData()
    let direction = Number(data.get('direction'))
    const postData = {
        animalid: data.get('animalid'),
        direction: direction > 2 ? (direction - 3) : direction,
        reason: String(data.get('reason') ?? ''),
        session: String(direction > 2 ? 'next' : String(data.get('session') ?? 'current')),
        rfid: String(data.get('rfid')),
        name: String(data.get('name'))
    }

    const resp = await callAPI<GenericAPI>(request, `/api/draft/animal/${userData.EasyDairyID[0]}`, {
        animals: [postData]
    }, 'POST', accessToken)
    return json({...postData, success: resp.response.errors ? false : true})
}

export default function DashboardDrafts() {
    const data = useLoaderData<typeof loader>()
    const [gateStatus, setGateStatus] = useState(!!data.gateOnline)
    const [heatRefresh, setHeatRefresh] = useState(1)
    const [draftRefresh, setDraftRefresh] = useState({drafted: 1, toDraft: 1, nextDraft: 1, cows: 1})
    const [draftTotals, setDraftTotals] = useState<Record<string, string | number>>({drafted: 'loading...', toDraft: 'loading...', nextDraft: 'loading...', cows: 'loading...', heat: 'loading...'})
    const formRef = useRef<HTMLFormElement>(null)
    const [modalContent, setModalContent] = useState({open: false, animalId: '0', reason: '', direction: 1, rfid: '', name: '', draftSession: ''})
    const [dialogData, setDialogData] = useState<DialogProps>({isOpen: false, title: '', icon: 'tick', color: 'primary' as ColorPresetKeys, message: '', buttons: [{text: 'OK', onClick: () => setDialogData(prev => ({...prev, isOpen: false}))}]})
    const actionData = useActionData<{success: boolean, direction: number, reason: string, animalid: string, rfid: string, name: string, session: string}>()

    const [expandedList, setExpandedList] = useState<string[]>([]);

    const submit = useSubmit()

    const deleteRowDraft = useCallback((session: string) => (row: {animalId: string, rfid: string, name: string, reason: string, draftSession: string}) => {
        setDialogData({
            isOpen: true,
            title: `Delete Draft`,
            icon: 'warn',
            color: 'warn',
            message: `Deleting draft for Animal ${row.animalId}${row.name ? ` (${row.name})` : ''}. Are you sure you want to continue?`,
            buttons: [
                {text: 'Continue', onClick: () => {
                    const fData = new FormData()
                    fData.append('direction', '1')
                    fData.append('animalid', String(row.animalId))
                    fData.append('session', session)
                    submit(fData, {
                        method: 'POST',
                        encType: 'application/x-www-form-urlencoded'
                    })
                    setDialogData!(prev => ({...prev, isOpen: false}))
                }},
                {text: 'Cancel', variant: 'outline', onClick: () => {
                    setDialogData!(prev => ({...prev, isOpen: false}))
                }}
            ]
        })
        
    }, [])

    const setRowDraft = useCallback((session: string) => (row: {animalId: string, reason: string, direction?: string, rfid: string, name: string}) => {
        setModalContent({open: true, animalId: row.animalId, reason: row.reason, direction: Number(row.direction ?? -1), rfid: row.rfid, name: row.name, draftSession: session})
    }, [])

    const toggleExpanded = useCallback((item: string) => {
        setExpandedList((p) => {
        if (!p.includes(item)) {
            return p.concat(item);
        }
        return p.filter((x) => x != item);
        });
    }, []);

    const accordionRefs = useRef<Record<string, AccordionRef | null>>({});
    const accordionRecalculateHeight = (name: string) => {
        accordionRefs.current[name]?.recalcHeight();
    };
    const eventListener = useRef<EventSource>()
    const eventListenerFunc = useCallback((evt: {data: string}) => {
        const evtData = JSON.parse(evt.data)
        switch (evtData.type) {
            case "gateOnline":
                setGateStatus(true)
                break;
            case "gateOffline":
                setGateStatus(false)
                break;
            case "drafted":
                setDraftRefresh(prev => ({...prev, drafted: prev.drafted+1, toDraft: prev.toDraft+1, cows: prev.cows+1}))
                break;
            case "addDraft":
                setDraftRefresh(prev => ({...prev, toDraft: prev.toDraft+1, cows: prev.cows+1, nextDraft: prev.nextDraft+1}))
                break;
            case "heat":
                setHeatRefresh(prev => prev + 1)
                break;
            case "newSession":
                setDialogData({
                    isOpen: true,
                    title: 'Session has expired',
                    icon: 'warn',
                    color: 'warn',
                    message: 'A new session has started. Please refresh to continue',
                    buttons: [{
                        text: 'Refresh',
                        onClick: () => {
                            window.location.reload()
                        }
                    }]
                })
                break;
        }
    }, [])

    useEffect(() => {
        if (!eventListener.current) {
            eventListener.current = new EventSource(data.listenerUrl, {withCredentials: true})
            eventListener.current.addEventListener('notification', eventListenerFunc)
        }
        return () => {
            if (eventListener.current) {
                eventListener.current.removeEventListener('notification', eventListenerFunc)
                delete eventListener.current
            }
        }
    }, [data.listenerUrl, eventListenerFunc])
    useEffect(() => {
        if (actionData?.success) {
            setModalContent({open: false, animalId: '0', reason: '', direction: 1, rfid: '', name: '', draftSession: ''})
        } else if (actionData?.success == false) {
            setDialogData(prev => ({isOpen: true, title: 'Sync Error', icon: 'error', color: 'error', message: 'Failed to sync draft', buttons: prev.buttons}))
        }
    }, [actionData])

  return (
    <section className="px-4 mt-10 pb-5">
        <div className='flex md:flex-row-reverse mb-10 gap-5 px-2 flex-col'>
            <div className="flex gap-6 ml-auto">
                {expandedList.length > 0 && <button
                    type='button'
                    onClick={() => {
                    setExpandedList([]);
                    }}
                    className='text-primary-500 underline gap-1 flex items-center font-bold ml-auto'
                >
                    Close All Tabs
                </button>}
                {expandedList.length < 3 && <button
                    type='button'
                    onClick={() => {
                    setExpandedList(['Drafted','To Draft','Heats','Cows','Next Session']);
                    }}
                    className='text-primary-500 underline gap-1 items-center font-bold '
                >
                    Open All Tabs
                </button>}
            </div>
            <div className="flex gap-3 items-center">
                <h1 className="text-3xl">Draft Session</h1>
                <label className={`rounded-lg text-xs text-white px-2 py-0.5 uppercase font-semibold ${gateStatus ? 'bg-green-500' : 'bg-slate-500'}`}>Gate {gateStatus ? 'Online' : 'Offline'}</label>
            </div>
        </div>
        <Accordion
          title={`Drafted (${draftTotals.drafted})`}
          expanded={expandedList.includes('Drafted')}
          setExpand={() => {
            toggleExpanded('Drafted');
          }}
          ref={(el) => (accordionRefs.current['Drafted'] = el)}
        >
            <TableWidget
                key={`drafted-${draftRefresh.drafted}`}
                type={`drafted`}
                isApp={data.isApp}
                hideColumnSettings={true}
                onTotalChange={(total: number) => setDraftTotals(prev => ({...prev, drafted: total}))}
                addParams={{ easyDairyId: data.edId, draftSession: "current" }}
                refreshOuter={() => accordionRecalculateHeight('Drafted')}
                print={false}
            />
            {/* <DraftTable drafts={toDraft.filter(td => !!td.draftedDate)} hasRfid={false} hasCenter={true} type="Drafted" gateOnline={gateStatus} recalcHeight={accordionRecalculateHeight} /> */}
        </Accordion>
        <Accordion
          title={`Current Drafts (${draftTotals.toDraft})`}
          expanded={expandedList.includes('To Draft')}
          setExpand={() => {
            toggleExpanded('To Draft');
          }}
          ref={(el) => (accordionRefs.current['To Draft'] = el)}
        >
            <>
                {!gateStatus && <div className="mt-2">
                    <span className="text-red-500 flex items-center gap-2"><BsExclamationTriangle className="text-red-500" /> Data cannot be synced until the gate is online</span>
                </div>}
                <TableWidget
                    key={`currentDraft-${draftRefresh.toDraft}`}
                    type={`currentDraft`}
                    isApp={data.isApp}
                    actions={[{
                        label: 'Draft',
                        type: 'edit',
                        filter: (row: any) => gateStatus,
                        func: setRowDraft("current")
                    }, {
                        label: 'Delete',
                        type: 'delete',
                        filter: (row: any) => {
                            return gateStatus
                        },
                        func: deleteRowDraft("current")
                    }]}
                    onTotalChange={(total: number) => setDraftTotals(prev => ({...prev, toDraft: total}))}
                    hideColumnSettings={true}
                    addParams={{ easyDairyId: data.edId, draftSession: "current" }}
                    refreshOuter={() => accordionRecalculateHeight('To Draft')}
                    print={false}
                />
                {/* <DraftTable drafts={toDraft.filter(td => td.direction !== 1 && !td.draftedDate)} hasRfid={false} hasCenter={false} type="To Draft" deleteDraft={deleteDraft} setDialogData={setDialogData} setModalContent={setModalContent} gateOnline={gateStatus} recalcHeight={accordionRecalculateHeight} /> */}
            </>
        </Accordion>
        <Accordion
          title={`Cows (${draftTotals.cows})`}
          expanded={expandedList.includes('Cows')}
          setExpand={() => {
            toggleExpanded('Cows');
          }}
          ref={(el) => (accordionRefs.current['Cows'] = el)}
        >
            <>
                {!gateStatus && <div className="mt-2">
                    <span className="text-red-500 flex items-center gap-2"><BsExclamationTriangle className="text-red-500" /> Data cannot be synced until the gate is online</span>
                </div>}
                <TableWidget
                    key={`draftCows-${draftRefresh.cows}`}
                    type={`draftCows`}
                    isApp={data.isApp}
                    actions={[{
                        label: 'Draft',
                        type: 'edit',
                        filter: (row: any) => gateStatus,
                        func: setRowDraft("current")
                    }]}
                    onTotalChange={(total: number) => setDraftTotals(prev => ({...prev, cows: total}))}
                    hideColumnSettings={true}
                    addParams={{ easyDairyId: data.edId, draftSession: "current" }}
                    refreshOuter={() => accordionRecalculateHeight('Cows')}
                    print={false}
                />
                {/* <DraftTable drafts={toDraft.filter(td => !td.draftedDate)} hasRfid={true} type="Cows" hasCenter={true} setDialogData={setDialogData} setModalContent={setModalContent} gateOnline={gateStatus} recalcHeight={accordionRecalculateHeight} /> */}
            </>
        </Accordion>
        <Accordion
          title={`Next Session Drafts (${draftTotals.nextDraft})`}
          expanded={expandedList.includes('Next Session')}
          setExpand={() => {
            toggleExpanded('Next Session');
          }}
          ref={(el) => (accordionRefs.current['Next Session'] = el)}
        >
            <>
                {!gateStatus && <div className="mt-2">
                    <span className="text-red-500 flex items-center gap-2"><BsExclamationTriangle className="text-red-500" /> Data cannot be synced until the gate is online</span>
                </div>}
                <TableWidget
                    key={`nextDraft-${draftRefresh.nextDraft}`}
                    type={`nextDraft`}
                    isApp={data.isApp}
                    actions={[{
                        label: 'Draft',
                        type: 'edit',
                        filter: (row: any) => gateStatus,
                        func: setRowDraft("next")
                    }, {
                        label: 'Delete',
                        type: 'delete',
                        filter: (row: any) => {
                            return gateStatus
                        },
                        func: deleteRowDraft("next")
                    }]}
                    onTotalChange={(total: number) => setDraftTotals(prev => ({...prev, nextDraft: total}))}
                    hideColumnSettings={true}
                    addParams={{ easyDairyId: data.edId, draftSession: "next" }}
                    refreshOuter={() => accordionRecalculateHeight('Next Session')}
                    print={false}
                />
                {/* <DraftTable drafts={nextDraft.filter(td => td.direction !== 1)} hasRfid={false} hasCenter={false} type="Next Session" deleteDraft={deleteDraft} setDialogData={setDialogData} setModalContent={setModalContent} gateOnline={gateStatus} recalcHeight={accordionRecalculateHeight} /> */}
            </>
        </Accordion>
        <Accordion
          title={`Heats (${draftTotals.heat})`}
          expanded={expandedList.includes('Heats')}
          setExpand={() => {
            toggleExpanded('Heats');
          }}
          ref={(el) => (accordionRefs.current['Heats'] = el)}
        >
            <TableWidget
                key={`heats-${heatRefresh}`}
                type={`heat-${data.heatType}`}
                onTotalChange={(total: number) => setDraftTotals(prev => ({...prev, heat: total}))}
                isApp={data.isApp}
                addParams={{ easyDairyId: data.edId }}
                refreshOuter={() => accordionRecalculateHeight('Heats')}
                print={false}
            />
        </Accordion>
        <ModalBox isOpen={modalContent.open} classes="w-full max-w-3xl" onClose={() => setModalContent((prev) => ({...prev, open: false}))} title={`Set Draft for #${modalContent.animalId}`}>
          <Form ref={formRef} className="flex flex-col gap-8 items-start" method="POST">
            <div className="flex flex-col gap-2 items-start w-full">
                <label className="block leading-6 font-bold text-sm md:text-base text-black">Direction</label>
                <div className="grid grid-cols-3 gap-2 w-full">
                    <div>
                        <input id="leftGate" type="radio" name="direction" value="0" className="hidden peer" defaultChecked={modalContent.direction === 0} />
                        <Button type="button" variant="outline" className="w-full peer-checked:bg-primary-500 peer-checked:text-white p-0">
                            <label htmlFor="leftGate" className="flex items-center gap-1 justify-center cursor-pointer p-2"><BsArrowUpLeftCircle className="text-green-500 text-lg" /> Left</label>
                        </Button>
                    </div>
                    <div>
                        <input id="rightGate" type="radio" name="direction" value="2" className="hidden peer" defaultChecked={modalContent.direction === 2} />
                        <Button type="button" variant="outline" className="w-full peer-checked:bg-primary-500 peer-checked:text-white p-0">
                            <label htmlFor="rightGate" className="flex items-center gap-1 justify-center cursor-pointer p-2">Right <BsArrowUpRightCircle className="text-green-500 text-lg" /></label>
                        </Button>
                    </div>
                    <div>
                        <input id="centerGate" type="radio" name="direction" value="1" className="hidden peer" defaultChecked={modalContent.direction === 1} />
                        <Button type="button" variant="outline" className="w-full peer-checked:bg-primary-500 peer-checked:text-white p-0">
                            <label htmlFor="centerGate" className="flex items-center gap-1 justify-center cursor-pointer p-2"><FiXCircle className="text-red-500 text-lg" /> None</label>
                        </Button>
                    </div>
                </div>
                {modalContent.draftSession !== 'next' && <div className="grid grid-cols-2 gap-2 w-full">
                    <div>
                        <input id="leftGateN" type="radio" name="direction" value="3" className="hidden peer" defaultChecked={modalContent.direction === 3} />
                        <Button type="button" variant="outline" className="w-full peer-checked:bg-primary-500 peer-checked:text-white p-0">
                            <label htmlFor="leftGateN" className="flex items-center gap-1 justify-center cursor-pointer p-2"><BsArrowUpLeftCircleFill className="text-green-500 text-lg" /> Next Draft Left</label>
                        </Button>
                    </div>
                    <div>
                        <input id="rightGateN" type="radio" name="direction" value="5" className="hidden peer" defaultChecked={modalContent.direction === 5} />
                        <Button type="button" variant="outline" className="w-full peer-checked:bg-primary-500 peer-checked:text-white p-0">
                            <label htmlFor="rightGateN" className="flex items-center gap-1 justify-center cursor-pointer p-2">Next Draft Right <BsArrowUpRightCircleFill className="text-green-500 text-lg" /></label>
                        </Button>
                    </div>
                </div>}
            </div>
            <Input label="Reason" name="reason" parentClass="flex flex-col items-start" defaultValue={modalContent.reason} />
            <input type="hidden" name="animalid" value={modalContent.animalId} />
            <input type="hidden" name="rfid" value={modalContent.rfid} />
            <input type="hidden" name="name" value={modalContent.name} />
            <input type="hidden" name="session" value={modalContent.draftSession} />
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button type="button" variant="outline" className="" onClick={() => setModalContent({open: false, animalId: '0', reason: '', direction: 1, rfid: '', name: '', draftSession: ''})}>Cancel</Button>
                <Button type="submit" className="">Save</Button>
            </div>
          </Form>
        </ModalBox>
        <DialogModal {...dialogData} />
    </section>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}

