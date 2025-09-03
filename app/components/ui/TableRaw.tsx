import { Link, useFetcher } from "@remix-run/react"
import moment from "moment";
import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { FaRegEdit, FaTrash } from "react-icons/fa";
import { FaArrowDown, FaArrowUp, FaSort } from "react-icons/fa6"
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io"
import { IoWarning } from "react-icons/io5";
import type { tableTypes } from "~/lib/utils";
import { formatDate } from "~/lib/utils"
import HoverCard from "./HoverCard";
import Button from "./Button";

export type TableProps = {
  columns: typeof tableTypes[0]['columns'],
  type: string,
  isApp?: boolean,
  addParams?: {[key:string]: string | string[]},
  defaultData?: {
    rows: {[key: string]: string}[]
    total: number,
    hasNext: boolean
  },
  showWithholding?: boolean,
  filters: {[key: string]: string | number},
  perPage: number,
  refreshOuter?: () => void,
  rawRowData?: (rowData: {[key: string]: string}) => void,
  rowClick?: boolean,
  defaultSort?: {column: string, direction: string},
  isPDF?: boolean,
  isPDFDone?: () => void,
  customColumnData?: (rowData: {[key: string]: Array<any> }) => void,
  onTotalChange?: (total: number) => void;
  unit?: string,
  actions?: {
    label: string,
    type: 'edit' | 'delete',
    filter?: (row: any) => boolean,
    func: (row: any) => void
  }[]
}

export type TableRawRef = {
  passPrintData: () => void
}

const TableRaw = forwardRef(({columns, type, filters, perPage, isApp, addParams, defaultData, showWithholding, refreshOuter, rawRowData, rowClick, defaultSort, isPDF, isPDFDone, customColumnData, onTotalChange, unit, actions}: TableProps, ref) => {
  TableRaw.displayName = "TableRaw";
  const fetcher = useFetcher<{rows: {[key: string]: string}[], total: number, hasNext: boolean}>()
  const [rowData, setRowData] = useState<{rows: {[key: string]: string}[], total: number}>({
    rows: defaultData?.rows ?? [], 
    total: defaultData?.total ?? -1
  })
  const [currPaging, setCurrPaging] = useState([(defaultData && !defaultData.hasNext ? -1 : rowData.rows.length), rowData.rows.length + perPage])
  const [currSort, setCurrSort] = useState(defaultSort ?? {column: '', direction: ''})
  const inProcess = useRef(false)
  const filtersRef = useRef({update: false, filters: filters})
  const tableRef = useRef<HTMLDivElement>(null)
  const [colTotal, setColTotal] = useState(columns.filter(c => !c.hide).length + (!!actions && actions?.length > 0 ? 1 : 0))

  const scrollIntoView = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    if (target.scrollHeight - target.scrollTop < 800 && !inProcess.current) {
      inProcess.current = true
      setCurrPaging((prevState) => {
        if (prevState[0] === -1) {
          return prevState
        }
        return [prevState[1], (prevState[1]*2) - prevState[0]]
      })
    }
  }, [])

  const changeSort = useCallback((column: string) => () => {
    setRowData({rows: [], total: -1})
    setCurrPaging([0, perPage])
    setCurrSort((prevState) => {
      if (prevState.column === column) {
        if (prevState.direction === 'desc') {
          return {column: '', direction: ''}
        } else {
          return {column: column, direction: 'desc'}
        }
      } else {
        return {column, direction: 'asc'}
      }
    })
  }, [perPage])

  const [expandedRow, setExpandedRow] = useState<number>(-1);
  const toggleDetails = (rowId: number) => {
    if (expandedRow === rowId) {
      setExpandedRow(-1);
    } else {
      setExpandedRow(rowId);
    }
  };

  const [toggleOnClickBg, setToggleOnClickBg] = useState<number>(-1);
  const handleRowClick = (rd: {[key: string]: string}, ri: number) => {
    if (rowClick && rawRowData) {
      setToggleOnClickBg(ri)
      rawRowData(rd)
    }
  };

  useImperativeHandle(ref, () => {
    return {
      async passPrintData(): Promise<{ [key: string]: string }[]> {
        let dataArr:[] = []
        let filterArr = Object.entries(filtersRef.current.filters).map(([k, v]) => {
          return `${k}=${v}`
        })
        if (currSort.column) {
          filterArr.push(`sortcol=${currSort.column}`)
          filterArr.push(`sortdir=${currSort.direction}`)
        }
        if (addParams) {
          Object.entries(addParams).forEach(([k,v]) => {
            filterArr.push(`${k}=${v}`)
          })
        }
        const columnList = columns.filter(col => !col.hide).map((col) => col.name)
        const url = `/table/${type}/?from=0&to=10000000&${filterArr.join('&')}&columns=${columnList.join(',')}`;
        await fetch(url)
          .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
              if (data && Array.isArray(data.rows)) {
                dataArr = data.rows;
              } else {
                  return Promise.reject(new Error('Invalid data format'));
              }
          })
          .catch(error => {
              console.error('Error fetching data:', error);
              return [];
          });
        return dataArr
      }
    }
  })

  useEffect(() => {
    if (currPaging[0] > -1 || filtersRef.current.update) {
      let filterArr = Object.entries(filtersRef.current.filters).map(([k, v]) => {
        return `${k}=${v}`
      })
      if (currSort.column) {
        filterArr.push(`sortcol=${currSort.column}`)
        filterArr.push(`sortdir=${currSort.direction}`)
      }
      if (addParams) {
        Object.entries(addParams).forEach(([k,v]) => {
          filterArr.push(`${k}=${v}`)
        })
      }
      const columnList = columns.filter(col => !col.hide).map((col) => col.name)
      fetcher.load(`/table/${type}/?from=${currPaging[0]}&to=${currPaging[1]}&${filterArr.join('&')}&columns=${columnList.join(',')}`)
    }
  }, [currPaging, type, currSort, columns, defaultData?.hasNext])

  useEffect(() => {
    setColTotal((prev) => {
      const newTotal = columns.filter(c => !c.hide).length
      if (newTotal !== prev) {
        setRowData({rows: [], total: -1})
        setCurrPaging([0, perPage])
      }
      return newTotal
    })
  }, [columns])
  useEffect(() => {
    let filterChanged = Object.keys(filters).length !== Object.keys(filtersRef.current.filters).length
    Object.entries(filters).forEach(([k, v]) => {
      if (!filtersRef.current.filters[k] || filtersRef.current.filters[k] !== v) {
        filterChanged = true
      }
    })
    if (!filterChanged) {
      return
    }
    filtersRef.current.filters = filters
    filtersRef.current.update = true
    setRowData({rows: [], total: -1})
    setCurrPaging([0, perPage])
  }, [filters])
  useEffect(() => {
    if (fetcher.state === "idle" && refreshOuter) {
      const timeout = setTimeout(() => {
        refreshOuter()
        clearTimeout(timeout)
      }, 10)
    }
  }, [fetcher.state, refreshOuter])
  useEffect(() => {
    if (fetcher.data && Array.isArray(fetcher.data.rows)) {
      if (filtersRef.current.update) {
        filtersRef.current.update = false
        if (customColumnData) {
          customColumnData({rowData: [...fetcher.data.rows]})
        }
        setRowData({rows: [...fetcher.data.rows], total: fetcher.data.total})
        tableRef?.current?.scrollTo(0,0)
      } else {
        if (customColumnData) {
          customColumnData({rowData: [...fetcher.data.rows]})
        }
        setRowData((prev) => {
          if (currPaging[0] <= 0) {
            return {rows: fetcher.data?.rows ?? [], total: fetcher.data?.total ?? prev.total}
          }
          return {rows: [...prev.rows, ...(fetcher.data && fetcher.data.rows.length > 0 ? fetcher.data.rows : [])], total: fetcher.data?.total ?? prev.total}
        })
      }
      if (!fetcher.data.hasNext) {
        setCurrPaging([-1, -1])
      }
      inProcess.current = false
    }
  }, [fetcher.data])
  useEffect(() => {
    let filterArr = Object.entries(filtersRef.current.filters).map(([k, v]) => {
      return `${k}=${v}`
    })
    if (currSort.column) {
      filterArr.push(`sortcol=${currSort.column}`)
      filterArr.push(`sortdir=${currSort.direction}`)
    }
    if (addParams) {
      Object.entries(addParams).forEach(([k,v]) => {
        filterArr.push(`${k}=${v}`)
      })
    }
    const columnList = columns.filter(col => !col.hide).map((col) => col.name)
    if (isPDF === true) {
      filtersRef.current.update = true
      fetcher.load(`/table/${type}/?from=0&to=1000000&${filterArr.join('&')}&columns=${columnList.join(',')}`)
    } else {
      // if ( currPaging[0] !== -1 && currPaging[1] !== -1) {
      //   fetcher.load(`/table/${type}/?from=${currPaging[0]}&to=${currPaging[1]}&${filterArr.join('&')}&columns=${columnList.join(',')}`)
      // } else {
      //   setCurrPaging([0, perPage])
      // }
    }
  },[isPDF])

  useEffect(() => {
    if (isPDF === true && isPDFDone) {
      isPDFDone()
    }
  }, [rowData])

  useEffect(() => {
    if (onTotalChange && rowData.total >= 0) {
      onTotalChange(rowData.total)
    }
  }, [rowData.total]);

  return (
    <>
      <div ref={tableRef} onScroll={scrollIntoView} className="relative overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4">
        <table className="min-w-full table-print relative">
          <thead className="font-signika text-lg">
              <tr className="[&>th:first-child]:rounded-l [&>th:last-child]:rounded-r bg-primary-500">
                {!!actions && actions?.length > 0 && <th className="sticky top-0 bg-primary-500 z-10">&nbsp;</th>}
              {columns.filter(c => !c.hide).map((col, idx) => <th key={`table-${idx}`} 
                className={`z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left ${col.classes ?? ""} ${idx >= 2 ? "hidden lg:table-cell print:table-cell" + (idx === 2 ? " rounded-r md:table-cell lg:rounded-none print:rounded-none" : "") : idx === 1 ? "rounded-r md:rounded-none print:rounded-none" : ""}`}
              >
                <div className="flex gap-2">
                  <span>{col.label}</span>
                  {!col.hideSort && <button type="button" className="print:hidden" onClick={changeSort(col.name)}>
                    {currSort.column !== col.name && <FaSort />}
                    {currSort.column === col.name && currSort.direction === 'asc' && <FaArrowUp />}
                    {currSort.column === col.name && currSort.direction === 'desc' && <FaArrowDown />}
                  </button>}
                </div>
              </th>)}
              </tr>
          </thead>
          <tbody className="">
            {rowData.rows.map((rd, ri) => 
            <React.Fragment key={`row-${ri}`}>
              <tr onClick={() => handleRowClick(rd,ri)} className={`${expandedRow === ri ? "bg-secondary-500 [&>td:first-child]:rounded-l [&>td:last-child]:rounded-r" : ( ri % 2 !== 0 ? "bg-gray-100" : "")} ${(toggleOnClickBg === ri ? 'bg-secondary-500' : '')} border-t border-t-gray-200`}>
                {!!actions && actions?.length > 0 && <td className="pl-3 pt-3 flex items-center">
                  {actions.filter(act => act.filter ? act.filter(rd) : true).map((act, ix) => <React.Fragment key={`actions-${ri}-${ix}`}>
                    {act.type === 'edit' && <Button type="button" variant="transparent" size="icon" title={act.label} onClick={() => act.func(rd)}><FaRegEdit /></Button>}
                    {act.type === 'delete' && <Button type="button" variant="transparent" size="icon" title={act.label} onClick={() => act.func(rd)} className="text-gray-500 hover:text-red-500"><FaTrash /></Button>}
                  </React.Fragment>)}
                </td>}
                {columns.filter(col => !col.hide).map((col, idx) => 
                  <td key={`row-${ri}-col-${idx}`} className={`p-3 ${col.classes ?? ""} ${idx >= 2 ? "hidden lg:table-cell print:table-cell" + (idx === 2 ? " rounded-r md:table-cell lg:rounded-none print:rounded-none" : "") : idx === 1 ? "rounded-r md:rounded-none print:rounded-none" : ""}`}>
                    <span className="flex gap-2 items-center">
                      {idx === 0 && <>
                          <button type="button" className="mt-1 mr-2 lg:hidden print:hidden" onClick={() => {
                            toggleDetails(ri)
                            setTimeout(() => {
                              refreshOuter && refreshOuter()
                            }, 10);
                          }}>
                            {expandedRow === ri ? <IoIosArrowUp /> : <IoIosArrowDown />}
                          </button>
                          {showWithholding && ((rd.whMeat && moment(rd.whMeat).isAfter()) || (rd.whMilk && moment(rd.whMilk).isAfter())) && 
                          <HoverCard closeDelay={0} openDelay={0}>
                            <HoverCard.Trigger asChild>
                              <button type="button"><IoWarning className="fill-red-500" /></button>
                            </HoverCard.Trigger>
                            <HoverCard.Content role='tooltip' className='rounded py-2 px-4 z-50 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800' side='top' >
                              This animal is within the withholding period
                            </HoverCard.Content>
                          </HoverCard>}
                        </>
                      }
                      {col.link ? isApp ? 
                        <button type="button" onClick={() => {
                          //@ts-ignore
                          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({actionData: {url: col.link?.replace('{id}', rd.id || rd.animalUuid)}, type: "openPage"}));
                        }} className="text-primary-500 underline font-bold link-print">{rd[col.name]}</button>
                        : 
                      <Link to={col.link.replace('{id}', rd.id || rd.animalUuid).replace('{animalid}', rd.animalId)} className="text-primary-500 underline font-bold link-print">{rd[col.name]}</Link>
                      :
                      col.dateField && rd[col.name] 
                        ? formatDate(rd[col.name] + (col.formatUTC && !/\.\d{1,3}Z?$/.test(rd[col.name]) ? '.000Z' : ''), col.dateField)
                        : col.mapper ? col.mapper[rd[col.name]]
                          : (col.emptyVal && typeof rd[col.name] === 'undefined' 
                            ? col.emptyVal 
                            : typeof rd[col.name] === 'boolean' 
                              ? String(rd[col.name]) 
                              : rd[col.name])}
                    </span>
                  </td>
                )}
              </tr>
              {(expandedRow === ri) && (
                <tr>
                  <td className="bg-white" colSpan={colTotal}>
                    <div className="grid grid-cols-2 gap-6 p-4">
                      {columns.filter(c => !c.hide).map((col, index) => (
                        <div key={`row-${ri}-detail-${index}`} className={`py-2 ${index <= 1 ? "hidden" : index === 2 ? "md:hidden" : ""}`}>
                          <div className="text-base font-bold leading-[1.375em] pb-2">
                            {col.label}
                          </div>
                          <div className="text-base font-normal leading-[1.375em]">
                            {col.dateField && rd[col.name] 
                              ? formatDate(rd[col.name], col.dateField) 
                              : col.mapper ? col.mapper[rd[col.name]]
                                : (col.emptyVal && typeof rd[col.name] === 'undefined' 
                                  ? col.emptyVal 
                                  : typeof rd[col.name] === 'boolean' 
                                    ? String(rd[col.name]) 
                                    : rd[col.name])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            )}
            {fetcher.state !== 'idle' && 
              <tr className="">
                <td colSpan={colTotal}>
                  <div role="status" className="flex justify-start p-3 items-center">
                      <svg aria-hidden="true" className="w-6 h-6 animate-spin text-primary-500 fill-primary-100" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                      </svg>
                      <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            }
            {fetcher.state === "idle" && rowData.rows.length === 0 && 
              <tr className="">
                <td colSpan={colTotal} className="p-4">
                  No data found
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      {rowData.total > -1 &&
        <div className="mt-6 pb-4">
            <p className="font-bold">{rowData.total} total {unit}</p>
        </div>}
    </>
  );
})

export default TableRaw;
