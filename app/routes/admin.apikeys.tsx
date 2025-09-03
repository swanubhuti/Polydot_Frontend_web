import React, { useState } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useFetcher, useLoaderData, useSubmit } from '@remix-run/react';

import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import HoverCard from '~/components/ui/HoverCard';
import { LuTrash } from 'react-icons/lu';
import Spinner from '~/components/ui/Spinner';
import ConfirmationModal from '~/components/ui/ConfirmationModel';


type ActionData = {
    status: boolean;
    message: string;
    errors?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {

    const apiResult = await callAPI(request, `/api/apikeys`, undefined, 'GET');
    if (!apiResult.success) {
        return json({ error: apiResult.response?.errors || 'Unknown error', easydairyIds: [] });
    }
    return json({ apiKeys: (apiResult.response as { apiKeys: any[] }).apiKeys });
}


export async function action({ request, params }: ActionFunctionArgs) {
    const formData = await request.formData();
    const apiKey = formData.get('key')?.toString();
    if (!apiKey) {
        return {
            status: 'failure',
            error: "apiKey is required"
        }
    }

   const response = await callAPI<GenericAPI>(request, `/api/apikeys/${apiKey}`, {}, 'DELETE');

    if (!response.success) {
        return json({
            status: false,
            message: 'Error deleting API Key',
            errors: response.response.errors,
        });
    } else {
        return json({
            status: response.response.success,
            message: response.response.message,
        });
    }

}

const purgeHerd = ({ request }: { request: Request }) => {
    const { apiKeys } = useLoaderData<{ apiKeys: any[] }>();
    const actionData = useActionData<ActionData>();

    const submit = useSubmit();


    const [spinnerActive, setSpinnerActive] = useState(false)
    const [purgeModal, setPurgeModal] = useState<{ apiKey: string } | null>(null);
    const [isPurgeLoading, setIsPurgeLoading] = useState(false);
    const formRef = React.useRef<HTMLFormElement>(null)

       const handleConfirmPurge = async (request: Request, apikey: string) => {
            setIsPurgeLoading(true);
            try {
                const formData = new FormData();
                formData.append('key', apikey);

                submit(formData, { method: 'DELETE' });
                if (actionData) {
                    setPurgeModal(null);
                }
            } catch (error) {
                console.error('Error during purge:', error);
            } finally {
                setIsPurgeLoading(false);
            }
        };

    return (
        <>
            {actionData?.status && (
                <div className='bg-green-100/50 rounded p-5'>
                    <h5 className='text-xl mb-3'>{actionData?.message}</h5>
                </div>
            )}
            {!actionData?.status && actionData?.errors && (
                <div className='bg-error-200/50 rounded p-5'>
                    <h5 className='text-xl mb-3'>{actionData.message}</h5>
                    <p className='text-grey-700'>{actionData.errors}</p>
                </div>
            )}
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-4">ApiKeys</h1>
                <Form ref={formRef} method='post' className='flex flex-col gap-3'>
                    <div className="overflow-auto w-full mt-5">
                        <table className="table-auto font-opensans w-full text-base lg:text-lg bg-white border">
                            <thead>
                                <tr className="bg-primary-500 text-white font-bold [&>th]:p-3 text-left [&>th:first-child]:rounded-l [&>th:last-child]:rounded-r">
                                    <th>ApiKey</th>
                                    <th>EasyDraftId</th>
                                    <th>Device</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiKeys.map((ed, i) => <tr key={`ed-${i}`} className={`[&>td]:p-3 ${i % 2 === 0 ? '' : 'bg-gray-100'}`}>
                                    <td>{ed.ApiKey}</td>
                                    <td>{ed.EasyDairyID}</td>
                                    <td>{ed.Device}</td>
                                    <td>
                                        <HoverCard closeDelay={0} openDelay={0}>
                                            <HoverCard.Trigger asChild>
                                                <button
                                                    aria-label='Delete Herd'
                                                    className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600 enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setPurgeModal({
                                                            apiKey: ed.ApiKey
                                                        });
                                                    }}
                                                >
                                                    <LuTrash className='w-6 h-6' />
                                                </button>
                                            </HoverCard.Trigger>
                                            <HoverCard.Content
                                                role='tooltip'
                                                className='rounded py-2 px-4 text-center pointer-events-none text-grey-800'
                                                side='top'
                                            >
                                                Delete ApiKey
                                            </HoverCard.Content>
                                        </HoverCard>
                                    </td>
                                </tr>)}
                            </tbody>
                        </table>

                    </div>
                </Form>
                {purgeModal && (<ConfirmationModal
                    isOpen={!!purgeModal}
                    onClose={() => {
                        if (!isPurgeLoading) {
                            setPurgeModal(null);
                        }
                    }}
                    onConfirm={() => {
                        handleConfirmPurge(request, purgeModal?.apiKey);
                        setPurgeModal(null);
                    }}
                    message={`Are you sure you want to delete this apikey ${purgeModal.apiKey}?`}
                    confirmButtonProps={{
                        disabled: isPurgeLoading, // Disable the confirm button while loading
                        children: isPurgeLoading ? 'Processing...' : 'Confirm', // Show loading text or normal text
                    }}
                />)}
                <Spinner active={spinnerActive} />
            </div>

        </>
    );
}

export default purgeHerd;
