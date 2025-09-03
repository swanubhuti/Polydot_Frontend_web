import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from '@remix-run/node';
import TableWidget from '~/components/TableWidget';
import { useLoaderData, useRouteError } from '@remix-run/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenericAPI, GraphQLReturn, ColPreference } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';
import { storeLocal } from '~/lib/utils';
import { requireVisibleHerds } from '~/lib/middleware/herd';
import ErrorMessage from '~/components/ui/ErrorMessage';
import Accordion, { type AccordionRef } from '~/components/ui/Accordion';

export const meta: MetaFunction = (request) => {
  return [{ title: `Easy Dairy Drugs Stock` }, { name: 'description', content: 'Easy Dairy Drugs Stock' }];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, userData, isApp } = await getUserAccessToken(request, true);
  const {currentHerdCode} = await requireVisibleHerds(request, userData as any, params.herduuid ?? '');

  const reportPrefDb = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET');
  let reportPrefs: ColPreference[0] = { columns: [], subtype: '', herdCode: '' };
  if (reportPrefDb.success && reportPrefDb.response.Reports) {
    reportPrefs = reportPrefDb.response.Reports.find(
      (rp: ColPreference[0]) => rp.herdCode === currentHerdCode && rp.subtype === 'withholding'
    );
  }

  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      drugStocks (
        first: 10,
        filter: {
          easyDairyId: {in: [${userData.EasyDairyID?.map((eid: string) => `"${eid}"`).join(',')}]}
        }
      ) 
      {
        nodes {
          shortName
          whMilk
          whMeat
          measure
          stockOnHand
        }
        pageInfo {
          hasNextPage
        }
        totalCount
      }
      milkViews: animalWithholdingViews (
        condition: {
          herdUuid: "${params.herduuid}"
        }
        filter: {milkDrug: {isNull: false}}
      )
      {
        totalCount
      }
      meatViews: animalWithholdingViews (
        condition: {
          herdUuid: "${params.herduuid}"
        }
        filter: {meatDrug: {isNull: false}}
      )
      {
        totalCount
      }
    }`,
    },
    undefined,
    accessToken
  );

  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve drug data for ${params.herduuid}`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve drug data', { status: 400 });
  }

  let paramsEd: string[] = []
  userData.EasyDairyID.forEach((ed: string) => {
    paramsEd.push(`ids=${ed}`)
  })
  if (paramsEd.length === 1) {
    paramsEd.push('ids=') //force it to be array
  }
  
  const edResp = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings?${paramsEd.join('&')}`, undefined, 'GET');

  return json({
    currentHerd: currentHerdCode,
    herdUuid: params.herduuid!,
    isApp,
    easyDairyId: userData.EasyDairyID,
    table: response.data.drugStocks.nodes,
    tableNext: response.data.drugStocks.pageInfo?.hasNextPage,
    tableCount: response.data.drugStocks.totalCount,
    milkCount: response.data.milkViews.totalCount,
    meatCount: response.data.meatViews.totalCount,
    colPref: reportPrefs?.columns,
    edList: edResp.success && edResp.response ? edResp.response.data.map((ed) => ({
      value: ed.EasyDairyID,
      label: ed.Name || ed.EasyDairyID
    })) : []
  });
}

export async function action({ request }: ActionFunctionArgs) {}

export default function Drugs() {
  const data = useLoaderData<typeof loader>();
  // const tableRef = useRef<TableWidgetRef>(null)
  const [expandedList, setExpandedList] = useState<string[]>([]);

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

  useEffect(() => {
    storeLocal('herdUuid', data.herdUuid);
  }, [data.herdUuid]);

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='pb-6 px-4'>
        <div className='flex flex-row mb-10 gap-6 px-5 justify-end'>
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
              setExpandedList(['Milk Withholding Report', 'Meat Withholding Report', 'Drug Stocks']);
            }}
            className='text-primary-500 underline gap-1 items-center font-bold '
          >
            Open All Tabs
          </button>}
        </div>
        <Accordion
          title={`Milk Withholding Report: ${data.milkCount}`}
          expanded={expandedList.includes('Milk Withholding Report')}
          setExpand={() => {
            toggleExpanded('Milk Withholding Report');
          }}
          ref={(el) => (accordionRefs.current['Milk Withholding Report'] = el)}
        >
          <div className="py-4">
            <TableWidget
              key={`withholding-milk-${data.herdUuid}`}
              // ref={tableRef}
              type='withholding_milk'
              isApp={data.isApp}
              addParams={{ herdUuid: data.herdUuid }}
              columnPref={data.colPref}
              refreshOuter={() => accordionRecalculateHeight('Milk Withholding Report')}
            />
          </div>
        </Accordion>
        <Accordion
          title={`Meat Withholding Report: ${data.meatCount}`}
          expanded={expandedList.includes('Meat Withholding Report')}
          setExpand={() => {
            toggleExpanded('Meat Withholding Report');
          }}
          ref={(el) => (accordionRefs.current['Meat Withholding Report'] = el)}
        >
          <div className="py-4">
            <TableWidget
              key={`withholding-meat-${data.herdUuid}`}
              // ref={tableRef}
              type='withholding_meat'
              isApp={data.isApp}
              addParams={{ herdUuid: data.herdUuid }}
              columnPref={data.colPref}
              refreshOuter={() => accordionRecalculateHeight('Meat Withholding Report')}
            />
          </div>
        </Accordion>
        <Accordion
          title={`Drug Stocks`}
          expanded={expandedList.includes('Drug Stocks')}
          setExpand={() => {
            toggleExpanded('Drug Stocks');
          }}
          ref={(el) => (accordionRefs.current['Drug Stocks'] = el)}
        >
          <TableWidget
            key={`drugstocks`}
            // ref={tableRef}
            type='drugstocks'
            filterOpts={{ easyDairyId: data.edList}}
            filterDefault={[{ label: 'Easy Dairy ID / Name', name: 'easyDairyId', value: '' }]}
            isApp={data.isApp}
            hideColumnSettings={true}
            defaultData={{
              rows: data.table,
              hasNext: !!data.tableNext,
              total: data.tableCount ?? 0,
            }}
            refreshOuter={() => accordionRecalculateHeight('Drug Stocks')}
          />
        </Accordion>
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
