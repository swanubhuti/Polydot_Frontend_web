import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/node';
import { useLoaderData, useRouteError } from '@remix-run/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import moment from 'moment';
import type { GenericAPI, GraphQLReturn, ColPreference } from '~/lib/types';
import { getLocalStore, storeLocal, tableTypes } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';

import TableWidget, { type TableWidgetRef } from '~/components/TableWidget';
import SelectDropdown from '~/components/ui/Dropdown';
import MobileDateRangePicker from '~/components/ui/MobileDateRangePicker';
import CalendarRangePicker from '~/components/ui/calendar/RangePicker';
import ErrorMessage from '~/components/ui/ErrorMessage';
import { requireVisibleHerds } from '~/lib/middleware/herd';

export const meta: MetaFunction = ({ matches }) => {
  const lastMatch = matches[matches.length - 1];
  return [
    { title: `Easy Dairy Calendar${lastMatch.params.herduuid ? ` - Herd ${lastMatch.params.herduuid}` : ''}` },
    { name: 'description', content: 'Easy Dairy Calendar' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, isApp, userData } = await getUserAccessToken(request, true);

  const {currentHerd, currentHerdCode} = await requireVisibleHerds(request, userData as any, params.herduuid ?? '');

  const url = new URL(request.url);

  const reportPrefDb = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET');
  let reportPrefs: ColPreference[0] = { columns: [], subtype: '', herdCode: '' };
  if (reportPrefDb.success && reportPrefDb.response.Reports) {
    reportPrefs = reportPrefDb.response.Reports.find(
      (rp: ColPreference[0]) => rp.herdCode === currentHerdCode && rp.subtype === 'calendar_calving'
    );
  }

  const startingDate = new Date();
  startingDate.setDate(startingDate.getDate() - 14);
  const endingDate = new Date();
  endingDate.setDate(endingDate.getDate() + 14);
  const startDate = url.searchParams.get('start') || startingDate.toISOString().split('T')[0];
  const endDate = url.searchParams.get('end') || endingDate.toISOString().split('T')[0];
  let displayFilter = 'expectedCalvingDate';
  switch (url.searchParams.get('display')) {
    case 'dryOff':
      displayFilter = 'dueDryDate';
      break;
    case 'leadFeeding':
      displayFilter = 'leadFeedDate';
      break;
    default:
      break;
  }
  const colPref = tableTypes.calendar.columns
    .filter((c) =>
      reportPrefs?.columns?.length
        ? reportPrefs.columns.includes(c.name)
        : !c.hide || c.subType === (url.searchParams.get('display') || 'calving')
    )
    .map((c) => c.name);
  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      animalCalendarCounts (
        condition: {
          herdUuid: "${params.herduuid}"
        }
      ) 
      {
        nodes {
          eventDate
          calving
          dryOff
          leadFeeding
        }
      }
      animalCalendarViews (
        first: 10
        offset: 0
        condition: {
          herdUuid: "${params.herduuid}",
        }
        filter: {
          ${displayFilter}: {
            greaterThanOrEqualTo: "${startDate + 'T00:00:00'}",
            lessThanOrEqualTo: "${endDate + 'T23:59:59'}"
          }
        }
      )
      {
        nodes {
          animalUuid
          ${colPref.join('\n')}
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
    console.error(`FATAL ERROR: Failed to retrieve calendar data for ${params.herduuid}`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve calendar data', { status: 400 });
  }

  let calendarData: { [key: string]: { [key: string]: number } } = {};
  response.data.animalCalendarCounts.nodes?.forEach((cc) => {
    const { eventDate, ...others } = cc;
    calendarData[eventDate] = others;
  });

  return json({
    currentHerd,
    herdCode: currentHerdCode,
    isApp,
    calendarCount: calendarData,
    table: response.data.animalCalendarViews.nodes,
    tableNext: response.data.animalCalendarViews.pageInfo?.hasNextPage,
    tableCount: response.data.animalCalendarViews.totalCount,
    colPref: colPref,
    filters: { startDate, endDate, display: url.searchParams.get('display') || 'calving' },
  });
}

export async function action({ request }: ActionFunctionArgs) {}

const CalendarCount = ({
  d,
  cc,
  type,
}: {
  d: Date;
  cc: { [key: string]: { [key: string]: number } };
  type: string;
}) => {
  const dateField = moment(d).format('YYYY-MM-DD');
  let count = 0;
  if (cc[dateField] && cc[dateField][type]) {
    count = cc[dateField][type];
  }
  return <p className='xs:text-xs md:text-sm h-5 w-5 text-black'>{count > 0 ? count : ' '}</p>;
};

const displayOpts = [
  { label: 'Calving', value: 'calving' },
  { label: 'Dry Off', value: 'dryOff' },
  { label: 'Lead Feeding', value: 'leadFeeding' },
];

type DateRange = {
  startDate: Date;
  endDate: Date
}
export default function Calendar() {
  const data = useLoaderData<typeof loader>();
  const tableRef = useRef<TableWidgetRef>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [displayOptions, setDisplayOptions] = useState(displayOpts);
  const [display, setDisplay] = useState(data.filters.display);
  const [columns, setColumns] = useState(data.colPref);
  const [hasNext, setHasNext] = useState(data.tableNext);
  const [numMonth, setNumMonth] = useState(2);
  const [calendarRange, setCalendarRange] = useState<DateRange>({
    startDate: new Date(data.filters.startDate),
    endDate: new Date(data.filters.endDate),
  });
  const [range, setRange] = useState<DateRange>({
    startDate: new Date(data.filters.startDate),
    endDate: new Date(data.filters.endDate),
  });

  const changeDisplay = useCallback(
    (opt: { label: string; value: string }) => {
      setDisplay(opt.value);
      let reportPref = getLocalStore<ColPreference>('colPref');
      let colList = tableTypes.calendar.columns
        .filter((col) => !col.hide || col.subType === opt.value)
        .map((c) => c.name);
      if (reportPref) {
        const existingIdx = reportPref.findIndex(
          (rp) => rp.herdCode === data.herdCode && rp.subtype === 'calendar_' + opt.value
        );
        if (existingIdx > -1) {
          colList = reportPref[existingIdx].columns;
        }
      }
      setColumns(colList);
      setHasNext(true);
      let params = ['display=' + opt.value];
      if (range.startDate) {
        params.push('start=' + range.startDate.toISOString().split('T')[0]);
      }
      if (range.endDate) {
        params.push('end=' + range.endDate.toISOString().split('T')[0]);
      }
      window.history.replaceState(null, '', window.location.pathname + '?' + params.join('&'));
    },
    [data.currentHerd, range]
  );

  const handleGenerate = useCallback((range: DateRange) => {
    setRange(range);
    let params = [
      `display=${display}`,
      `start=${range.startDate.toISOString().split('T')[0]}`,
      `end=${range.endDate.toISOString().split('T')[0]}`,
    ];
    window.history.replaceState(null, '', window.location.pathname + '?' + params.join('&'));
  }, [display]);

  const handleRangeChange = useCallback((range: DateRange) => {
    setCalendarRange(range);
    handleGenerate(range);
  }, [handleGenerate]);


  useEffect(() => {
    const filterType = displayOpts.find((opt) => opt.value === display);
    const filterName = filterType ? filterType['label'] : '';
    tableRef.current?.triggerFilter('display', filterName);
    const startDate = moment(range.startDate).format('YYYY-MM-DD');
    const endDate = moment(range.endDate).format('YYYY-MM-DD');
    tableRef.current?.triggerFilter('start', startDate);
    tableRef.current?.triggerFilter('end', endDate);
    setDisplayOptions((prev) => {
      let copy: { label: string; value: string; count: number }[] = prev.map((p) => ({ ...p, count: 0 }));
      let startingDate = startDate;
      do {
        const currLoop = startingDate;
        copy.forEach((c, idx) => {
          copy[idx].count +=
            data.calendarCount[currLoop] && data.calendarCount[currLoop][c.value]
              ? Number(data.calendarCount[currLoop][c.value])
              : 0;
        });
        startingDate = moment(startingDate).add(1, 'day').format('YYYY-MM-DD');
      } while (startingDate <= endDate);
      return copy;
    });
  }, [range.startDate, range.endDate, display]);
  useEffect(() => {
    storeLocal('herdUuid', data.currentHerd);
  }, [data.currentHerd]);
  useEffect(() => {
    setNumMonth(window.innerWidth > 1080 ? 3 : 2);
  }, []);

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='bg-grey-100 pb-6 px-4'>
        <div className='mt-10'>
          <div className='bg-white p-4'>
            <h3 className='md:text-2xl text-xl pb-5 pt-3'>Calendar</h3>
            <TableWidget
              key={`calendar-${data.currentHerd}-${display}`}
              ref={tableRef}
              type='calendar'
              subType={display}
              print={false}
              isApp={data.isApp}
              addParams={{ herdUuid: data.currentHerd }}
              filterDefault={[
                {
                  label: 'Display',
                  name: 'display',
                  value: displayOpts.find((opt) => opt.value === data.filters.display)!['label'],
                },
                { label: 'Start Date', name: 'start', value: data.filters.startDate },
                { label: 'End Date', name: 'end', value: data.filters.endDate },
              ]}
              defaultData={{
                rows: data.table,
                hasNext: !!hasNext,
                total: data.tableCount ?? 0,
              }}
              columnPref={columns}
              moreInfoView={
                <div className='hidden md:block mb-10'>
                  <CalendarRangePicker
                    onChange={handleRangeChange}
                    range={{ startDate: calendarRange.startDate, endDate: calendarRange.endDate }}
                    numberOfMonths={numMonth}
                    renderPlaceholder={(d) => <CalendarCount d={d} cc={data.calendarCount} type={display} />}
                  />
                </div>
              }
            >
              <form ref={formRef} action='' method='GET' className='flex flex-col sm:flex-row gap-x-5 gap-y-3 flex-1'>
                <div className='flex-1'>
                  <MobileDateRangePicker
                    startDate={calendarRange.startDate}
                    endDate={calendarRange.endDate}
                    onChange={handleRangeChange}
                    renderPlaceholder={(d) => <CalendarCount d={d} cc={data.calendarCount} type={display} />}
                  />
                </div>
                <div className='flex flex-col min-w-[230px] lg:min-w-[208px] lg:max-w-[208px]'>
                  <p className='font-bold mb-2'>Display</p>
                  <SelectDropdown
                    className='w-full'
                    name='display'
                    type='single'
                    value={display}
                    options={displayOptions}
                    count={true}
                    onSelectChange={changeDisplay}
                  />
                </div>
              </form>
            </TableWidget>
          </div>
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
