import { type SetStateAction, useEffect, useState, useCallback } from "react"
import { CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis, LineChart, Tooltip, Line, ComposedChart, Bar, BarChart, PieChart, Pie, Cell, Sector, type YAxisProps, type XAxisProps, Area, LegendProps } from "recharts"
import { chartList } from "~/lib/chartTypes"
import CalendarRangePicker from "./ui/calendar/RangePicker"
import moment from "moment"
import Input from "./ui/Input"
import SelectDropdown from "./ui/Dropdown"
import { Link } from "@remix-run/react"
import { formatDate, getLocalStore } from "~/lib/utils"
import MonthPicker from "./ui/calendar/MonthPicker"

type ChartBarLine = {key: string, color: string, yAxisId?: string, name?: string}

const LineChartWidget = (props: {
    lines: ChartBarLine[], 
    data: any[], 
    xAxis: XAxisProps, 
    tooltip?: {labelFormatter?: (lbl: string) => string, formatter?: (val: string) => string},
    yAxis?: YAxisProps[],
    legendProps?: Omit<LegendProps, 'ref'>,
    height: number
}) => {
    const [activeLine, setActiveLine] = useState(props.lines.map((l) => l.key))
    const handleLegendClick = (dataKey: string) => {
        if (activeLine.includes(dataKey)) {
            if (activeLine.length > 1) {
                setActiveLine(activeLine.filter(el => el !== dataKey))
            }
        } else {
            setActiveLine(prev => [...prev, dataKey])
        }
    }
    useEffect(() => {
        setActiveLine(props.lines.map((l) => l.key))
    }, [props.lines])
    return <ResponsiveContainer width='100%' height={props.height}>
        <LineChart height={props.height} data={props.data} margin={{ left: 20, right: 20, bottom: 15, top: 20 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis {...props.xAxis} padding={{ left: 20, right: 20 }} />
            {props.yAxis ? 
                props.yAxis.map((y, i) => <YAxis key={`yaxis-${i}`} {...y} />)
                : <YAxis />}
            <Legend onClick={props.lines.length > 1 ? (pl) => handleLegendClick(pl.dataKey) : undefined} {...props.legendProps}/>
            {!!props.tooltip && <Tooltip {...props.tooltip}/>}
            {props.lines.map((ln, i) => 
                <Line hide={!activeLine.includes(ln.key)} key={`line-${i}`} yAxisId={ln.yAxisId} name={ln.name} type='monotone' dataKey={ln.key} stroke={ln.color} />
            )}
        </LineChart>
    </ResponsiveContainer>
}

const BarChartWidget = (props: {
    bars: ChartBarLine[], 
    data: any[], 
    chartType: 'horizontal' | 'vertical', 
    xAxis: XAxisProps, 
    yAxis?: YAxisProps, 
    tooltip?: {labelFormatter?: (lbl: string) => string, formatter?: (val: string) => string},
    legendProps?: Omit<LegendProps, 'ref'>,
    height: number}) => {
    return <ResponsiveContainer width="100%" height={props.height}>
        <BarChart
            data={props.data}
            barCategoryGap={props.chartType === "vertical" ? 10 : 20}
            margin={{
                top: 20,
                right: props.chartType === "vertical" ? 30 : 10,
                left: props.chartType === "vertical" ? 30 : 0,
                bottom: 20,
            }}
            layout={props.chartType}
        >
            <CartesianGrid strokeDasharray="3 3" vertical={props.chartType === "vertical"} />
            <XAxis {...props.xAxis} />
            <YAxis {...props.yAxis} />
            {!!props.tooltip && <Tooltip {...props.tooltip} />}
            <Legend {...props.legendProps}/>
            {props.bars.map((bar, ix) => (
                <Bar key={`bar-${ix}`} dataKey={bar.key} name={bar.name} stackId='a' fill={bar.color} />
            ))}
            {/* <Bar dataKey="total" fill="#efe513">
                <LabelList dataKey="total" position={stateLayout === "vertical" ? "right" : "top"} />
            </Bar> */}
        </BarChart>
    </ResponsiveContainer>
}

const ComboChartWidget = (props: {
    lines?: ChartBarLine[], 
    bars?: ChartBarLine[], 
    area?: ChartBarLine[],
    data: any[], 
    xAxis: XAxisProps, 
    height: number,
    tooltip?: {labelFormatter?: (lbl: string) => string, formatter?: (val: string) => string},
    yAxis?: YAxisProps[],
}) => {
    return <ResponsiveContainer width='100%' height={props.height}>
    <ComposedChart height={props.height} data={props.data} margin={{ left: 20, right: 20, bottom: 10, top: 20 }}>
      <CartesianGrid strokeDasharray='3 3' />
      <XAxis {...props.xAxis} />
      {props.yAxis ? 
        props.yAxis.map((y, i) => <YAxis key={`yaxis-${i}`} {...y} />)
      : <YAxis />}
      {!!props.tooltip && <Tooltip {...props.tooltip} />}
      {props.area?.map((area, ix) => 
        <Area key={`area-${ix}`} yAxisId={area.yAxisId} name={area.name} dataKey={area.key} stroke={area.color} fill={area.color}  />
      )}
      {props.bars?.map((bar, ix) => (
        <Bar key={`bar-${ix}`} yAxisId={bar.yAxisId} name={bar.name} dataKey={bar.key} stackId='a' fill={bar.color} />
      ))}
      {props.lines?.map((line, ix) => 
        <Line key={`line-${ix}`} yAxisId={line.yAxisId} name={line.name} dataKey={line.key} stroke={line.color} />
      )}
    </ComposedChart>
  </ResponsiveContainer>
}

const PieChartWidget = (props: {data: any[], colors: string[], height: number}) => {
    const [pieActive, setPieActive] = useState(0);
    return <ResponsiveContainer width='100%' height={props.height}>
        <PieChart height={Math.round(props.height * 0.8)}>
        <Pie
            activeIndex={pieActive}
            activeShape={props.height > 300 ? renderActiveShape : undefined}
            onMouseEnter={(_, index) => setPieActive(index)}
            cx='50%'
            cy='50%'
            data={props.data}
            innerRadius={Math.round(props.height * 0.125)}
            outerRadius={Math.round(props.height * 0.2)}
            dataKey='value'
        >
            {props.colors.map((col, ix) => (
                <Cell key={`piecell-${ix}`} fill={col} />
            ))}
        </Pie>
        </PieChart>
    </ResponsiveContainer>
}

const TableWidget = (props: {data: any[], columns: {label: string, name: string, link?: string, dateField?: string}[], height?: number, total: number}) => {
    return <div className="h-full">
        <div className={`overflow-y-auto lg:overflow-x-auto h-[320px] scroll-smooth mt-4`}>
            <table className="min-w-full relative">
                <thead className="font-signika text-lg">
                    <tr className="[&>th:first-child]:rounded-l [&>th:last-child]:rounded-r bg-primary-500">
                        {props.columns.map((col, idx) => <th key={`table-${idx}`} 
                            className={`z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left`}
                        >
                            <div className="flex gap-2">
                                <span>{col.label}</span>
                            </div>
                        </th>)}
                    </tr>
                </thead>
                <tbody className="">
                    {props.data.map((rd, ri) => 
                        <tr key={`row-${ri}`} className={`${( ri % 2 !== 0 ? "bg-gray-100" : "")} border-t border-t-gray-200`}>
                            {props.columns.map((col, idx) => 
                            <td key={`row-${ri}-col-${idx}`} className={`p-3`}>
                                <span className="flex">
                                {col.link ? 
                                    <Link to={col.link.replace('{id}', rd.id || rd.animalUuid)} target="_blank" className="text-primary-500 underline font-bold link-print">{rd[col.name]}</Link>
                                :
                                col.dateField && rd[col.name] 
                                    ? formatDate(rd[col.name], col.dateField) 
                                    : typeof rd[col.name] === 'boolean' 
                                        ? String(rd[col.name]) 
                                        : rd[col.name]}
                                </span>
                            </td>
                            )}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      {props.total > -1 &&
        <div className="mt-6">
            <p className="font-bold">{props.total} total rows</p>
        </div>}
    </div>
}

const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const label: string[] = payload.name?.match(/\b[\w\s]{5,}?(?=\s)|.+$/g) || [];
  
    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor='middle' fill={'black'}>
          {label.map((l, idx) => (
            <tspan key={`txt-${idx}`} x='50%' y='50%' dy={idx * 18 - ((label.length - 1) * 8) / 2} textAnchor='middle'>
              {l}
            </tspan>
          ))}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill='none' />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke='none' />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          textAnchor={textAnchor}
          fontWeight={700}
          fill='#333'
        >{`${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} fontSize={14} textAnchor={textAnchor} fill='#999'>
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
};

export type ChartTypes = 'bar' | 'line' | 'combo' | 'pie' | 'table'

type ChartSelectorType = {
    data: any[],
    type: ChartTypes,
    xAxis?: XAxisProps, 
    yAxis?: YAxisProps[],
    legendProps?: Omit<LegendProps, 'ref'>,
    height: number,
    tooltip?: {labelFormatter?: (lbl: string) => string, formatter?: (val: string) => string}
} & (
    {
        type: 'bar',
        bars: ChartBarLine[],
        chartType: 'horizontal' | 'vertical', 
        xAxis: XAxisProps,
        yAxis?: YAxisProps
    } | {
        type: 'pie',
        colors: string[]
    } | {
        type: 'line',
        xAxis: XAxisProps,
        yAxis?: YAxisProps[],
        lines: ChartBarLine[],
    } | {
        type: 'combo',
        xAxis: XAxisProps,
        yAxis?: YAxisProps[],
        lines?: ChartBarLine[],
        bars?: ChartBarLine[],
        area?: ChartBarLine[],
    } | {
        type: 'table',
        columns: {label: string, name: string, link?: string, dateField?: string}[],
        total: number
    }
)

const ChartSelector = (props: ChartSelectorType | {type: 'loading', height: number} | {type: 'nodata', height: number}) => {
    switch (props.type) {
        case 'bar':
            return <BarChartWidget {...props} />
        case 'line':
            return <LineChartWidget {...props} />
        case 'combo':
            return <ComboChartWidget {...props} />
        case 'pie':
            return <PieChartWidget {...props} />
        case 'table':
            return <TableWidget {...props} />
        default:
            return <div className="h-[400px] w-full"></div>
    }
}

const Filters = (props: {type: string, name: string, label: string, value?: string|number, options?: {value: string|number, label: string}[], onChange: React.Dispatch<SetStateAction<{[key: string]: string | number | undefined}>>}) => {
    const [open, setOpen] = useState(false)
    switch (props.type) {
        case "yearRange":
            const startVal = props.value ? String(props.value).split('_')[0] : props.options![0].value
            const endVal = props.value ? String(props.value).split('_')[1] : props.options![props.options?.length ? props.options.length - 1 : 0].value
            return <div className="flex items-center gap-1 border border-gray-300 rounded">
                <select className="focus:outline-none pl-1 pr-2 py-2 bg-white rounded-l" value={startVal} onChange={(e) => props.onChange((prev) => {
                    const split = String(prev[props.name]).split('_')
                    return {...prev, [props.name]: `${e.target.value}_${split[1]}`}
                })}>
                    {props.options?.map((opt, i) => <option key={`opt-${i}`} disabled={Number(opt.value) > Number(endVal)} value={opt.value}>{opt.label}</option>)}
                </select>
                <span className="text-sm">to</span>
                <select className="focus:outline-none pl-1 pr-2 py-2 bg-white rounded-r" value={endVal} onChange={(e) => props.onChange((prev) => {
                    const split = String(prev[props.name]).split('_')
                    return {...prev, [props.name]: `${split[0]}_${e.target.value}`}
                })}>
                    {props.options?.map((opt, i) => <option key={`opt-${i}`} disabled={Number(opt.value) < Number(startVal)} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
        case "date":
            return <div className="flex items-center gap-2">
                <label className="font-signika font-semibold">{props.label}</label>
                <Input defaultValue={props.value} type="date" name={props.name} onChange={(e) => {
                    if (!e.target.value || !/^((20)|(19))\d{2}/.test(e.target.value)) {
                        return
                    }
                    props.onChange((prev) => {
                        return {
                            ...prev,
                            [props.name]: e.target.value
                        }
                    })}
                } />
            </div>
        case "select":
            return <div className="flex items-center gap-2">
                <label className="font-signika font-semibold">{props.label}</label>
                <SelectDropdown
                    type='single'
                    options={props.options!}
                    value={props.value}
                    className='text-primary-500'
                    onSelectChange={(val) => props.onChange((prev) => {
                        return {...prev, [props.name]: val.value}
                    })}
                />
            </div>
        case "dateRange":
            const start = String(props.value).split('_')[0]
            const end = String(props.value).split('_')[1]
            return <div className="relative">
                    <button type="button" onClick={() => setOpen(!open)} className="border outline-none border-gray-300 px-4 py-2 rounded-sm flex gap-2 items-center">
                        <span className="font-bold">{start.split('-').reverse().join('/')}</span>
                        <span>to</span>
                        <span className="font-bold">{end.split('-').reverse().join('/')}</span>
                    </button>
                    <div className={`absolute z-20 top-full mt-2 min-w-[356px] bg-white border border-gray-300 rounded p-2 right-0 ${open ? '' : 'hidden'}`}>
                        <CalendarRangePicker numberOfMonths={1} range={{startDate: new Date(start), endDate: new Date(end)}} onChange={(range) => {
                            props.onChange((prev) => {
                                setOpen(false)
                                return {...prev, [props.name]: `${moment(range.startDate).format('YYYY-MM-DD')}_${moment(range.endDate).format('YYYY-MM-DD')}`}
                            })
                        }} />
                    </div>
                </div>
        case "month":
            return <div className="flex items-center gap-2">
                <label className="font-signika font-semibold">{props.label}</label>
                <MonthPicker 
                    value={props.value as string | undefined}
                    onChange={(val) => props.onChange(prev => ({...prev, [props.name]: val}))}
                    maxDate={moment().subtract(1, 'month').format('YYYY-MM')}
                />
            </div>
        default:
            return <></>
    }
}

const generateHerdDropdown = (name: string, herds: {[key: string]: string}, required?: boolean) => {
    let tmp = Object.entries(herds).map(([k, v]) => {
        return {
            label: v,
            value: `${name}: {equalTo: "${k}"}`
        }
    })
    if (!required) {
        tmp = [{label: "All Herds", value: ""}, ...tmp]
    }
    return {
        [name]: tmp
    }
}

const ChartWidget = (props: {id: keyof typeof chartList, height?: number, type: ChartTypes, title?: string, herdList: {[key: string]: string}, defaultValues?: {[key: string]: string | number}, hideHerdFilter?: boolean}) => {
    const [chartInfo, setChartInfo] = useState(chartList[props.id])
    const [data, setData] = useState<ChartSelectorType | {type: 'loading'} | {type: 'nodata'}>({type: 'loading'})
    const [rawData, setRawData] = useState<any>()
    const [isLoading, setIsLoading] = useState(false)
    const [customOpts, setCustomOpts] = useState<{[key: string]: {label: string, value: string}[]}>({
        ...generateHerdDropdown('herdUuid', props.herdList, chartList[props.id].filters.filter((ft) => ft.name === 'herdUuid' && 'required' in ft && ft.required).length > 0),
        herdUuids: [
            {label: "All Herds", value: Object.keys(props.herdList).join(',')},
            ...Object.entries(props.herdList).map(([k, v]) => {
                return {
                    label: v,
                    value: k
                }
            })
        ],
        ...generateHerdDropdown('herdFrom', props.herdList),
        ...generateHerdDropdown('herdTo', props.herdList)
    })
    const [filterState, setFilterState] = useState<{[key: string]: string | number | string[] | undefined}>(() => {
        let obj: {[key: string]: string | number | undefined} = props.defaultValues ? {...props.defaultValues} : {}
        chartInfo.filters.forEach((c, i) => {
            if (c.type === 'yearRange' && c.options) {
                obj[c.name] = `${c.options[Math.floor(c.options.length/2)].value}_${c.options[c.options.length-1].value}`
            } else if (c.type === 'dateRange') {
                obj[c.name] = `${moment().subtract(1, 'year').format('YYYY-MM-DD')}_${moment().format('YYYY-MM-DD')}`
            } else {
                obj[c.name] = 'defaultValue' in c ? c.defaultValue as string | number : undefined
                if (c.name === 'herdUuids' && 'defaultValue' in c && c.defaultValue === '') {
                    obj[c.name] = Object.keys(props.herdList).join(',')
                } else if (c.name === 'herdUuid' && 'defaultValue' in c && 'required' in c && c.required && !c.defaultValue && props.herdList) {
                    obj[c.name] = `herdUuid: {equalTo: "${Object.keys(props.herdList)[0]}"}`
                }
            }
            if (c.name == 'herdUuid') {
                if (props.hideHerdFilter) {
                    setChartInfo((prev) => {
                        return {...prev, filters: chartList[props.id].filters.filter((i:any) => i.name !== 'herdUuid')}
                    })
                } else {
                    setChartInfo(chartList[props.id])
                }
            }
        })
        return obj
    })
    const fetchData = useCallback(() => {
        setIsLoading(true)
        fetch(`/dashboard/summary/personal/${props.id}`, {
            method: 'POST',
            body: JSON.stringify({filters: filterState, herdList: Object.keys(props.herdList)})
        }).then((resp) => resp.json())
        .then((resp: any) => {
            setRawData(resp.data)
            let filterStateCopy = {...filterState}
            if (chartInfo.filters.filter(f => 'apiFill' in f).length && 'filter' in chartInfo.processor) {
                const optsList = chartInfo.processor.filter(resp.data)
                let opts: typeof customOpts = {}
                Object.entries(optsList).forEach(([k, v]) => {
                    opts[k] = v.opts
                    filterStateCopy[k] = v.selected
                })
                setCustomOpts(opts)
                setFilterState(filterStateCopy)
            }
            const obj = Object.keys(resp.data)
            if (!obj || !resp.data[obj[0]].nodes || resp.data[obj[0]].nodes.length === 0) {
                setData({type: 'nodata'})
            } else {
                //@ts-ignore
                setData(chartInfo.processor[props.type](resp.data, props.herdList, filterStateCopy))
            }
        }).finally(() => {
            setIsLoading(false)
        })
    }, [filterState])
    useEffect(() => {
        if (props.defaultValues) {
            if (props.defaultValues?.herdUuid && !props.defaultValues.herdUuid.toString().includes('equalTo')) {
                props.defaultValues.herdUuid = `herdUuid: {equalTo: "${props.defaultValues.herdUuid}"}`
            }
            let updates: typeof filterState = {}
            Object.entries(props.defaultValues).forEach(([k ,v]) => {
                if (v && filterState[k] !== v) {
                    updates[k] = v
                }
            })
            if (Object.keys(updates).length) {
                setFilterState((prev) => ({...prev, ...updates}))
            }
        }
    }, [props.defaultValues, filterState])
    useEffect(() => {
        if ('required' in chartInfo) {
            const missingReq = chartInfo.required.filter(r => !filterState[r]).length
            if (missingReq) {
                return
            }
        }
        if ('inlineFilter' in chartInfo && chartInfo.inlineFilter && rawData) {
            //@ts-ignore
            setData(chartInfo.processor[props.type](rawData, props.herdList, filterState))
            return
        }
        fetchData()
    }, [filterState])
    return <div className="">
        {props.title && <h3 className="text-xl pb-2">{props.title}</h3>}
        <div className={`flex justify-end`}>
            <div className="flex justify-end gap-4">
                {chartInfo.filters?.map((f, i) => <Filters key={`filter-${i}`} value={filterState[f.name]} {...f} options={customOpts[f.name] ?? f.options} onChange={setFilterState} />)}
            </div>
        </div>
        <div className="relative">
            <ChartSelector {...data} height={props.height ?? 400} />
            {isLoading && <div role="status" className="absolute inset-0 z-10 flex justify-center p-3 items-center bg-white/50">
                <svg aria-hidden="true" className="w-6 h-6 animate-spin text-primary-500 fill-primary-100" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg>
                <span className="ml-2">Loading...</span>
            </div>}
            {data.type === 'nodata' && !isLoading && <div className="absolute inset-0 z-10 flex justify-center items-center">
                <h5>No data</h5>
            </div>}
        </div>
    </div>
}

export {
    LineChartWidget,
    ComboChartWidget,
    BarChartWidget,
    PieChartWidget,
    ChartSelector,
    ChartWidget,
    renderActiveShape
}