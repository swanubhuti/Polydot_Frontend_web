import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData, useRouteError } from '@remix-run/react';
import { ChartWidget, type ChartTypes } from '~/components/ReportChartWidget';

import ErrorMessage from '~/components/ui/ErrorMessage';
import {type ChartDataTypes, chartList } from '~/lib/chartTypes';
import type { GenericAPI, GraphQLReturn, PersonalDashboard } from '~/lib/types';
import { colors, getVisibleHerdsFilter } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, userData } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  if (!res.success) {
    console.error(`FATAL ERROR: Failed to get user data`, `source: ${request.url}`, userData)
    throw new Error("Fail to get user data");
  }
  const userDataDb = res.response;
  //get user pref data
  const reportPrefDb = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  let reportPrefs: PersonalDashboard['list'] = [];
  if (reportPrefDb.success && reportPrefDb.response.Reports) {
    const temp = reportPrefDb.response.Reports.find(
      (rp: PersonalDashboard) => rp.subtype === 'personalDashboard'
    )
    if (temp) {
      reportPrefs = temp['list']
    }
  }
  const maxCols = 3;
  const maxRows = 20;
  const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
  const reportData: any[] = [];

  const reportsToPlace = reportPrefs.map((rp) => {
    const isEmpty = !rp || rp.trim() === '';
    let width = 1, height = 1;
    if (!isEmpty) {
      const split = rp.split('_');
      const colsrows = (split[1] ?? '').split('x');
      width = Number(colsrows[0]) || 1;
      height = Number(colsrows[1]) || 1;
    }
    return { name: rp, width, height, isEmpty };
  });

  for (const report of reportsToPlace) {
    let placed = false;
    for (let r = 0; r < maxRows && !placed; r++) {
      for (let c = 0; c <= maxCols - report.width && !placed; c++) {
        let canPlace = true;
        for (let y = r; y < r + report.height; y++) {
          for (let x = c; x < c + report.width; x++) {
            if (grid[y]?.[x] === true) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        if (canPlace) {
          for (let y = r; y < r + report.height; y++) {
            for (let x = c; x < c + report.width; x++) {
              grid[y][x] = true;
            }
          }
          const chartType = report.name.match(/\[([a-z]+)\]/)![1]
          const reportName = report.name.split('[')[0]
          reportData.push({
            id: reportName,
            report: chartList[reportName as ChartDataTypes]?.title ?? report.name,
            type: chartType,
            cols: `${c + 1} / span ${report.width}`,
            rows: `${r + 1} / span ${report.height}`,
          });
          placed = true;
        }
      }
    }
  }

  let visibleFilter = getVisibleHerdsFilter(userDataDb as any);
  let filter = visibleFilter ? `(${visibleFilter})` : '';
  const { response, success } = await callAPI<GraphQLReturn>(
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
        }`
      }
  , 'POST', accessToken)
  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve chart data`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve chart data', { status: 400 });
  }
  let herdList: {[key: string]: string} = {}
  response.data.herds.nodes.forEach((n) => {
    herdList[n.herdUuid] = n.herdCode
  })

  return json({
    reportList: reportData,
    herdList
  })
}

export default function DashboardSummaryPersonalView() {
  const data = useLoaderData<typeof loader>()
  return (
    <div>
      <div className="grid grid-cols-3 gap-5">
        {data.reportList.map((rl, i) =>
        <div key={`rl-${i}`}
          className="bg-white p-4"
          style={{gridColumn: rl.cols, gridRow: rl.rows}}>
            <ChartWidget id={rl.id as ChartDataTypes} title={rl.report} type={rl.type as ChartTypes} herdList={data.herdList} />
        </div>)}
      </div>
      {data.reportList.length === 0 && <div className="h-96 flex justify-center items-center">
        <h2>No reports set. Use the edit mode to customize your dashboard.</h2>
      </div>}
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
