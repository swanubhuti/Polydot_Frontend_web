import { type LoaderFunctionArgs, json, type ActionFunctionArgs } from '@remix-run/node';
import { useFetcher, useLoaderData, useRouteError } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';
import { FaPauseCircle, FaPlayCircle, FaSave, FaTimes } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import { FaTrash } from 'react-icons/fa6';
import Button from '~/components/ui/Button';
import SelectDropdown from '~/components/ui/Dropdown';

import ErrorMessage from '~/components/ui/ErrorMessage';
import Input from '~/components/ui/Input';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { getVisibleHerdsFilter } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';
import DialogModal, { DialogProps } from '~/components/ui/Dialog';

function convertSchedule(schedule: string) {
    const tz = new Date().getTimezoneOffset()/60 * -1
    const matches = schedule.match(/(\S+)\s(\S+)\s(\S+)\s(\S+)\s(\S+)/)
    if (!matches) {
        return {trigger: '*', time: '0', timeSection: 'AM'}
    }
    let hour = Number(matches[2]) + tz
    if (hour >= 24) {
        hour -= 24
    }
    let time = String(hour)
    let timeSection = hour > 12 ? 'PM' : 'AM'
    if (hour > 12) {
        time = String(hour - 12)
    } else if (hour === 0) {
        time = '12'
    }
    return {
        trigger: matches[5],
        time: String(time),
        timeSection
    }
}

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { userData } = await getUserAccessToken(request, true);
    const apiResult = await callAPI<GenericAPI>(request, `/api/admin/users?limit=9999&businessId=${userData.BusinessID}&status=active`, undefined, 'GET');
    const herdFilter = getVisibleHerdsFilter(userData as any)
    const herdCall = await callAPI<GraphQLReturn>(
        request,
        '/api/graphql',
        {
          query: `{
            herds ${herdFilter ? `(${herdFilter})` : ''}
            {
                nodes {
                    herdUuid
                    herdCode
                }
            }
          }`
        }
    )
    let herdConvert: {[key: string]: string} = {}
    let herdArray: {label: string, value: string}[] = []
    if (herdCall.success && !('errors' in herdCall.response)) {
        herdCall.response.data.herds.nodes.forEach((n) => {
            herdConvert[n.herdUuid] = n.herdCode
            herdArray.push({label: n.herdCode, value: n.herdUuid})
        })
    }
    let userList: {Email: string, UserID: string, Herds: string[]}[] = [{
        Email: userData.Email,
        UserID: userData.UserID,
        Herds: herdArray.map(ha => ha.value)
    }]
    if (apiResult.success && apiResult.response.data) {
        userList = userList.concat(apiResult.response.data.filter(ul => !!ul.Email && ul.UserID !== userData.UserID))
    }
    // console.log(userList)
    const alertResult = await callAPI<GenericAPI>(request, `/api/alert`, undefined, 'GET');
    if (alertResult.success && alertResult.response.data) {
        const alerts: {
            id: string,
            status: string,
            name: string,
            group: string,
            userId: string,
            herd: string,
            email: string,
            schedule: string
        }[] = alertResult.response.data.map((ar: {[key: string]: string}) => {
            return {
                id: ar.AlertUUID,
                status: ar.Status,
                name: ar.Name,
                group: ar.GroupName,
                userId: ar.UserID,
                herd: ar.Herd,
                email: userList.find(ul => ul.UserID === ar.UserID)?.Email ?? '',
                schedule: ar.Schedule
            }
        })
        return json({
            alerts,
            herdConvert,
            userList,
            herdArray
        })
    }
    return json({
        alerts: [],
        herdConvert,
        userList,
        herdArray
    })
}

export async function action({request}: ActionFunctionArgs) {
    const { userData } = await getUserAccessToken(request, true);
    const formData = await request.formData()
    const alertId = formData.get('alertId') as string
    const status = formData.get("status") as string
    if (request.method === 'DELETE') {
        const res = await callAPI<GenericAPI>(request, `/api/alert/${alertId}`, undefined, 'DELETE')
        //delete
        return json({success: res.success, id: alertId, type: 'delete', message: `${res.success ? 'Successfully' : 'Failed to'} deleted alert`})
    }
    const trigger = formData.get('trigger') as string
    const group = formData.get('group') as string
    const userId = formData.get('userId') as string
    const herd = formData.get('herd') as string
    const time = formData.get('time') as string
    const timezone = formData.get('timezone') as string
    const timeSect = formData.get('timeSection') as string

    let hour = Number(time)
    if (timeSect === 'PM') {
        hour += 12
    }
    hour += Number(timezone)
    if (hour >= 24) {
        hour -= 24
    } else if (hour < 0) {
        hour += 24
    }
    const schedule = `0 ${hour} * * ${trigger}`
    const { response, success } = await callAPI<GraphQLReturn>(
        request,
        '/api/graphql',
        {
          query: `{
            groups (
                condition: {
                    groupName: "${group}"
                    herdUuid: "${herd}"
                }
            ) 
            {
                nodes {
                    groupName
                    groupUuid
                    herdUuid
                    groupSql
                }
            }
          }`
        }
    )
    if (!success || 'errors' in response) {
        return json({success: false, message: 'Invalid group', id: alertId, type: 'fail'})
    }
    let alertSQL = response.data.groups.nodes[0].groupSql
    let alertData: {[key: string]: any} = {
        name: formData.get('name') as string,
        alertSQL,
        herd,
        schedule,
        userId
    }
    let returnType = 'add'
    if (alertId) {
        alertData['status'] = status
        if (request.method === 'PUT') {
            //pause
            if (status === 'Active') {
                alertData['status'] = 'Inactive'
                returnType = 'pause'
            } else {
                alertData['status'] = 'Active'
                returnType = 'unpause'
            }
        } else {
            returnType = 'edit'
        }
    }
    const res = await callAPI<GenericAPI>(request, `/api/alert${alertId ? `/${alertId}` : ''}`, alertData, alertId ? 'PUT' : 'POST')
    if (res.success) {
        return json({success: true, id: alertId || res.response.id, type: returnType, message: 'Successfully added/edited alert'})
    }
    return json({success: false, id: alertId, type: returnType, message: 'Failed to add/edit alert'})
}

const intervals = [
    {label: 'Day', value: '*'},
    {label: 'Monday', value: '1'},
    {label: 'Tuesday', value: '2'},
    {label: 'Wednesday', value: '3'},
    {label: 'Thursday', value: '4'},
    {label: 'Friday', value: '5'},
    {label: 'Saturday', value: '6'},
    {label: 'Sunday', value: '0'},
]
const groupList = [
    {label: 'Not Joined 60 Days', value: 'Not Joined 60 Days'}, 
    {label: 'Empty 100 Days', value: 'Empty 100 Days'},
    {label: 'Not Cycling', value: 'Not Cycling'}
]
const timeSection = [
    {label: "AM", value: "AM"},
    {label: "PM", value: "PM"}
]
const timeValues = Array(12).fill('').map((a, i) => ({label: `${i + 1}`, value: `${i + 1}`}))

export default function DashboardAlertsList() {
    const data = useLoaderData<typeof loader>()
    const [alertList, setAlertList] = useState(data.alerts.map((al) => {
        const {schedule, ...rest} = al
        return {...rest, ...convertSchedule(al.schedule)}
    }))
    const [editAlert, setEditAlert] = useState({
        index: -2,
        id: '',
        name: '',
        trigger: '*',
        time: '12',
        timeSection: 'AM',
        status: 'Active',
        group: 'Not joined 60 days',
        email: '',
        userId: '',
        herd: ''
    })
    const [dialogData, setDialogData] = useState<DialogProps>({
        isOpen: false, 
    })
    const emailList = useMemo(() => {
        let userHerdList: {[key: string]: {label: string, value: string}[]} = {}
        data.herdArray.forEach((ha) => {
            userHerdList[ha.value] = data.userList.filter(u => u.Herds?.includes(ha.value))?.map((ul) => ({
                label: ul.Email,
                value: ul.UserID
            }))
        })
        return userHerdList
    }, [data.herdArray, data.userList])
    const tzOffset = new Date().getTimezoneOffset()/60
    const fetcher = useFetcher<typeof action>()
    useEffect(() => {
        if (fetcher.state === 'submitting') {
            return
        }
        if (fetcher?.data?.success && fetcher.formData) {
            setAlertList(prev => {
                const idx = fetcher?.data?.type === 'add' ? prev.length - 1 : prev.findIndex(a => a.id === (fetcher?.data?.id))
                let copy = [...prev]
                if (fetcher?.data?.type === 'pause' || fetcher?.data?.type === 'unpause') {
                    copy[idx].status = fetcher?.data?.type === 'pause' ? 'Inactive' : 'Active'
                } else if (fetcher?.data?.type === 'delete') {
                    copy.splice(idx, 1)
                } else if (fetcher.formData) {
                    const formData = Object.fromEntries(fetcher.formData)
                    copy[idx] = {...copy[idx], ...formData,  id: fetcher.data?.id as string}
                    setEditAlert((prev) => ({...prev, index: -1}))
                }
                return copy
            })
        } else if (fetcher?.data?.success === false) {
            setDialogData(prev => ({
                isOpen: true, 
                title: 'Error', 
                icon: 'error', 
                color: 'error',
                message: fetcher?.data?.message,
                buttons: [{text: 'Close', onClick: () => setDialogData(prev => ({...prev, isOpen: false}))}]
            }))
        }
    }, [fetcher.data, fetcher.formData, fetcher.state])
    return (
        <div className="px-4">
            <div className="flex justify-end">
                <Button type="button" onClick={() => {
                    if (!editAlert.id && editAlert.index === 0) {
                        //already have one active, dismiss
                        return;
                    }
                    const newAlert = {
                        id: '',
                        name: '',
                        trigger: intervals[0].value,
                        time: '12',
                        timeSection: 'AM',
                        status: 'Active',
                        group: groupList[0].value,
                        email: '',
                        herd: '',
                        userId: ''
                    }
                    setAlertList(prev => ([...prev, newAlert]))
                    setEditAlert({
                        index: alertList.length,
                        ...newAlert
                    })
                }} variant="primary">Add Alert</Button>
            </div>
            <div className="mt-2 relative h-[450px] overflow-auto pb-10">
                <table className="w-full text-left">
                    <thead className="bg-primary-500 text-white z-30">
                        <tr className="[&>th]:p-3 [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
                            <th>Alert Name</th>
                            <th>Trigger Every</th>
                            <th>When</th>
                            <th>Herd</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody className="[&>tr:nth-child(even)]:bg-gray-100">
                        {alertList.map((a, i) => 
                            <tr key={`cows-${i}`} className={`[&>td]:px-3 [&>td]:py-2 [&>td]:align-top relative`}>
                                <td>
                                    {editAlert.index === i ? <Input form={`alert-${i}`} required value={editAlert.name} onChange={(e) => setEditAlert(prev => ({...prev, name: e.target.value}))} /> : a.name}
                                </td>
                                <td>
                                    {editAlert.index === i 
                                    ? <div>
                                        <SelectDropdown type="single" value={editAlert.trigger} options={intervals} onSelectChange={(opt) => setEditAlert(prev => ({...prev, trigger: opt.value}))} />
                                        <div className="flex gap-1 items-center mt-1">
                                            <span>at</span>
                                            <SelectDropdown type="single" noMinWidth={true} value={editAlert.time} options={timeValues} onSelectChange={(opt) => setEditAlert(prev => ({...prev, time: opt.value}))} />
                                            <SelectDropdown type="single" noMinWidth={true} value={editAlert.timeSection} options={timeSection} onSelectChange={(opt) => setEditAlert(prev => ({...prev, timeSection: opt.value}))} />
                                        </div>
                                    </div>
                                    : <>{intervals.find(i => i.value === a.trigger)?.label} at {a.time}{a.timeSection}</>}
                                </td>
                                <td>{editAlert.index === i 
                                    ? <div className="flex gap-1 items-center">
                                        <SelectDropdown type="single" value={editAlert.group} options={groupList} onSelectChange={(opt) => setEditAlert(prev => ({...prev, group: opt.value}))} />
                                    </div>
                                    : <>{a.group}</>}
                                </td>
                                <td>
                                    {editAlert.index === i 
                                    ? <div className="flex flex-col gap-1">
                                        <SelectDropdown type="single" value={editAlert.herd} options={data.herdArray} onSelectChange={(opt) => setEditAlert(prev => ({...prev, herd: opt.value}))} />
                                        {editAlert.herd && <div className="flex items-center gap-2">
                                            <span>Notify:</span>
                                            <SelectDropdown type="single" value={editAlert.userId} options={emailList[editAlert.herd]} onSelectChange={(opt) => setEditAlert(prev => ({...prev, email: opt.label, userId: opt.value}))} />
                                        </div>}
                                        {/* <SelectDropdown type="single" value={editAlert.email} options={emailList} onSelectChange={(opt) => setEditAlert(prev => {
                                            return ({...prev, email: opt.label, userIds: opt.value})
                                        })} />
                                        {editAlert.email && <div className="flex gap-2">
                                            <span>On Herd:</span>
                                            <SelectDropdown type="single" value={editAlert.herd} options={data.userList.find(u => u.UserID === editAlert.userId)?.HerdUUID.map((h) => ({
                                                label: data.herdConvert[h],
                                                value: h
                                            })) ?? []} onSelectChange={(opt) => setEditAlert(prev => {
                                                return prev
                                            })} />
                                        </div>} */}
                                        {/* <Input form={`alert-${i}`} type="email" required value={ei} onChange={(e) => setEditAlert(prev => {
                                            let newEmail = [...prev.email]
                                            newEmail[ix] = e.target.value
                                            return ({...prev, email: newEmail})
                                        })} /> 
                                        <button type="button" className="bg-red-500 px-2.5 text-white" onClick={() => {
                                            setEditAlert(prev => {
                                                let newEmail = [...prev.email]
                                                let newUserId = [...prev.userIds]
                                                newEmail.splice(ix, 1)
                                                newUserId.splice(ix, 1)
                                                return ({...prev, email: newEmail, userIds: newUserId})
                                            })
                                        }}><FaTimes /></button>*/}
                                    </div>
                                    : <div className="whitespace-pre-line">{data.herdConvert[a.herd]}<br/>Notify: {a.email}</div>}
                                </td>
                                <td>
                                    {editAlert.index === i ? <fetcher.Form id={`alert-${i}`} method="POST" className="flex gap-1 items-center">
                                        <input type="hidden" name="name" value={editAlert.name} />
                                        <input type="hidden" name="trigger" value={editAlert.trigger} />
                                        <input type="hidden" name="time" value={editAlert.time} />
                                        <input type="hidden" name="timeSection" value={editAlert.timeSection} />
                                        <input type="hidden" name="group" value={editAlert.group} />
                                        <input type="hidden" name="alertId" value={editAlert.id} />
                                        <input type="hidden" name="herd" value={editAlert.herd} />
                                        <input type="hidden" name="status" value={a.status} />
                                        <input type="hidden" name="userId" value={editAlert.userId} />
                                        <input type="hidden" name="email" value={editAlert.email} />
                                        <input type="hidden" name="timezone" value={tzOffset} />
                                        <Button variant="transparent" shape="pill" size="icon" type="submit" className="text-gray-500"><FaSave className="w-6 h-6" /></Button>
                                        <Button variant="transparent" shape="pill" size="icon" type="button" className="text-gray-500" onClick={() => {
                                            setEditAlert({...editAlert, index: -1})
                                            if (!editAlert.id) {
                                                let copy = [...alertList]
                                                copy.shift()
                                                setAlertList(copy)
                                            }
                                        }}><FaTimes className="w-6 h-6" /></Button>
                                    </fetcher.Form> 
                                    : <div className="flex gap-1 items-center">
                                        <Button size="icon" shape="pill" variant="transparent" type="button"  className="text-gray-500" onClick={() => {
                                            if (!alertList[0].id) {
                                                setAlertList(prev => {
                                                    let copy = [...prev]
                                                    copy.shift()
                                                    return copy
                                                })
                                            }
                                            setTimeout(() => {
                                                setEditAlert({
                                                    index: i - (!alertList[0].id ? 1 : 0),
                                                    ...a
                                                })
                                            }, 10)
                                        }}><MdEdit className="w-6 h-6" /></Button>
                                        <fetcher.Form id={`alert-${i}`} method="PUT">
                                            <input type="hidden" name="alertId" value={a.id} />
                                            <input type="hidden" name="name" value={a.name} />
                                            <input type="hidden" name="trigger" value={a.trigger} />
                                            <input type="hidden" name="time" value={a.time} />
                                            <input type="hidden" name="timeSection" value={a.timeSection} />
                                            <input type="hidden" name="group" value={a.group} />
                                            <input type="hidden" name="alertId" value={a.id} />
                                            <input type="hidden" name="herd" value={a.herd} />
                                            <input type="hidden" name="userId" value={a.userId} />
                                            <input type="hidden" name="email" value={a.email} />
                                            <input type="hidden" name="status" value={a.status} />
                                            <input type="hidden" name="timezone" value={tzOffset} />
                                            <Button shape="pill"  variant="transparent" size="icon" type="submit" className="text-gray-500">{a.status === 'Active' ? <FaPauseCircle className="w-6 h-6" /> : <FaPlayCircle className="w-6 h-6" />}</Button>
                                        </fetcher.Form>
                                        <fetcher.Form id={`alert-${i}`} method="DELETE">
                                            <input type="hidden" name="alertId" value={a.id} />
                                            <Button size="icon" shape="pill" variant="transparent" type="submit" className="hover:text-error-500 text-gray-500"><FaTrash className="w-5 h-5" /></Button>
                                        </fetcher.Form>
                                    </div>}
                                    {fetcher.state !== 'idle' && <div className="absolute inset-0 bg-white/70 z-30"></div>}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <DialogModal
                {...dialogData}
            />
        </div>
    );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}

