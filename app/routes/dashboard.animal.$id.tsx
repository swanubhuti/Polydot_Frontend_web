import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from "@remix-run/node";
import { Form, useFetcher, useLoaderData, Link, useRouteError, useLocation, useActionData, useNavigation, useOutletContext } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaAngleDown, FaAngleLeft, FaAngleUp, FaImage, FaPencil } from "react-icons/fa6";
import toast, { Toaster } from 'react-hot-toast';

import TableWidget, { type TableWidgetRef } from "~/components/TableWidget";
import Accordion, { type AccordionRef } from "~/components/ui/Accordion";
import type { GenericAPI, GraphQLReturn } from "~/lib/types";
import { formatDate } from "~/lib/utils";
import { callAPI, getUserAccessToken, invalidateUserHeaders } from "~/session.server";
import moment from "moment";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Cropper, { type ReactCropperElement } from "react-cropper";
import Button from "~/components/ui/Button";
import Spinner from "~/components/ui/Spinner";
import type { ChartTypes } from "~/components/ReportChartWidget";
import type { ChartDataTypes } from "~/lib/chartTypes";
import Popover from "~/components/ui/Popover";
import ErrorMessage from "~/components/ui/ErrorMessage";
import { Toast } from "~/components/Toast";
import Checkbox from "~/components/ui/Checkbox";

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Animal ID ${request.params.id}` },
    { name: "description", content: "Easy Dairy Animal Profile" },
  ];
};

const thumbSize = 320

type Field = {
  label: string,
  value: any,
  dateField?: boolean,
  dateFormat?: string,
  link?: string,
  checkbox?: boolean
}
type LoadDefault = {
  animalUuid: string,
  isApp: boolean,
  animalPhoto: string,
  businessId: string,
  animal: {
    animalId: string,
    name: string,
    status: string,
    summary: Field[],
    herdUuid: string,
    herdCode: string
    easyDairyName: string
  },
  tabs: {
    label: string,
    name: string,
    table?: boolean,
    tableShow?: string,
    details?: Field[],
    filterOpts?: {
      [key: string]: {label: string, value: string}[]
    },
    chart?: {
      id: ChartDataTypes,
      type: ChartTypes,
      title?: string
    },
    defaultRow?: {total: number, hasNext: boolean, rows: {[key: string]: string}[]},
    tableLabel?: string,
    rowClick?: boolean,
    count?: number
  }[],
  lactationTotal: number,
  pageConfig: Record<string, {
    visible: boolean;
    title: string;
  }>,
}

async function fetchUserData(request: Request, accessToken: string) {
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);

  if (!res.success) {
    throw new Error("Fail to get user data");
  }
  const user = res.response;
  if (!user.UserID || !user.BusinessID) {
    throw new Error("Got bad user data");
  }
  return {
    UserID: user.UserID,
    BusinessID: user.BusinessID,
    Enterprise: user.Enterprise,
    AnimalPageConfig: user.AnimalPageConfig,
  }
}

export async function loader({request, params}: LoaderFunctionArgs) {
  const {accessToken, headers, isApp, userData} = await getUserAccessToken(request, true);
  const animalUuid = params.id;
  let animalData: { [key: string]: any } = {};
  const query = `
  query {
    groupAnimalViews (filter: { animalUuid: { equalTo: "${animalUuid}" } }) 
    {
      nodes {
        animalUuid
        animalId
        herdUuid
        herdCode
        easyDairyName
        name
        breed
        calvingDate
        lactationNo
        daysInMilk
        status
        dateOfBirth
        dryOffDate
        dryOffDue
        studName
        herdbook
        terminationCode
        mastitisCount
        mastitis
        matings
        weeksInCalf
        lastMatingDate
        calvingDueDate
        lastMatingSireName
        damId
        damUuid
        sireId
        sireUuid
        confirmPregnant
        whMeat
        whMilk
        drugSession
      }
    }
    animalEventViews (
      first: 10,
      offset: 0,
      condition: {
        animalUuid: "${animalUuid}"
      }
      orderBy: EVENT_DATE_DESC
    )
    {
      aggregates {
        distinctItems {
          drugName
          staffId
          eventDescription
        }
      }
        nodes {
          eventDescription
          drugAmount
          drugName
          notes
          eventDate
          staffId
        }
        pageInfo {
            hasNextPage
        }
        totalCount
    }
    workabilityAnimalViews(
      first: 1
      offset: 0,
      condition: {
        animalUuid: "${animalUuid}"
      }
    ) {
      nodes {
        likability
        milkingSpeed
        temperament
        lactationNo
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
      }
      totalCount
    }
    animalLactationViews(
      first: 1
      offset: 0,
      condition: {
        animalUuid: "${animalUuid}"
      }
    ) {
      totalCount
    }
  }
  `;
  const animalInfo = await callAPI<GraphQLReturn>(request, '/api/graphql', {query}, undefined, accessToken)
  if (!animalInfo.success || 'errors' in animalInfo.response) {
    console.error(`FATAL ERROR: Failed to retrieve animal data for ${params.animalId}`, `source: ${request.url}`, animalInfo.response, userData)
    throw new Response("Failed to retrieve animal data", {status: 400})
  }
  if (animalInfo.response.data.groupAnimalViews.nodes.length === 0) {
    return redirect('/dashboard', headers)
  }

  animalData = animalInfo.response.data.groupAnimalViews.nodes.length > 0 ? animalInfo.response.data.groupAnimalViews.nodes[0] : {}
  const eventTableData = animalInfo.response?.data?.animalEventViews || {}
  const animalWorkability = animalInfo.response?.data?.workabilityAnimalViews?.nodes.length > 0 ? animalInfo.response?.data?.workabilityAnimalViews?.nodes[0] : {}
  let lactationTotal = animalInfo.response.data.animalLactationViews.totalCount
  const damQuery = `
    query {
      daughters: groupAnimalViews (
        filter: {
          or: [
            { damUuid: {equalTo: "${animalData.animalUuid}" }},
            { sireUuid: {equalTo: "${animalData.animalUuid}" }}
          ]
        }
        condition:{ 
          damUuid:"${animalData.animalUuid}"
          gender:"F"
        }
      )
      {
        nodes {
          animalId
        }
        totalCount
      }
    }
  `;
  let daughterTotal = 0
  let edId = ''
  const moreAnimalInfo = await callAPI<GraphQLReturn>(request, '/api/graphql', {query:damQuery}, undefined, accessToken)
  if (moreAnimalInfo.success && !('errors' in moreAnimalInfo.response)) {
    if (moreAnimalInfo.response.data.daughters) {
      daughterTotal = moreAnimalInfo.response.data.daughters.totalCount ?? 0
    }
  }
  console.log('daughters?', daughterTotal, moreAnimalInfo)

  function addTab(tabs: LoadDefault['tabs'], tab: LoadDefault['tabs'][number], insert: boolean) {
    if (insert) {
      tabs.push(tab);
    }
    return tabs;
  }

  let tabs: LoadDefault['tabs'] = [];
  addTab(
    tabs,
    {
      label: 'Cow Details',
      name: 'cow',
      table: false,
      details: [
        { label: 'Sire', value: animalData.sireId, link: animalData.sireId && animalData.sireUuid ? '/dashboard/bulls/' + animalData.sireUuid : undefined  },
        { label: 'Dam', value: animalData.damId, link: animalData.damId && animalData.damUuid ? '/dashboard/animal/' + animalData.damUuid : undefined },
        { label: 'Stud Name', value: animalData.studName },
        { label: 'Herdbook', value: animalData.herdbook },
        { label: 'Termination', value: animalData.terminationCode },
      ],
    },
    true
  );
  addTab(
    tabs,
    {
      label: 'Reproduction Statistics',
      name: 'reproduction',
      table: false,
      details: [
        {
          label: 'Expected Calving Date',
          value: animalData.calvingDueDate,
          dateField: true,
          dateFormat: '{DD/MM/YYYY} | [-d] Days',
        },
        { label: 'Expected Calving Sire', value: animalData.lastMatingSireName },
        { label: 'Weeks in Calf', value: animalData.weeksInCalf },
        { label: 'Matings', value: animalData.matings },
        {
          label: 'Last Mating/Heat Date',
          value: animalData.lastMatingDate,
          dateField: true,
          dateFormat: '{DD/MM/YYYY} | [d] Days',
        },
        { label: 'Confirmed Pregnant', value: Boolean(animalData.confirmPregnant), checkbox: true },
      ],
    },
    true
  );
  addTab(
    tabs,
    {
      label: 'Events',
      name: 'events',
      table: true,
      tableLabel: 'Events',
      defaultRow: eventTableData?.totalCount
        ? {
            total: eventTableData?.totalCount,
            hasNext: eventTableData?.pageInfo?.hasNextPage ?? false,
            rows: eventTableData?.nodes,
          }
        : undefined,
    },
    true
  );
  addTab(
    tabs,
    {
      label: 'Lactations: ',
      name: 'lactation',
      table: true,
      tableShow: 'Previous Lactations',
      count: lactationTotal,
      tableLabel: 'Lactations',
      rowClick: true,
      chart: { id: 'lactation', type: 'combo' },
    },
    true
  );
  addTab(
    tabs,
    { label: 'Daughters: ', name: 'bull_daughters', table: true, tableLabel: 'Daughters', count: daughterTotal },
    true
  );
  addTab(tabs, { label: 'Production', name: 'production', table: true, tableLabel: 'Production Statistics' }, true);

  const isEnterprise = userData?.['Enterprise'];
  addTab(
    tabs,
    {
      label: 'Animal Transfer Records',
      name: 'animalTransferRecords',
      table: true,
      tableShow: 'Transfer Records',
      tableLabel: 'Transfers',
      rowClick: false,
    },
    isEnterprise
  );
  addTab(
    tabs,
    {
      label: 'Workability',
      name: 'workabilityByAnimal',
      table: false,
      details: [
        { label: 'Likability', value: animalWorkability.likability },
        { label: 'Temperament', value: animalWorkability.temperament },
        { label: 'Milking Speed', value: animalWorkability.milkingSpeed },
      ],
    },
    true
  );
  addTab(
    tabs,
    {
      label: 'Classification Scores',
      name: 'classifications',
      table: true,
      tableShow: 'Classification',
      tableLabel: 'Scores',
      rowClick: false,
    },
    isEnterprise
  );
  addTab(
    tabs,
    {
      label: 'Live Weights',
      name: 'liveweightsByAnimal',
      table: true,
      tableShow: 'Liveweights Sessions',
      tableLabel: 'Liveweights',
      rowClick: false,
    },
    isEnterprise
  );
  addTab(
    tabs,
    {
      label: 'Average Daily Weight Gain',
      name: 'liveweightAverageDailyWeightGainByAnimal',
      table: true,
      tableShow: 'Average Daily Weight Gain',
      tableLabel: 'Average Daily Weight Gain',
      rowClick: false,
    },
    isEnterprise
  );

  if (!animalData.herdUuid) {
    throw new Error("Missing herd id on this animal.")
  }
  // configure page
  const defaultPageConfig = userData.AnimalPageConfig as { Items: string[]; HerdUUID: string }[];
  const defaultItems = defaultPageConfig?.find(tc => tc.HerdUUID === animalData.herdUuid)?.Items;

  let pageConfig: LoadDefault['pageConfig'] = {};
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    if (tab.name === 'production') {
      continue;
    }
    const found = !!defaultItems?.length && defaultItems?.findIndex(t => t === tab.name) !== -1;
    const visible = defaultItems === undefined || found;
    pageConfig[tab.name] = {visible, title: tab.label.replace(/:\s+$/g, "")}
  }

  // picture
  const client = new S3Client({
    region: 'ap-southeast-2'
  });

  let animalphoto = ''
  const command = new GetObjectCommand({
    Bucket: "easydairy-public",
    Key: `userUploads/${userData['BusinessID']}/${animalData.animalUuid}_thumb.jpg`,
  });
  try {
    const response = await client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const str = await response.Body?.transformToByteArray();
    if (str) {
      animalphoto = 'data:image/jpeg;base64,' + Buffer.from(str).toString('base64')
    }
  } catch (err) {
    // console.error(err);
  }

  return json({
    animalUuid: animalUuid,
    isApp: isApp,
    animalPhoto: animalphoto,
    businessId: userData['BusinessID'],
    animal: {
      ...animalData,
      summary: [
        {label: 'Date of Birth', value: animalData.dateOfBirth, dateField: true, dateFormat: "{DD/MM/YYYY} | [y]y [m]m"},
        {label: 'Breed', value: animalData.breed},
        {label: 'Calving Date', value: animalData.calvingDate, dateField: true, dateFormat: "{DD/MM/YYYY} | [d] Days"},
        {label: 'Due Dry Date', value: animalData.dryOffDue, dateField: true, dateFormat: "{DD/MM/YYYY} | [-d] Days"},
        {label: 'Dry Off Date', value: animalData.dryOffDate, dateField: true, dateFormat:'{DD/MM/YYYY} | [d] Days'},
        {label: 'Clinical Mastitis Cases', value: animalData.mastitisCount},
        {label: 'Withholding Milk Date', value: moment(animalData.whMilk).isAfter() ? animalData.whMilk : null, dateField: true, dateFormat: '{DD/MM/YYYY} | [-d] Days'},
        {label: 'Withholding Meat Date', value: moment(animalData.whMeat).isAfter() ? animalData.whMeat : null, dateField: true, dateFormat: '{DD/MM/YYYY} | [-d] Days'},
        {label: 'Herd Code', value: animalData.herdCode},
        {label: 'Easy Dairy ID/Name', value: animalData.easyDairyName}
      ]
    },
    tabs: tabs,
    pageConfig,
  }, headers)
}

// actions

async function userUpload(formData: FormData) {
  const imgName = formData.get("name")
  const imgData = await (formData.get("image") as Blob).arrayBuffer()
  const thumbName = formData.get("thumbname")
  const thumbImg = await (formData.get("thumb") as Blob).arrayBuffer()
  const client = new S3Client({
    region: 'ap-southeast-2'
  });
  const mainImg = new PutObjectCommand({
    Bucket: 'easydairy-public',
    Key: `userUploads/${imgName}`,
    Body: Buffer.from(imgData),
    ContentType: 'image/jpeg'
  })
  const thumb = new PutObjectCommand({
    Bucket: 'easydairy-public',
    Key: `userUploads/${thumbName}`,
    Body: Buffer.from(thumbImg),
    ContentType: 'image/jpeg'
  })

  try {
    await client.send(mainImg)
    await client.send(thumb)
    return json({complete: true, errors: ''})
  } catch (err) {
    console.error(err)
    return json({complete: true, errors: err})
  }
}

async function configurePage(request: Request, formData: FormData) {
  try {
    const {accessToken} = await getUserAccessToken(request, true);
    const userData = await fetchUserData(request, accessToken);

    const herdId = formData.get("herdUuid")?.toString();
    if (!herdId) {
      return json({intent: "configurePage", errors: {message: "Missing herdId"}})
    }

    const pageConfig: {HerdUUID: string; Items: string[]}[] = userData.AnimalPageConfig?.slice() ?? [];

    const items: string[] = [];
    for (const [k, v] of formData.entries()) {
      if (k !== "herdUuid" && k !== "intent" && v === "on") {
        items.push(k.toString());
      }
    }
    const newConfig = {
      HerdUUID: herdId,
      Items: items,
    };

    const idx = pageConfig.findIndex(p => p.HerdUUID === herdId);
    if (idx === -1) {
      pageConfig.push(newConfig);
    } else {
      pageConfig.splice(idx, 1, newConfig);
    }

    const payload = {animalPageConfig: pageConfig};
    const res = await callAPI<GenericAPI>(request, `/api/account`, payload, "PATCH");
    if (!res.success && res.response.errors ) {
      return json({intent: "configurePage", errors: { message: res.response.errors}});
    }
    return json({intent: "configurePage", errors: null}, {
      headers: await invalidateUserHeaders(request),
    });
  } catch (error) {
    console.log("configurePage", error);
    return json({intent: "configurePage", errors: { message: "Something went wrong"}});
  }
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  switch (intent) {
    case "upload":
      return await userUpload(formData);
    case "configurePage":
      return await configurePage(request, formData);
    default:
      throw new Error(`Unregconized action intent '${intent}'`)
  }
}

const formatFields = (data: {label: string, value: string, dateField?: boolean, dateFormat?: string, link?: string, checkbox?: boolean}[], ) => {
  return data.map((sm) => {
    return {
      label: sm.label,
      value: 'dateField' in sm ? (sm.value ? formatDate(new Date(sm.value).toDateString(), sm.dateFormat) : '----') : (sm.value || sm.value == '0' ? sm.value : '-'),
      link: sm.link ?? undefined,
      checkbox: sm.checkbox ?? undefined
    }
  })
}

export default function AnimalProfile() {
  const navigation = useNavigation();
  const data = useLoaderData<LoadDefault>();
  const actionData = useActionData<typeof action>();
  const tableRef = useRef<TableWidgetRef>(null)
  const fetcher = useFetcher()
  const {addParams} = useOutletContext<{addParams: (val: Record<string, string>) => void}>()
  const [expanded, setExpanded] = useState(() => {
    let expandList: {[key: string]: boolean} = {summary: true}
    data.tabs.forEach((tb) => {
      expandList[tb.name] = false
      if (tb.table && 'details' in tb) {
        expandList[`${tb.name}Inner`] = false
      }
    })
    return expandList
  })
  const handleRowData = (rowData: {[key: string]: string}) => {
    if (rowData) {
        const startDate = rowData.calvingDate ? moment(rowData.calvingDate).format('YYYY-MM-DD') : ''
        tableRef.current?.triggerFilter('start', startDate)
        const endDate = rowData.terminationDate ? moment(rowData.terminationDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
        tableRef.current?.triggerFilter('end', endDate)
    }
  };
  const summaryRef = useRef<HTMLDivElement>(null)
  const accordionList = useRef<(AccordionRef | null)[]>([])
  const summaryFields = useMemo(() => formatFields(data.animal.summary as LoadDefault['animal']['summary']), [data])
  const [spinnerActive, setSpinnerActive] = useState(false)
  const [cropImg, setCropImg] = useState({img: '', width: 0, height: 0})
  const [animalImg, setAnimalImg] = useState(data.animalPhoto)
  const cropperRef = useRef<ReactCropperElement>(null)
  const expandAll = useMemo(() => {
    let totalExpanded = 0
    let totalTabs = 0
    Object.entries(expanded).forEach(([k,v]) => {
      totalExpanded += (k !== 'summary' && !k.endsWith('Inner') && v) ? 1 : 0
      totalTabs += k !== 'summary' && !k.endsWith('Inner') ? 1 : 0
    })
    return {open: totalExpanded !== totalTabs, close: totalExpanded !== 0}
  }, [expanded])
  const triggerRecalculateHeight = useCallback((idx: number) => () => {
    accordionList.current[idx]?.recalcHeight()
  }, [])
  const showHideAll = useCallback((show: boolean) => () => {
    setExpanded((prev) => {
      let copy = {...prev}
      Object.entries(copy).forEach(([k, v]) => {
        if (k.endsWith('Inner')) {
          copy[k as keyof typeof copy] = false
        } else if (k !== 'summary') {
          copy[k as keyof typeof copy] = show
        }
      })
      return copy
    })
  }, [])
  const uploadImg = useCallback(() => {
    if (typeof cropperRef.current?.cropper !== "undefined") {
      setSpinnerActive(true)
      let canvas = document.createElement('canvas')
      canvas.width = thumbSize
      canvas.height = thumbSize
      let c = canvas.getContext("2d")
      const img = new Image()
      img.crossOrigin = "anonymous"
      let blobObj: Blob
      cropperRef.current.cropper.getCroppedCanvas({
        width: cropImg.width,
        height: cropImg.height
      }).toBlob(blob => {
        img.src = URL.createObjectURL(blob!)
        setAnimalImg(img.src)
        blobObj = blob!
      }, 'image/jpeg', 0.7)
      img.onload = async () => {
        c?.drawImage(img, 0, 0, thumbSize, thumbSize)
        const thumbBlob: Blob = await new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.7))
        let body = new FormData();
        body.set('image', blobObj, `${data.businessId}/${data.animalUuid}.jpg`);
        body.set('name', `${data.businessId}/${data.animalUuid}.jpg`)
        body.set('thumbname', `${data.businessId}/${data.animalUuid}_thumb.jpg`)
        body.set('thumb', thumbBlob, `${data.businessId}/${data.animalUuid}_thumb.jpg`)
        body.set('intent', 'upload')
        fetcher.submit(body, {method: "POST", encType: 'multipart/form-data'})
        setCropImg({img: '', width: 0, height: 0})
      }
    }
  }, [cropImg.width, cropImg.height, data.businessId, data.animalUuid])

  const goBack = () => window.history.back()

  const [tableTotalCount, setTableTotalCount] = useState<Record<string, number>>(() => {
    let result: Record<string,number> = {};
    const tables = Object.keys(data.pageConfig);
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      result[t] = 0;
    }
    return result;
  });

  useEffect(() => {
    setTimeout(() => {
      const firstRow: HTMLElement | null = document.querySelector('#lactation-table table > tbody > tr:first-child')
      if (firstRow) {
        firstRow.click()
      }
    }, 1000)
    addParams({events: `?animalId=${data.animal.animalId}`})
    return () => {
      addParams({})
    }
  }, [])
  useEffect(() => {
    setSpinnerActive(false)
  }, [fetcher.data])

  useEffect(()=> {
    if(!actionData || navigation.state !== 'idle') {
      return;
    }
    if (
      "intent" in actionData && actionData.intent === "configurePage" &&
      actionData.errors
    ) {
      const msg = (actionData.errors as any).message
      toast.error(msg, {
        duration: 3000,
      });
    }
  }, [actionData, navigation.state]);

  return (
    <div className="">
      <Toast />
      <div className="border-b border-b-gray-200 pb-4 shadow-md bg-white">
        <div className="">
          <div className="lg:flex lg:justify-between px-4 items-center">
            {!data.isApp && <div className="py-4 whitespace-nowrap">
              <button type="button" onClick={goBack} className="text-primary-500 underline gap-1 flex items-center font-bold">
                <FaAngleLeft />
                Back
              </button>
            </div>}
            <div className={`font-bold grid m-auto transition-all rounded overflow-hidden max-w-[320px] grid-cols-1 lg:mx-0 md:w-full md:max-w-[664px] md:grid-cols-2`}>
              <div className="bg-gray-200 p-2 min-h-[72px] flex items-center justify-center">
                <h3 className="text-primary-500 md:text-2xl text-xl">Status: {data.animal.status}</h3>
              </div>
              <div className="bg-primary-500 flex items-start p-2">
                <div className="flex-1 text-center">
                  <h4 className="text-white text-lg">Animal ID</h4>
                  <h5 className="text-white text-lg">{data.animal.animalId}</h5>
                </div>
                <div className="flex-1 text-center">
                  <h4 className="text-white whitespace-nowrap text-lg">Animal Name</h4>
                  <h5 className="text-white text-lg">{data.animal.name}</h5>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4">
            <div ref={summaryRef} className="mt-4 flex flex-col lg:flex-row gap-10 transition-all duration-500 overflow-hidden" style={{maxHeight: expanded.summary ? summaryRef.current?.scrollHeight : 0, maxWidth: expanded.summary ? "100%" : 0}}>
            <div className="p-3 grid md:grid-cols-3 grid-cols-1 gap-10 flex-grow">
              {summaryFields.map((sm, idx) =>
                <div key={`summary-${idx}`}>
                  <p className="font-bold">{sm.label}</p>
                  <p className="mt-2">{sm.value}</p>
                </div>
              )}
            </div>
              <label htmlFor="animalphoto" className="self-center hover:underline items-center w-full md:w-1/3 max-w-[320px]">
                {animalImg 
                ? <div className="relative">
                    <img src={animalImg} className="w-full aspect-square" alt="animal" />
                    <div className="cursor-pointer z-10 absolute inset-0 bg-white/80 flex opacity-0 hover:opacity-100 items-center justify-center underline text-primary-500 p-2">
                      <span>Replace Image</span>
                    </div>
                  </div>
                : 
                  <div className="aspect-square bg-gray-300 flex gap-2 justify-center items-center cursor-pointer">
                    <FaImage />
                    <span>Upload Image</span>
                  </div>
                }
              </label>
              <input id="animalphoto" type="file" accept="image/*" onChange={(e) => {
                if (e.target.value && e.target.files?.length) {
                  const reader = new FileReader()
                  reader.addEventListener('load', () => {
                    const img = new Image()
                    img.onload = () => {
                      setCropImg({img: reader.result as string, width: img.naturalWidth, height: img.naturalHeight})
                      e.target.value = ''
                    }
                    img.src = reader.result as string
                  })
                  reader.readAsDataURL(e.target.files[0])
                } else {
                  setCropImg({img: '', width: 0, height: 0})
                }
              }} className="hidden" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="m-2 p-2 flex items-center gap-2" onClick={() => setExpanded({...expanded, summary: !expanded.summary})}>
              {expanded.summary ? 
                <>
                  <FaAngleUp />
                  <span className="text-primary-500 underline font-bold">Minimize</span>
                </>
                : <>
                  <FaAngleDown />
                  <span className="text-primary-500 underline font-bold">Expand</span>
                </>
              }
            </button>
          </div>
        </div>
      </div>
      <div className="">
        <div className="flex justify-between p-2 mt-4 items-center">
          <div className="px-2">
            {data.isApp ? 
              <Button type="button" onClick={() => {
                  //@ts-ignore
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({actionData: {url: `/dashboard/events/${data.animal.herdUuid}?animalId=${data.animal.animalId}`, title: 'Events'}, type: "openPage"}));
                }}>Manage Events</Button>
              : <Button link={`/dashboard/events/${data.animal.herdUuid}?animalId=${data.animal.animalId}`} variant="primary">Manage Events</Button>}
          </div>
          <div className="flex justify-end gap-4 items-center">
            <Popover>
              <Popover.Trigger asChild>
                <button type="button" className="flex flex-row gap-1.5 text-primary font-semibold items-center underline">
                  <FaPencil className="w-4 h-4" /> Configure
                </button>
              </Popover.Trigger>
              <Popover.Content align="end" alignOffset={1} className="relative p-0 min-w-[400px]" >
                <Popover.CloseButton className="top-3 right-4" />
                <Form method="POST" className="py-4">
                  <p className="font-semibold text-primary text-lg px-6">
                    Show Items
                  </p>
                  <input hidden name={"herdUuid"} onChange={()=>{}} value={data.animal.herdUuid} />
                  <hr className="mx-6 mt-3 border-t border-t-grey-200" />
                  <ul className="max-h-[350px] overflow-y-auto px-6 py-3">
                    {
                      Object.entries(data.pageConfig).map(([key, val]) => {
                        return <li key={key} className="flex py-2 px-1 gap-3 items-center">
                          <Checkbox variant="primary" id={key} name={key} defaultChecked={val.visible} />
                          <label htmlFor={key}>{val.title}</label>
                        </li>
                      })
                    }
                  </ul>
                  <hr className="mx-6 mb-4 border-t border-t-grey-200" />
                  <Button className="mx-6" type="submit" name="intent" onChange={()=>{}} value={"configurePage"}>Save</Button>
                </Form>
              </Popover.Content>
            </Popover>
            {expandAll.close && <button type="button" className="text-primary-500 underline font-bold p-2" onClick={showHideAll(false)}>
              Close All Tabs
            </button>}
            {expandAll.open && <button type="button" className="text-primary-500 underline font-bold p-2" onClick={showHideAll(true)}>
              Open All Tabs
            </button>}
          </div>
        </div>
        <div className="p-4 flex flex-col">
          {data.tabs.map((dt, idx) =>
            dt.name != 'production' && (data.pageConfig[dt.name].visible === true || (dt.table && tableTotalCount[dt.name] > 0)) && 
            <Accordion key={`tabprofile-${idx}`} ref={(el) => (accordionList.current[idx] = el)} title={`${'count' in dt ? dt.label+dt.count : dt.label}`} expanded={expanded[dt.name]} setExpand={() => setExpanded((prev) => {
              let copy = {...prev}
              if (copy[dt.name] || !data.isApp) {
                return {...copy, [dt.name]: !copy[dt.name]}
              }
              Object.entries(copy).forEach(([k, v]) => {
                if (k !== 'summary') {
                  copy[k] = k === dt.name
                }
              })
              return copy
            })}>
              <>
                {dt.details && <div className={`p-3 grid md:grid-cols-3 grid-cols-1 gap-10 pt-8 ${dt.table ? "pb-6": "pb-14"}`}>
                  {formatFields(dt.details).map((sm, i) =>
                    <div key={`profiledetail-${i}`}>
                      <p className="font-bold">{sm.label}</p>
                      <p className="mt-2">
                        {
                          sm.link 
                          ?
                            <Link className="text-primary-500 underline font-bold link-print" to={sm.link} >{sm.value}</Link>
                          :
                            sm.checkbox
                            ?
                              <input
                                id={sm.label}
                                type="checkbox"
                                className="form-checkbox mb-3 h-6 w-6 accent-primary-500"
                                checked={sm.value ? true : false}
                                readOnly={true}
                              />
                            :
                              sm.value
                        }
                      </p>
                    </div>
                  )}
                </div>}
                {dt.table && 
                  <div className={`pb-10`}>
                    {/* {dt.chart && data.animalUuid && <div className="pt-3"><ChartWidget {...dt.chart} herdList={{}} defaultValues={{animalUuid: data.animalUuid}} /></div>} */}
                    <TableWidget 
                      type={dt.name} 
                      boxed={true} 
                      chart={dt.chart}
                      filterOpts={dt.filterOpts}
                      addParams={dt.name == 'bull_daughters' ? {} : {animalUuid: data.animalUuid}} 
                      defaultData={dt.defaultRow} 
                      refreshOuter={triggerRecalculateHeight(idx)} 
                      print={false} 
                      tableLabel={dt.tableLabel}
                      rowClick={dt.rowClick}
                      returnRowData={dt.name === 'lactation' ? handleRowData : undefined}
                      filterDefault={dt.name == 'bull_daughters' ? [
                        { label: 'damId', value: data.animal.animalId, name: 'damId' },
                        { label: 'gender', value: "F", name: 'gender' },
                      ]: undefined}
                      onTotalChange={(total) => {
                        setTableTotalCount((prev) => ({...prev, [dt.name]: total}));
                      }}
                    />
                  </div>
                }
                {
                  dt.name == 'lactation' &&
                  <div className={`pb-10`}>
                    <TableWidget 
                      type={'production'} 
                      chart={{id: 'lactationTestDay', type: 'combo', title: 'Test Day Results for selected lactation'}}
                      boxed={true} 
                      addParams={{animalUuid: data.animalUuid}}
                      // refreshOuter={triggerRecalculateHeight(idx)} 
                      defaultData={{rows:[], total:0, hasNext:false}}
                      print={false} 
                      tableLabel={'Test Day Results'}
                      ref={tableRef}
                    />
                  </div>
                }
              </>
            </Accordion>
          )}
        </div>
      </div>
      {cropImg.img && 
      <div className="fixed inset-0 z-50 flex flex-col gap-2 items-center p-4 bg-white/75 backdrop-blur-sm overflow-auto">
        <Cropper
          src={cropImg.img}
          // className="flex-grow"
          // style={{ width: "100%" }}
          // Cropper.js options
          initialAspectRatio={1}
          aspectRatio={1}
          minCropBoxHeight={320}
          minCropBoxWidth={320}
          // autoCrop={false}
          autoCropArea={1}
          guides={true}
          // zoomTo={0.5}
          viewMode={2}
          background={false}
          zoomable={false}
          // crop={() => {
          //   if (typeof cropperRef.current?.cropper !== "undefined") {
          //     setAnimalImg(cropperRef.current?.cropper.getCroppedCanvas().toDataURL());
          //   }
          // }}
          ref={cropperRef}
        />
        <fetcher.Form method="POST" className="w-full flex justify-center gap-10">
          <Button type="button" variant="outline" onClick={() => setCropImg({img: '', width: 0, height: 0})}>Cancel</Button>
          <Button type="button" onClick={uploadImg}>Crop & Save</Button>
        </fetcher.Form>
      </div>}
      <Spinner active={spinnerActive} />
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  const location = useLocation();
  console.error(error.data || error.message);
  return (
    <div className='flex flex-col justify-center'>
      <ErrorMessage message={error.data || error.message} />
      <Link
        replace
        to={location.pathname}
        className='focus:outline-none enabled:hover:opacity-80 transition ease-in-out duration-100 focus-visible:ring-offset-2 border border-transparent font-signika mx-auto px-4 py-2 bg-black focus-visible:ring-2 focus-visible:ring-black text-white rounded'
      >
        Go Back
      </Link>
    </div>
  );
}
