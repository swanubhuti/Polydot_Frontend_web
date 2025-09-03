import { useEffect, useRef, useState } from 'react';
import { useFetcher, useLoaderData, useRouteError } from '@remix-run/react';
import { type LoaderFunctionArgs, json, type ActionFunctionArgs } from '@remix-run/node';
import { callAPI } from '~/session.server';
import type { GraphQLReturn, GenericAPI } from '~/lib/types';
import moment from 'moment';
import { Pagination } from '~/components/ui/Pagination';
import ErrorMessage from '~/components/ui/ErrorMessage';

export async function action({ request, params }: ActionFunctionArgs) {
  return json({});
}

const pageSize = 10;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const eventFilter = searchParams.get('eventFilter');
  let filters = '';
  if (start && end) {
    filters = `actionAt: {greaterThanOrEqualTo: "${start}", lessThanOrEqualTo: "${end}T23:59:59"}`;
  } else if (start) {
    filters = `actionAt: {greaterThanOrEqualTo: "${start}"}`;
  } else if (end) {
    filters = `actionAt: {lessThanOrEqualTo: "${end}T23:59:59"}`;
  }
  if (eventFilter) {
    filters = filters ? `${filters}, event: {equalTo: "${eventFilter}"}` : `event: {equalTo: "${eventFilter}"}`;
  }
  if (searchParams.get('search')) {
    filters = ` or: [
      {action: {likeInsensitive: "%${searchParams.get('search')}%"}}
      ${/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
      searchParams.get('search')!
    )
        ? `, {targetBusinessId: {equalTo: "${searchParams.get('search')}"}}`
        : ''
      }
    ]`;
  }

  // First query to get unique events
  const eventsResp = await callAPI<GenericAPI>(
    request,
    `/api/admin/actionlog/unique-list`,
    undefined,
    'GET'
  );

  if (!eventsResp.success) {
    throw new Error('Failed to retrieve event types');
  }

  const resp = await callAPI<GraphQLReturn>(
    request,
    `/api/graphql`,
    {
      query: `{
        actionLogs(
          first: ${pageSize}, 
          offset: ${(Number(searchParams.get('page') || 1) - 1) * 10},
          orderBy: ACTION_AT_DESC,
          ${filters ? `filter: {${filters}}` : ''}
        )
        {
          nodes {
            actionAt
            userId
            targetBusinessId
            event
            action
            referenceId
          }
          totalCount
        }
      }`,
    },
    'POST'
  );
  if (!resp.success || 'errors' in resp.response) {
    throw new Error('Failed to retrieve admin logs');
  }

  return json({
    data: resp.response.data.actionLogs.nodes,
    total: resp.response.data.actionLogs.totalCount,
    currPage: Number(searchParams.get('page') || 1),
    events: eventsResp.response.data.sort()
  });
}

const AdminLogs = () => {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof loader>();
  const [tableData, setTableData] = useState(data);
  const [newPage, setNewPage] = useState(data.currPage);
  const searchDelay = useRef<any>(null);
  const handlePageChange = (page: number) => {
    setNewPage(page);
    setTimeout(() => {
      fetcher.submit(document.forms[0]);
    }, 100);
  };

  useEffect(() => {
    if (fetcher.data) {
      setTableData(fetcher.data);
      window.scrollTo(0, 0);
    }
  }, [fetcher.data]);

  return (
    <>
      <fetcher.Form method='get' className='flex gap-5 mb-5 items-end'>
        <div>
          <label htmlFor='startDate' className='font-signika block mb-1'>
            Start Date
          </label>
          <input
            id='startDate'
            type='date'
            name='start'
            onChange={(e) => {
              setNewPage(1);
              setTimeout(() => {
                fetcher.submit(document.forms[0])
              }, 100);
            }}
            className='border rounded p-2'
          />
        </div>
        <div>
          <label htmlFor='endDate' className='font-signika block mb-1'>
            End Date
          </label>
          <input
            id='endDate'
            type='date'
            name='end'
            onChange={(e) => {
              setNewPage(1);
              setTimeout(() => {
                fetcher.submit(document.forms[0])
              }, 100);
            }}
            className='border rounded p-2'
          />
        </div>
        <div>
          <label htmlFor='eventFilter' className='font-signika block mb-1'>
            Event Filter
          </label>
          <select
            id="eventFilter"
            name="eventFilter"
            onChange={(e) => {
              setNewPage(1);
              setTimeout(() => {
                fetcher.submit(document.forms[0])
              }, 100);
            }}
            className="border rounded p-2"
          >
            <option value="">All</option>
            {data.events.map((event: string) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            id='search'
            type='text'
            name='search'
            onChange={(e) => {
              setNewPage(1);
              if (searchDelay.current) {
                clearTimeout(searchDelay.current);
                searchDelay.current = null;
              }
              const currForm = e.currentTarget.form;
              searchDelay.current = setTimeout(() => {
                fetcher.submit(currForm);
              }, 500);
            }}
            placeholder='Search action'
            className='border rounded p-2'
          />
        </div>
        <input type='hidden' name='page' value={newPage} />
      </fetcher.Form>
      <table className='border border-gray-300 w-full'>
        <thead>
          <tr className='bg-primary-500 [&>th]:p-3 text-white font-signika text-lg text-left'>
            <th>Date</th>
            <th>Time</th>
            <th>Admin User</th>
            <th>Business ID Actioned</th>
            <th>Event</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {fetcher.state !== 'idle' ? (
            <tr className=''>
              <td colSpan={6}>
                <div role='status' className='flex justify-start p-3 items-center'>
                  <svg
                    aria-hidden='true'
                    className='w-6 h-6 animate-spin text-primary-500 fill-primary-100'
                    viewBox='0 0 100 101'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
                      fill='currentColor'
                    />
                    <path
                      d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
                      fill='currentFill'
                    />
                  </svg>
                  <span className='ml-2'>Loading...</span>
                </div>
              </td>
            </tr>
          ) : (
            <>
              {tableData.data.map((d, i) => (
                <tr key={i} className={`border-t border-gray-300 [&>td]:p-3`}>
                  <td className='whitespace-nowrap'>{moment(d.actionAt).format('DD/MM/YYYY')}</td>
                  <td>{moment(d.actionAt).format('HH:mm:ss')}</td>
                  <td>{d.userId}</td>
                  <td>{d.targetBusinessId}</td>
                  <td>{d.event}</td>
                  <td className='whitespace-pre-line'>{d.action}</td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={3} className='p-4 text-center'>
                    <h3 className='text-xl'>No logs found</h3>
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
      <Pagination
        className='ml-auto mt-3 border border-gray-100 rounded'
        disabled={fetcher.state === 'loading'}
        currentPage={tableData.currPage}
        pageSize={pageSize}
        totalCount={tableData.total || 0}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default AdminLogs;

export function ErrorBoundary() {
  // Error or new Response
  const error = useRouteError() as { message: string; data: string };
  console.error(error.message || error.data);
  return <ErrorMessage message={error.message || error.data} />;
}
