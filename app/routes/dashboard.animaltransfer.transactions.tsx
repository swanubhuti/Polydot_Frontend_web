import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useNavigate, useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { useState, useEffect, type ForwardRefRenderFunction, forwardRef, useImperativeHandle, useRef,  type PropsWithChildren,  } from "react";
import type { GraphQLReturn, DropdownOpts } from "~/lib/types";
import { formatDate } from "~/lib/utils";
import { callAPI, getUserAccessToken } from "~/session.server";
import Button from "~/components/ui/Button";

import type { GenericAPI } from '~/lib/types';
import z from 'zod';
import Dialog, { ModalBox } from '~/components/ui/Dialog';

import SelectDropdown from "~/components/ui/Dropdown";
import { BiSolidErrorCircle } from "react-icons/bi";
import { BsClipboard2CheckFill } from "react-icons/bs";
import Accordion, { type AccordionRef } from "~/components/ui/Accordion";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import moment from 'moment';

enum ColorPresets {
  primary = 'text-primary-500',
  error = 'text-error-500',
}

export type ColorPresetKeys = keyof typeof ColorPresets;
export interface DialogProps {
  isOpen: boolean;
  buttons?: {
    onClick: () => void;
    text: string
    className?: string;
  }[];
  title?: string;
  message?: string;
  icon?: string;
  color?: ColorPresetKeys;
}

const animalTransferAcceptAnimalSchema = z.object({
  animalTransferTransactionUuid: z.string(), 
  herdUuidAssignedTo: z.string(),
  animalListInfo: z.string(), // This is a string which contains JSON.stringfy array
})

enum AnimalTransactionType {
  RECEIVED = 'Received',
  SENT = 'Sent',
  WITHIN_BUSINESS = 'Within Business'
}

enum AnimalTransactionStatus {
  ON_HOLD = 'On Hold',
  COMPLETED = 'completed'
}

type AllAnimalList = {
  animalTransferTransactionUuid: string,
  transferFromBusinessId: string,
  fromBusinessName: string,
  transferToBusinessId: string,
  toBusinessName: string,
  requestUserUuid: string,
  requestUserName: string,
  totalNumberOfAnimals: string,
  animalList: any,
  requestDate: string,
  type: AnimalTransactionType,
  recepientSender: string,
  status: AnimalTransactionStatus
}

type LoadDataScheme = {
  all_animal_list: Array<AllAnimalList>,
  herdList: DropdownOpts,
}

type CustomAccordionProps = {
  ref?: any,
  children: string | JSX.Element | JSX.Element[],
  title: string,
  expanded: boolean,
  setExpand: () => void
}

const animalInfoSchema = z.array(z.object({
  AnimalUUID: z.string(),
  AnimalID: z.string(),
  Name: z.string(),
}))


function CustomAccordion( {setExpand, title, children,expanded, ref}:CustomAccordionProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    setHeight(panelRef.current?.scrollHeight ?? 0)
  }, [])
  useImperativeHandle(ref, () => ({
    recalcHeight() {
      setHeight(panelRef.current?.scrollHeight ?? 0)
    }
  }))
  return (
    <>
      <div className="">
        <button type="button" className=" flex gap-2 w-full items-center" onClick={setExpand}>
          <span className="text-gray-800">{expanded ? <FaChevronUp /> : <FaChevronDown />}</span>
          <div className="text-lg">{title}</div>
        </button>
      </div>
      <div ref={panelRef} className="px-4 transition-all duration-500 overflow-hidden" style={{maxHeight: expanded ? height : 0}}>
        {children}
      </div>
    </>
  );
}


export async function loader({request, params}: LoaderFunctionArgs) {
  const {accessToken, headers, isApp, userData} = await getUserAccessToken(request, true)
  //console.log("userData, ", userData)
  const userBusinessId = userData?.BusinessID

  const herdCall = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `{
      herds 
      {
        nodes {
          herdUuid
          herdCode
        }
      }
    }`
  }, undefined, accessToken)
  if (!herdCall.success || 'errors' in herdCall.response) {
    throw new Error("Failed to retrieve herd data")
  }
  const herdList: DropdownOpts = herdCall.response.data?.herds?.nodes?.map((hd) => ({label: hd.herdCode, value: hd.herdUuid}))

  const received_animal_onHold_B2B_api_response = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `
      {
       animalTransferTransactionViews(
          condition:{ 
            transferToBusinessId:"${userBusinessId}",
            status: "On Hold",
            transferType: "B2B"
          }
        ) {
          nodes {
            animalTransferTransactionUuid
            transferFromBusinessId
            fromBusinessName
            transferToBusinessId
            toBusinessName
            requestUserUuid
            requestUserName
            requestDate
            status
            transferType
            totalNumberOfAnimals
            animalList 
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
          }
          totalCount
        }
      }
    `
  }, undefined, accessToken)


  if (!received_animal_onHold_B2B_api_response.success || 'errors' in received_animal_onHold_B2B_api_response.response) {
    throw new Error("Failed to retrieve received_animal_onHold_B2B_api_response data")
  }

  const received_animal_completed_B2B_api_response = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `
      {
       animalTransferTransactionViews(
          condition:{ 
            transferToBusinessId:"${userBusinessId}",
            status: "completed",
            transferType: "B2B"
          }
        ) {
          nodes {
            animalTransferTransactionUuid
            transferFromBusinessId
            fromBusinessName
            transferToBusinessId
            toBusinessName
            requestUserUuid
            requestUserName
            requestDate
            status
            transferType
            totalNumberOfAnimals
            animalList 
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
          }
          totalCount
        }
      }
    `
  }, undefined, accessToken)


  if (!received_animal_completed_B2B_api_response.success || 'errors' in received_animal_completed_B2B_api_response.response) {
    throw new Error("Failed to retrieve received_animal_completed_B2B_api_response data")
  }

  //console.log("received_animal_onHold_api_response, ", received_animal_onHold_api_response.response?.data?.animalTransferTransactionViews?.nodes)

  const sent_animal_onHold_B2B_api_response = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `
      {
        animalTransferTransactionViews(
          condition:{ 
            transferFromBusinessId:"${userBusinessId}",
            status: "On Hold",
            transferType: "B2B"
          }
        ) {
          nodes {
            animalTransferTransactionUuid
            transferFromBusinessId
            fromBusinessName
            transferToBusinessId
            toBusinessName
            requestUserUuid
            requestUserName
            requestDate
            status
            transferType
            totalNumberOfAnimals
            animalList 
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
          }
          totalCount
        }
      }
    `
  }, undefined, accessToken)

  if (!sent_animal_onHold_B2B_api_response.success || 'errors' in sent_animal_onHold_B2B_api_response.response) {
    throw new Error("Failed to retrieve sent_animal_onHold_B2B_api_response data")
  }

  //console.log("sent_animal_response, ", sent_animal_response.response?.data?.animalTransferTransactionViews?.nodes)

  const sent_animal_completed_B2B_api_response = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `
      {
        animalTransferTransactionViews(
          condition:{ 
            transferFromBusinessId:"${userBusinessId}",
            status: "completed",
            transferType: "B2B"
          }
        ) {
          nodes {
            animalTransferTransactionUuid
            transferFromBusinessId
            fromBusinessName
            transferToBusinessId
            toBusinessName
            requestUserUuid
            requestUserName
            requestDate
            status
            transferType
            totalNumberOfAnimals
            animalList 
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
          }
          totalCount
        }
      }
    `
  }, undefined, accessToken)

  if (!sent_animal_completed_B2B_api_response.success || 'errors' in sent_animal_completed_B2B_api_response.response) {
    throw new Error("Failed to retrieve sent_animal_completed_B2B_api_response data")
  }

  const sent_animal_completed_withinBusiness_api_response = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `
      {
        animalTransferTransactionViews(
          condition:{ 
            transferFromBusinessId:"${userBusinessId}",
            status: "completed",
            transferType: "withinBusiness"
          }
        ) {
          nodes {
            animalTransferTransactionUuid
            transferFromBusinessId
            fromBusinessName
            transferToBusinessId
            toBusinessName
            requestUserUuid
            requestUserName
            requestDate
            status
            transferType
            totalNumberOfAnimals
            animalList 
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
          }
          totalCount
        }
      }
    `
  }, undefined, accessToken)

  if (!sent_animal_completed_withinBusiness_api_response.success || 'errors' in sent_animal_completed_withinBusiness_api_response.response) {
    throw new Error("Failed to retrieve sent_animal_completed_withinBusiness_api_response data")
  }

  let animal_list_completed: Array<AllAnimalList> = []
  received_animal_completed_B2B_api_response.response?.data?.animalTransferTransactionViews?.nodes.map(
    (val, idx) => {
      let temp: AllAnimalList = {
        animalTransferTransactionUuid: val?.animalTransferTransactionUuid,
        transferFromBusinessId: val?.transferFromBusinessId,
        fromBusinessName: val?.fromBusinessName,
        transferToBusinessId: val?.transferToBusinessId,
        toBusinessName: val?. toBusinessName,
        requestUserUuid: val?.requestUserUuid,
        requestUserName: val?.requestUserName,
        totalNumberOfAnimals: val?.totalNumberOfAnimals,
        animalList: val?.animalList,
        requestDate: val?.requestDate,
        type: AnimalTransactionType.RECEIVED,
        recepientSender: val?.fromBusinessName,
        status: val?.status,
      }
      animal_list_completed.push(temp)
    }
  )
  sent_animal_completed_B2B_api_response.response?.data?.animalTransferTransactionViews?.nodes.map(
    (val, idx) => {
      let temp: AllAnimalList = {
        animalTransferTransactionUuid: val?.animalTransferTransactionUuid,
        transferFromBusinessId: val?.transferFromBusinessId,
        fromBusinessName: val?.fromBusinessName,
        transferToBusinessId: val?.transferToBusinessId,
        toBusinessName: val?. toBusinessName,
        requestUserUuid: val?.requestUserUuid,
        requestUserName: val?.requestUserName,
        totalNumberOfAnimals: val?.totalNumberOfAnimals,
        animalList: val?.animalList,
        requestDate: val?.requestDate,
        type: AnimalTransactionType.SENT,
        recepientSender: val?.toBusinessName,
        status: val?.status,
      }
      animal_list_completed.push(temp)
    }
  )
  sent_animal_completed_withinBusiness_api_response.response?.data?.animalTransferTransactionViews?.nodes.map(
    (val, idx) => {
      let temp: AllAnimalList = {
        animalTransferTransactionUuid: val?.animalTransferTransactionUuid,
        transferFromBusinessId: val?.transferFromBusinessId,
        fromBusinessName: val?.fromBusinessName,
        transferToBusinessId: val?.transferToBusinessId,
        toBusinessName: val?. toBusinessName,
        requestUserUuid: val?.requestUserUuid,
        requestUserName: val?.requestUserName,
        totalNumberOfAnimals: val?.totalNumberOfAnimals,
        animalList: val?.animalList,
        requestDate: val?.requestDate,
        type: AnimalTransactionType.WITHIN_BUSINESS,
        recepientSender: val?.toBusinessName,
        status: val?.status,
      }
      animal_list_completed.push(temp)
    }
  )

  // Sort descending
  const animal_list_completed_sorted  = animal_list_completed.sort((a,b) => moment(b.requestDate).valueOf()-moment(a.requestDate).valueOf())

  let received_onHold_B2B_animal_list = received_animal_onHold_B2B_api_response.response?.data?.animalTransferTransactionViews?.nodes
  let sent_onHold_B2B_animal_list = sent_animal_onHold_B2B_api_response.response?.data?.animalTransferTransactionViews?.nodes

  // Order of list:
  // 1. Received - On Hold - B2B
  // 2. Sent - On Hold - B2B
  // 3. Sent/Received - Completed - B2B/Within - Sorted by date 
  let all_animal_list: Array<AllAnimalList> = []
  received_onHold_B2B_animal_list.map(
    (val, idx) => {
      let temp: AllAnimalList = {
        animalTransferTransactionUuid: val?.animalTransferTransactionUuid,
        transferFromBusinessId: val?.transferFromBusinessId,
        fromBusinessName: val?.fromBusinessName,
        transferToBusinessId: val?.transferToBusinessId,
        toBusinessName: val?. toBusinessName,
        requestUserUuid: val?.requestUserUuid,
        requestUserName: val?.requestUserName,
        totalNumberOfAnimals: val?.totalNumberOfAnimals,
        animalList: val?.animalList,
        requestDate: val?.requestDate,
        type: AnimalTransactionType.RECEIVED,
        recepientSender: val?.fromBusinessName,
        status: val?.status,
      }
      all_animal_list.push(temp)
    }
  )
  sent_onHold_B2B_animal_list.map(
    (val, idx) => {
      let temp: AllAnimalList = {
        animalTransferTransactionUuid: val?.animalTransferTransactionUuid,
        transferFromBusinessId: val?.transferFromBusinessId,
        fromBusinessName: val?.fromBusinessName,
        transferToBusinessId: val?.transferToBusinessId,
        toBusinessName: val?. toBusinessName,
        requestUserUuid: val?.requestUserUuid,
        requestUserName: val?.requestUserName,
        totalNumberOfAnimals: val?.totalNumberOfAnimals,
        animalList: val?.animalList,
        requestDate: val?.requestDate,
        type: AnimalTransactionType.SENT,
        recepientSender: val?.toBusinessName,
        status: val?.status,
      }
      all_animal_list.push(temp)
    }
  )
  animal_list_completed_sorted.map(
    (val, idx) => {
      let temp: AllAnimalList = {
        animalTransferTransactionUuid: val?.animalTransferTransactionUuid,
        transferFromBusinessId: val?.transferFromBusinessId,
        fromBusinessName: val?.fromBusinessName,
        transferToBusinessId: val?.transferToBusinessId,
        toBusinessName: val?. toBusinessName,
        requestUserUuid: val?.requestUserUuid,
        requestUserName: val?.requestUserName,
        totalNumberOfAnimals: val?.totalNumberOfAnimals,
        animalList: val?.animalList,
        requestDate: val?.requestDate,
        type: val?.type,
        recepientSender: val?.recepientSender,
        status: val?.status,
      }
      all_animal_list.push(temp)
    }
  )
  
  return json({
    all_animal_list,
    herdList
  })  
}

export async function action({request}: ActionFunctionArgs) {
  const {accessToken, userData} = await getUserAccessToken(request, true)
  const userBusinessId = userData?.BusinessID

  const formData = await request.formData();
  const requestData = Object.fromEntries(formData);
  const validation = animalTransferAcceptAnimalSchema.safeParse(requestData);
  if (!validation.success) {
    return json({
      isError: true,
      status: 'validation error',
      message: null,
      errors: null,
    });
  }

  // Get herdCode based on herdUuid
  const herdInformation = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `{
      herds (
        condition: {
          herdUuid: "${validation.data.herdUuidAssignedTo}"
        }
      )
      {
        nodes {
          herdUuid
          herdCode
          easyDairyId
        }
      }
    }`
  }, undefined, accessToken)
  if (!herdInformation.success || 'errors' in herdInformation.response) {
    throw new Error("Failed to retrieve herd data")
  }

  if(herdInformation.response.data?.herds?.nodes?.length <= 0){
    throw new Error("Failed to retrieve the current herd data")
  }
  
  let validation_animalInfo: any
  try {
    let res_parse_json = JSON.parse(validation.data.animalListInfo);
    //console.log("res_parse_json,",res_parse_json)
    validation_animalInfo = animalInfoSchema.safeParse(res_parse_json)
    if(!validation_animalInfo.success){
      return json({
        isError: true,
        status: 'validation error',
        message: null,
        errors: null,
      });
    }
  } catch (e) {
    return json({
      isError: true,
      status: 'validation error',
      message: null,
      errors: null,
    });
  }

  //TODO: Commented out, temperory disable animal transfer
  const resp: GenericAPI = {response: {message: "In development.",errors: "In development."}}
  //const resp = await callAPI<GenericAPI>(request, '/api/animal/transfer/businessToBusiness', validation.data, 'POST');
  if (!resp.success || resp.response?.errors) {
    return json({
      isError: true,
      status: 'api error',
      message: '',
      errors: !resp.success ? resp.response.errors as string : resp.response.message,
    })
  }
  
  // Send an Animal Transfer Event System for successful transfer
  let animalsListInfoNotification: Array<any> = []
  for(const item of validation_animalInfo.data){
    animalsListInfoNotification.push( { animalId: item.AnimalId, name: item.Name } ) 
  }
  let currEasyDairyId = herdInformation.response.data?.herds?.nodes[0].easyDairyId
  let message = `${animalsListInfoNotification.length} Animal(s) has been successfully assigned to a herd`

  let notification_message =  {
    type:"animalTransferIn",
    data: {
        message: message,
        animals: animalsListInfoNotification,
        assignedToHerd: herdInformation.response.data?.herds?.nodes[0].herdCode
    },
    businessId: userBusinessId,
  }

  //TODO: Commented out, temperory disable animal transfer
  //const notification_resp = await callAPI<GenericAPI>(request,`/api/notifications/message/${currEasyDairyId}`,notification_message, 'POST');
  
  return json({
    isError: false,
    status: 'success',
    message: resp.response.message,
    errors: '',
  });
}

export default function AnimalTransferSummaryPage() {
  const data = useLoaderData<LoadDataScheme>()
  const actionData = useActionData<typeof action>()
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showTransactionDialogStatus, setShowTransactionDialogStatus] = useState<boolean>(false);
  const [animalTransferSelectionInfo, setAnimalTransferSelectionInfo] = useState<any>({});
  const [transferToHerdUuidSelection,setTransferToHerdUuidSelection] = useState<string | null>(null)

  const [expanded, setExpanded] = useState(() => {
    let expandList: {[key: string]: boolean} = {}
    data.all_animal_list.forEach((val) => {
      if(val.type === AnimalTransactionType.RECEIVED && val.status === AnimalTransactionStatus.ON_HOLD){
        expandList[`${val.animalTransferTransactionUuid}-${val.type}-accordion`] = true 
      } else {
        expandList[`${val.animalTransferTransactionUuid}-${val.type}-accordion`] = false 
      }
    })
    return expandList
  })
  //const accordionList = useRef<(AccordionRef | null)[]>([])

  const colorClass = ColorPresets['primary' as ColorPresetKeys];
  const submit = useSubmit();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>)  => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    formData.append('animalTransferTransactionUuid', animalTransferSelectionInfo?.animalTransferUuid);
    formData.append('herdUuidAssignedTo', transferToHerdUuidSelection ? transferToHerdUuidSelection : '');
    formData.append('animalListInfo', JSON.stringify(animalTransferSelectionInfo?.animalList)); 
    
    submit(formData, { method: 'post' });
  }

  useEffect(
    () => {
      if( (actionData?.message || actionData?.errors) && showModal){
        setShowModal(false)
        setShowTransactionDialogStatus(true)
      }
    },
    [actionData]
  )

  return (
    <>
      <div className="bg-grey-100 px-24 py-5 left-0 right-0">
        <div className="flex flex-row gap-10">
          <button 
            className="rounded px-5 py-2 text-white font-bold hover:bg-primary-400 hover:text-white bg-primary"
            onClick={ () => {  navigate("/dashboard/animaltransfer/transactions", {
              replace: true
            }) } }
          >
            Transfers
          </button>
          <button 
            className="rounded px-5 py-2 text-black font-bold hover:bg-primary-400 hover:text-white"
            onClick={ () => {  navigate("/dashboard/animaltransfer/selection", {
              replace: true
            }) } }
          >
            Transfer Animal
          </button>
        </div>
      </div>
      <div className="px-24 py-5 flex flex-col">
        <div className="overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4">
          <table className="min-w-full table-print relative">
            <thead className="font-signika text-lg">
                <tr className="[&>th:first-child]:rounded-l [&>th:last-child]:rounded-r bg-primary-500">
                  <th key="th-dateOfTransfer" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Date Of Transfer</th>
                  <th key="th-type" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Type</th>
                  <th key="th-recipientSender" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Recipient / Sender</th>
                  <th key="th-noOfAnimals" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">No. of Animals</th>
                  <th key="th-status" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Status</th>
                  <th key="th-action" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Action</th>
                </tr>         
            </thead>
            <tbody className="">
              {
                data?.all_animal_list.map((val, idx) => {
                  return (
                    <tr key={`list-${idx}`} className={idx % 2 !== 0 ? "bg-gray-100" : ""}>
                      <td className="p-3 whitespace-nowrap align-top" key={`${idx}-requestDate`}>{ formatDate(val.requestDate, "{DD/MM/YYYY}") }</td>
                      <td className="p-3 whitespace-nowrap align-top" key={`${idx}-type`}>{val?.type}</td>
                      <td className="p-3 whitespace-nowrap align-top" key={`${idx}-recepientSender`}>{ val?.type === AnimalTransactionType.RECEIVED ? <b>From: </b> : <b>To: </b> }{val?.recepientSender }</td>
                      <td className="p-3 whitespace-nowrap align-top" key={`${idx}-noOfAnimals`}>
                        <CustomAccordion
                          //ref={accordionSelectBusinessRef}
                          title={val.totalNumberOfAnimals}
                          setExpand={ () => setExpanded({...expanded, [`${val.animalTransferTransactionUuid}-${val.type}-accordion`]: !expanded[`${val.animalTransferTransactionUuid}-${val.type}-accordion`]}) }
                          expanded={expanded[`${val.animalTransferTransactionUuid}-${val.type}-accordion`]}
                        >
                          
                          <table className="border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-solid border-gray-300 border-2">
                                <th className="px-3 py-2 sticky top-0 font-bold whitespace-nowrap text-left">ID</th>
                                <th className="px-3 py-2 sticky top-0 font-bold whitespace-nowrap text-left">Animal Name</th>
                              </tr>
                            </thead>
                            <tbody className="border-solid border-gray-300 border-2">
                              {
                                val?.animalList?.map(
                                  (item: any) => {
                                    return (
                                      <tr>
                                        <td className="px-3 py-1 text-left">{item?.AnimalID}</td>
                                        <td className="px-3 py-1 text-left">{item?.Name}</td>
                                      </tr>
                                    )
                                  }
                                )
                              }
                            
                            </tbody>
                          </table>
                        </CustomAccordion>
                      </td>
                      <td className="p-3 whitespace-nowrap align-top" key={`${idx}-status`}>{val.status}</td>
                      <td className="p-3 whitespace-nowrap align-top" key={`${idx}-action`}>
                        {
                          val.status === AnimalTransactionStatus.ON_HOLD ? val.type === AnimalTransactionType.RECEIVED ? 
                            (
                              <>
                                <div 
                                  onClick={ () => { 
                                      setShowModal(true) 
                                      setAnimalTransferSelectionInfo(
                                        {
                                          animalTransferUuid: val?.animalTransferTransactionUuid,
                                          transferFromBusinessId: val?.transferFromBusinessId,
                                          fromBusinessName: val?.fromBusinessName,
                                          transferToBusinessId: val?.transferToBusinessId,
                                          toBusinessName: val?. toBusinessName,
                                          requestUserUuid: val?.requestUserUuid,
                                          requestUserName: val?.requestUserName,
                                          totalNumberOfAnimals: val?.totalNumberOfAnimals,
                                          animalList: val?.animalList,
                                          requestDate: val?.requestDate,
                                          type: val.type,
                                          recepientSender: val?.recepientSender,
                                          status: val?.status,
                                        }
                                      )
                                  }}
                                >
                                  <BsClipboard2CheckFill className={`text-3xl`} ></BsClipboard2CheckFill>
                                </div>
                              </>) 
                              : (<></>) : (<></>)
                        }
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
      <ModalBox 
        isOpen={showModal} 
        classes="w-full max-w-3xl h-2/3" 
        onClose={() => { setShowModal(false) }} title=""
      >
          <div>
            {
              animalTransferSelectionInfo ? (
                    <div className="grid justify-items-center">
                      <BiSolidErrorCircle className={`text-7xl ${colorClass}`}></BiSolidErrorCircle>
                      <br></br>

                      <div className="text-center py-5 font-bold text-xl">{animalTransferSelectionInfo?.recepientSender} has sent you {animalTransferSelectionInfo?.totalNumberOfAnimals} animal(s)</div>
                      <br></br>


                      <table className="border-collapse justify-items-center">
                          <thead>
                            <tr className="bg-gray-100 border-solid border-gray-300 border-2">
                              <th className="px-3 py-2 sticky top-0 font-bold whitespace-nowrap text-left">ID</th>
                              <th className="px-3 py-2 sticky top-0 font-bold whitespace-nowrap text-left">Animal Name</th>
                            </tr>
                          </thead>
                          <tbody className="border-solid border-gray-300 border-2">
                            {
                              animalTransferSelectionInfo?.animalList?.map(
                                (item: any, idx: number) => {
                                  return (
                                    <tr>
                                      <td className="px-3 py-1 text-left" key={`${idx}-confirm-animal-id`}>{item?.AnimalID}</td>
                                      <td className="px-3 py-1 text-left" key={`${idx}-confirm-name`}>{item?.Name}</td>
                                    </tr>
                                  )
                                }
                              )
                            }
                          
                          </tbody>
                        </table>
                    </div>
                ) : (<></>)
            }
            <br></br>
            <SelectDropdown 
              type='single' 
              label="Assign To Herd:" 
              name='AssignTo' 
              //options={[{label:'C00859H',value:'Test Business 1'},{label:'C01682H',value:'Test Business 2'}]} 
              options={data.herdList}
              value={transferToHerdUuidSelection}
              onSelectChange={(val) => {
                setTransferToHerdUuidSelection(val.value)
              }} 
            />
            <br></br>
            <br></br>
            <div className="grid justify-items-center">
              <div className='flex flex-row gap-5 px-5 py-2'>
                { transferToHerdUuidSelection &&
                  <Form method="POST" onSubmit={handleSubmit}>
                    <Button 
                      type="submit"
                      className="px-10 py-2 font-extrabold" 
                      onClick={ async () => { 
                      }}
                    >Accept
                  </Button>
                </Form>
                }
                
                <Button className="px-10 py-2 bg-white text-primary border-primary font-extrabold" onClick={ () => { setShowModal(false) } }>On Hold</Button>
              </div>
            </div>
          </div>
      </ModalBox>

      {/** TRANSFER DIALOG STATE */}
      <Dialog
        isOpen={showTransactionDialogStatus}
        color={`${actionData?.isError ? 'error' : 'primary'}`}
        //color={`primary`}
        icon={`${actionData?.isError ? 'error':'success'}`}
        title={`${actionData?.isError ? 'Error':'Success'}`}
        message={
          `${actionData?.isError ? 
            `${actionData?.message} ${actionData?.errors}` :  
            `Received ${animalTransferSelectionInfo?.totalNumberOfAnimals} animal(s) from ${animalTransferSelectionInfo?.recepientSender}`} 
          `}
        buttons={[
          {
            text: 'Close',
            variant: 'black',
            onClick: () => {
              if(actionData?.isError){
                setShowTransactionDialogStatus(false)
              } else {
                setShowTransactionDialogStatus(false)
                navigate("/dashboard/animal/transfertransactions", {
                  replace: true
                })
              }
            },
          },
        ]}
      />
    </>
  )
}