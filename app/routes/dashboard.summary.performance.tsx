import { useState } from 'react';
import { type LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData, useRouteError } from '@remix-run/react';
import { LuArrowBigDown, LuArrowBigUp } from 'react-icons/lu';
import {
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  ComposedChart,
  Line,
  LineChart,
  Legend,
} from 'recharts';

import ErrorMessage from '~/components/ui/ErrorMessage';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';
import { getVisibleHerdsFilter } from '~/lib/utils';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, headers, userData } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  if (!res.success) {
    console.error(`FATAL ERROR: Failed to get user data`, `source: ${request.url}`, userData)
    throw new Error("Fail to get user data");
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
    console.error(`FATAL ERROR: Failed to retrieve herd data`, `source: ${request.url}`, initCall.response, userData)
    throw new Response('Failed to retrieve herd data', { status: 400 });
  }
  if (!initCall.response.data.herds.nodes.length) {
    console.error(`FATAL ERROR: No herd found`, `source: ${request.url}`, userData)
    throw new Response('No herd found', { status: 404 });
  }
  const validStatus = ['Heifers', 'In Milk', 'Dry', 'Calves', 'Yearlings'];
  let herdUuids: { [key: string]: string } = {};
  initCall.response.data.herds.nodes.forEach((n) => {
    herdUuids[n.herdUuid] = n.herdCode;
  });
  const yearDisplay = new Date().getFullYear();
  const minDate = yearDisplay - 4;
  const years = Array(yearDisplay - minDate + 1)
    .fill(0)
    .map((_, idx) => String(minDate + idx));
  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      groups (
        filter: {
          herdUuid: {in: ["${Object.keys(herdUuids).join('","')}"]}
          status: { equalTo: "active" }
        }
      )
      {
        nodes {
          groupName
          groupUuid
          herdUuid
          count
        }
      }
      milkChartViews (
        filter: {
          herdUuid: {in: ["${Object.keys(herdUuids).join('","')}"]}
          year: {greaterThanOrEqualTo: ${minDate - 1}, lessThanOrEqualTo: ${yearDisplay}}
        }
      )
      {
        nodes {
          herdUuid
          herdCode
          totalMilk
          totalCows
          avgMilk
          fatPct
          proteinPct
          year
        }
      }
      eventChartViews (
        filter: {
          herdUuid: {in: ["${Object.keys(herdUuids).join('","')}"]}
          year: {greaterThanOrEqualTo: ${minDate}, lessThanOrEqualTo: ${yearDisplay}}
        }
      )
      {
        nodes {
          herdUuid
          herdCode
          avgDaysInMilk
          animalsSold
          animalsDied
          calvings
          treatments
          year
        }
      }
      weightChartViews (
        filter: {
          herdUuid: {in: ["${Object.keys(herdUuids).join('","')}"]}
          year: {greaterThanOrEqualTo: ${minDate}, lessThanOrEqualTo: ${yearDisplay}}
        }
      )
      {
        nodes {
          herdUuid
          herdCode
          year
          avgWeightGain
        }
      }
      abvChartViews (
        filter: {
          herdUuid: {in: ["${Object.keys(herdUuids).join('","')}"]}
          status: {in: ["${validStatus.join('","')}"]}
        }
      )
      {
        nodes {
          herdCode
          animalId
          asi
          reliability
          bpi
          bpiReliability
        }
      }
    }`,
    },
    undefined,
    accessToken
  );
  if (!success || 'errors' in response) {
    throw new Response('Failed to retrieve chart data', { status: 400 });
  }
  const colors = [
    '#bc4749',
    '#a7c957',
    '#8ECAE6',
    '#219EBC',
    '#023047',
    '#613dc1',
    '#6a994e',
    '#FFB703',
    '#e63946',
    '#FB8500',
    '#386641',
    '#9b5de5',
    '#f15bb5',
    '#8a5a44',
    '#00a6fb',
    '#ff595e',
  ];

  let summary: { [key: string]: { [key: string]: number } } = {};
  const summaryYears = [String(minDate - 1), ...years];
  summaryYears.forEach((y) => {
    summary[y] = {
      milk: 0,
      fat: 0,
      protein: 0,
      avgMilk: 0,
      avgDays: 0,
      YoYInc: 0,
      YoYAvg: 0,
      cow: 0,
      calvings: 0,
      treatments: 0,
      sold: 0,
      dead: 0,
      milkRowCount: 0,
      avgDaysMilkCount: 0,
    };
  });
  response.data.milkChartViews.nodes.forEach((node) => {
    summary[node.year].milk += Number(node.totalMilk || 0);
    summary[node.year].fat += Number(node.fatPct || 0);
    summary[node.year].protein += Number(node.proteinPct || 0);
    summary[node.year].cow += Number(node.totalCows || 0);
    summary[node.year].avgMilk += Number(node.avgMilk || 0);
    summary[node.year].milkRowCount++;
    if (summary[node.year - 1] && summary[node.year - 1].milk > 0) {
      summary[node.year].YoYInc =
        Math.round(((summary[node.year].milk - summary[node.year - 1].milk) / summary[node.year - 1].milk) * 10000) /
        100;
      summary[node.year].YoYAvg =
        Math.round(
          ((summary[node.year].avgMilk / summary[node.year].milkRowCount -
            summary[node.year - 1].avgMilk / summary[node.year - 1].milkRowCount) /
            (summary[node.year - 1].avgMilk / summary[node.year - 1].milkRowCount)) *
            10000
        ) / 100;
    }
  });
  let avgMilkChart: { [key: string]: { [key: number | string]: number } } = {};
  let eventChart: { [key: string]: { [key: string]: number } } = {};
  years.forEach((y) => {
    eventChart[Number(y)] = {
      year: Number(y),
      'Cows Sold': 0,
      'Cows Died': 0,
      Treatments: 0,
      Calvings: 0,
    };
  });
  response.data.eventChartViews.nodes.forEach((n) => {
    if (!avgMilkChart[n.herdCode]) {
      avgMilkChart[n.herdCode] = {
        herd: n.herdCode,
      };
    }
    avgMilkChart[n.herdCode][n.year] = n.avgDaysInMilk;
    eventChart[n.year] = {
      year: n.year,
      'Cows Sold': eventChart[n.year]['Cows Sold'] + Number(n.animalsSold || 0),
      'Cows Died': eventChart[n.year]['Cows Died'] + Number(n.animalsDied || 0),
      Treatments: eventChart[n.year]['Treatments'] + Number(n.treatments || 0),
      Calvings: eventChart[n.year]['Calvings'] + Number(n.calvings || 0),
    };
    summary[n.year].avgDays += Number(n.avgDaysInMilk || 0);
    summary[n.year].calvings += Number(n.calvings || 0);
    summary[n.year].treatments += Number(n.treatments || 0);
    summary[n.year].sold += Number(n.animalsSold || 0);
    summary[n.year].dead += Number(n.animalsDied || 0);
    if (n.avgDaysInMilk > 0) {
      summary[n.year].avgDaysMilkCount++;
    }
  });
  let herdData: { [key: string]: { [key: string]: string | number } } = {};
  let herdGroupData: { [key: string]: { [key: string]: string | number } } = {};
  let pieData: { [key: string]: { name: string; value: number } } = {};
  let pieGroupData: { [key: string]: { name: string; value: number } } = {};
  let pieHerdData: { [key: string]: { name: string; value: number } } = {};
  let herdMilkChart: { [key: string]: { [key: string]: string | number } } = {
    [yearDisplay]: { name: yearDisplay, Total: 0 },
  };
  let herdCalveChart: { [key: string]: { [key: string]: string | number } } = {
    [yearDisplay]: { name: yearDisplay, Total: 0 },
  };
  let herdSet = new Set();
  let totalCows = 0;
  response.data.groups.nodes.forEach((n) => {
    if (!pieHerdData[herdUuids[n.herdUuid]]) {
      pieHerdData[herdUuids[n.herdUuid]] = {
        name: herdUuids[n.herdUuid],
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
        };
      }
    }
    herdSet.add(herdUuids[n.herdUuid]);
    if (validStatus.includes(n.groupName)) {
      pieData[n.groupName].value += Number(n.count);
      herdData[n.groupName][herdUuids[n.herdUuid]] = Number(n.count);
    } else if (!n.groupName.includes('All Animals')) {
      pieGroupData[n.groupName].value += Number(n.count);
      herdGroupData[n.groupName][herdUuids[n.herdUuid]] = Number(n.count);
    }
    pieHerdData[herdUuids[n.herdUuid]].value += Number(n.count);
    totalCows += Number(n.count);
  });

  response.data.milkChartViews.nodes.forEach((mc) => {
    if (!herdMilkChart[mc.year]) {
      herdMilkChart[mc.year] = {
        name: mc.year,
        Total: 0,
      };
    }
    herdMilkChart[mc.year][mc.herdCode] = mc.totalMilk || 0;
    herdMilkChart[mc.year].Total = Number(herdMilkChart[mc.year].Total) + Number(mc.totalMilk || 0);
  });
  response.data.eventChartViews.nodes.forEach((ec) => {
    if (!herdCalveChart[ec.year]) {
      herdCalveChart[ec.year] = { name: ec.year, Total: 0 };
    }
    herdCalveChart[ec.year][ec.herdCode] = ec.calvings || 0;
    herdCalveChart[ec.year].Total = Number(herdCalveChart[ec.year].Total) + Number(ec.calvings || 0);
  });
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
      colors,
      totalCows,
      yearDisplay,
      minDate,
      years,
      summaries: Object.entries(summary)
        .filter(([k, v]) => Number(k) >= minDate)
        .map(([k, v]) => ({
          year: k,
          main: [
            {
              value: `${v.milk.toLocaleString()}KG`,
              text: 'Milk Produced',
              incr: v.YoYInc > 0,
              percent: v.milkRowCount > 0 ? v.YoYInc : 100,
              subText: '',
            },
            {
              value: `${(v.milkRowCount > 0
                ? Math.round((v.avgMilk / v.milkRowCount) * 100) / 100
                : 0
              ).toLocaleString()}KG`,
              text: 'Average Milk per Cow',
              incr: v.YoYAvg > 0,
              percent: v.milkRowCount ? v.YoYAvg : 100,
              subText: '',
            },
            {
              value: `${v.cow.toLocaleString()}`,
              text: 'Cows Milked',
              incr: v.cow - summary[Number(k) - 1].cow > 0,
              percent: Math.round(((v.cow - summary[Number(k) - 1].cow) / summary[Number(k) - 1].cow) * 10000) / 100,
              subText: '',
            },
            {
              value: v.calvings.toLocaleString(),
              text: 'Calvings',
              incr: v.calvings > summary[Number(k) - 1].calvings,
              percent: Math.round(((v.calvings - summary[Number(k) - 1].calvings) / summary[Number(k) - 1].calvings) * 10000) /
                100,
              subText: '',
            },
          ].map(s => ({...s, subText: isNaN(s.percent) || s.percent === Infinity ? "N/A" : `${s.percent}% change from ${Number(k) - 1}`})),
          sub: [
            {
              value: `${v.milkRowCount > 0 ? (Math.round((v.fat / v.milkRowCount) * 100) / 100).toLocaleString() : 0}%`,
              text: 'Fat Content',
            },
            {
              value: `${v.milkRowCount > 0 ? Math.round((v.protein / v.milkRowCount) * 100) / 100 : 0}%`,
              text: 'Protein Content',
            },
            {
              value: `${v.avgDaysMilkCount > 0 ? Math.round((v.avgDays / v.avgDaysMilkCount) * 100) / 100 : 0}`,
              text: 'Avg Days in Milk',
            },
            { value: v.sold.toLocaleString(), text: 'Cows Sold' },
            { value: v.dead.toLocaleString(), text: 'Cows Died' },
            { value: v.treatments.toLocaleString(), text: 'Treatments' },
          ],
        })),
      herdMilkChart: Object.values(herdMilkChart),
      herdCalveChart: Object.values(herdCalveChart),
      avgMilkChart: Object.values(avgMilkChart),
      eventChart: Object.values(eventChart),
      // abvChart: response.data.abvChartViews.nodes
    },
    headers
  );
}

export default function DashboardPerformanceCharts() {
  const data = useLoaderData<typeof loader>();
  const [yearSelect, setYearSelect] = useState(data.summaries.length - 1);

  if ('error' in data) {
    return (
      <div>
        <h2 className='text-2xl text-center'>No Herds found</h2>
      </div>
    );
  }

  return (<>
          <ul className='flex gap-2 mb-2 items-center px-4 mt-2 flex-row-reverse justify-end'>
            {data.summaries.map((y, idx) => (
              <li key={`tab-${idx}`}>
                <button
                  type='button'
                  className={`${
                    yearSelect === idx ? ' border-b-primary-500' : 'hover:border-b-primary-100 border-b-transparent'
                  } border-b-4 px-6 py-2 text-lg font-signika`}
                  onClick={() => setYearSelect(idx)}
                >
                  Year {y.year}
                </button>
              </li>
            ))}
          </ul>
          <div className='grid grid-cols-4 gap-5 mb-5 px-4'>
            {data.summaries[yearSelect].main.map((sm, idx) => (
              <div key={`summain-${idx}`} className='flex gap-3 p-4 bg-gray-100 rounded items-center flex-col'>
                <h3 className='text-5xl'>{sm.value}</h3>
                <p className='text-lg block text-center'>{sm.text}</p>
                <p className='text-gray-500 align-middle'> 
                  {(!isNaN(sm.percent) && sm.percent !== null && sm.percent !== Infinity) && 
                    (sm.incr ? (
                      <LuArrowBigUp className='fill-green-500 stroke-green-500 text-2xl align-middle inline-block' />
                    ) : (
                      <LuArrowBigDown className='fill-red-500 stroke-red-500 text-2xl align-middle inline-block' />
                    ))
                  }
                  {sm.subText}
                </p>
              </div>
            ))}
          </div>
          <div className='grid grid-cols-6 gap-5 mb-10 px-4'>
            {data.summaries[yearSelect].sub.map((sm, idx) => (
              <div key={`sumsub-${idx}`} className='flex gap-2 p-4 bg-gray-100 rounded items-center'>
                <strong className=''>{sm.value}</strong>
                <span className='text-center'>{sm.text}</span>
              </div>
            ))}
          </div>
          <div className='mt-10 px-4 py-8 bg-gray-100'>
            <h2 className='mb-8 text-4xl text-center'>
              Performance from {data.minDate} to {data.yearDisplay}
            </h2>
            <div className='grid grid-cols-3 gap-5'>
              <div className='bg-white'>
                <h2 className='text-2xl p-4'>Milk Production</h2>
                <ResponsiveContainer width='100%' height={400}>
                  <ComposedChart height={400} data={data.herdMilkChart} margin={{ left: 30, right: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='name' name='Year' />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(lbl) => `Year ${lbl}`}
                      formatter={(val) => `${Number(val).toLocaleString()}KG`}
                    />
                    {data.herdList.map((hl, ix) => (
                      <Bar dataKey={hl} key={`bar-${ix}`} stackId='a' fill={data.colors[ix]} />
                    ))}
                    <Line dataKey='Total' stroke='#22378c' />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className='bg-white'>
                <h2 className='text-2xl p-4'>Calvings</h2>
                <ResponsiveContainer width='100%' height={400}>
                  <ComposedChart height={400} data={data.herdCalveChart} margin={{ left: 20, right: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='name' name='Year' />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(lbl) => `Year ${lbl}`}
                      formatter={(val) => `${Number(val).toLocaleString()}`}
                    />
                    {data.herdList.map((hl, ix) => (
                      <Bar dataKey={hl} key={`bar-${ix}`} stackId='a' fill={data.colors[ix]} />
                    ))}
                    <Line dataKey='Total' stroke='#22378c' />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className='bg-white'>
                <h2 className='text-2xl p-4'>Events</h2>
                <ResponsiveContainer width='100%' height={400}>
                  <LineChart height={400} data={data.eventChart} margin={{ left: 20, right: 20, bottom: 15 }}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='year' name='Year' padding={{ left: 20, right: 20 }} />
                    <YAxis />
                    <Legend />
                    <Tooltip
                      labelFormatter={(lbl) => `Year ${lbl}`}
                      formatter={(val) => `${Number(val).toLocaleString()}`}
                    />
                    <Line type='monotone' dataKey='Treatments' stroke={data.colors[0]} />
                    <Line type='monotone' dataKey='Calvings' stroke={data.colors[1]} />
                    <Line type='monotone' dataKey='Cows Sold' stroke={data.colors[2]} />
                    <Line type='monotone' dataKey='Cows Died' stroke={data.colors[3]} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className='mb-4 mt-6 bg-white p-4'>
              <h2 className='text-4xl mb-4 text-center mt-4'>Average Days in Milk</h2>
              <table className='min-w-full relative mb-8'>
                <thead className='font-signika text-lg'>
                  <tr className='[&>th:first-child]:rounded-l [&>th:last-child]:rounded-r bg-primary-500'>
                    <th className='px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left'>
                      Herd Code
                    </th>
                    {data.years.map((y, idx) => (
                      <th
                        key={`thead-${idx}`}
                        className='px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left'
                      >
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.avgMilkChart.map((av, idx) => (
                    <tr key={`tr-${idx}`} className={`border-t border-t-gray-200 ${idx % 2 > 0 ? ' bg-gray-100' : ''}`}>
                      <td className='p-3'>{av.herd}</td>
                      {data.years.map((y, ix) => (
                        <td key={`td-${idx}-${ix}`} className='p-3'>
                          {av[y] || 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}