import React, { useEffect, useState, useRef, useImperativeHandle, useMemo } from 'react';
import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useSubmit } from '@remix-run/react';
import { callAPI } from '~/session.server';
import type { GenericAPI } from '~/lib/types';
import HoverCard from '~/components/ui/HoverCard';
import Popover from '~/components/ui/Popover';
import { LuPlay, LuChevronDown } from 'react-icons/lu';
import ConfirmationModal from '~/components/ui/ConfirmationModel';
import { type AccordionRef } from '~/components/ui/Accordion';
import moment from 'moment-timezone';
import Input from '~/components/ui/Input';
import { BiSearch } from 'react-icons/bi';

type LoaderResponse = {
  message: string;
  data: {
    name: string;
    lastUpdated: string;
    files: {
      name: string;
      lastModified: string;
    }[];
    excluded?: boolean;
  }[];
  total: number;
};

type ActionData =
  | {
      tag: 'load_file';
      status: boolean;
      data: any[];
      message: string;
      errors?: string; // Optional, only present if there's an error
    }
  | {
      tag: 'trigger';
      status: boolean;
      message: string;
      errors?: string; // Optional, only present if there's an error
    };

export async function loader({ request }: LoaderFunctionArgs) {
  const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/backup`, undefined, 'GET');
  if (!apiResult.success) {
    return json({ error: apiResult.response, easydairy: [], business: {} });
  }
  const s3Folders = (apiResult.response as LoaderResponse).data.map((dt) => {
    // const modifiedDate = dayjs(dt.lastUpdated)
    const files = dt.files.map((fl) => {
      // const modifiedDt = dayjs(fl.lastModified)
      return {
        ...fl,
        // lastModified: modifiedDt.format('YYYY-MM-DD HH:mm:ss')
      };
    });

    return {
      ...dt,
      files,
      // lastUpdated: modifiedDate.format('YYYY-MM-DD HH:mm:ss')
    };
  });

  return json({
    ...apiResult.response,
    data: s3Folders,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const easyDairyId = formData.get('easyDairyId')?.toString();
  const fileName = formData.get('fileName')?.toString();

  if (!easyDairyId) {
    return {
      status: 'failure',
      error: 'easyDairyId is required',
    };
  }

  const res = await callAPI<GenericAPI>(
    request,
    `/api/dev/admin/backup`,
    {
      easyDairyID: easyDairyId,
      fileName,
    },
    'POST'
  );

  if (!res.success) {
    return json({
      status: false,
      message: 'Error Trigger EasyDairyId',
      errors: res.response.errors,
    });
  }

  return json({
    status: true,
    message: res.response.message,
  });
}
type CustomAccordionProps = {
  ref?: any;
  children: string | JSX.Element | JSX.Element[];
  expanded: boolean;
};

function HeadlessAccordion({ children, expanded, ref }: CustomAccordionProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    setHeight(panelRef.current?.scrollHeight ?? 0);
  }, []);
  useImperativeHandle(ref, () => ({
    recalcHeight() {
      setHeight(panelRef.current?.scrollHeight ?? 0);
    },
  }));
  return (
    <div
      ref={panelRef}
      className='px-4 transition-all duration-500 overflow-hidden'
      style={{ maxHeight: expanded ? height : 0 }}
    >
      {children}
    </div>
  );
}

const formatLocalTime = (date: string | undefined) => {
  if (!date) return '-';

  try {
    // Convert UTC time to local timezone
    const localTime = moment.utc(date).local().format('YYYY-MM-DD HH:mm:ss');

    return localTime;
  } catch (error) {
    console.error('Invalid date:', date);
    return '-';
  }
};

const S3Handler = ({ request }: { request: Request }) => {
  // const fetcher = useFetcher();
  const submit = useSubmit();
  const actionData = useActionData<ActionData>();
  const loaderData = useLoaderData<LoaderResponse>();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [triggerModal, setTriggerModal] = useState<{ easyDairyId: string; fileName: string } | null>(null);
  const [isTriggerLoading, setIsTriggerLoading] = useState(false);
  const [excludedPopover, setExcludedPopover] = useState<{ easyDairyId: string; fileName: string } | null>(null);

  const accordionList = useRef<(AccordionRef | null)[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const filteredData = useMemo(() => {
    if (loaderData.data == null) {
      return [];
    }
    return loaderData.data.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  }, [loaderData.data, search]);

  const handleTrigger = async (easyDairyId: string, fileName: string) => {
    setIsTriggerLoading(true);
    try {
      const formData = new FormData();
      formData.append('easyDairyId', easyDairyId);
      formData.append('fileName', fileName);

      await submit(formData, { method: 'POST' });
    } catch (error) {
      console.error('Error during trigger:', error);
    } finally {
      setIsTriggerLoading(false); // Reset loading state
    }
  };

  useEffect(() => {
    console.log(actionData);
    if (actionData) {
      setTriggerModal(null);
    }
  }, [actionData]);

  return (
    <>
      {actionData && actionData.status && (
        <div className='bg-green-100/50 mb-10 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData.message}</h5>
        </div>
      )}
      {actionData && !actionData.status && (
        <div className='bg-error-200/50 mb-10 rounded p-5'>
          <h5 className='text-xl mb-3'>{actionData.message}</h5>
          {/* <p className='text-grey-700'>{actionData.errors}</p> */}
        </div>
      )}
      <h2 className='text-xl lg:text-2xl mb-5'>{'BackUp S3 Folder'}</h2>
      <Input
        leftIcon={<BiSearch className='text-gray-400' />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search Easy Dairy ID'
        className='mb-3'
      />
      <Form ref={formRef} method='post' className='flex flex-col gap-3'>
        <table className='table-auto font-opensans w-full text-base lg:text-lg bg-white border text-left'>
          <thead className='font-bold'>
            <tr className='bg-primary-500 text-white border-b [&>th]:py-4 [&>th]:px-5'>
              <th>Easy Dairy ID</th>
              <th>Last Date File Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody className='text-gray-600'>
            {filteredData.map((dt, idx) => (
              <>
                <tr key={`row-${idx}`} className={`border-t [&>td]:align-top [&>td]:py-3 [&>td]:px-5`}>
                  <td>{dt.name}</td>
                  <td>{formatLocalTime(dt.lastUpdated)}</td>
                  <td>
                    <div className='flex gap-1'>
                      <HoverCard closeDelay={0} openDelay={0}>
                        <HoverCard.Trigger asChild>
                          <button
                            aria-label='Delete EasyDairyId'
                            className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600 enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpanded({ ...expanded, [dt.name]: !expanded[dt.name] });
                            }}
                          >
                            <LuChevronDown
                              className={`w-6 h-6 transition ease-in-out ${expanded[dt.name] ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </HoverCard.Trigger>
                        <HoverCard.Content
                          role='tooltip'
                          className='rounded py-2 px-4 text-center pointer-events-none text-grey-800'
                          side='top'
                        >
                          Click for dropdown
                        </HoverCard.Content>
                      </HoverCard>
                    </div>
                  </td>
                </tr>
                <tr key={`rowA-${idx}`}>
                  <td colSpan={3} className='bg-orange-100'>
                    <HeadlessAccordion
                      key={`tabprofile-${idx}`}
                      ref={(el: any) => (accordionList.current[idx] = el)}
                      expanded={expanded[dt.name]}
                    >
                      <table className='table-auto font-opensans w-full text-base lg:text-lg bg-white border text-left my-3'>
                        <thead className='font-bold'>
                          <tr className='bg-orange-300 border-b [&>th]:py-1 [&>th]:px-5'>
                            <th>File Name</th>
                            <th>Last Modified</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className='text-gray-600'>
                          {dt.files.length == 0 && <p>Not Files Found</p>}
                          {dt.files.length > 0 &&
                            dt.files.map((file, index) => (
                              <tr
                                key={`row-${index}`}
                                className={`border-t [&>td]:align-top [&>td]:py-3 [&>td]:px-5 bg-orange-100`}
                              >
                                <td>{file.name}</td>
                                <td>{formatLocalTime(file.lastModified)}</td>
                                                                  <td>
                                    <div className='flex gap-1'>
                                      <div className="relative">
                                        <HoverCard closeDelay={0} openDelay={0}>
                                          <HoverCard.Trigger asChild>
                                            <button
                                              aria-label='Delete EasyDairyId'
                                              className='w-10 h-10 grid place-items-center rounded-full transition outline-none text-grey-600 enabled:hover:text-primary-500 focus-visible:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500'
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation(); // Prevent triggering the td click

                                                // Check if this EasyDairy is excluded
                                                if (dt.excluded) {
                                                  setExcludedPopover({
                                                    easyDairyId: dt.name,
                                                    fileName: file.name,
                                                  });
                                                } else {
                                                  setTriggerModal({
                                                    easyDairyId: dt.name,
                                                    fileName: file.name,
                                                  });
                                                }
                                              }}
                                            >
                                              <LuPlay className='w-6 h-6' />
                                            </button>
                                          </HoverCard.Trigger>
                                          <HoverCard.Content
                                            role='tooltip'
                                            className='rounded py-2 px-4 text-center pointer-events-none text-grey-800'
                                            side='top'
                                          >
                                            Go
                                          </HoverCard.Content>
                                        </HoverCard>
                                        {excludedPopover?.easyDairyId === dt.name && excludedPopover?.fileName === file.name && (
                                          <Popover
                                            open={true}
                                            onOpenChange={(open) => {
                                              if (!open) {
                                                setExcludedPopover(null);
                                              }
                                            }}
                                          >
                                            <Popover.Trigger asChild>
                                              <div className="absolute inset-0 pointer-events-none" />
                                            </Popover.Trigger>
                                            <Popover.Content side="top" className="w-auto">
                                              <div className="text-sm text-gray-700">
                                                <p>This EasyDairy is excluded from processing</p>
                                              </div>
                                            </Popover.Content>
                                          </Popover>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </HeadlessAccordion>
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </Form>
      {triggerModal ? (
        <ConfirmationModal
          isOpen={!!triggerModal}
          onClose={() => {
            if (!isTriggerLoading) {
              setTriggerModal(null);
            }
          }}
          onConfirm={() => {
            handleTrigger(triggerModal.easyDairyId, triggerModal.fileName);
            setTriggerModal(null);
          }}
          message={`Are you sure you want to retrigger process backup for this EasyDairy ${triggerModal.easyDairyId}, file ${triggerModal.fileName} ?`}
          confirmButtonProps={{
            disabled: isTriggerLoading, // Disable the confirm button while loading
            children: isTriggerLoading ? 'Processing...' : 'Confirm', // Show loading text or normal text
          }}
        />
      ) : null}
    </>
  );
};

export default S3Handler;
