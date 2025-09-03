import React, { useEffect, useState } from 'react';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { LoaderFunctionArgs, json } from '@remix-run/node';
import SelectDropdown from '~/components/ui/Dropdown';
import { BsFilterLeft } from 'react-icons/bs';
import Button from '~/components/ui/Button';
import { callAPI } from '~/session.server';
import { Pagination } from '~/components/ui/Pagination';
import Spinner from '~/components/ui/Spinner';
import { convertTz } from '~/lib/utils';
import { FaDownload } from "react-icons/fa6";
import Papa from 'papaparse';
import moment from 'moment';

type EasyDairyResponse = {
    data: string[];
    errors?: any;
};

const ENTITY_TYPE_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'Herd', label: 'Herd' },
    { value: 'ABV', label: 'ABV' },
    { value: 'HerdTestAvg', label: 'HerdTestAvg' },
    { value: 'Bull', label: 'Bull' },
    { value: 'Cow', label: 'Cow' },
    { value: 'Team', label: 'Team' },
    { value: 'Lactation', label: 'Lactation' },
    { value: 'Event', label: 'Event' },
    { value: 'Classification', label: 'Classification' },
    { value: 'LiveWeight', label: 'LiveWeight' },
    { value: 'Workability', label: 'Workability' },
    { value: 'Defects', label: 'Defects' },
    { value: 'TestDay', label: 'TestDay' },
    { value: 'DrugReceipt', label: 'DrugReceipt' },
    { value: 'DrugStock', label: 'DrugStock' },
    { value: 'Groups', label: 'Groups' },
    { value: 'Options', label: 'Options' },
    { value: 'Staff', label: 'Staff' }
];

const RESOURCE_URL = '/admin/resources/report';

type CSVActionLogResponse = {
    success: boolean;
    data: ActionLog[];
    total: number;
};

type ActionLog = {
    EntityType: string;
    EasyDairyId: string;
    CsvProcessingDate: string;
    totalCount: number;
    insertCount: number;
    updateCount: number;
    deleteCount: number;
    skippedCount: number;
    duplicateCount: number;
    ErrorMessage?: string | null;
};

type ErrorLog = {
    ID: string;
    CsvActionLogId: string;
    EntityType: string;
    ErrorMessage: any[];
    ErrorTimestamp: string;
    CsvProcessingDate: string;
    EasyDairyId: string;
    ActionType: string;
    Count: number;
    ActionData: any;
};

export async function loader({ request }: LoaderFunctionArgs) {
    const { success, response } = await callAPI(request, `/api/dev/admin/easydairyIds`, undefined, 'GET');
    if (!success) {
        return json({ error: response?.errors || 'Unknown error', easydairyIds: [] });
    }
    const easydairyIds = (response as EasyDairyResponse).data;
    return json({ easydairyIds });
}

const Report = () => {
    const { easydairyIds } = useLoaderData<{ easydairyIds: string[] }>();
    const fetcher = useFetcher<CSVActionLogResponse>();
    const errorFetcher = useFetcher<{ success: boolean; errorLogs: ErrorLog[], total: number }>();

    const [selectedId, setSelectedId] = useState<string | null>('All');
    const [selectedEntityType, setSelectedEntityType] = useState<string>('All'); // Default to 'Herd'
    const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [pageSize] = useState<number>(5);
    const [page, setPage] = useState(1);

    const [reportData, setReportData] = useState<ActionLog[]>([]);
    const [today, setToday] = useState<string>('');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
    const [spinnerActive, setSpinnerActive] = useState(false)
    const [triggerDownload, setTriggerDownload] = useState(false);
    const [downloadFilename, setDownloadFilename] = useState('');
    const [displayData, setDisplayData] = useState(true);

    const dropdownOptions = [
        { label: "All", value: "All" },
        ...easydairyIds.map(id => ({
            label: id,
            value: id
        }))];

    useEffect(() => {
        if (fetcher.data?.success) {
            console.log('fetcher data', fetcher.data);
            setReportData(fetcher.data.data);
            setTotalCount(fetcher.data.total);
        } else {
            setReportData([]);
        }
    }, [fetcher.data]);

    useEffect(() => {
        if (errorFetcher.data?.success) {
            console.log('errorFetcher', errorFetcher.data);
            setErrorLogs(errorFetcher.data.errorLogs); // Corrected to setErrorLogs
        } else {
            setErrorLogs([]);
        }
        setSpinnerActive(false);
    }, [errorFetcher.data]);

    useEffect(() => {
        const todayDate = moment().format('YYYY-MM-DD')
        setToday(todayDate);
    }, []);

    useEffect(() => {
        if (triggerDownload && errorLogs.length > 0) {
            downloadCsv(dataToPaginate, downloadFilename);
            setTriggerDownload(false);
        }
    }, [triggerDownload, errorLogs, downloadFilename]);


    const handleSelectChangeId = (selectedOption: { label: string, value: string }) => {
        setSelectedId(selectedOption.value);
    };

    const handleSelectChangeEntityType = (selectedOption: { label: string, value: string }) => {
        setSelectedEntityType(selectedOption.value);
    };
    const handleApply = async () => {
        setPage(1);
        setExpandedRow(null)
        if (!selectedStartDate || !selectedEndDate || !selectedId) {
            alert("Please select all filters");
            return;
        }

        const params = new URLSearchParams({
            startDate: convertTz(selectedStartDate).toISOString(),
            endDate: convertTz(selectedEndDate, true).toISOString(),
            entityType: selectedEntityType,
            easyDairyId: selectedId,
            page: '1',
            limit: pageSize.toString()
        });

        await fetcher.load(`${RESOURCE_URL}?${params.toString()}`);
    };

    const handlePageChange = async (newPage: number) => {
        setPage(newPage);
        if (!selectedStartDate || !selectedEndDate || !selectedId) {
            alert("Please select all filters");
            return;
        }

        const params = new URLSearchParams({
            startDate: convertTz(selectedStartDate).toISOString(),
            endDate: convertTz(selectedEndDate, true).toISOString(),
            entityType: selectedEntityType,
            easyDairyId: selectedId,
            page: newPage.toString(),
            limit: pageSize.toString()
        });

        await fetcher.load(`${RESOURCE_URL}?${params.toString()}`);
    };

    const preprocessData = (data: any) => {
        return data.map((row: any) => {
            const processedRow: any = {};
            for (const key in row) {
                if (row.hasOwnProperty(key)) {
                    if (typeof row[key] === 'object' && row[key] !== null) {
                        processedRow[key] = JSON.stringify(row[key]);
                    } else {
                        processedRow[key] = row[key];
                    }
                }
            }
            return processedRow;
        });
    };

    const downloadCsv = (data:any, filename: string) => {
        const csv = Papa.unparse(preprocessData(data));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRowClick = async (index: number, log: ActionLog, action?: string, downloadCSV?: boolean) => {
        setSpinnerActive(true);
        if (expandedRow === index) {
            setExpandedRow(null);
            setErrorLogs([]);
            setSpinnerActive(false);
            return;
        }
        setExpandedRow(index);
        const URL = '/admin/resources/errorLogs';

        const params = new URLSearchParams({
            date: log.CsvProcessingDate,
            entityType: log.EntityType,
            easyDairyId: log.EasyDairyId
        });
        if (action) {
            params.append('action', action);
        }

        await errorFetcher.load(`${URL}?${params.toString()}`);
        setDisplayData(true);

        if (downloadCSV) {
            setDownloadFilename(`${log.EntityType}_${log.CsvProcessingDate}.csv`);
            setTriggerDownload(true);
            setDisplayData(false);
        }
    };

    const recordsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);

    // Determine data to display
    const hasActionData = errorLogs[0]?.ActionData?.length > 0;
    const hasErrorMessage = errorLogs[0]?.ErrorMessage && (
        Array.isArray(errorLogs[0].ErrorMessage) || typeof errorLogs[0].ErrorMessage === "string"
    );

    const dataToPaginate = hasActionData
        ? errorLogs[0].ActionData
        : hasErrorMessage
            ? (Array.isArray(errorLogs[0].ErrorMessage)
                ? errorLogs[0].ErrorMessage
                : JSON.parse(errorLogs[0].ErrorMessage))
            : [];

    // Calculate total pages
    const totalPages = Math.ceil(dataToPaginate.length / recordsPerPage);

    // Get records for the current page
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedData = dataToPaginate.slice(startIndex, endIndex);

    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Backup Processing Report</h1>
            <div className='flex flex-row flex-wrap items-center gap-2 mt-3'>
                <label htmlFor='filterRoles' className='flex flex-row items-center gap-1 text-grey-700 shrink-0'>
                    Filter
                    <BsFilterLeft className='w-6 h-6' />
                </label>
                <SelectDropdown
                    options={dropdownOptions}
                    type="single"
                    value={selectedId || ''}
                    onSelectChange={handleSelectChangeId}
                    className="max-w-xl flex-1 min-w-[200px]"
                    id="easyDairySelect"
                />
                <SelectDropdown
                    options={ENTITY_TYPE_OPTIONS}
                    type="single"
                    value={selectedEntityType}
                    onSelectChange={handleSelectChangeEntityType}
                    className="max-w-xl flex-1 min-w-[200px]"
                    id="entityTypeSelect"
                />
                <input
                    id='startDate'
                    type='date'
                    name='startDate'
                    onChange={(e) => setSelectedStartDate(e.target.value)}
                    className='border rounded p-2'
                    max={today}
                />
                <input
                    id='endDate'
                    type='date'
                    name='endDate'
                    onChange={(e) => setSelectedEndDate(e.target.value)}
                    className='border rounded p-2'
                    max={today}
                />
                <Button type='button' onClick={handleApply} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Apply
                </Button>
                <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                        setSelectedStartDate(null);
                        setSelectedEndDate(null);
                        setSelectedId('All');
                        setSelectedEntityType('All');
                        setReportData([]);
                        setPage(1);
                        setExpandedRow(null)
                    }}
                    className="border border-blue-600 text-blue-600 px-4 py-2 rounded"
                >
                    Reset
                </Button>
            </div>

            <div className="overflow-auto w-full mt-5">
                <table className="table-auto font-opensans w-full text-base lg:text-lg bg-white border">
                    <thead className="font-bold bg-primary-500 text-white border-b">
                        <tr>
                            <td className="px-5 py-4">Easy Dairy ID</td>
                            <td className="px-5 py-4">Date</td>
                            <td className="px-5 py-4">Insert Count</td>
                            <td className="px-5 py-4">Update Count</td>
                            <td className="px-5 py-4">Delete Count</td>
                            <td className="px-5 py-4">Skipped Row Count</td>
                            <td className="px-5 py-4">Duplicate Row Count</td>
                            <td className="px-5 py-4">EntityType</td>
                        </tr>
                    </thead>
                    <tbody className="text-gray-600">
                        {reportData?.length > 0 ? (
                            reportData.map((log, index) => (
                                <React.Fragment key={index}>
                                    <tr key={index}>
                                        <td className="px-5 py-4">{log.EasyDairyId}</td>
                                        <td className="px-5 py-4">{log.CsvProcessingDate}</td>
                                        <td className={log.insertCount > 0 ? "px-5 py-4 cursor-pointer text-blue-600 underline" : "px-5 py-4"} onClick={() => handleRowClick(index, log, 'Insert')}>{log.insertCount} {log.insertCount > 0 && <FaDownload className="inline ml-1"
                                         onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(index, log, 'Insert', true);
                                          }}/>}
                                        </td>
                                        <td className={log.updateCount > 0 ? "px-5 py-4 cursor-pointer text-blue-600 underline" : "px-5 py-4"} onClick={() => handleRowClick(index, log, 'Update')}>{log.updateCount} {log.updateCount > 0 && <FaDownload className="inline ml-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(index, log, 'Update', true);
                                          }}/>}</td>
                                        <td className={log.deleteCount > 0 ? "px-5 py-4 cursor-pointer text-blue-600 underline" : "px-5 py-4"} onClick={() => handleRowClick(index, log, 'Delete')}>{log.deleteCount} {log.deleteCount > 0 && <FaDownload className="inline ml-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(index, log, 'Delete', true);
                                          }}/>}</td>
                                        <td className={log.skippedCount > 0 ? "px-5 py-4 cursor-pointer text-blue-600 underline" : "px-5 py-4"} onClick={() => handleRowClick(index, log)}>{log.skippedCount} {log.skippedCount > 0 && <FaDownload className="inline ml-1"
                                         onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(index, log, undefined, true);
                                          }}/>}</td>
                                        <td className={log.duplicateCount > 0 ? "px-5 py-4 cursor-pointer text-blue-600 underline" : "px-5 py-4"} onClick={() => handleRowClick(index, log)}>{log.duplicateCount} {log.duplicateCount > 0 && <FaDownload className="inline ml-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(index, log, undefined, true);
                                          }}/>}</td>
                                        <td className="px-5 py-4">{log.EntityType}</td>
                                    </tr>
                                    {expandedRow === index && errorLogs?.length > 0 && displayData && (
                                        <tr>
                                            <td colSpan={8} className="bg-gray-100">
                                                <div className="overflow-hidden">
                                                    <table className="table-auto font-opensans w-full text-base lg:text-lg bg-white border mt-2">
                                                        <thead className="font-bold bg-primary-500 text-white border-b">
                                                            <tr>
                                                                <td className="px-5 py-4">Action</td>
                                                                { !hasActionData ? (<td className="px-5 py-4">Error Message</td> ): null}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-gray-600">
                                                            {paginatedData.map((detail: any, detailIndex: number) => (
                                                                <tr key={detailIndex}>
                                                                    <td className="px-2 py-1 max-w-[300px] overflow-auto">
                                                                    <div className="overflow-auto">{JSON.stringify(hasActionData ? detail : detail.duplicateRow || detail.skippedRow || detail)}</div>
                                                                    </td>
                                                                    {!hasActionData && (
                                                                        <td className="px-2 py-1 max-w-[100px] overflow-auto"><div className="overflow-auto">{detail.error}</div></td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {totalPages > 1 && (
                                                        <div className="sticky left-0 bg-white z-10 p-2">
                                                            <button
                                                                className={`px-4 py-2 mx-2 border rounded ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "bg-gray-200"}`}
                                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                disabled={currentPage === 1}
                                                            >
                                                                Previous
                                                            </button>

                                                            <span className="text-lg font-medium">
                                                                Page {currentPage} of {totalPages}
                                                            </span>

                                                            <button
                                                                className={`px-4 py-2 mx-2 border rounded ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "bg-gray-200"}`}
                                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                                disabled={currentPage === totalPages}
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td className="px-5 py-4" colSpan={8}>No data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="mt-3">
                    {fetcher.data && fetcher.data?.data?.length > 0 && (
                        <Pagination
                            className='ml-auto border border-gray-100 rounded'
                            disabled={fetcher.state === 'loading'}
                            currentPage={page}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
                <Spinner active={spinnerActive} />
            </div>
        </>
    );
};

export default Report;
