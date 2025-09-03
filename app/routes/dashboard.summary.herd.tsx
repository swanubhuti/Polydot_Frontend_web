import { type ComponentPropsWithoutRef, useState, useMemo } from 'react';
import { type LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData, useRouteError } from '@remix-run/react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
} from 'recharts';

import ErrorMessage from '~/components/ui/ErrorMessage';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';
import { colors, getVisibleHerdsFilter } from '~/lib/utils';
import { renderActiveShape } from '~/components/ReportChartWidget';
import { BiChevronDown } from 'react-icons/bi';
import Popover from '~/components/ui/Popover';
import Checkbox from '~/components/ui/Checkbox';

type GroupEntry = {
  name: string;
  type: string;
} & { [key: string]: number };

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, headers, userData } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  if (!res.success) {
    console.error(`FATAL ERROR: Failed to get user data`, `source: ${request.url}`, userData)
    throw new Error('Fail to get user data');
  }
  const userDataDb = res.response;
  if (!userDataDb.Enterprise) {
    return redirect('/dashboard');
  }
  let visibleFilter = getVisibleHerdsFilter(userDataDb as any);
  let filter = visibleFilter ? `(${visibleFilter})` : '';
  const initCall = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      herds ${filter}
      {
        nodes {
          herdUuid
          herdCode
        }
      }
    }`,
    },
    undefined,
    accessToken
  );
  if (!initCall.success || 'errors' in initCall.response) {
    console.error(`FATAL ERROR: Failed to retrieve herd data}`, `source: ${request.url}`, initCall.response, userData)
    throw new Response('Failed to retrieve herd data', { status: 400 });
  }
  if (!initCall.response.data.herds.nodes.length) {
    console.error(`FATAL ERROR: No herd found`, `source: ${request.url}`, userData)
    throw new Response('No herd found', { status: 404 });
  }
  const validStatus = ['Heifers', 'In Milk', 'Dry', 'Calves', 'Yearlings'];
  let herdUuids: { [key: string]: string } = {};
  let gqlAlias: { [key: string]: string } = {};

  initCall.response.data.herds.nodes.forEach((n, i) => {
    herdUuids[n.herdUuid] = n.herdCode;
    gqlAlias[`herd_animal_count_${i}`] = n.herdUuid;
  });

  let gqlCounts: string[] = [];
  for (const [k, v] of Object.entries(gqlAlias)) {
    gqlCounts.push(`
        ${k}: groupAnimalViews (
            condition: {
                herdUuid: "${v}"
            }
            filter: {
              not: {
                  status: { in: ["Dead", "Sold"]}
              }
            }
        )
        {
            totalCount
        }
    `);
  }

  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      groups (
        filter: {
          herdUuid: {in: ["${Object.keys(herdUuids).join('","')}"]}
        }
      )
      {
        nodes {
          groupName
          groupUuid
          status
          herdUuid
          count
        }
      }
      ${gqlCounts.join('\n')}
    }`,
    },
    undefined,
    accessToken
  );
  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve chart data`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve chart data', { status: 400 });
  }

  let herdData: { [key: string]: { [key: string]: string | number } } = {};
  let herdGroupData: { [key: string]: GroupEntry } = {};
  let pieData: { [key: string]: { name: string; value: number } } = {};
  let pieGroupData: { [key: string]: { name: string; value: number } } = {};
  let pieHerdData: { [key: string]: { name: string; value: number } } = {};
  let herdSet = new Set();
  let totalCows = 0;
  response.data.groups.nodes.forEach((n) => {
    const herdCode = herdUuids[n.herdUuid];
    if (!pieHerdData[herdCode]) {
      pieHerdData[herdCode] = {
        name: herdCode,
        value: 0,
      };
    }
    if (validStatus.includes(n.groupName)) {
      if (!herdData[n.groupName]) {
        pieData[n.groupName] = {
          name: n.groupName,
          value: 0,
        };
        herdData[n.groupName] = {
          name: n.groupName,
        };
      }
    } else if (!n.groupName.includes('All Animals')) {
      if (!herdGroupData[n.groupName]) {
        pieGroupData[n.groupName] = {
          name: n.groupName,
          value: 0,
        };
        herdGroupData[n.groupName] = {
          name: n.groupName,
          type: n.status,
        };
      }
    }
    herdSet.add(herdUuids[n.herdUuid]);
    if (validStatus.includes(n.groupName)) {
      pieData[n.groupName].value += Number(n.count);
      herdData[n.groupName][herdCode] = Number(n.count);
    } else if (!n.groupName.includes('All Animals')) {
      pieGroupData[n.groupName].value += Number(n.count);
      herdGroupData[n.groupName][herdCode] = Number(n.count);
    }
  });

  for (const [k, v] of Object.entries(response.data)) {
    if (k.startsWith('herd_animal_count_')) {
      const h = gqlAlias[k];
      const herdCode = herdUuids[h];
      if (h && pieHerdData[herdCode]) {
        const count = v.totalCount || 0;
        pieHerdData[herdCode].value = count;
        totalCows += count;
      }
    }
  }

  const animalStatusList = ['In Milk', 'Dry', 'Heifers', 'Yearlings', 'Calves'];
  let pieChart = Object.values(pieData);
  pieChart = pieChart.sort((a, b) => animalStatusList.indexOf(a.name) - animalStatusList.indexOf(b.name));
  let herdArrData = Object.values(herdData);
  herdArrData = herdArrData.sort(
    (a, b) => animalStatusList.indexOf(a.name as string) - animalStatusList.indexOf(b.name as string)
  );
  return json(
    {
      tab: params.tab,
      herdData: herdArrData,
      herdList: Array.from(herdSet),
      herdGroupData: Object.values(herdGroupData),
      pieData: pieChart,
      pieGroupData: Object.values(pieGroupData),
      pieHerdData: Object.values(pieHerdData),
      totalCows,
      // abvChart: response.data.abvChartViews.nodes
    },
    headers
  );
}

export default function DashboardHerds() {
  const data = useLoaderData<typeof loader>();
  const [pieActive, setPieActive] = useState(0);
  const [pieGroupActive, setPieGroupActive] = useState(0);
  const [pieHerdActive, setPieHerdActive] = useState(0);

  if ('error' in data) {
    return (
      <div>
        <h2 className='text-2xl text-center'>No Herds found</h2>
      </div>
    );
  }

  return (
    <div className='bg-gray-100 p-4 mb-6 mt-4 grid grid-cols-1 lg:grid-cols-9 xl:grid-cols-10 gap-4 items-stretch  grid-rows-[120px]'>
      <div className='bg-white p-4 text-center flex justify-center flex-col col-span-10 lg:col-span-3 row-span-1 xl:row-start-1 xl:col-span-1'>
        <h2 className='text-4xl'>{data.pieHerdData.length}</h2>
        <p>Herds</p>
      </div>

      <div className='bg-white p-4 text-center flex justify-center flex-col col-span-10 lg:col-span-3 row-span-1 xl:row-start-2 xl:col-span-1'>
        <h2 className='text-4xl'>{data.totalCows.toLocaleString()}</h2>
        <p>Animals</p>
      </div>
      <div className='bg-white p-4 text-center flex justify-center flex-col col-span-10 lg:col-span-3 row-span-1 xl:row-start-3 xl:col-span-1'>
        <h2 className='text-4xl'>{Math.round(data.totalCows / data.pieHerdData.length).toLocaleString()}</h2>
        <p>Average Herd Size</p>
      </div>
      <div className='min-w-[400px] bg-white flex-grow lg:col-span-3 row-span-3 col-span-10'>
        <h3 className='text-center text-2xl pt-3'>By Herd</h3>
        <ResponsiveContainer width='100%' height={320}>
          <PieChart height={320}>
            <Pie
              activeIndex={pieHerdActive}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setPieHerdActive(index)}
              cx='50%'
              cy='50%'
              data={data.pieHerdData}
              innerRadius={50}
              outerRadius={80}
              dataKey='value'
            >
              {data.pieHerdData.map((hl, ix) => (
                <Cell key={`piecell-${ix}`} fill={colors[colors.length - 1 - ix]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className='min-w-[400px] bg-white flex-grow lg:col-span-3 row-span-3 col-span-10'>
        <h3 className='text-center text-2xl pt-3'>By Status</h3>
        <ResponsiveContainer width='100%' height={320}>
          <PieChart height={320}>
            <Pie
              activeIndex={pieActive}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setPieActive(index)}
              cx='50%'
              cy='50%'
              data={data.pieData}
              innerRadius={50}
              outerRadius={80}
              dataKey='value'
            >
              {data.pieData.map((hl, ix) => (
                <Cell key={`piecell-${ix}`} fill={colors[colors.length - 1 - ix]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className='min-w-[400px] bg-white flex-grow lg:col-span-3 row-span-3 col-span-10'>
        <h3 className='text-center text-2xl pt-3'>By Group</h3>
        <ResponsiveContainer width='100%' height={320}>
          <PieChart height={320}>
            <Pie
              activeIndex={pieGroupActive}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setPieGroupActive(index)}
              cx='50%'
              cy='50%'
              data={data.pieGroupData}
              innerRadius={50}
              outerRadius={80}
              dataKey='value'
            >
              {data.pieGroupData.map((hl, ix) => (
                <Cell key={`piecell2-${ix}`} fill={colors[colors.length - 1 - ix]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className='bg-white lg:col-span-9 row-span-3 col-span-10 xl:col-span-3'>
        <h3 className='text-center text-2xl pt-3'>Status Breakdown</h3>
        <ResponsiveContainer width='100%' height={360}>
          <BarChart
            height={360}
            data={data.herdData}
            margin={{ left: 25, right: 20, top: 40, bottom: 20 }}
            layout='vertical'
          >
            <CartesianGrid strokeDasharray='3 3' />
            <YAxis type='category' dataKey='name' />
            <XAxis type='number' />
            <Tooltip />
            {data.herdList.map((hl, ix) => (
              <Bar dataKey={hl} key={`bar-${ix}`} stackId='b' fill={colors[ix]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className='bg-white lg:col-span-9 row-span-3 col-span-10 xl:col-span-7'>
        <GroupChart height={360} data={data.herdGroupData as any} herdList={data.herdList} />
      </div>
      {/*<div className="mt-4 bg-white">
            <h3 className="text-center text-2xl pt-3">ASI/BPI Scores</h3>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{right: 20, left: 20, bottom: 20}}>
                <CartesianGrid />
                <XAxis type="number" dataKey="asi" name="ASI" />
                <YAxis type="number" dataKey="bpi" name="BPI" />
                <Tooltip />
                {data.herdList.map((hl, idx) => 
                  <Scatter key={`scat-${idx}`} name={hl} data={data.abvChart.filter(abv => abv.herdCode === hl)} fill={colors[idx]} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>*/}
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}

const CustomTickLabel = (props: any) => {
  const { x, y, payload } = props;
  const label: string[] = payload.value?.match(/\b[\w\s]{6,}?(?=\s)|.+$/g) || [];
  return (
    <text x={x} y={y + 12} fill='#666666' fontSize={16} textAnchor='middle'>
      {label.map((l, idx) => (
        <tspan key={`txt-${idx}`} x={x} y={y + 12} dy={idx * 18} textAnchor='middle'>
          {l}
        </tspan>
      ))}
    </text>
  );
};

function GroupChart({ data, herdList, height }: { data: GroupEntry[]; herdList: string[]; height: number | string }) {
  const [shownGroups, setShownGroups] = useState(
    Array.from(
      new Set(
        data
          .filter((d) => d.type === 'default')
          .map((d) => d.name)
          .sort((a, b) => a.localeCompare(b))
      )
    )
  );

  const allGroups = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.name).sort((a, b) => a.localeCompare(b))));
  }, [data]);

  const filteredData = useMemo(() => {
    return data
      .filter((d) => shownGroups.findIndex((g) => g === d['name']) !== -1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shownGroups, data]);

  return (
    <>
      <div className='pt-3 flex items-baseline'>
        <h3 className='text-center text-2xl ml-auto mr-auto'>Group Breakdown</h3>
        <Popover>
          <Popover.Trigger asChild>
            <button className='mr-2 pl-4 pr-2 py-1.5 w-36 border border-gray-300 rounded text-gray-600 flex items-center group'>
              Groups
              <BiChevronDown className="w-6 h-6 ml-auto group-data-[state='open']:rotate-90 transition-transform" />
            </button>
          </Popover.Trigger>
          <Popover.Content align='end' side='bottom' sideOffset={5} className='p-0 pb-2 overflow-hidden'>
            <label className='flex gap-3 items-center px-3 py-3 text-base bg-primary-600 text-white'>
              <Checkbox
                checked={allGroups.length === shownGroups.length}
                variant='outline'
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setShownGroups(checked ? allGroups.slice() : []);
                }}
              />
              <p>Select All</p>
            </label>
            <div className='space-y-1 pt-1 h-72 overflow-auto'>
              {allGroups.map((group, idx) => (
                <label key={idx} className='flex flex-row gap-3 items-center px-3 py-1.5 text-base'>
                  <Checkbox
                    variant='primary'
                    checked={shownGroups.includes(group)}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setShownGroups((p) => {
                        if (checked) {
                          return p.concat(group);
                        }
                        return p.filter((g) => g !== group);
                      });
                    }}
                  />
                  <p>{group}</p>
                </label>
              ))}
            </div>
          </Popover.Content>
        </Popover>
      </div>
      <div className='w-full overflow-auto'>
        <CustomResponsiveContainer height={height} width={100 * filteredData.length}>
          <BarChart data={filteredData} margin={{ left: 20, right: 20, top: 40, bottom: 40 }} layout='horizontal'>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis type='category' dataKey='name' interval={0} tick={CustomTickLabel} />
            <YAxis type='number' />
            <Tooltip />
            {herdList.map((hl, ix) => (
              <Bar dataKey={hl} key={`bar-${ix}`} stackId='a' fill={colors[ix]} />
            ))}
          </BarChart>
        </CustomResponsiveContainer>
      </div>
    </>
  );
}

function CustomResponsiveContainer(props: ComponentPropsWithoutRef<typeof ResponsiveContainer>) {
  const [width, setWidth] = useState<string | number>(props.width || '100%');
  return (
    <ResponsiveContainer
      {...props}
      width={width}
      ref={(n: any) => {
        if (!n) {
          return;
        }
        const current = n.current as HTMLDivElement;
        const clientWidth = current.parentElement?.clientWidth as number;
        if (typeof props.width === 'number') {
          if (props.width < clientWidth) {
            setWidth('100%');
          } else {
            setWidth(props.width);
          }
        }
      }}
    >
      {props.children}
    </ResponsiveContainer>
  );
}
