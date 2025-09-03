import { useEffect, useState } from 'react';
import { chartList } from '~/lib/chartTypes';
import { getLocalStore, storeLocal } from '~/lib/utils';

export const useChartsAvailable = () => {
  const [charts, setCharts] = useState<string[]>([]);
  useEffect(() => {
    const key = 'chartsAvailable';
    const oldChartList = getLocalStore<string[]>(key) ?? null;
    const lastestChartList = Object.keys(chartList).reduce((res, k) => {
      const c = chartList[k as keyof typeof chartList];
      if (c.availableInDashboard) {
        res.push(c.title);
      }
      return res;
    }, [] as string[]);

    if (oldChartList === null || !arrayEqual(oldChartList ?? [], lastestChartList)) {
      setCharts(diffArr(oldChartList ?? [], lastestChartList).added.sort((a, b) => a.localeCompare(b)));
    }
    storeLocal(key, lastestChartList)
  }, []);

  return charts;
};

function diffArr(oldArr: string[], newArr: string[]) {
  var added = newArr.slice();
  for (let i = 0; i < oldArr.length; i++) {
    const old = oldArr[i];
    // find duplicate
    const idx = added.findIndex((h) => h === old);
    if (idx !== -1) {
      added.splice(idx, 1);
    }
  }
  return { added };
}

function arrayEqual(a: string[], b: string[]) {
  if (a.length != b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}
