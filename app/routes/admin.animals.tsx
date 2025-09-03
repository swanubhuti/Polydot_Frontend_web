import React, { useEffect, useState } from 'react';
import { type LoaderFunctionArgs, json, ActionFunctionArgs } from '@remix-run/node';
import { useActionData, useLoaderData, useSubmit, useFetcher } from '@remix-run/react';
import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import { Pagination } from '~/components/ui/Pagination';
import { BiLoaderAlt } from 'react-icons/bi';
import SelectDropdown from '~/components/ui/Dropdown';
import { BsFilterLeft } from 'react-icons/bs';
import Button from '~/components/ui/Button';
import Input from '~/components/ui/Input';


const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'Pending Merge', label: 'Pending Merge' },
    { value: 'Done', label: 'Done' },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/manualMergeAnimals`, undefined, 'GET');
    if (!apiResult.success) {
        return json({ error: apiResult.response });
    }
    return json({ data: apiResult.response.data, total: apiResult.response.total });
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const mergeID = Number(formData.get('mergeID'));
    const animalUUIDs = JSON.parse((formData.get('animalUUIDs') ?? '[]') as string);
    const messageGroupId = formData.get('messageGroupId')?.toString();
    const messageDeduplicationId = formData.get('messageDeduplicationId')?.toString();

    if (!mergeID) {
        return json({
            status: 'failure',
            error: "mergeID is required",
        });
    }

    if (animalUUIDs.length === 0) {
        return json({
            status: 'failure',
            error: "At least one animalUUID is required",
        });
    }

    const actionData = await callAPI<GenericAPI>(request, `/api/dev/admin/mergeAnimal`, {
        mergeID,
        animalUUIDs: animalUUIDs.filter((uuid: any) => uuid !== null),
        messageGroupId,
        messageDeduplicationId
    }, 'POST');

    if (!actionData.success) {
        return json({
            status: false,
            message: 'Error merging animals',
            errors: actionData.response.errors,
        });
    } else {
        return json({
            status: actionData.success,
            message: actionData.response.message,
            messageId: actionData.response.messageId
        });
    }
}

const RESOURCE_URL = '/admin/resources/merge';

interface Animal {
    AnimalUUID: string;
    NLISRF: string;
    AnimalID: string;
    DamCowID: number | null;
    DamNationalID: string;
    Breed: string;
    SireNationalID: string;
    DateOfBirth: string | null;
    LastReadDairy: string | null;
    LastReadDraft: string | null;
    HerdCode: string;
    EasyDairyID: string;
}

interface MergeData {
    mergeID: string;
    status: string;
    animals: Animal[];
}

interface LoaderData {
    data: MergeData[];
    total: number;
}

type ActionData = {
    status: boolean;
    message: string;
    errors?: string;
}

type animalMerge = {
    mergeID: string; animalUUIDs: string[]
}

const AnimalMerge = () => {
    const { data: initialData, total: initialTotal } = useLoaderData<LoaderData>();
    const actionData = useActionData<ActionData>();
    const submit = useSubmit();
    const fetcher = useFetcher<{ data?: MergeData[]; total: number; success: boolean; error?: string }>();

    const [selectedMergeID, setSelectedMergeID] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState<number>(5);
    const [selectedAnimalUUID, setSelectedAnimalUUID] = useState<string | null>(null);
    const [bannerMessage, setBannerMessage] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(initialTotal);
    const [currentData, setCurrentData] = useState(initialData);
    const [filters, setFilters] = useState({herdCode: '', easyDairyId: '', status: ''})

    useEffect(() => {
        if (actionData) {
            setBannerMessage(actionData.message);
            setTimeout(() => setBannerMessage(null), 5000); // Hide after 5 seconds
        }
    }, [actionData]);

    // Update currentData when fetcher data is loaded
    useEffect(() => {
        if (fetcher.data?.success) {
            setCurrentData(fetcher.data.data ?? []);
            setTotalCount(fetcher.data.total);
        }
    }, [fetcher.data]);

    const handleMergeClick = (mergeID: string) => {
        setSelectedMergeID(mergeID);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMergeID(null);
    };

    const handleCheckboxChange = (animalUUID: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedAnimalUUID(animalUUID);
        } else if (selectedAnimalUUID === animalUUID) {
            setSelectedAnimalUUID(null);
        }
    };

    const handlePageChange = async (newPage: number) => {
        setPage(newPage);
        const params = new URLSearchParams({ page: newPage.toString(), limit: pageSize.toString() });
        Object.entries(filters).forEach(([k, v]) => {
            if (v) {
                params.append(k, v)
            }
        })
        await fetcher.load(`${RESOURCE_URL}?${params}`);
    };

    const handleSave = async () => {
        if (selectedMergeData) {
            const { mergeID, animals } = selectedMergeData;
            const animalUUIDs = animals.map(animal => animal.AnimalUUID);
            const dataToSend: animalMerge = {
                mergeID,
                animalUUIDs: [
                    selectedAnimalUUID,
                    ...animalUUIDs.filter(uuid => uuid !== selectedAnimalUUID)
                ].filter((uuid): uuid is string => uuid !== null)
            };
            // Trigger AWS SQS event
            await triggerAWSSQSEvent(dataToSend);
            if (actionData) {
                handleCloseModal();
            }
            handleCloseModal();
        }
    };

    const triggerAWSSQSEvent = async (data: { mergeID: string; animalUUIDs: string[] }) => {
        const formData = new FormData();
        const uniqueSuffix = Date.now().toString();
        formData.append('mergeID', data.mergeID);
        formData.append('animalUUIDs', JSON.stringify(data.animalUUIDs));
        formData.append('messageGroupId', `group-${data.mergeID}-${uniqueSuffix}`);
        formData.append('messageDeduplicationId', `dedup-${data.mergeID}-${uniqueSuffix}`);
        await submit(formData, { method: 'post' });
    };

    const selectedMergeData = currentData?.find((merge) => merge.mergeID === selectedMergeID);

    return (
        <>
            {bannerMessage && (
                <div className="bg-green-500 text-white px-4 py-3 rounded">
                    <p>{bannerMessage}</p>
                </div>
            )}
            {fetcher.state === 'loading' && (
                <p className='mt-10 w-full flex flex-row justify-center'>
                    <BiLoaderAlt className="w-8 h-8 animate-spin text-grey-600" />
                </p>
            )}
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-4">Animal Manual Merge</h1>
                <div className='flex flex-row items-center gap-2 mt-3'>
                    <p className='flex flex-row items-center gap-1 text-grey-700 shrink-0'>
                        Filter
                        <BsFilterLeft className='w-6 h-6' />
                    </p>
                    <SelectDropdown
                        options={STATUS_OPTIONS}
                        type="single"
                        value={filters.status}
                        onSelectChange={(val) => setFilters(prev => ({...prev, status: val.value}))}
                        className="max-w-xl flex-1 min-w-[200px]"
                        id="entityTypeSelect"
                    />
                    <Input placeholder="Herd Code" className="" value={filters.herdCode} onChange={(e) => setFilters(prev => ({...prev, herdCode: e.target.value}))} />
                    <Input placeholder="Easy Dairy ID" value={filters.easyDairyId} onChange={(e) => setFilters(prev => ({...prev, easyDairyId: e.target.value}))} />
                    <Button
                        aria-label='Apply Filter'
                        type='button'
                        disabled={fetcher.state === 'loading'}
                        onClick={async() => {
                            const params = new URLSearchParams({ page: '1', limit: pageSize.toString() });
                            Object.entries(filters).forEach(([k, v]) => {
                                params.append(k, v)
                            })
                            fetcher.load(`${RESOURCE_URL}?${params}`);
                            setPage(1);
                        }}
                    >
                        Apply
                    </Button>
                    <Button
                        arial-label='Reset Filter'
                        type='button'
                        variant='outline'
                        disabled={fetcher.state === 'loading'}
                        onClick={async() =>
                            {
                                const params = new URLSearchParams({ page: '1', limit: pageSize.toString() });
                                setFilters({herdCode: '', easyDairyId: '', status: ''})
                                fetcher.load(`${RESOURCE_URL}?${params}`);
                                setPage(1);
                        }}
                    >Reset</Button>
                </div>
                <div className="overflow-auto">
                    <table className="table-auto font-opensans w-full mt-5 text-base lg:text-lg bg-white border">
                        <thead className="font-bold bg-primary-500 text-white border-b">
                            <tr>
                                <td className="px-5 py-4">Merge ID</td>
                                <td className="px-5 py-4">Status</td>
                                <td className="px-5 py-4">Animal UUID</td>
                                <td className="px-5 py-4">NLISRF</td>
                                <td className="px-5 py-4">Animal ID</td>
                                <td className="px-5 py-4">Dam Cow ID</td>
                                <td className="px-5 py-4">Dam National ID</td>
                                <td className="px-5 py-4">Breed</td>
                                <td className="px-5 py-4">Sire National ID</td>
                                <td className="px-5 py-4">Date Of Birth</td>
                                <td className="px-5 py-4">Last Read Dairy</td>
                                <td className="px-5 py-4">Last Read Draft</td>
                                <td className="px-5 py-4">Herd Code</td>
                                <td className="px-5 py-4">Easy Dairy ID</td>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600">
                            {currentData?.map((merge) => (
                                <React.Fragment key={merge.mergeID}>
                                    {merge.animals.map((animal, index) => (
                                        <tr key={animal.AnimalUUID} className="border-t">
                                            {index === 0 && (
                                                <>
                                                    <td
                                                        rowSpan={merge.animals.length}
                                                        className="px-5 py-3 text-center cursor-pointer underline text-blue-600"
                                                        onClick={() => handleMergeClick(merge.mergeID)}
                                                    >
                                                        {merge.mergeID}
                                                    </td>
                                                    <td rowSpan={merge.animals.length} className="px-5 py-3 text-center">
                                                        {merge.status}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-5 py-3 text-xs">{animal.AnimalUUID}</td>
                                            <td className="px-5 py-3">{animal.NLISRF}</td>
                                            <td className="px-5 py-3">{animal.AnimalID}</td>
                                            <td className="px-5 py-3">{animal.DamCowID}</td>
                                            <td className="px-5 py-3">{animal.DamNationalID}</td>
                                            <td className="px-5 py-3">{animal.Breed}</td>
                                            <td className="px-5 py-3">{animal.SireNationalID}</td>
                                            <td className="px-5 py-3">
                                                {animal.DateOfBirth ? new Date(animal.DateOfBirth).toLocaleDateString() : ''}
                                            </td>
                                            <td className="px-5 py-3">{animal.LastReadDairy}</td>
                                            <td className="px-5 py-3">{animal.LastReadDraft}</td>
                                            <td className="px-5 py-3">{animal.HerdCode}</td>
                                            <td className="px-5 py-3">{animal.EasyDairyID}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    className='ml-auto mt-3 border border-gray-100 rounded'
                    disabled={fetcher.state === 'loading'}
                    currentPage={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={handlePageChange}
                />
            </div>
            {isModalOpen && selectedMergeData && (
                <Modal onClose={handleCloseModal}>
                    <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
                        <h2 className="text-xl font-bold mb-4">Animals in Merge ID: {selectedMergeID}</h2>
                        <div className="table-responsive">
                            <table className="table min-w-full mt-5 text-base lg:text-lg bg-white border">
                                <thead className="font-bold bg-primary-500 text-white border-b">
                                    <tr>
                                        <th className="px-4 py-2">Select</th>
                                        <th className="px-4 py-2">Animal UUID</th>
                                        <th className="px-4 py-2">NLISRF</th>
                                        <th className="px-4 py-2">Animal ID</th>
                                        <th className="px-4 py-2">Dam Cow ID</th>
                                        <th className="px-4 py-2">Dam National ID</th>
                                        <th className="px-4 py-2">Breed</th>
                                        <th className="px-4 py-2">Sire National ID</th>
                                        <th className="px-4 py-2">Date Of Birth</th>
                                        <th className="px-4 py-2">Last Read Dairy</th>
                                        <th className="px-4 py-2">Last Read Draft</th>
                                        <th className="px-4 py-2">Herd Code</th>
                                        <th className="px-4 py-2">Easy Dairy ID</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    {selectedMergeData.animals.map((animal, idx) => (
                                        <React.Fragment key={animal.AnimalUUID}>
                                            <tr>
                                                <td className="px-4 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        id={animal.AnimalUUID}
                                                        className="mr-2"
                                                        checked={selectedAnimalUUID === animal.AnimalUUID}
                                                        onChange={(e) => handleCheckboxChange(animal.AnimalUUID, e.target.checked)}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">{animal.AnimalUUID}</td>
                                                <td className="px-4 py-2">{animal.NLISRF}</td>
                                                <td className="px-4 py-2">{animal.AnimalID}</td>
                                                <td className="px-4 py-2">{animal.DamCowID}</td>
                                                <td className="px-4 py-2">{animal.DamNationalID}</td>
                                                <td className="px-4 py-2">{animal.Breed}</td>
                                                <td className="px-4 py-2">{animal.SireNationalID}</td>
                                                <td className="px-4 py-2">
                                                    {animal.DateOfBirth ? new Date(animal.DateOfBirth).toLocaleDateString() : ''}
                                                </td>
                                                <td className="px-4 py-2">{animal.LastReadDairy}</td>
                                                <td className="px-4 py-2">{animal.LastReadDraft}</td>
                                                <td className="px-4 py-2">{animal.HerdCode}</td>
                                                <td className="px-4 py-2">{animal.EasyDairyID}</td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            onClick={handleSave}
                            className={`mt-4 px-4 py-2 text-white rounded ${selectedAnimalUUID ? 'bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
                            disabled={!selectedAnimalUUID}
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCloseModal}
                            className="mt-4 ml-4 px-4 py-2 bg-gray-600 text-white rounded"
                        >
                            Close
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};

// Modal Component
const Modal = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-8 rounded shadow-lg max-w-6xl w-full overflow-y-auto">
                {children}
            </div>
            <div className="fixed inset-0 pointer-events-none" onClick={onClose}></div>
        </div>
    );
};

export default AnimalMerge;
