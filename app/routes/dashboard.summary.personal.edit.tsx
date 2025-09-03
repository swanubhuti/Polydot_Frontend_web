import {type LoaderFunctionArgs, json } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate, useRouteError } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';
import { FaCirclePlus, FaXmark } from 'react-icons/fa6';
import Button from '~/components/ui/Button';
import DialogModal, {type DialogProps} from '~/components/ui/Dialog';
import SelectDropdown from '~/components/ui/Dropdown';

import ErrorMessage from '~/components/ui/ErrorMessage';
import { chartList } from '~/lib/chartTypes';
import type { ColPreference, GenericAPI, PersonalDashboard } from '~/lib/types';
import { getLocalStore, storeLocal } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';
import type { action } from './table.$type';

const parseGridReport = (reportPrefs: PersonalDashboard['list']) => {
  const maxCols = 3;
  const maxRows = 20;
  const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
  const reportData: any[] = [];

  const reportsToPlace = reportPrefs.map((rp, index) => {
    const isEmpty = !rp || rp.trim() === '';
    let width = 1, height = 1;
    if (!isEmpty) {
      const split = rp.split('_');
      const colsrows = (split[1] ?? '').split('x');
      width = Number(colsrows[0]) || 1;
      height = Number(colsrows[1]) || 1;
    }
    return { name: rp, width, height, originalIndex: index, isEmpty };
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

          const split = (report.name || '').split('_');
          reportData[report.originalIndex] = {
            name: report.name,
            label: report.isEmpty ? '' : (report.name || '').replace(/_/g, ' ').replace(/(\d+)x(\d+)/, '($1x$2)'),
            report: report.isEmpty ? '' : split[0],
            cols: `${c + 1} / span ${report.width}`,
            rows: `${r + 1} / span ${report.height}`,
          };
          placed = true;
        }
      }
    }
  }

  let addButtonPosition = { cols: '1 / span 1', rows: `${maxRows} / span 1` };
  let buttonFound = false;
  for (let r = 0; r < maxRows && !buttonFound; r++) {
    for (let c = 0; c < maxCols && !buttonFound; c++) {
      if (grid[r]?.[c] === false) {
        addButtonPosition = {
          cols: `${c + 1} / span 1`,
          rows: `${r + 1} / span 1`,
        };
        buttonFound = true;
      }
    }
  }

  return { reportList: reportData, addButtonPosition };
};


export async function loader({ request, params }: LoaderFunctionArgs) {
  const { userData, accessToken } = await getUserAccessToken(request, true);
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

  const reportOpts: {label: string, value: string, imgName: string}[] = []
  Object.entries(chartList).forEach(([k, v]) => {
    if (v.availableInDashboard) {
      v.chartType.forEach((ct) => {
        v.sizes.forEach((s) => {
          reportOpts.push({label: `${v.title} (${ct}${ct !== 'table' ? ' chart' : ''}, ${s})`, value: `${k}[${ct}]_${s}`, imgName: `/images/${k}[${ct}].png`})
        })
      })
    }
  })
  return json({
    reportList: reportPrefs,
    reportOpts: reportOpts
  })
}

export default function DashboardSummaryPersonalEdit() {
  const data = useLoaderData<typeof loader>()
  const options = data.reportOpts.map((ro) => ({
    label: ro.label,
    value: ro.value,
    tooltip: <div className="w-48"><img src={ro.imgName} alt={ro.label} className="max-w-full" /></div>
  }))
  const [reportList, setReportList] = useState(() => data.reportList.map((name, index) => ({ id: Date.now() + index, name })));
  const [dialogData, setDialogData] = useState<DialogProps>({
    isOpen: false,
  })
  const { reportList: gridReport, addButtonPosition } = useMemo(() => parseGridReport(reportList.map(r => r.name)), [reportList])
  const fetcher = useFetcher<typeof action>()
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.data?.success) {
      setDialogData(prev => ({
        isOpen: true,
        title: 'Success',
        icon: 'success',
        color: 'primary',
        message: 'Saved preferences',
        buttons: [{text: 'Close', onClick: () => {
          setDialogData(prev => ({...prev, isOpen: false}))
          navigate(`/dashboard/summary/personal/view`);
        }}]
      }))
    }
  }, [fetcher.data])

  return (
    <div>
      <div className="flex justify-end absolute -top-14 -mt-3 right-0 px-4">
        <Button type="button" onClick={() => {
          const reportNames = reportList.map(r => r.name);
          const empty = reportNames.filter((name) => !name).length > 0
          if (empty) {
            setDialogData(prev => ({
              isOpen: true,
              title: 'Error',
              icon: 'error',
              color: 'error',
              message: 'Some reports have not been selected',
              buttons: [{text: 'Close', onClick: () => setDialogData(prev => ({...prev, isOpen: false}))}]
            }))
          } else {
            let reportPref = getLocalStore<(ColPreference[0] | {subtype: string, list: string[]})[]>('colPref');
            const newPref = {
              subtype: 'personalDashboard',
              list: reportNames.filter(Boolean)
            };
            if (reportPref) {
              const existingIdx = reportPref.findIndex(
                (rp) => rp.subtype === 'personalDashboard'
              );
              if (existingIdx > -1) {
                reportPref[existingIdx] = newPref;
              } else {
                reportPref.push(newPref);
              }
            } else {
              reportPref = [newPref];
            }
            storeLocal('colPref', reportPref);
            const formdata = new FormData();

            formdata.append('reports', JSON.stringify(reportPref));
            fetcher.submit(formdata, {method: "POST", action: '/table/userPref'})
          }
        }}>Save</Button>
      </div>
      <div className="grid grid-cols-3 gap-5 transition-none">
        {gridReport.map((rl, i) =>
          <div key={reportList[i].id}
            className="bg-white py-4 px-6 flex relative justify-center items-center h-72 transition-none"
            style={{gridColumn: rl.cols, gridRow: rl.rows}}>
            <div className="w-full">
              <SelectDropdown type="single" parentBlock={true} label="Report Type" className="w-full" options={options} value={rl.name} onSelectChange={(opt) => {
                setReportList((prev) => {
                  const newReportList = prev.map(item =>
                    item.id === reportList[i].id ? { ...item, name: opt.value } : item
                  );
                  return newReportList;
                })
              }} />
            </div>
            <button type="button" className="absolute top-5 right-5" onClick={() => setReportList(prev => prev.filter((_, idx) => idx !== i))}>
              <FaXmark className="text-2xl text-gray-700 hover:text-primary-300" />
            </button>
          </div>
        )}
        <button type="button" onClick={() => setReportList((prev) => [...prev, { id: Date.now(), name: ''}])}
          className="group border-8 border-white flex flex-col gap-2 relative justify-center items-center h-72 transition-none"
          style={{gridColumn: addButtonPosition.cols, gridRow: addButtonPosition.rows}}>
          <FaCirclePlus className="text-4xl text-primary-500 group-hover:text-primary-400" />
          <span className="">Add New Report</span>
        </button>
      </div>
      <DialogModal
        {...dialogData}
      />
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.message} />;
}

