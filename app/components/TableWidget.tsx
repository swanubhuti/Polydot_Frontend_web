import SelectDropdown from './ui/Dropdown';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState, useRef } from 'react';
import { getLocalStore, storeLocal, tableTypes } from '~/lib/utils';
import { FaGear } from 'react-icons/fa6/index.js';
import { AiOutlineClose } from 'react-icons/ai/index.js';
import Search from './ui/Search';
import TableRaw, { type TableProps, type TableRawRef } from './ui/TableRaw';
import { useFetcher } from '@remix-run/react';
import type { ColPreference } from '~/lib/types';
import moment from 'moment';
import type { ChartDataTypes } from '~/lib/chartTypes';
import { ChartWidget, type ChartTypes } from './ReportChartWidget';

type Props = {
  type: string;
  subType?: string;
  boxed?: boolean;
  isApp?: boolean;
  addParams?: { [key: string]: string | string[] };
  defaultData?: {
    rows: { [key: string]: string }[];
    total: number;
    hasNext: boolean;
  };
  columnPref?: string[];
  filterOpts?: {
    [key: string]: { label: string; value: string }[];
  };
  showWithholding?: boolean,
  additional?: { [key: string]: any };
  refreshOuter?: () => void;
  filterDefault?: { label: string; value: string | number; name?: string }[];
  children?: React.ReactNode;
  hideColumnSettings?: boolean;
  print?: boolean;
  tableLabel?: string;
  moreInfoView?: React.ReactNode;
  returnRowData?: (rowData: { [key: string]: string }) => void;
  rowClick?: boolean;
  customColumnData?: (rowData: { [key: string]: Array<any> }) => void;
  chart?: {
    id: ChartDataTypes,
    type: ChartTypes,
    title?: string,
    hideHerdFilter?: boolean
  };
  onTotalChange?: (total: number) => void;
  actions?: {
    label: string,
    type: 'edit' | 'delete',
    filter?: (row: any) => boolean,
    func: (row: any) => void
  }[]
};

type FilterProps = {
  type: string;
  name: string;
  label: string;
  selected?: string;
  checked?: boolean;
  required?: boolean;
  value?: string | number;
  placeholder?: string;
  classes?: string;
  options?: { label: string; value: string; isDatefield?: boolean }[];
  onChange: (name: string, val: any, label?: string, type?: string) => void;
  count?: boolean;
  defaultSearch?: string;
};
const Filter = (props: FilterProps) => {
  switch (props.type) {
    case 'select':
      return (
        <SelectDropdown
          className={props.classes}
          type='single'
          value={props.value}
          options={props.options ?? []}
          name={props.name}
          label={props.label}
          onSelectChange={(opts) => props.onChange(props.name, opts.value, opts.label)}
          count={props.count}
        />
      );
    case 'search':
      return (
        <Search
          className={props.classes}
          defaultSearch={props.defaultSearch}
          options={props.options}
          placeholder={props.placeholder}
          name={props.name}
          onChange={(val, opt) => props.onChange(props.name, val + (opt ? `|${opt}` : ''))}
        />
      );
    case 'checkbox':
      return (
        <div>
          <label className='inline-flex items-center'>
            <input
              type='checkbox'
              name={props.name}
              className='form-checkbox mb-3 h-6 w-6 accent-primary-500'
              checked={!!(props.checked || props.required)}
              disabled={props.required}
              onChange={(e) => props.onChange(props.name, e.target.checked, props.label, 'checkbox')}
            />
            <span className='mx-4 mb-3'>{props.label}</span>
          </label>
        </div>
      );
    case 'datepicker':
      return (
        <div className={props.classes}>
          <label
            htmlFor={`${props.name}-${props.label}`}
            className='block leading-6 font-bold text-sm md:text-base mb-1.5 text-black'
          >
            {props.label}
          </label>
          <input
            id={`${props.name}-${props.label}`}
            type='date'
            className='text-inherit appearance-none min-h-[36px] rounded bg-white border-gray-300 text-dark relative block w-full px-3 py-[7px] border placeholder-grey-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 md:text-base md:placeholder:text-base text-sm placeholder:text-sm'
            value={props.value}
            name={props.name}
            onChange={(e) => props.onChange(props.name, e.target.value)}
          />
        </div>
      );
    case 'dateRange':
      const start = props.value ? String(props.value).split('|')[0] : ''
      const end = props.value ? String(props.value).split('|')[1] : ''
      return <div className={`${props.classes} flex items-center gap-2 border outline-none border-gray-300 rounded`}>
          <label
            htmlFor={`${props.name}-${props.label}`}
            className='block leading-6 font-bold text-sm md:text-base text-black p-2 bg-gray-100 px-4 border-r border-r-gray-300 rounded-l'
          >
            {props.label}
          </label>
          <div className="relative py-1 pr-4 flex gap-4 items-center">
            <input type="date" className="border-0 focus:outline-none w-[120px]" value={start} placeholder="dd/mm/yyyy" onChange={(e) => {
              props.onChange(props.name, e.target.value + '|' + end)
            }} />
            <span>to</span>
            <input type="date" className="border-0 focus:outline-none w-[120px]" value={end} placeholder="dd/mm/yyyy" onChange={(e) => {
              props.onChange(props.name, start + '|' + e.target.value)
            }} />
          </div>
      </div>
  }
  return <></>;
};

export type TableWidgetRef = {
  triggerFilter: (name: string, value: any, label?: string) => void;
};

function tableFilters(table: keyof typeof tableTypes, filterOpts: Props['filterOpts'], colpref: string[]) {
  return tableTypes[table]?.filters.map((ori) => {
    let searchFilter = JSON.parse(JSON.stringify(ori)) as (typeof tableTypes)[number]['filters'][number];
    // default filter options
    if (filterOpts && filterOpts[searchFilter.name]) {
      if (!('options' in searchFilter)) {
        searchFilter['options'] = [];
      }
      searchFilter.options?.push(...filterOpts[searchFilter.name]);
    }
    // hide/show some search filters
    if (searchFilter.type === 'search' && searchFilter.options?.length) {
      searchFilter.options = searchFilter.options.filter((o) => {
        if (!o.display) {
          return true;
        }
        return colpref.find((cp) => o.display?.includes(cp));
      });
    }
    // if (singleFilter.type === 'search') {
    // const tableTypesCopy = JSON.parse(JSON.stringify(tableTypes));
    // const sortedOptions = tableTypesCopy[props.type as keyof typeof tableTypes].columns.sort((a: { label: string; }, b: { label: string; }) => {
    //     return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    // });
    // singleFilter.options = sortedOptions.map((col: { label: string; name: string; dateField?: boolean}) => {
    //     return {
    //         label: col.label,
    //         value: col.name,
    //         isDateField: col.dateField ? true : false
    //     }
    // })
    // }
    return searchFilter;
  });
}

const TableWidget = forwardRef<TableWidgetRef, Props>((props, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPrintOptVisible, setIsPrintOptVisible] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const fetcher = useFetcher();
  const togglePopup = (value?: boolean) => {
    setIsPrintOptVisible(false);
    setIsVisible(value ? value : !isVisible);
  };
  const togglePrintPopup = (value?: boolean) => {
    setIsVisible(false);
    setIsPrintOptVisible(value ? value : !isPrintOptVisible);
  };

  const [filterList, setFilterList] = useState(() => {
    const tmp = tableFilters(
      props.type as keyof typeof tableTypes,
      props.filterOpts,
      props.columnPref?.length
        ? props.columnPref
        : tableTypes[props.type as keyof typeof tableTypes].columns.map((c) => c.name)
    )
    return tmp
  });
  
  const [currentFilters, setCurrentFilters] = useState(() => {
    let filters: { [key: string]: string | number } = {};
    props.filterDefault?.forEach((fd) => {
      if (fd.name) {
        filters[fd.name] = fd.value;
      }
    });
    tableTypes[props.type as keyof typeof tableTypes]?.filters.forEach((f) => {
      if ('selected' in f) {
        filters[f.name] = f.selected as string | number;
      }
      const defaultValue = props.filterDefault?.find((item) => item.label === f.name);

      if (defaultValue) {
        filters[f.name] = defaultValue.value as string | number;
      }
    });
    return filters;
  });
  const [tableColumns, setTableColumns] = useState<TableProps['columns']>(() => {
    if (props.type === 'liveweightsHistoryByHerd') {
      let temp: any = JSON.parse(JSON.stringify(tableTypes[props.type as keyof typeof tableTypes])); // deep

      if (props.addParams?.startDate && props.addParams?.endDate && typeof props.addParams.endDate === 'string' && typeof props.addParams.startDate === 'string') {
        let v_startDate = moment(new Date(props.addParams?.startDate));
        let v_endDate = moment(new Date(props.addParams?.endDate));
        let v_monthDiff = v_endDate.diff(v_startDate, 'months', true);
        //console.log("widget v_monthDiff, ", v_monthDiff)

        var tempCur = v_startDate.clone();
        if (v_monthDiff > 0) {
          while (true) {
            let tempMonthDiff = v_endDate.diff(tempCur, 'months');
            if (tempMonthDiff < 1) {
              break;
            }
            //console.log("tempCur-1, ", tempCur.format('YYYY-MM'))
            //console.log("tempCur-2, ", tempCur.format('MMMM YYYY'))
            temp.columns.push({ label: tempCur.format('MMMM YYYY'), name: tempCur.format('YYYY-MM'), hide: false });
            tempCur.add(1, 'months');
          }
        }
      }

      return temp?.columns.map((c: any) => {
        return {
          ...c,
          hide: props.columnPref?.length ? !props.columnPref.includes(c.name) : c.hide,
        };
      });
    }

    return tableTypes[props.type as keyof typeof tableTypes]?.columns.map((c) => {
      return {
        ...c,
        hide: props.columnPref?.length ? !props.columnPref.includes(c.name) : c.hide,
      };
    });
  });
  const defaultSort = useMemo(() => {
    const sortCol = tableTypes[props.type as keyof typeof tableTypes]?.columns.find((c) => c.defaultSort);
    if (sortCol) {
      return { column: sortCol.name, direction: sortCol.defaultSort! };
    }
    return { column: '', direction: '' };
  }, [props.type]);
  const changeValue = useCallback(
    (name: string, value: any, label?: string, type?: string) => {
      setCurrentFilters((prevState) => {
        let stateCopy = { ...prevState };
        if (type === 'checkbox') {
          stateCopy[name] = value ? 'true' : 'false';
        } else {
          stateCopy[name] = value;
        }
        return stateCopy;
      });
      if (props.type == 'status' && name === 'group') {
        let colpref: string[] = [];
        const updatedColumns = tableColumns.map((column) => {
          if (column.display && label && column.display.includes(label)) {
            colpref.push(column.name);
            return { ...column, hide: false };
          } else if (value !== '' && ['animalId', 'name', 'dateOfBirth', 'breed', 'status'].includes(column.name)) {
            return { ...column, hide: true };
          }
          return column;
        });
        if (value === '' && label === 'All') {
          colpref = updatedColumns.map((c) => c.name);
        }
        setTableColumns(updatedColumns);
        setFilterList(tableFilters(props.type as keyof typeof tableTypes, props.filterOpts, colpref));
      }
    },
    [props.type, tableColumns, props.filterOpts]
  );

  const toggleColumn = useCallback(
    (name: string, checked: any) => {
      const updatedColumns = tableColumns.map((column) => {
        if (column.name === name) {
          return { ...column, hide: !checked };
        }
        return column;
      });
      setTableColumns(updatedColumns);
      const code = props.addParams?.herdCode ? props.addParams?.herdCode as string : '';
      let reportPref = getLocalStore<ColPreference>('colPref');
      const newPref = {
        herdCode: code,
        subtype: props.type + (props.subType ? `_${props.subType}` : ''),
        columns: updatedColumns.filter((col) => !col.hide).map((col) => col.name),
      };
      if (reportPref) {
        const existingIdx = reportPref.findIndex(
          (rp) =>
            rp.herdCode &&
            code === rp.herdCode &&
            rp.subtype === props.type + (props.subType ? `_${props.subType}` : '')
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
      fetcher.submit(formdata, { method: 'POST', action: '/table/userPref' });
    },
    [tableColumns, fetcher, props.addParams, props.type, props.subType]
  );

  const convertToCSV = (data: { [key: string]: string }[]): string => {
    if (data && data.length > 0) {
      const header = Object.keys(data[0]).filter((key) => key !== 'animalUuid');
      const nameMap: Record<string, string> = {};
      tableTypes[props.type as keyof typeof tableTypes]?.columns.forEach((obj) => {
        nameMap[obj.name] = obj.label;
      });
      let resultHeader: string = '';
      resultHeader = header
        .filter((head) => nameMap[head])
        .map((head) => nameMap[head])
        .join(',');
      const rows = data.map((item) => {
        const filteredItem = Object.entries(item)
          .filter(([key]) => key !== 'animalUuid')
          .map(([key, value]) => `${value}`);
        return filteredItem.join(',');
      });
      return [resultHeader, ...rows].join('\n');
    }
    return '';
  };

  const printElementRef = useRef<HTMLDivElement>(null);
  const download = (type: string, data: { [key: string]: string }[]): void => {
    if (data && data.length > 0) {
      switch (type) {
        case 'csv':
          const date = moment();
          const currentDate = date.format('DD/MM/YYYY');
          const csv = convertToCSV(data);
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = props.type + '-' + currentDate;
          document.body.appendChild(a);
          a.click();

          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          break;
        case 'pdf':
          setIsPDF(true);
          break;
      }
    }
  };

  const printPDF = () => {
    if (printElementRef.current && isPDF) {
      document.querySelector('main')?.classList.add('print:hidden');
      const newContainer = document.createElement('div');
      newContainer.innerHTML = printElementRef.current!.innerHTML;
      document.body.append(newContainer);
      window.print();
      document.body.removeChild(newContainer);
      document.querySelector('main')?.classList.remove('print:hidden');
    }
  };

  const childRef = useRef<TableRawRef>(null);

  const handleDownload = async (type: string) => {
    const data = await childRef.current?.passPrintData();
    download(type, data ?? []);
  };

  const handleRowData = (rowData: { [key: string]: string }) => {
    if (props.returnRowData && rowData) {
      props.returnRowData(rowData);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerFilter(name: string, value: any, label?: string) {
      changeValue(name, value, label);
    },
  }));

  useEffect(() => {
    if (props.columnPref?.length) {
      setTableColumns((prev) => {
        return prev.map((col) => {
          return {
            ...col,
            hide: !props.columnPref?.includes(col.name),
          };
        });
      });
    }
  }, [props.columnPref]);

  // useEffect(() => {
  //     if (props.type === 'status') {
  //         const updatedFilterOptions = filterList.map(m => {
  //             if (m.type === 'search') {
  //                 m.options = tableColumns.filter(column => !column.hide).map(map => {
  //                     return {label: map.label, value: map.name, isDateField: map.dateField ? true : false}
  //                 })
  //                 m.options.sort((a: { label: string; }, b: { label: any; }) => {
  //                     return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  //                 });
  //             }
  //             return m
  //         })
  //         setFilterList(updatedFilterOptions)
  //     }
  // }, [tableColumns])

  useEffect(() => {
    const setIsPDFValFalse = () => {
      setIsPDF(false);
    };
    window.addEventListener('afterprint', setIsPDFValFalse);
    return () => {
      window.removeEventListener('afterprint', setIsPDFValFalse);
    };
  }, []);
  return (
    <div id={`${props.type}-table`}>
      {props.chart && <div className="py-5">
        <ChartWidget {...props.chart} herdList={{}} defaultValues={{...(props.addParams as {[key: string]: string}), ...currentFilters}} />
      </div>}
      <div className='mb-4 flex'>
        {props.boxed ? (
          filterList.length > 0 && (
            <div className='md:px-8 pt-8 pb-4 w-full'>
              <div className='rounded border border-gray-300 p-5 px-6 flex justify-start gap-6 w-full flex-col md:flex-row'>
                <p className='pt-1 text-primary-500 font-bold pr-2'>Filters:</p>
                {filterList.map((df, idx) => (
                  <div key={idx}>
                    <Filter {...df} onChange={changeValue} value={currentFilters[df.name]} />
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div
            className={`flex lg:gap-10 gap-5 flex-1 flex-col mb-2 mt-4 flex-wrap md:flex-row ${
              filterList.length ? 'items-stretch' : ''
            }`}
          >
            {filterList.map((df, idx) => (
              <div
                key={idx}
                className={`flex-1 md:flex-initial ${
                  df.type === 'search' || df.type === 'checkbox' ? 'md:self-end' : ''
                }`}
              >
                <Filter
                  {...df}
                  onChange={changeValue}
                  checked={currentFilters[df.name] === 'true'}
                  value={currentFilters[df.name]}
                />
              </div>
            ))}
            {props.children}
            {!props.hideColumnSettings && (
              <div className='ml-auto relative self-end'>
                <button
                  type='button'
                  className='flex p-2 text-primary-500 font-semibold text-base underline'
                  onClick={() => togglePopup()}
                >
                  <FaGear className='mt-1 mr-1' />
                  <span>Column Settings</span>
                </button>
                {isVisible && (
                  <fetcher.Form
                    method='POST'
                    action='/table/userPref'
                    className='absolute right-0 w-[320px] max-w-[calc(100vw-64px)] max-h-[25rem] z-20 px-8 pt-6 overflow-y-auto bg-white rounded shadow-[0_1px_4px_0_rgba(0,0,0,0.2)]'
                  >
                    <AiOutlineClose className='float-right cursor-pointer' onClick={() => togglePopup(false)} />
                    <span className='text-primary-500 font-bold text-base'>Columns Settings</span>
                    <div className='border-t border-gray-300 my-4'></div>
                    {JSON.parse(JSON.stringify(tableColumns))
                      .sort((a: { label: string }, b: { label: any }) => {
                        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
                      })
                      .filter((df: { name: string }) => df.name !== 'search')
                      .map(
                        (df: { label: string; name: string; required: boolean | undefined; hide: any }, idx: any) => (
                          <Filter
                            key={`chckbox-${idx}`}
                            type={'checkbox'}
                            label={df.label}
                            name={df.name}
                            required={df.required}
                            checked={!df.hide}
                            onChange={toggleColumn}
                          />
                        )
                      )}
                  </fetcher.Form>
                )}
              </div>
            )}
          </div>
        )}
        {props.tableLabel && <div className='font-bold text-2xl ml-4 mt-4'>{props.tableLabel}</div>}
        {props.print && (
          <>
            <button
              type='button'
              className={`ml-auto mt-auto p-2 ${
                props.tableLabel ? 'pt-1 mb-0 pb-1' : 'mb-2'
              } text-primary-500 font-semibold text-base underline lg:block hidden`}
              onClick={() => {
                togglePrintPopup();
              }}
            >
              <span>Print</span>
            </button>
            {isPrintOptVisible && (
              <div className='absolute right-8 w-[13.5rem] max-h-[25rem] z-10 px-8 pt-6 mt-[72px] overflow-y-auto bg-white rounded shadow-md'>
                <AiOutlineClose className='float-right cursor-pointer' onClick={() => togglePrintPopup(false)} />
                <span className='text-primary-500 font-bold text-base'>Print Options</span>
                <div className='border-t border-gray-300 my-4'></div>
                <div className='flex flex-col'>
                  <button className='mr-auto pb-5 hover:text-primary-500' onClick={() => handleDownload('csv')}>
                    CSV
                  </button>
                  <button className='mr-auto pb-5 hover:text-primary-500' onClick={() => handleDownload('pdf')}>
                    PDF
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {props.moreInfoView}

      <div ref={printElementRef}>
        <TableRaw
          ref={childRef}
          isApp={props.isApp}
          columns={tableColumns}
          type={props.type}
          addParams={props.addParams}
          defaultData={props.defaultData}
          filters={currentFilters}
          perPage={10}
          refreshOuter={props.refreshOuter}
          rawRowData={handleRowData}
          rowClick={props.rowClick}
          showWithholding={props.showWithholding}
          defaultSort={defaultSort}
          isPDF={isPDF}
          isPDFDone={printPDF}
          customColumnData={props?.customColumnData}
          onTotalChange={props.onTotalChange}
          unit={tableTypes[props.type]?.unit ?? 'rows'}
          actions={props.actions}
        />
      </div>
    </div>
  );
});
TableWidget.displayName = 'TableWidget';

export default TableWidget;
