import type { ChartTypes } from "~/components/ReportChartWidget"
import { colors } from "./utils"
import moment from "moment"

const startYear = new Date().getFullYear() - 9
const years = Array(10).fill(startYear).map((a, i) => ({value: startYear + i, label: String(startYear + i)}))

const mortality = {
    title: 'Mortality Rates',
    query: `animalPopulationViews (
        filter: {
            year: {greaterThanOrEqualTo: {start}, lessThanOrEqualTo: {end}},
            herdUuid: {in: [{herdList}]}
        }
    )
    {
        nodes {
            year
            herdUuid
            total
            totalDead
            totalSold
        }
    }`,
    filters: [
        {name: 'yearRange', label: 'Range', type: 'yearRange', options: years},
    ],
    chartType: ['line'],
    sizes: ['1x1','2x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {animalPopulationViews: {nodes: {year: number, herdUuid: string, total: number, totalDead: number, totalSold: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[year: number]: {[key: string]: number | string}} = {} 
            params.animalPopulationViews.nodes.forEach(n => {
                if (!chartDataLine[n.year]) {
                    chartDataLine[n.year] = {
                        year: n.year,
                    }
                }
                chartDataLine[n.year][herdList[n.herdUuid]] = Math.round(Number(n.totalDead || 0) * 10000 / (Number(n.total || 0) + Number(n.totalDead || 0) + Number(n.totalSold || 0)))/100
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: Object.entries(herdList).map(([uuid, code], i) => ({
                    key: code,
                    color: colors[i]
                })),
                xAxis: {
                    dataKey: 'year',
                    name: 'Year'
                },
                tooltip: {
                    labelFormatter: (val: string) => `Year ${val}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

const lactation = {
    title: 'Lactation',
    query: `animalLactationViews (
        condition: {
            animalUuid: "{animalUuid}"
        }
    )
    {
        nodes {
            animalUuid
            lactationNo
            totalMilk
            totalFatKg
            totalProteinKg
            standardMilk
            standardFatKg
            standardProteinKg
        }
    }`,
    required: ['animalUuid'],
    filters: [
        {name: 'chartType', label: 'Type', type: 'select', processor: true, defaultValue: 'total', options: [{label: "Totals", value: "total"}, {label: "305 Day", value: "standard"}]},
    ],
    inlineFilter: true,
    chartType: ['combo'],
    sizes: ['1x1','2x1'],
    availableInDashboard: false,
    processor: {
        combo: (params: {animalLactationViews: {nodes: {
            animalUuid: string,
            lactationNo: number,
            totalMilk: number,
            totalFatKg: number,
            totalProteinKg: number,
            standardMilk: number,
            standardFatKg: number,
            standardProteinKg: number
        }[]}}, herdList: {[key: string]: string}, filters: {chartType: 'total' | 'standard'}) => {
            let chartDataLine: {[lactNo: number]: {[key: string]: number | string}} = {} 
            params.animalLactationViews.nodes.forEach(n => {
                if (!chartDataLine[n.lactationNo]) {
                    chartDataLine[n.lactationNo] = {
                        lactNo: n.lactationNo,
                    }
                }
                chartDataLine[n.lactationNo]['milk'] = Number(n[`${filters.chartType}Milk`] || 0)
                chartDataLine[n.lactationNo]['fat'] = n[`${filters.chartType}Milk`] ? Math.round(Number(n[`${filters.chartType}FatKg`] || 0) * 10000 / n[`${filters.chartType}Milk`]) / 100 : 0
                chartDataLine[n.lactationNo]['protein'] = n[`${filters.chartType}Milk`] ? Math.round(Number(n[`${filters.chartType}ProteinKg`] || 0) * 10000 / n[`${filters.chartType}Milk`]) / 100 : 0
                return chartDataLine
            })
            return {
                type: 'combo' as ChartTypes,
                data: Object.values(chartDataLine),
                area: [{
                    key: 'milk',
                    color: colors[1],
                    yAxisId: 'left',
                    name: 'Milk KG'
                }],
                lines: [
                    {key: 'fat', name: 'Fat %', color: colors[0], yAxisId: 'right'},
                    {key: 'protein', name: 'Protein %', color: colors[3], yAxisId: 'right'}
                ],
                xAxis: {
                    dataKey: 'lactNo',
                    name: 'Lactation No.',
                    label: {value: 'Lactation', position: 'insideBottom', offset: -10}
                },
                yAxis: [
                    {yAxisId: 'left', dataKey: 'milk', label: {value: 'Milk KG', angle: -90, position: 'insideLeft'}},
                    {yAxisId: 'right', orientation: 'right', label: {value: 'Fat/Protein %', angle: 90}}
                ],
                tooltip: {
                    labelFormatter: (val: string) => `Lactation #${val}`,
                    formatter: (val: string) => Number(val).toLocaleString('en-AU')
                }
            }
        }
    }
}

const lactationTestDay = {
    title: 'Test Day',
    query: `animalTestdayViews (
        condition: {
            animalUuid: "{animalUuid}"
        }
        filter: {
            testDate: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"}
        }
    )
    {
        nodes {
            animalUuid
			cellCount
			testDate
			milk
			fatPercent
			fatKg
			proteinKg
			proteinPercent
        }
    }`,
    required: ['start', 'end', 'animalUuid'],
    filters: [
        {name: 'chartType', label: 'Type', type: 'select', processor: true, defaultValue: 'fat/protein', options: [{label: "Fat & Protein", value: "fat/protein"}, {label: "Cell Counts", value: "cell"}]},
    ],
    chartType: ['combo'],
    sizes: ['1x1','2x1'],
    availableInDashboard: false,
    processor: {
        combo: (params: {animalTestdayViews: {nodes: {
            animalUuid: string,
            cellCount: number,
            testDate: string,
            milk: number,
            fatPercent: number,
            fatKg: number,
            proteinPercent: number,
            proteinKg: number
        }[]}}, herdList: {[key: string]: string}, filters: {chartType: 'fat/protein' | 'cell'}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.animalTestdayViews.nodes.forEach(n => {
                if (!chartDataLine[n.testDate]) {
                    chartDataLine[n.testDate] = {
                        date: new Date(n.testDate).valueOf(),
                    }
                }
                chartDataLine[n.testDate]['milk'] = n.milk
                chartDataLine[n.testDate]['fat'] = n.fatPercent
                chartDataLine[n.testDate]['protein'] = n.proteinPercent
                chartDataLine[n.testDate]['cell'] = n.cellCount
                return chartDataLine
            })
            return {
                type: 'combo' as ChartTypes,
                data: Object.values(chartDataLine),
                area: [{
                    key: 'milk',
                    name: 'Milk Litres',
                    color: colors[1],
                    yAxisId: 'left',
                }],
                lines: filters.chartType === 'fat/protein' ? [
                    {key: 'fat', name: 'Fat %', color: colors[0], yAxisId: 'right'},
                    {key: 'protein', name: 'Protein %', color: colors[3], yAxisId: 'right'}
                ] : [{key: 'cell', name: 'Cell Count', color: colors[0], yAxisId: 'right'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Date',
                    tickFormatter: (date: number) => moment(date).format('DD/MM/YY')
                    // label: {value: 'Lactation', position: 'insideBottom', offset: -10}
                },
                yAxis: [
                    {yAxisId: 'left', label: {value: 'Litres', angle: -90, position: 'insideLeft'}},
                    {yAxisId: 'right', orientation: 'right', label: {value: filters.chartType === 'fat/protein' ? 'Fat/Protein %' : 'Cell Counts', angle: 90, position: 'right'}}
                ],
                tooltip: {
                    labelFormatter: (val: string) => `Date: ${moment(val).format('MMMM DD, YYYY')}`,
                    // formatter: (val: string) => filters.chartType === 'fat/protein' ? `${val}%` : val
                }
            }
        }
    }
}

const herdTestAverage = {
    title: 'Herd Test Averages',
    query: `herdTestAvgViews (
        filter: {
            testDate: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"}
            {herdUuid}
        }
        orderBy: TEST_DATE_ASC
    )
    {
        nodes {
            testDate
            milk
            cellCount
            fatPercent
            proteinPercent
        }
    }`,
    required: ['start','end'],
    filters: [
        // {name: 'dateRange', label: 'Range', type: 'dateRange'},
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(1, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'chartType', label: 'Type', type: 'select', processor: true, defaultValue: 'cell', options: [{label: "Fat & Protein", value: "fat/protein"}, {label: "Cell Counts", value: "cell"}]},
        {name: 'herdUuid', label: 'Herd', type: 'select', defaultValue: '', options: []}
    ],
    chartType: ['combo'],
    sizes: ['2x1'],
    availableInDashboard: true,
    processor: {
        combo: (params: {herdTestAvgViews: {nodes: {
            cellCount: number,
            testDate: string,
            milk: number,
            fatPercent: number,
            proteinPercent: number,
        }[]}}, herdList: {[key: string]: string}, filters: {chartType: 'fat/protein' | 'cell'}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string | Date}} = {} 
            params.herdTestAvgViews.nodes.forEach(n => {
                if (!chartDataLine[n.testDate]) {
                    chartDataLine[n.testDate] = {
                        date: new Date(n.testDate),
                    }
                }
                chartDataLine[n.testDate]['milk'] = n.milk
                chartDataLine[n.testDate]['fat'] = n.fatPercent
                chartDataLine[n.testDate]['protein'] = n.proteinPercent
                chartDataLine[n.testDate]['cell'] = n.cellCount
                return chartDataLine
            })
            return {
                type: 'combo' as ChartTypes,
                data: Object.values(chartDataLine),
                area: [{
                    key: 'milk',
                    name: 'Milk Litres',
                    color: colors[1],
                    yAxisId: 'left',
                }],
                lines: filters.chartType === 'fat/protein' ? [
                    {key: 'fat', name: 'Fat %', color: colors[0], yAxisId: 'right'},
                    {key: 'protein', name: 'Protein %', color: colors[3], yAxisId: 'right'}
                ] : [{key: 'cell', name: 'Cell Count', color: colors[5], yAxisId: 'right'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Date',
                    tickFormatter: (date: number) => moment(date).format('DD/MM/YY')
                    // label: {value: 'Lactation', position: 'insideBottom', offset: -10}
                },
                yAxis: [
                    {yAxisId: 'left', label: {value: 'Litres', angle: -90, position: 'insideLeft'}},
                    {yAxisId: 'right', orientation: 'right', label: {value: filters.chartType === 'fat/protein' ? 'Fat/Protein %' : 'Cell Counts', angle: 90, position: 'right'}}
                ],
                tooltip: {
                    labelFormatter: (val: string) => `Date: ${moment(val).format('MMMM DD, YYYY')}`,
                    // formatter: (val: string) => filters.chartType === 'fat/protein' ? `${val}%` : val
                }
            }
        }
    }
}

const testAverage = {
    title: 'Production Summary',
    query: `testDayDailySummaries (
        filter: {testDate: {greaterThan: "${moment().subtract(5, 'year').format('YYYY-MM-DD')}"}}
    )
    {
        nodes {
            testDate
            age
            cows
            avgMilk
            avgCellCount
            avgFatPercent
            avgProteinPercent
        }
    }`,
    // required: ['dateRange'],
    filters: [
        {name: 'date', label: 'Test Date', type: 'select', options: [], processor: true, apiFill: true},
        {name: 'chartType', label: 'Type', type: 'select', processor: true, defaultValue: 'fat/protein', options: [{label: "Fat & Protein", value: "fat/protein"}, {label: "Cell Counts", value: "cell"}]},
    ],
    inlineFilter: true,
    chartType: ['combo'],
    sizes: ['1x1','2x1'],
    availableInDashboard: true,
    processor: {
        filter: (params: {testDayDailySummaries: {nodes: {
            avgCellCount: number,
            testDate: string,
            age: number,
            cows: number,
            avgMilk: number,
            avgFatPercent: number,
            avgProteinPercent: number,
        }[]}}) => {
            let dateSet = new Set<string>()
            params.testDayDailySummaries.nodes.forEach(n => {
                dateSet.add(n.testDate)
            })
            const dateOpts = Array.from(dateSet).sort((a, b) => a > b ? 1: -1).map((d) => ({label: moment(d).format('DD/MM/YYYY'), value: d}))
            return {
                date: {opts: dateOpts, selected: dateOpts ? dateOpts[0].value : undefined}
            }
        },
        combo: (params: {testDayDailySummaries: {nodes: {
            avgCellCount: number,
            testDate: string,
            age: number,
            cows: number,
            avgMilk: number,
            avgFatPercent: number,
            avgProteinPercent: number,
        }[]}}, herdList: {[key: string]: string}, filters: {date: string, chartType: 'fat/protein' | 'cell'}) => {
            let chartDataLine: {[age: number]: {[key: string]: number | string}} = {}
            params.testDayDailySummaries.nodes.forEach(n => {
                if (filters.date !== n.testDate) {
                    return
                }
                if (!chartDataLine[n.age]) {
                    chartDataLine[n.age] = {
                        age: n.age
                    }
                }
                chartDataLine[n.age]['Milk'] = n.avgMilk
                chartDataLine[n.age]['Cows'] = Number(n.cows)
                chartDataLine[n.age]['Fat %'] = Number(n.avgFatPercent)
                chartDataLine[n.age]['Protein %'] = Number(n.avgProteinPercent)
                chartDataLine[n.age]['Cell Count'] = Number(n.avgCellCount)
                return chartDataLine
            })
            return {
                type: 'combo' as ChartTypes,
                data: Object.values(chartDataLine),
                area: [{
                    key: 'Milk',
                    color: colors[2],
                    yAxisId: 'left',
                }],
                bars: [{
                    key: 'Cows',
                    color: colors[0],
                    yAxisId: 'left',
                }],
                lines: filters.chartType === 'fat/protein' ? [
                    {key: 'Fat %', color: colors[1], yAxisId: 'right'},
                    {key: 'Protein %', color: colors[4], yAxisId: 'right'},
                ] : [
                    {key: 'Cell Count', color: colors[1], yAxisId: 'right'}
                ],
                xAxis: {
                    dataKey: 'age',
                    name: 'Age',
                    // tickFormatter: (date: number) => moment(date).format('DD/MM/YY')
                    label: {value: 'Age', position: 'insideBottom', offset: -5}
                },
                yAxis: [
                    {yAxisId: 'left', label: {value: 'Cows/Milk Litres', angle: -90, position: 'insideLeft'}},
                    {yAxisId: 'right', orientation: 'right', label: {value: filters.chartType === 'fat/protein' ? 'Fat/Protein %' : 'Cell Counts', angle: 90, position: 'right'}}
                ],
                tooltip: {
                    // labelFormatter: (val: string) => `Date: ${moment(val).format('MMMM DD, YYYY')}`,
                    // formatter: (val: string) => filters.chartType === 'fat/protein' ? `${val}%` : val
                }
            }
        }
    }
}

const pregnancyRates = {
    title: 'Pregnancy Composition',
    query: `animalMateByHerds (
        filter: {
            status: {equalTo: "{status}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            totalCount
            totalCountMs
            totalCountMa
            totalCountMn
            totalCountEmpty
        }
    }`,
    required: ['status'],
    filters: [
        {name: 'status', label: 'Type', type: 'select', defaultValue: 'Milking', options: [
            {label: "Cows", value: "Milking"}, 
            {label: "Heifers", value: "Heifer"}
        ]},
        {name: 'herdUuid', label: 'Herd', type: 'select', defaultValue: "", options: [
            {label: "All Herds", value: ""}
        ]}
    ],
    chartType: ['pie'],
    sizes: ['1x1'],
    availableInDashboard: true,
    processor: {
        pie: (params: {animalMateByHerds: {nodes: {
            herdUuid: number
            totalCount: number,
            totalCountMs: number,
            totalCountMa: number,
            totalCountMn: number,
            totalCountEmpty: number,
        }[]}}, herdList: {[key: string]: string}) => {
            let chartPieLine: {[key: string]: {name: string, value: number}} = {}
            params.animalMateByHerds.nodes.forEach(n => {
                if (!chartPieLine['sexed']) {
                    chartPieLine['sexed'] = {name: 'Sexed Semen', value: 0}
                    chartPieLine['ai'] = {name: 'AI Bulls', value: 0}
                    chartPieLine['natural'] = {name: 'Natural Bulls', value: 0}
                    chartPieLine['empty'] = {name: 'Empty', value: 0}
                }
                chartPieLine['sexed'].value += Number(n.totalCountMs)
                chartPieLine['ai'].value += Number(n.totalCountMa)
                chartPieLine['natural'].value += Number(n.totalCountMn)
                chartPieLine['empty'].value += Number(n.totalCountEmpty)
            })
            const pieData = Object.values(chartPieLine)
            return {
                type: 'pie' as ChartTypes,
                data: pieData,
                colors: [...colors].slice(0, pieData.length)
            }
        }
    }
}

const joiningRates = {
    title: 'Pregnancy to Joining Percentage',
    query: `animalJoiningByHerds (
        filter: {
            type: {equalTo: "{type}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            totalCount
            totalPregnant
        }
    }`,
    required: ['type'],
    filters: [
        {name: 'type', label: 'Type', type: 'select', defaultValue: 'Cow', options: [
            {label: "Cows", value: "Cow"}, 
            {label: "Heifers", value: "Heifer"}
        ]},
        {name: 'herdUuid', label: 'Herd', type: 'select', defaultValue: "", options: [
            {label: "All Herds", value: ""}
        ]}
    ],
    chartType: ['pie'],
    sizes: ['1x1'],
    availableInDashboard: true,
    processor: {
        pie: (params: {animalJoiningByHerds: {nodes: {
            herdUuid: number
            totalCount: number,
            totalPregnant: number,
        }[]}}, herdList: {[key: string]: string}) => {
            let chartPieLine: {[key: string]: {name: string, value: number}} = {}
            params.animalJoiningByHerds.nodes.forEach(n => {
                if (!chartPieLine['joining']) {
                    chartPieLine['joining'] = {name: 'Joinings', value: 0}
                    chartPieLine['pregnant'] = {name: 'Pregnant', value: 0}
                    chartPieLine['empty'] = {name: 'Empty', value: 0}
                }
                chartPieLine['joining'].value += Number(n.totalCount)
                chartPieLine['pregnant'].value += Number(n.totalPregnant)
            })
            if (chartPieLine['empty']) {
                chartPieLine['empty'].value = chartPieLine['joining'].value - chartPieLine['pregnant'].value
                delete chartPieLine['joining']
            }
            const pieData = Object.values(chartPieLine)
            return {
                type: 'pie' as ChartTypes,
                data: pieData,
                colors: [...colors].slice(0, pieData.length)
            }
        }
    }
}

const animalTransferOut = {
    title: 'Animals Transferred Out',
    query: `animalHerdTransferViews (
        filter: {
            transferDate: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"}
            {herdFrom}
        }
        orderBy: TRANSFER_DATE_DESC
    )
    {
        nodes {
            herdFromCode
            herdCodeTo
            animalId
            animalUuid
            transferDate
        }
        totalCount
    }`,
    required: ['start','end'],
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(1, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdFrom', label: 'From Herd', type: 'select', defaultValue: '', options: []}
    ],
    chartType: ['table'],
    sizes: ['2x1'],
    availableInDashboard: true,
    processor: {
        table: (params: {animalHerdTransferViews: {nodes: {
            herdFromCode: string
            herdCodeTo: string,
            animalId: string,
            transferDate: string
        }[], totalCount: number}}, herdList: {[key: string]: string}) => {
            return {
                type: 'table',
                data: params.animalHerdTransferViews.nodes,
                columns: [
                    {label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}'},
                    {label: 'From', name: 'herdFromCode'},
                    {label: 'To', name: 'herdCodeTo'},
                    {label: 'Date', name: 'transferDate', dateField: '{DD/MM/YYYY}'}
                ],
                total: params.animalHerdTransferViews.totalCount
            }
        }
    }
}

const animalTransferIn = {
    title: 'Animals Transferred In',
    query: `animalHerdTransferViews (
        filter: {
            transferDate: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"}
            {herdTo}
        }
        orderBy: TRANSFER_DATE_DESC
    )
    {
        nodes {
            herdFromCode
            herdCodeTo
            animalId
            animalUuid
            transferDate
        }
        totalCount
    }`,
    required: ['start','end'],
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(1, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdTo', label: 'To Herd', type: 'select', defaultValue: '', options: []}
    ],
    chartType: ['table'],
    sizes: ['2x1'],
    availableInDashboard: true,
    processor: {
        table: (params: {animalHerdTransferViews: {nodes: {
            herdFromCode: string
            herdCodeTo: string,
            animalId: string,
            transferDate: string
        }[], totalCount: number}}, herdList: {[key: string]: string}) => {
            return {
                type: 'table',
                data: params.animalHerdTransferViews.nodes,
                columns: [
                    {label: 'ID', name: 'animalId', link: '/dashboard/animal/{id}'},
                    {label: 'From', name: 'herdFromCode'},
                    {label: 'To', name: 'herdCodeTo'},
                    {label: 'Date', name: 'transferDate', dateField: '{DD/MM/YYYY}'}
                ],
                total: params.animalHerdTransferViews.totalCount
            }
        }
    }
}

const groupSnapshot = {
    title: 'Monthly Herd Snapshot',
    url: '/api/report/groupsnapshot',
    required: ['type'],
    filters: [
        {name: 'startDate', label: 'From', type: 'month', defaultValue: moment().subtract(1, 'y').subtract(1, 'month').format('YYYY-MM')},
        {name: 'endDate', label: 'To', type: 'month', defaultValue: moment().subtract(1, 'month').format('YYYY-MM')},
        {name: 'type', label: 'Type', type: 'select', defaultValue: "current", options: [
            {label: "Per Month", value: "current"},
            {label: "Running Total", value: "total"}
        ]},
        {name: 'herdUuids', label: 'Herd', type: 'select', defaultValue: "", options: [
            {label: "All Herds", value: ""}
        ]}
    ],
    chartType: ['table'],
    sizes: ['2x1'],
    availableInDashboard: true,
    processor: {
        table: (params: {animalStatusSnapshot: {nodes: {
            month: string,
            inMilk: number,
            dry: number,
            heifers: number,
            yearlings: number,
            calves: number,
            sold: number,
            dead: number
        }[]}}, herdList: {[key: string]: string}) => {
            return {
                type: 'table',
                data: params.animalStatusSnapshot.nodes,
                columns: [
                    {label: 'Month', name: 'month'},
                    {label: 'In Milk', name: 'inMilk'},
                    {label: 'Dry', name: 'dry'},
                    {label: 'Heifers', name: 'heifers'},
                    {label: 'Yearlings', name: 'yearlings'},
                    {label: 'Calves', name: 'calves'},
                    {label: 'Sold', name: 'sold'},
                    {label: 'Dead', name: 'dead'}
                ],
                total: params.animalStatusSnapshot.nodes.length
            }
        }
    }
}

const fertilityThreeSixWeekSubmissionRates = {
    title: '3/6 Week Submission Rates',
    query: `fertilityThreesixweekSubmissionRateViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            threeWeeks
            sixWeeks
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilityThreesixweekSubmissionRateViews: {nodes: {date: string, herdUuid: string, threeWeeks: number, sixWeeks: number, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.fertilityThreesixweekSubmissionRateViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY'),
                    }
                }
                chartDataLine[n.date]['sub3'] = Math.round(Number(n.threeWeeks) * 10000 / n['total'])/100
                chartDataLine[n.date]['sub6'] = Math.round(Number(n.sixWeeks) * 10000 / n['total'])/100
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: [{key: 'sub3', color: colors[0], name: '3 Weeks Submission'}, {key: 'sub6', color: colors[1], name: '6 Weeks Submission'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

const fertilitySubmissionRates = {
    title: 'Submission Rates',
    query: `fertilitySubmissionRateViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            matings
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilitySubmissionRateViews: {nodes: {date: string, herdUuid: string, matings: number, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.fertilitySubmissionRateViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY'),
                    }
                }
                chartDataLine[n.date]['sub'] = Math.round(Number(n.matings) * 10000 / n['total'])/100
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: [{key: 'sub', color: colors[0], name: 'Submission Rate'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

const fertilityReturnInterval = {
    title: '6 Week Return Interval',
    query: `fertilityReturnIntervalViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            interval
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilityReturnIntervalViews: {nodes: {date: string, herdUuid: string, interval: number, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.fertilityReturnIntervalViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY'),
                    }
                }
                chartDataLine[n.date]['interval'] = n['total'] > 0 ? Math.round(Number(n.interval) * 100 / n['total'])/100 : 0
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: [{key: 'interval', color: colors[0], name: 'Average Interval'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val} days`
                }
            }
        }
    }
}

const fertilitySixWeekCalfRate = {
    title: '6 Week In Calf Rate',
    query: `fertilitySixWeekCalfRateViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            preg
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilitySixWeekCalfRateViews: {nodes: {date: string, herdUuid: string, preg: number, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.fertilitySixWeekCalfRateViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY'),
                    }
                }
                chartDataLine[n.date]['interval'] = Math.round(Number(n.preg) * 10000 / n['total'])/100
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: [{key: 'interval', color: colors[0], name: 'In Calf Rate'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

const aiConceptionRate = {
    title: 'AI Conception Rate',
    query: `fertilityAiConceptionRateViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            preg
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilityAiConceptionRateViews: {nodes: {date: string, herdUuid: string, preg: number, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.fertilityAiConceptionRateViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY'),
                    }
                }
                chartDataLine[n.date]['interval'] = Math.round(Number(n.preg) * 10000 / n['total'])/100
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: [{key: 'interval', color: colors[0], name: 'Conception Rate'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

const emptyRate = {
    title: 'Empty Rate',
    query: `fertilityEmptyRateViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            empty
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilityEmptyRateViews: {nodes: {date: string, herdUuid: string, empty: number, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {} 
            params.fertilityEmptyRateViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY'),
                    }
                }
                chartDataLine[n.date]['interval'] = Math.round(Number(n.empty) * 10000 / n['total'])/100
                return chartDataLine
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: [{key: 'interval', color: colors[0], name: 'Empty Rate'}],
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

const fertilityBullRate = {
    title: 'Bull Rate',
    query: `fertilityBullRateViews (
        filter: {
            date: {greaterThanOrEqualTo: "{start}", lessThanOrEqualTo: "{end}"},
            {herdUuid}
        }
    )
    {
        nodes {
            herdUuid
            date
            sireId
            total
        }
    }`,
    filters: [
        {name: 'start', label: 'From', type: 'date', defaultValue: moment().subtract(2, 'year').format('YYYY-MM-DD')},
        {name: 'end', label: 'To', type: 'date', defaultValue: moment().format('YYYY-MM-DD')},
        {name: 'herdUuid', label: 'Herd', type: 'select', required: true, defaultValue: '', options: []}
    ],
    chartType: ['line'],
    sizes: ['2x1','3x1'],
    availableInDashboard: true,
    processor: {
        line: (params: {fertilityBullRateViews: {nodes: {date: string, herdUuid: string, sireId: string | null, total: number}[]}}, herdList: {[key: string]: string}) => {
            let chartDataLine: {[date: string]: {[key: string]: number | string}} = {}
            let bullList = new Set<string>()
            const total: {[date: string]: number} = {}
            params.fertilityBullRateViews.nodes.forEach(n => {
                if (!total[n.date]) {
                    total[n.date] = 0
                }
                total[n.date] += Number(n.total)
                if (n.sireId !== null) {
                    bullList.add(n.sireId)
                }
            })
            params.fertilityBullRateViews.nodes.forEach(n => {
                if (!chartDataLine[n.date]) {
                    chartDataLine[n.date] = {
                        date: moment(n.date).format('DD/MM/YYYY')
                    }
                    Array.from(bullList).forEach((bl) => {
                        chartDataLine[n.date][bl] = 0
                    })
                }
                if (n.sireId !== null) {
                    chartDataLine[n.date][n.sireId] = Math.round(Number(n.total) * 10000 / total[n.date])/100
                }
            })
            return {
                type: 'line' as ChartTypes,
                data: Object.values(chartDataLine),
                lines: Array.from(bullList).map((bl, ix) => ({
                    key: bl, color: colors[ix], name: bl
                })),
                xAxis: {
                    dataKey: 'date',
                    name: 'Mating Start Date'
                },
                tooltip: {
                    labelFormatter: (val: string) => `${moment(val.split('/').reverse().join('-')).format('DD/MM/YYYY')}`,
                    formatter: (val: string) => `${val}%`
                }
            }
        }
    }
}

export const chartList = {
    mortality,
    lactation,
    lactationTestDay,
    herdTestAverage,
    testAverage,
    pregnancyRates,
    joiningRates,
    animalTransferOut,
    animalTransferIn,
    groupSnapshot,
    fertilityThreeSixWeekSubmissionRates,
    fertilitySubmissionRates,
    fertilityReturnInterval,
    fertilitySixWeekCalfRate,
    aiConceptionRate,
    emptyRate,
    fertilityBullRate
}

export type ChartDataTypes = keyof typeof chartList