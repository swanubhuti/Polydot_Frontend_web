import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useLoaderData, useSubmit, useNavigate, useActionData } from "@remix-run/react";
import React, { useEffect, useRef, useState, ChangeEventHandler, ChangeEvent, forwardRef, useImperativeHandle } from "react";
import TableWidget from "~/components/TableWidget";
import type { GenericAPI } from '~/lib/types';

import Accordion, { type AccordionRef } from "~/components/ui/Accordion";
import type { GraphQLReturn } from "~/lib/types";
import { formatDate, getVisibleHerdsFilter } from "~/lib/utils";
import { callAPI, getUserAccessToken } from "~/session.server";
import Button from "~/components/ui/Button";
import { Switch } from '@headlessui/react'
import Dialog from '~/components/ui/Dialog';

import type { DropdownOpts } from '~/lib/types';
import z from 'zod';
import SelectDropdown from "~/components/ui/Dropdown";
import Search from "~/components/ui/Search";

type RowScheme = {
  animalUuid: string,
  animalId: string,
  name: string,
  breed: string,
  status: string,
  dateOfBirth: string,
  transfer: boolean,
}

type CustomSwitchToggleProps = {
  onCallBackHandler: any,
  holdValue: RowScheme,
  isChecked: boolean,
}

type SearchBusinessType = {
  BusinessID: string,
  BusinessName: string,
}

type SearchBarSuggestionData = {
  label: string,
  data: any,
}

enum AnimalTransferPageStatus {
  SELECTION = 'selection',
  CONFIRMATION = 'confirmation',
}

const searchFilterOptions = [
  {label: 'Animal Name', value: 'name', isDateField: false},
  {label: 'Breed', value: 'breed', isDateField: false},
  {label: 'Status', value: 'status', isDateField: false},
]

enum BusinessSearchType {
  BUSINESS_NAME = 'BusinessName',
  EAMIL = 'Email'
}

enum transferBusinessType {
  WITHIN_BUSINESS = 'WithinBusiness',
  B2B = 'B2B'
}

const businessSearchOptionBy: DropdownOpts = [
  { label: 'Business Name', value: BusinessSearchType.BUSINESS_NAME },
  { label: 'Email', value: BusinessSearchType.EAMIL },
]

const animalTransferTypeSchema = z.object({
  currTransferBusinessType: z.string()
})

const animalTransferProcessB2BSchema = z.object({
  sourceAnimalListInfo: z.string(), // This is a string which contains JSON.stringfy array
  sourceAnimalHerdCode: z.string(),
  fromBusinessId: z.string(),
  TransferToBusinessId: z.string(),
})

const animalTransferProcessWithinBusinessSchema = z.object({
  sourceAnimalListInfo: z.string(), // This is a string which contains JSON.stringfy array
  sourceAnimalHerdCode: z.string(),
  transferToAnimalHerdUuid: z.string(),
  transferToAnimalHerdCode: z.string(),
})


const animalInfoSchema = z.array(z.object({
  animalUuid: z.string(),
  animalId: z.string(),
  animalName: z.string(),
}))

type SearchBarRef = {
  clearInputSearch: () => void
}

export async function loader({request, params}: LoaderFunctionArgs) {
  const {accessToken, userData, headers, isApp} = await getUserAccessToken(request, true)
  
  try {
      const herdCall = await callAPI<GraphQLReturn>(request, '/api/graphql', {
        query: `{
          herds (${getVisibleHerdsFilter(userData as any)})
          {
            nodes {
              herdUuid
              herdCode
              easyDairyId
            }
          }
        }`
      }, undefined, accessToken)
      if (!herdCall.success || 'errors' in herdCall.response) {
        throw new Error("Failed to retrieve herd data")
      }
      const currentHerdInfo = herdCall.response.data?.herds?.nodes?.find((hd) => hd.herdCode === params.herdcode)
      if (!currentHerdInfo) {
        //return redirect('/dashboard', headers)
      }
      const herdList: DropdownOpts = herdCall.response.data?.herds?.nodes?.map((hd) => ({label: hd.herdCode, value: hd.herdUuid}))
      return json({userData: userData, isApp, herdList}, headers)
    
  } catch (e) {
    console.log(e)
  }

  return json({userData: userData, isApp, herdList: []}, headers)
}

export async function action({request}: ActionFunctionArgs) {
  const {accessToken, userData} = await getUserAccessToken(request, true)
  const userBusinessId = userData?.BusinessID
  const userBusinessName = userData?.BusinessName

  // Extract submit data
  const formData = await request.formData();
  const requestData = Object.fromEntries(formData);

  //Check type of transfer
  const validation_typeTranfer = animalTransferTypeSchema.safeParse(requestData);
  if (!validation_typeTranfer.success) {
    return json({
      isError: true,
      status: 'validation error',
      message: null,
      errors: validation_typeTranfer.error.message,
    });
  }

  var validation: any
  if(validation_typeTranfer.data.currTransferBusinessType === transferBusinessType.B2B){
    validation = animalTransferProcessB2BSchema.safeParse(requestData);
    if (!validation.success) {
      return json({
        isError: true,
        status: 'validation error',
        message: null,
        errors: validation.error.message,
      });
    }
  } else {
    validation = animalTransferProcessWithinBusinessSchema.safeParse(requestData);
    if (!validation.success) {
      return json({
        isError: true,
        status: 'validation error',
        message: null,
        errors: validation.error.message,
      });
    }
  }

  let validation_animalInfo: any
  try {
    let res_parse_json = JSON.parse(validation.data.sourceAnimalListInfo);
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
  } catch (e: any) {
    return json({
      isError: true,
      status: 'validation error',
      message: null,
      errors: e?.message,
    });
  }
  //console.log("validation_animalInfo,",validation_animalInfo)

  // Get EasyDairyId for herd which animals are transfering out
  const herdInformation = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `{
      herds (
        condition: {
          herdCode: "${validation.data.sourceAnimalHerdCode}"
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

  let animalsUuidList: Array<string> = []
  for(const item of validation_animalInfo.data){
    animalsUuidList.push(item.animalUuid) 
  }

  
  var resp: GenericAPI
  if(validation_typeTranfer.data.currTransferBusinessType === transferBusinessType.B2B){
    let data_to_send = {
      sourceAnimalListUuid: animalsUuidList,
      fromBusinessId: validation.data.fromBusinessId,
      TransferToBusinessId: validation.data.TransferToBusinessId,
    }

    //TODO: Commented out, temperory disable animal transfer
    resp = {response: {message: "In development.",errors: "In development."}}
    //resp = await callAPI<GenericAPI>(request, '/api/animal/transfer/businessToBusinessRequest', data_to_send, 'POST');
  } else {
    let data_to_send = {
      sourceAnimalListUuid: animalsUuidList,
      //sourceAnimalHerdCode: validation.data.sourceAnimalHerdCode,
      transferToAnimalHerdUuid: validation.data.transferToAnimalHerdUuid,
    }

    //TODO: Commented out, temperory disable animal transfer
    resp = {response: {message: "In development.",errors: "In development."}}
    //resp = await callAPI<GenericAPI>(request, '/api/animal/transfer/withinBusiness', data_to_send, 'POST');
  }
  if (!resp.success || resp.response?.errors) {
    return json({
      isError: true,
      status: 'api error',
      message: '',
      errors: !resp.success ? resp.response.errors as string : resp.response.message,
    })
  }

  // Send an Animal Transfer Event System for successful transfer
  if(validation_typeTranfer.data.currTransferBusinessType === transferBusinessType.B2B){
    let animalsListInfoNotification: Array<any> = []
    for(const item of validation_animalInfo.data){
      animalsListInfoNotification.push( { animalId: item.animalId, name: item.animalName } ) 
    }
    let currEasyDairyId = herdInformation.response.data?.herds?.nodes[0].easyDairyId
    let message = `Business ${userBusinessName} has transferred ${animalsListInfoNotification.length} animal(s)`

    let notification_message =  {
      type:"animalTransferOut",
      data: {
          message: message,
          animals: animalsListInfoNotification,
      },
      businessId: userBusinessId,
    }
    //TODO: Commented out, temperory disable animal transfer
    //const notification_resp = await callAPI<GenericAPI>(request, `/api/notifications/message/${currEasyDairyId}`, notification_message, 'POST');
  } else {
    let animalsListInfoNotification: Array<any> = []
    for(const item of validation_animalInfo.data){
      animalsListInfoNotification.push( { animalId: item.animalId, name: item.animalName } ) 
    }
    let currEasyDairyId = herdInformation.response.data?.herds?.nodes[0].easyDairyId
    let message = `${animalsListInfoNotification.length} animal(s) has been transfered from Herd ${validation.data.sourceAnimalHerdCode} to Herd ${validation.data.transferToAnimalHerdCode} within the business`

    let notification_message =  {
      type:"animalTransferWithin",
      data: {
          message: message,
          animals: animalsListInfoNotification,
      },
      businessId: userBusinessId,
    }
    //TODO: Commented out, temperory disable animal transfer
    //const notification_resp = await callAPI<GenericAPI>(request, `/api/notifications/message/${currEasyDairyId}`, notification_message, 'POST');
  }

  return json({
    isError: false,
    status: 'success',
    message: resp.response.message,
    errors: '',
  });
  
}

function CustomSwitchToggleUi({onCallBackHandler, holdValue, isChecked}: CustomSwitchToggleProps) {
  const [ enabled, setEnabled ] = useState(isChecked);
  const [ currValue, setValue ] = useState(holdValue)

  useEffect( 
    () => {
      if(onCallBackHandler)
        onCallBackHandler(enabled,currValue)
    },
    [enabled] 
  )

  return (
    <Switch
      checked={enabled}
      onChange={setEnabled}
      key='value'
      className={`${
        enabled ? 'bg-primary-500' : 'bg-gray-300'
      } inline-flex h-6 w-11 items-center rounded-full -z-1`}
    >
      <div
        className={`${
          enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }  h-5 w-5 rounded-full bg-white -z-5`}
      />
    </Switch>
  )
}

function DebounceComp( value: string, interval: number ) {
  const [currValue, setCurrValue] = useState(value)

  useEffect(
    () => {
      const timeoutFn = setTimeout( () => {
        setCurrValue(value)
      } , interval)
      return (
        () => { clearTimeout(timeoutFn) }
      ) 
    },
    [value, interval]
  )
  return currValue
}

const SearchBar = forwardRef(({ label, onDelayedChange, onSelected, onCustomSuggestion ,debounceInterval }: {label: string,onDelayedChange?: CallableFunction, onSelected?: CallableFunction, onCustomSuggestion?: CallableFunction, debounceInterval: number }, ref) => {
  const [ searchInputValue, setSearchInputValue] = useState<string>('')
  const [ showSuggestion, setShowSuggestion] = useState<boolean>(false)
  const [ suggestionList, setSuggestionList] = useState<Array<{ label:string,value:string, info: string, data:any }> | null >(null)
  const debouncedSearchInput= DebounceComp(searchInputValue,debounceInterval)
  const [ numberOfSuggestion, setNumberOfSuggestion ] = useState<number>(0)
  const [ isSelectionMatch, setIsSelectionMatch ] = useState<boolean>(false)

  useImperativeHandle(ref, () => ({
    clearInputSearch(){
      setSearchInputValue('')
    }
  }));

  useEffect(
    () => {
      async function handleDebounce() {
        if(debouncedSearchInput === ''){
          setSuggestionList(null)
          setNumberOfSuggestion(0)
        } else {
          //onDelayedChange(debouncedSearchInput)
          await handleCustomSearch(debouncedSearchInput)
        }
        if(onDelayedChange) onDelayedChange(debouncedSearchInput)
      }
      handleDebounce()
    }, 
    [debouncedSearchInput]
  )

  useEffect(
    () => {
      let ret_value: SearchBarSuggestionData = {label:'', data: {}}
      if(suggestionList && searchInputValue){
        for(const item of suggestionList){
          if(item.label === searchInputValue){
            setIsSelectionMatch(true)
            ret_value = { label:item.label, data:item.data}
            break
          }
        }
      } else {
        setIsSelectionMatch(false)
      }
      if(onSelected) onSelected(ret_value);
    
    },
    [suggestionList]
  )

  const handleCustomSearch =  async ( searchInput: string )  => {
    if(onCustomSuggestion){
      let suggestionRetList = await onCustomSuggestion(searchInput)

      setSuggestionList(
        suggestionRetList
      )

      setNumberOfSuggestion(
        suggestionRetList.length
      )
    } 
  }

  const handleChangeBusinessSearchInput: ChangeEventHandler<HTMLInputElement> = async (event: ChangeEvent<HTMLInputElement>)  => {
    setSearchInputValue(event.target.value)
    setIsSelectionMatch(false)
  }

  return (
    <div className="my-5">
      <div className="block leading-6 font-bold text-sm md:text-base mb-1.5 text-black">
        {label}
      </div>
      <div className={`rounded border border-2 outline-none ${ isSelectionMatch ? 'border-green-400' :'border-grey-dark'}`} style={{width: '32rem'}}>
        <div className="flex w-full justify-stretch">
        
          <input
              autoComplete='off'
              onFocus={ () => { setShowSuggestion(true) } }
              onBlur={ () => { 
                setTimeout( () =>  {setShowSuggestion(false)}, 100) // Delay close suggestion to allow click event on children to occur
              }}
              className='rounded w-full px-3 py-2 outline-none'
              onChange={ handleChangeBusinessSearchInput }
              value={searchInputValue}
          />
        </div>
        <section style={ { position:'absolute', zIndex:900, width: '32rem' } } className={`bg-white px-3 py-2 border ${showSuggestion ? '':'hidden' }`} >
          <ul className="w-full">
            {
              suggestionList?.map(
                (val, idx) => {
                  return (
                    <li 
                      key={`search-${val.label}-${idx}`} 
                      className="hover:bg-sky-700" 
                      onClick={ 
                        () => { 
                          setSearchInputValue(val.label); 
                          if(onSelected) onSelected({label:val.label,data:val});
                        } 
                      }
                    >
                      {val.label}
                      {val?.info && 
                        <>
                          {val?.info}
                        </>
                      }
                    </li>
                  )
                }
              )
            }
          </ul>
          <div className="my-5"></div>
          <div className="text-gray-400 border-t-2 border-gray-200">{numberOfSuggestion} search result(s)</div>
        </section>
      </div>
    </div>
  )
})

export default function AnimalTransferPage() {
  const dataLoader = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit();
  const navigate = useNavigate();
  const [ showDialog, setShowDialog ] = useState<boolean>(false)
  const [ submitRequestStr, setSubmitRequestStr ] = useState<string | null>(null) 

  /** Page State (Selection/Confirmation) */
  const [ animalTransferPageState, setAnimalTransferPageState ] = useState<AnimalTransferPageStatus>(AnimalTransferPageStatus.SELECTION)

  /** Select Business States */
  //const accordionSelectBusinessRef = useRef<AccordionRef>(null)
  const searchBarRef = useRef<SearchBarRef>(null)
  //const [ accordionSelectBusinessShow, setAccordionSelectBusinessShow] = useState<boolean>(true)
  //const [ businessSearchNameInput, setBusinessSearchNameInput] = useState<string>('')
  const [ currentSearchType, setCurrentSearchType ] = useState<BusinessSearchType>(BusinessSearchType.BUSINESS_NAME)
  const [ selectedBusinessId, setSelectedBusinessId] = useState<SearchBusinessType | null >(null)
  //const [ searchBusinessList, setSearchBusinessList ] = useState<Array<SearchBusinessType>>([])

  /** Select Animal States */
  const accordionSelectAnimalRef = useRef<AccordionRef>(null)
  //const [ accordionSelectAnimalShow, setAccordionSelectAnimalShow] = useState<boolean>(true)
  const [ selectedAnimalTransfer, setSelectedAnimalTransfer ] = useState<Array<RowScheme>>([])
  const [ herdList, setHerdList] = useState<DropdownOpts>(dataLoader.herdList as DropdownOpts || [])
  const [ selectedHerdCode, setSelectedHerdCode] = useState<{herdCode: string, herdUuid:string}>({herdCode: dataLoader.herdList[0].label ?? '' , herdUuid: dataLoader.herdList[0].value ?? '' })
  const [ toHerdCodeWithinTransfer, setToHerdCodeWithinTransfer] = useState<{herdCode: string, herdUuid:string}>({herdCode: '', herdUuid: ''})
  const [ currTransferBusinessType,setCurrTransferBusinessType] = useState<transferBusinessType>(transferBusinessType.B2B)
  const [ searchFilter, setSearchFilter ] = useState<string>('')
  const [ searchFilterType, setSearchFilterType ] = useState<string>('')

  useEffect(
    () => {
      if(actionData?.message || actionData?.errors) {
        setShowDialog(true)
      } 
    },
    [actionData]
  )

  const handleCheckBoxChange = (state:boolean, val:RowScheme) => {
    if(state){
      setSelectedAnimalTransfer((prev) => { 
        let found_animal =  prev.find((anm) => anm.animalUuid === val.animalUuid )
        if(found_animal)
          return [...prev]  
        else
          return [...prev, val]  
      }) 
    } else {
      setSelectedAnimalTransfer((prev) => { 
        let found_animal =  prev.find((anm) => anm.animalUuid === val.animalUuid )
        if(found_animal) {
          return prev.filter(item => item.animalUuid !== val.animalUuid) 
        } else {
          return [...prev]  
        }
      })       
    }
    
  }

  /*
  const handleBusinessSearch =  async ()  => {
    const url = `/table/animal/transfer/searchBusiness/?searchName=${businessSearchNameInput}`;
    let fetch_resp = await fetch(url)
    if (fetch_resp.ok) {
      const fetch_business_list = await fetch_resp.json();
      setSearchBusinessList(
        fetch_business_list.data
      )
    } 
  }

  const handleChangeBusinessSearchInput = async (event: ChangeEvent<HTMLInputElement>)  => {
    setBusinessSearchNameInput(event.target.value)
  }
  */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>)  => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    var selectedAnimalUuid: Array<any> = [];
    
    for(const item of selectedAnimalTransfer){
      selectedAnimalUuid.push(
        {
          animalUuid: item.animalUuid,
          animalId: item.animalId,
          animalName: item.name,
        }
      )
    }
    if(currTransferBusinessType === transferBusinessType.B2B){
      if(selectedBusinessId){
        formData.append('sourceAnimalListInfo', JSON.stringify(selectedAnimalUuid)); 
        formData.append('sourceAnimalHerdCode', selectedHerdCode.herdCode);
        formData.append('fromBusinessId', dataLoader.userData?.BusinessID);
        formData.append('TransferToBusinessId', selectedBusinessId.BusinessID);
        formData.append('currTransferBusinessType', currTransferBusinessType);
        submit(formData, { method: 'post' });
      }
    }
    else {
      if(selectedBusinessId){
        formData.append('sourceAnimalListInfo', JSON.stringify(selectedAnimalUuid)); 
        formData.append('sourceAnimalHerdCode', selectedHerdCode.herdCode);
        formData.append('transferToAnimalHerdUuid', toHerdCodeWithinTransfer.herdUuid);
        formData.append('transferToAnimalHerdCode', toHerdCodeWithinTransfer.herdCode);
        //formData.append('fromBusinessId', dataLoader.userData?.BusinessID);
        //formData.append('TransferToBusinessId', dataLoader.userData?.BusinessID);
        formData.append('currTransferBusinessType', currTransferBusinessType);
        submit(formData, { method: 'post' });
      }
    }
    
  }
  const handleRowData = (rowData: {[key: string]: Array<any>}) => {
    if (rowData) {
        if (rowData.rowData){
          for (const item of rowData.rowData){
            let animalId = item.animalId
            
            // Check if animal is selected when rerendering table
            let animalCheckInList = selectedAnimalTransfer.find((checkVal) => checkVal.animalUuid === item.animalUuid)

            item.transfer = (
              <div className="overflow-hidden -z-1">
                <CustomSwitchToggleUi onCallBackHandler={handleCheckBoxChange} holdValue={item} isChecked={ animalCheckInList ? true : false }></CustomSwitchToggleUi>
              </div>
            )
          }
        }
    }
  };

  return (
    <div>
      <div className="bg-grey-100 px-24 py-5 left-0 right-0">
        <div className="flex flex-row gap-10">
          <button 
            className="rounded px-5 py-2 text-black font-bold hover:bg-primary-400 hover:text-white"
            onClick={ () => {  navigate("/dashboard/animaltransfer/transactions", {
              replace: true
            }) } }
          >
            Transfers
          </button>
          <button 
            className="rounded px-5 py-2 text-white font-bold hover:bg-primary-400 hover:text-white bg-primary"
            onClick={ () => {  navigate("/dashboard/animaltransfer/selection", {
              replace: true
            }) } }
          >
            Transfer Animal
          </button>
        </div>
      </div>

      {/** USER SELECTION STATE */}
      <div className= {`px-24 py-5 flex flex-col ${ animalTransferPageState == AnimalTransferPageStatus.SELECTION ? "": "hidden"}` }>
          <div className="flex flex-row items-end">
            <SearchBar
              ref = {searchBarRef}
              label={`Send To`}
              onCustomSuggestion={  
                async (inputString: string) => {
                  //let url = `/table/animal/transfer/searchBusiness/?searchName=${inputString}`;
                  let url: string;
                  if(currentSearchType === BusinessSearchType.BUSINESS_NAME){
                    url = `/table/animal/transfer/searchBusiness/?searchType=businessName&searchName=${inputString}`;
                  } else {
                    url = `/table/animal/transfer/searchBusiness/?searchType=userEmail&searchEmail=${inputString}`;
                  }
                  let fetch_resp = await fetch(url)
                  if (fetch_resp.ok) {
                    const fetch_business_list = await fetch_resp.json();
                    let tempArr = []
                    if(currentSearchType === BusinessSearchType.BUSINESS_NAME){
                      for (const item of fetch_business_list.data){
                        tempArr.push(
                          {
                            label: item.BusinessName,
                            value: item.BusinessID,
                            data: item,
                            info: dataLoader.userData.BusinessID === item.BusinessID ? ' [Within Business]' : ''
                          }
                        )
                      }
                    } else {
                      for (const item of fetch_business_list.data){
                        tempArr.push(
                          {
                            label: item.Email,
                            value: item.BusinessID,
                            data: item,
                            info: ` - (${item.BusinessName}) ${dataLoader.userData.BusinessID === item.BusinessID ? ' [Within Business]' : ''}` 

                          }
                        )
                      }
                    }
                    return tempArr
                  } 
                }
              }
              onSelected={ ( {label,data}: SearchBarSuggestionData  ) => { 
                setSelectedBusinessId( {BusinessID:data.BusinessID,BusinessName: data.BusinessName});
            
                if(data.BusinessID == dataLoader.userData.BusinessID){
                  setCurrTransferBusinessType(transferBusinessType.WITHIN_BUSINESS)
                } 
                else {
                 setCurrTransferBusinessType(transferBusinessType.B2B)
                } 
                
              }}
              debounceInterval={500}
            ></SearchBar>
            <div className="py-5">
              <SelectDropdown
                label={' '}
                type="single"
                className="block w-full" 
                value={currentSearchType}
                options={businessSearchOptionBy} 
                onSelectChange={(opts) => { 
                  setCurrentSearchType(opts.value);
                  searchBarRef?.current?.clearInputSearch()
                }} 
              />
            </div>
            
          </div>
        
          {
            currTransferBusinessType === transferBusinessType.WITHIN_BUSINESS && 
            <div className="py-2">NOTE: You are transfering animal within the business herds</div>
          }
          
          <div className={`flex lg:gap-10 gap-5 flex-1 flex-col mb-2 md:flex-row py-3`}>
            <div>
              <SelectDropdown
                label={'From Herd'}
                type="single"
                className="block w-full" 
                value={selectedHerdCode.herdUuid}
                options={herdList} 
                onSelectChange={(opts) => { 
                  setSelectedHerdCode( { herdCode: opts.label, herdUuid: opts.value } );
                  setSelectedAnimalTransfer([]);
                }} 
              />
            </div>
            {
              currTransferBusinessType === transferBusinessType.WITHIN_BUSINESS && 
              (<>
                <div>
                  <SelectDropdown
                    label={'To Herd'}
                    type="single"
                    className="block w-full" 
                    value={toHerdCodeWithinTransfer.herdUuid}
                    options={herdList} 
                    onSelectChange={(opts) => { setToHerdCodeWithinTransfer({ herdCode: opts.label, herdUuid: opts.value } ) }} 
                  />
                </div>
              </>)
            }
       
            <div>
              <Search 
                className={''} 
                options={searchFilterOptions} 
                defaultSearch={'name'} 
                placeholder={'Search For'} 
                label={'Animal'} 
                name={'search'} 
                onChange={ (val, opt) => { 
                  setSearchFilter(val); 
                  if(opt){
                    setSearchFilterType(opt);
                  }
                }} 
              />
            </div>
          </div>
        
          <TableWidget 
            key={`animalTransferPage-${selectedHerdCode.herdCode}-${searchFilterType}-${searchFilter}`}
            type="animalTransferPage"
            isApp={false}
            hideColumnSettings={true}
            addParams={{herdCode: selectedHerdCode.herdCode, searchFilterType: searchFilterType ,searchFilter: searchFilter}}
            refreshOuter={ () => { accordionSelectAnimalRef.current?.recalcHeight() }} 
            customColumnData = {handleRowData}
          >
          </TableWidget>
          

          {
            (currTransferBusinessType === transferBusinessType.B2B && selectedAnimalTransfer.length > 0 && selectedBusinessId?.BusinessID ) &&
            <section className='flex flex-row gap-3 bg-grey-light md:bg-transparent px-5 py-10'>
              <Button 
                type="button"
                className='ml-auto px-10 py-2'
                onClick={() => {
                  setAnimalTransferPageState(AnimalTransferPageStatus.CONFIRMATION)
                }}
              >
                Next
              </Button>
            </section>
          }

          {
            (currTransferBusinessType === transferBusinessType.WITHIN_BUSINESS && selectedAnimalTransfer.length > 0 && selectedBusinessId?.BusinessID && toHerdCodeWithinTransfer.herdUuid && (toHerdCodeWithinTransfer.herdUuid != selectedHerdCode.herdUuid) ) &&
            <section className='flex flex-row gap-3 bg-grey-light md:bg-transparent px-5 py-10'>
              <Button 
                type="button"
                className='ml-auto px-10 py-2'
                onClick={() => {
                  setAnimalTransferPageState(AnimalTransferPageStatus.CONFIRMATION)
                }}
              >
                Next
              </Button>
            </section>
          }
      </div>         

      {/** USER CONFIRMATION STATE */}
      <div className=  {animalTransferPageState === AnimalTransferPageStatus.CONFIRMATION ? "px-24 py-5 flex flex-col" : "hidden px-24 py-5 flex flex-col"}>
        <div className="overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4">
        {
          currTransferBusinessType === transferBusinessType.B2B 
           ? <div className="py-3 text-3xl font-bold">You will be transferring {selectedAnimalTransfer.length} animal(s) to {selectedBusinessId?.BusinessName}</div>
           : <div className="py-3 text-3xl font-bold">You will be transferring {selectedAnimalTransfer.length} animal(s) from Herd {selectedHerdCode.herdCode} to Herd {toHerdCodeWithinTransfer.herdCode} within the business.</div>
        }
        
          <table className="min-w-full table-print relative">
            <thead className="font-signika text-lg">
                <tr className="[&>th:first-child]:rounded-l [&>th:last-child]:rounded-r bg-primary-500">
                  <th key="th-id" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">ID</th>
                  <th key="th-animalName" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Animal Name</th>
                  <th key="th-breed" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Breed</th>
                  <th key="th-status" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Status</th>
                  <th key="th-dateOfBirth" className="px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left">Date Of Birth</th>
                </tr>         
            </thead>
            <tbody className="">
              {
                selectedAnimalTransfer.map((val, idx) => {
                  return (
                    <tr key={`list-${idx}`} className={idx % 2 !== 0 ? "bg-gray-100" : ""}>
                      <td className="p-3" key={`${idx}-animal`}>{val.animalId}</td>
                      <td className="p-3" key={`${idx}-name`}>{val.name}</td>
                      <td className="p-3" key={`${idx}-breed`}>{val.breed}</td>
                      <td className="p-3" key={`${idx}-status`}>{val.status}</td>
                      <td className="p-3" key={`${idx}-date`}>{ formatDate(val.dateOfBirth, "{DD/MM/YYYY}") }</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
          <div className="py-3 font-bold">Please confirm the animals you are transferring. You will not be able to undo this action.</div>
        </div>
        <section className='flex flex-row w-full justify-between gap-3 bg-grey-light md:bg-transparent px-5 py-2'>
          <Button 
            type="button"
            className='px-10 py-2 bg-white text-primary border-primary font-extrabold' 
            onClick={() => {
              setAnimalTransferPageState(AnimalTransferPageStatus.SELECTION)
            }}
          >
            Previous
          </Button>
          <Form method="POST" onSubmit={ async (e) => { await handleSubmit(e)} }>
            <Button 
              type="submit"
              className='px-10 py-2 font-extrabold'
              onClick={ async () => {
                let currStr: string= Date.now().toString()
                setSubmitRequestStr(currStr)
                //setShowDialog(true)
              }}
            > 
              Confirm
            </Button>
          </Form>
        </section>          
      </div>

      {/** TRANSFER DIALOG STATE */}
      <Dialog
        isOpen={showDialog}
        color={`${actionData?.isError ? 'error' : 'primary'}`}
        //color={`primary`}
        icon={`${actionData?.isError ? 'error':'success'}`}
        title={`${actionData?.isError ? 'Error':'Success'}`}
        message={
          `${actionData?.isError ? 
            `${actionData?.message} ${actionData?.errors}` :    
            `${selectedAnimalTransfer.length} animal(s) transferred to ${selectedBusinessId?.BusinessName}`} 
          `}
        buttons={[
          {
            text: 'Close',
            variant: 'black',
            onClick: () => {
              if(actionData?.isError){
                setShowDialog(false)
              } else {
                setShowDialog(false)
                navigate("/dashboard/animaltransfer/transactions", {
                  replace: true
                })
              }
            },
          },
        ]}
      />
      
    </div>
  )
}