import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from '@remix-run/node';
import { useLoaderData, useMatches, useRouteError } from '@remix-run/react';
import { useCallback, useEffect, useRef } from 'react';
import BarChartWidget from '~/components/Chart';
import TableWidget, { type TableWidgetRef } from '~/components/TableWidget';
import ErrorMessage from '~/components/ui/ErrorMessage';
import { requireVisibleHerds } from '~/lib/middleware/herd';
import type { ColPreference, GenericAPI, GraphQLReturn } from '~/lib/types';
import { getVisibleHerdsFilter, storeLocal, tableTypes } from '~/lib/utils';
import { callAPI, getUserAccessToken, updateSettingsCookie } from '~/session.server';

export const meta: MetaFunction = ({ matches }) => {
  const lastMatch = matches[matches.length - 1];
  return [
    { title: `Easy Dairy Herd${lastMatch.params.herduuid ? ` - Herd ${lastMatch.params.herduuid}` : ''}` },
    { name: 'description', content: 'Easy Dairy Herd' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  let { accessToken, headers, isApp, userData } = await getUserAccessToken(request, true);
  const {currentHerdCode} = await requireVisibleHerds(request, userData as any, params.herduuid ?? '');

  const reportPrefDb = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET');
  let reportPrefs: ColPreference[0] = { columns: [], herdCode: '', subtype: '' };
  let herdTestReportPrefs: ColPreference[0] = { columns: [], herdCode: '', subtype: '' };
  if (reportPrefDb.success && reportPrefDb.response.Reports) {
    reportPrefs = reportPrefDb.response.Reports.find(
      (rp: ColPreference[0]) => rp.herdCode === currentHerdCode && rp.subtype === 'status'
    );
    herdTestReportPrefs = reportPrefDb.response.Reports.find(
      (rp: ColPreference[0]) => rp.herdCode === currentHerdCode && rp.subtype === 'herdTestAvg'
    );
  }

  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      groups (
        condition: {
          herdUuid: "${params.herduuid}"
        }
      ) 
      {
        nodes {
          groupName
          groupUuid
          status
          count
        }
      }
      groupAnimalViews (
        first: 10
        offset: 0
        condition: {
          herdUuid: "${params.herduuid}"
        }
        filter: {
          status: {in: ["Calf","Yearling","Heifer","In Milk","Dry"]}
        }
      )
      {
        aggregates {
          distinctItems {
            breed
          }
        }
        nodes {
          animalUuid
          ${tableTypes.status.columns
            .filter((c) => (reportPrefs?.columns?.length ? reportPrefs.columns.includes(c.name) : !c.hide))
            .map((c) => c.name)
            .join('\n')}
        }
        pageInfo {
          hasNextPage
        }
        totalCount
      }
    }`,
    },
    undefined,
    accessToken
  );

  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve group data for ${params.herduuid}`, `source: ${request.url}`, userData)
    throw new Response('Failed to retrieve group data', { status: 400 });
  }

  let animalStatus: { status: string; total: number }[] = [];
  let statusData: { status: string; total: number; type: string; }[] = [];
  let animalCount = 0;
  let groupList: { label: string; value: string; type: string }[] = [];
  const animalStatusList = ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves'];
  const managementGroupOrdering = [
    'Not Joined 60 Days',
    'Empty 100 Days',
    'Fertility Problem Cows',
    'Preg Test Due',
    'Not Cycling',
    'Due To Cycle',
    'Clinical Mastitis Cases',
    'Vet Check Required',
  ];
  response.data?.groups?.nodes?.forEach((g) => {
    if (animalStatusList.includes(g.groupName)) {
      animalStatus.push({
        status: g.groupName,
        total: Number(g.count),
      });
      groupList.push({ label: g.groupName, value: g.groupUuid, type: g.status });
    } else if (g.groupName === 'All Animals Currently In Herd') {
      animalCount = g.count;
    } else if (g.groupName !== 'All Animals Ever In Herd') {
      statusData.push({
        status: g.groupName,
        type: g.status,
        total: Number(g.count),
      });
      groupList.push({ label: g.groupName, value: g.groupUuid, type: g.status });
    }
  });
  groupList.push({ label: 'Dead/Sold', value: 'deadsold', type: "default" });
  groupList.sort((a,b) => a.label.localeCompare(b.label));
  animalStatus = animalStatus.sort((a, b) => animalStatusList.indexOf(a.status) - animalStatusList.indexOf(b.status));
  statusData = statusData.filter(s => s.type === 'default').sort(
    (a, b) => managementGroupOrdering.indexOf(a.status) - managementGroupOrdering.indexOf(b.status)
  );

  const tableData = response.data?.groupAnimalViews || {};

  const cookieHeader = request.headers.get('Cookie');
  const cookie = (await updateSettingsCookie.parse(cookieHeader)) || {};
  //update every 12 hours max
  if (!headers && (!cookie.groups || cookie.groups + 12 * 60 * 60 * 1000 < Date.now())) {
    await callAPI<object>(request, '/api/account/group', undefined, 'POST', accessToken);
    cookie.groups = Date.now();
    headers = { headers: { 'Set-Cookie': await updateSettingsCookie.serialize(cookie) } };
  }

  return json(
    {
      healthStatus: statusData,
      animalStatus: animalStatus,
      currentHerd: params.herduuid,
      currentCode: currentHerdCode,
      animalCount,
      breedList: tableData?.aggregates?.distinctItems?.breed?.map((b) => ({ label: b, value: b })),
      groupList: groupList,
      animalTable: tableData?.nodes,
      totalRows: tableData?.totalCount,
      hasNext: tableData?.pageInfo?.hasNextPage,
      columnPref: reportPrefs?.columns ?? [],
      herdTestReportPrefs: herdTestReportPrefs?.columns ?? [],
      isApp: isApp,
      fullPref: reportPrefDb.success && reportPrefDb.response.Reports ? reportPrefDb.response.Reports : [],
    },
    headers
  );
}

export async function action({ request }: ActionFunctionArgs) {}

export default function HerdGroups() {
  const data = useLoaderData<typeof loader>();
  const tableRef = useRef<TableWidgetRef>(null);
  const changeFilter = useCallback(
    (val: { value: string }) => {
      const opt = data.groupList.find((opt) => opt.label === val.value);
      if (opt) {
        tableRef.current?.triggerFilter('group', opt.value, opt.label);
        const scrollTop = document.querySelector('#AnimalList')?.getBoundingClientRect().top || 850;
        window.scrollTo({ top: scrollTop + window.scrollY, behavior: 'smooth' });
      }
    },
    [data.groupList]
  );
  useEffect(() => {
    storeLocal('colPref', data.fullPref);
  }, [data.fullPref]);
  useEffect(() => {
    storeLocal('herdUuid', data.currentHerd);
  }, [data.currentHerd]);
  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='bg-grey-100 py-6 px-4 flex gap-8 text-black flex-col lg:flex-row'>
        <div className='bg-white p-6 flex-grow lg:min-w-[38%]'>
          <h2 className='md:text-2xl text-xl pt-3 pb-3 border-b border-b-gray-300'>Total Animals in Herd</h2>
          <p className='font-bold mt-10 mb-2'>Current Herd</p>
          <p className=''>{data.currentCode}</p>
          <div className='bg-gray-100 md:h-24 h-16 flex items-center justify-center mt-10 rounded'>
            <h3 className='md:text-3xl text-xl p-1 text-primary-500'>Total Animals: {data.animalCount}</h3>
          </div>
        </div>
        <div className='bg-white flex-grow p-4'>
          <h3 className='md:text-2xl text-xl mb-3 pt-3 pl-1'>Status Groups</h3>
          <BarChartWidget
            key={data.currentHerd}
            data={data.animalStatus}
            categoryOnClick={changeFilter}
            layout='horizontal'
            category='status'
            number='total'
          />
        </div>
      </div>
      <div className='bg-grey-100 py-6 px-4'>
        <div className='bg-white'>
          <h3 className='md:text-2xl text-xl p-4'>Management Groups</h3>
          <BarChartWidget
            key={data.currentHerd}
            data={data.healthStatus}
            categoryOnClick={changeFilter}
            layout='vertical'
            category='status'
            number='total'
          />
        </div>
        <div id='AnimalList' className='mt-10'>
          <div className='bg-white p-4'>
            <h3 className='md:text-2xl text-xl mb-3 pt-3'>Animal List</h3>
            <TableWidget
              key={`status-${data.currentHerd}`}
              ref={tableRef}
              type='status'
              isApp={data.isApp}
              showWithholding={true}
              filterOpts={{ breed: data.breedList!, group: data.groupList }}
              filterDefault={[{ label: 'Groups', name: 'group', value: '' }]}
              addParams={{ herdUuid: data.currentHerd! }}
              defaultData={{ rows: data.animalTable, total: data.totalRows!, hasNext: data.hasNext! }}
              columnPref={data.columnPref}
              print={false}
            />
          </div>
        </div>
        <div className='mt-10 bg-white p-4'>
          <h3 className='md:text-2xl text-xl mb-3 pt-3'>Herd Test Average</h3>
          <TableWidget
            type='herdTestAvg'
            isApp={data.isApp}
            chart={{id: 'herdTestAverage', type: 'combo', hideHerdFilter: true}}
            key={`herdTestAvg-${data.currentHerd}`}
            addParams={{ herdCode: data.currentCode!, herdUuid: data.currentHerd! }}
            columnPref={data.herdTestReportPrefs}
            print={false}
          />
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
