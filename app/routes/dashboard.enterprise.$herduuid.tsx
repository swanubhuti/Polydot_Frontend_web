import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData, useRouteError } from '@remix-run/react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TableWidget from '~/components/TableWidget';
import Accordion, { type AccordionRef } from '~/components/ui/Accordion';
import MobileDateRangePicker from '~/components/ui/MobileDateRangePicker';
import ErrorMessage from '~/components/ui/ErrorMessage';
import type { ColPreference, GenericAPI, GraphQLReturn } from '~/lib/types';
import { getVisibleHerdsFilter, storeLocal } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';

export const meta: MetaFunction = () => {
  return [{ title: `Easy Dairy Enterprise` }, { name: 'enterprise', content: 'Easy Dairy Enterprise Details' }];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { isApp, accessToken } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  if (!res.success) {
    throw new Error("Fail to get user data");
  }
  const userData = res.response;

  if (userData.Herds && !userData.Herds.includes(params.herduuid)) {
    console.error(`FATAL ERROR: Not allowed to view herd ${params.herduuid}`, `source: ${request.url}`, userData)
    throw new Response('Not allowed to view this herd', { status: 401 });
  }

  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      herds (
        condition: {
          herdUuid: "${params.herduuid}"
        }
        ${getVisibleHerdsFilter(userData as any)}
      )
      {
        nodes 
        {
          herdUuid
          herdCode
          name
        }
      }
    }`,
    },
    'POST',
    accessToken
  );
  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve herd data for ${params.herdUuid}`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve herd data', { status: 400 });
  }

  const herdData = response.data.herds.nodes[0];
  if (!herdData) {
    console.error(`FATAL ERROR: No herd found for ${params.herdUuid}`, `source: ${request.url}`, userData)
    throw new Response('No herd found', { status: 404 });
  }
  const reportPrefDb = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET');
  let reportPrefs: Record<string, ColPreference[0]> = {};
  if (reportPrefDb.success && reportPrefDb.response.Reports) {
    reportPrefs = reportPrefDb.response.Reports.filter((rp: ColPreference[0]) => rp.herdCode === herdData.herdCode).reduce(
      (result: Record<string, ColPreference[0]>, r: ColPreference[0]) => {
        result[r.subtype] = { columns: r.columns, herdCode: '', subtype: r.subtype };
        return result;
      },
      {}
    );
  }
  return json({
    currentHerd: params.herduuid,
    herdCode: herdData.herdCode!,
    isApp,
    easyDairyId: userData.EasyDairyID,
    columnPrefs: reportPrefs,
    herdData: herdData,
    tabs: [
      // {label: 'Herd Test Average', name: 'herdTestAvg', table: true},
      { label: 'Live Weights', name: 'liveweightsByHerd', table: true },
      { label: 'Latest Weight Gain', name: 'liveweightLatestWeightGainByHerd', table: true },
      { label: 'Latest Average Daily Weight Gain', name: 'liveweightLatestAverageDailyWeightGainByHerd', table: true },
      { label: 'Liveweight History', name: 'liveweightsHistoryByHerd', table: true },
      { label: 'ABV Scores', name: 'abv', table: true },
      { label: 'Workability', name: 'workabilityByAnimal', table: true },
    ],
  });
}

export default function HerdPage() {
  const data = useLoaderData<typeof loader>();
  const [expanded, setExpanded] = useState(() => {
    let expandList: { [key: string]: boolean } = { summary: true };
    data.tabs.forEach((tb) => {
      expandList[tb.name] = false;
      if (tb.table && 'details' in tb) {
        expandList[`${tb.name}Inner`] = false;
      }
    });
    return expandList;
  });
  const accordionList = useRef<(AccordionRef | null)[]>([]);
  const expandAll = useMemo(() => {
    let totalExpanded = 0;
    let totalTabs = 0;
    Object.entries(expanded).forEach(([k, v]) => {
      totalExpanded += k !== 'summary' && !k.endsWith('Inner') && v ? 1 : 0;
      totalTabs += k !== 'summary' && !k.endsWith('Inner') ? 1 : 0;
    });
    return { open: totalExpanded !== totalTabs, close: totalExpanded !== 0 };
  }, [expanded]);
  const triggerRecalculateHeight = useCallback(
    (idx: number) => () => {
      accordionList.current[idx]?.recalcHeight();
    },
    []
  );
  const showHideAll = useCallback(
    (show: boolean) => () => {
      setExpanded((prev) => {
        let copy = { ...prev };
        Object.entries(copy).forEach(([k, v]) => {
          if (k.endsWith('Inner')) {
            copy[k as keyof typeof copy] = false;
          } else if (k !== 'summary') {
            copy[k as keyof typeof copy] = show;
          }
        });
        return copy;
      });
    },
    []
  );

  useEffect(() => {
    storeLocal('herdCode', data.currentHerd);
  }, [data.currentHerd]);

  const [weightHistoryRangeDate, setWeightHistoryRangeDate] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [weightHistoryRangeDisplayDate, setWeightHistoryRangeDisplayDate] = useState<{ startDate: Date; endDate: Date, error?: string }>({
    startDate: new Date(),
    endDate: new Date(),
  });

  const validateWeightHistoryRange = useCallback(({startDate, endDate}: { startDate: Date; endDate: Date }) => {
    const endOfToday = moment().endOf('date');
    if (moment(startDate).isAfter(endOfToday)) {
      return new Error("Start Date cannot be after today's date");
    }
    if (moment(endDate).isAfter(endOfToday)) {
      return new Error("End Date cannot be after today's date");
    }

    const monthDiff = moment(endDate).diff(moment(startDate), 'months', true);
    if (monthDiff > 24) {
      return new Error("Range must not be more than 24 months.");
    }
    return null;
  }, []);

  return (
    <div className='mt-5'>
      <div className='shadow-[0_5px_10px_-5px_rgba(0,0,0,0.3)]'>
        <div className='pb-3 px-4'>
          <div className='mb-10 px-2 grid gap-8 grid-cols-1 md:grid-cols-4'>
            <div className='rounded overflow-hidden'>
              <div className='h-16 p-2 bg-gray-200 flex items-center justify-center'>
                <h3 className='text-primary-500 text-2xl'>Herd Code: {data.herdData.herdCode}</h3>
              </div>
              <div className='bg-primary-500 p-2 flex justify-center h-16 items-center'>
                <p className='font-signika text-white text-xl'>{data.herdData.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className=''>
        <div className='flex justify-end p-2 mt-4 gap-4'>
          {expandAll.close && (
            <button type='button' className='text-primary-500 underline font-bold p-2' onClick={showHideAll(false)}>
              Close All Tabs
            </button>
          )}
          {expandAll.open && (
            <button type='button' className='text-primary-500 underline font-bold p-2' onClick={showHideAll(true)}>
              Open All Tabs
            </button>
          )}
        </div>
        <div className='p-4 flex flex-col'>
          {data.tabs.map(
            (dt, idx) =>
              dt.name && (
                <Accordion
                  key={`tabprofile-${idx}`}
                  ref={(el) => (accordionList.current[idx] = el)}
                  title={dt.label}
                  expanded={expanded[dt.name]}
                  setExpand={() => setExpanded({ ...expanded, [dt.name]: !expanded[dt.name] })}
                >
                  <>
                    {dt.name != 'liveweightsHistoryByHerd' && (
                      <div className='mt-5 pb-5'>
                        <TableWidget
                          type={dt.name}
                          key={`${dt.name}-${data.currentHerd}`}
                          addParams={{ herdCode: data.herdCode }}
                          refreshOuter={triggerRecalculateHeight(idx)}
                          columnPref={data.columnPrefs[dt.name]?.columns}
                          print={false}
                        />
                      </div>
                    )}
                    {dt.name == 'liveweightsHistoryByHerd' && (
                      <div className='mt-5 pb-5'>
                        <TableWidget
                          key={`liveweightsHistoryByHerd-${
                            data.currentHerd
                          }-${weightHistoryRangeDate.startDate.getFullYear()}${
                            weightHistoryRangeDate.startDate.getMonth() + 1
                          }${weightHistoryRangeDate.startDate.getDate()}-${weightHistoryRangeDate.endDate.getFullYear()}${
                            weightHistoryRangeDate.endDate.getMonth() + 1
                          }${weightHistoryRangeDate.endDate.getDate()}`}
                          type='liveweightsHistoryByHerd'
                          isApp={data.isApp}
                          print={false}
                          addParams={{
                            herdCode: data.herdCode,
                            startDate: `${weightHistoryRangeDate.startDate.getFullYear()}-${
                              weightHistoryRangeDate.startDate.getMonth() + 1
                            }-${weightHistoryRangeDate.startDate.getDate()}`,
                            endDate: `${weightHistoryRangeDate.endDate.getFullYear()}-${
                              weightHistoryRangeDate.endDate.getMonth() + 1
                            }-${weightHistoryRangeDate.endDate.getDate()}`,
                          }}
                          refreshOuter={triggerRecalculateHeight(idx)}
                          //columnPref={data.columnPrefs['liveweightsWeightHistory']?.columns}
                        >
                          <div className='flex-1'>
                            <MobileDateRangePicker
                              startDate={weightHistoryRangeDisplayDate.startDate}
                              endDate={weightHistoryRangeDisplayDate.endDate}
                              onChange={(range: {startDate: Date, endDate: Date, error?: string}) => {
                                setWeightHistoryRangeDisplayDate(range)
                                if (!range.error) {
                                  const {error, ...dateRange} = range
                                  setWeightHistoryRangeDate(dateRange)
                                }
                              }}
                              validateFn={validateWeightHistoryRange}
                            />
                          </div>
                        </TableWidget>
                      </div>
                    )}
                  </>
                </Accordion>
              )
          )}
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
