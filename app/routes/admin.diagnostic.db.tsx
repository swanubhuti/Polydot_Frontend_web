import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { Fragment, FunctionComponent, useEffect, useMemo, useState } from 'react';
import ErrorMessage from '~/components/ui/ErrorMessage';
import { callAPI } from '~/session.server';
import { FaInfoCircle } from 'react-icons/fa';
import { CiImport } from 'react-icons/ci';
import { MdStorage } from 'react-icons/md';
import SelectDropdown from '~/components/ui/Dropdown';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { colors, formatNumber } from '~/lib/utils';
import { Dialog, Transition } from '@headlessui/react';
import Button from '~/components/ui/Button';
import { z } from 'zod';
import { ModalBox, ModalProps } from '~/components/ui/Dialog';
import Spinner from '~/components/ui/Spinner';
import Autocomplete from '~/components/ui/Autocomplete';

const extensionSchema = z.object({
  extname: z.string(),
  comment: z.string(),
  version: z.string()
})

const tableSizeSchema = z.object({
  schema: z.string(),
  name: z.string(),
  bytes: z.string(),
  size: z.string()
})

const cacheHitSchema = z.object({
  heap_read: z.string(),
  heap_hit: z.string(),
  ratio_percent: z.string()
})

const deadTupleSchema = z.object({
  type: z.string(),
  schemaname: z.string(),
  object_name: z.string(),
  bloat: z.string(),
  waste: z.string()
})

const sequentialScanSchema = z.object({
  schemaname: z.string(),
  relname: z.string(),
  total_count: z.string(),
  total_seq_rows: z.string(),
  avg_seq: z.string()
})

const customIndexSchema = z.object({
  schema: z.string(),
  table: z.string(),
  index: z.string(),
  indes_size_bytes: z.string(),
  index_size: z.string(),
  idx_scan: z.string()
})

const execTimeSchema = z.object({
  userid: z.string(),
  dbid: z.number(),
  mean_exec_time_ms: z.number(),
  max_exec_time_ms: z.number(),
  min_exec_time_ms: z.number(),
  stddev_exec_time: z.number(),
  calls: z.string(),
  query: z.string()
})

const dbStatSchema = z.object({
  version: z.string(),
  extensions: z.array(extensionSchema),
  tableSizes: z.array(tableSizeSchema),
  dbSize: z.string(),
  cacheHit: cacheHitSchema,
  deadTuples: z.array(deadTupleSchema),
  sequentialScan: z.array(sequentialScanSchema),
  customIndexes: z.array(customIndexSchema),
  execTimes: z.array(execTimeSchema)
})

interface LoaderResponse {
  success: boolean;
  data: DbStat;
  fileNames: string[];
  fileOptions: {label: string, value: string}[]
}

type DbStat = z.infer<typeof dbStatSchema>

type Extension = z.infer<typeof extensionSchema>

type TableSize = z.infer<typeof tableSizeSchema>

type CacheHit = z.infer<typeof cacheHitSchema>

type DeadTuple = z.infer<typeof deadTupleSchema>

type SequentialScan = z.infer<typeof sequentialScanSchema>

type CustomIndex = z.infer<typeof customIndexSchema>

type ExecTime = z.infer<typeof execTimeSchema>


export async function loader({ request }: LoaderFunctionArgs) {
  const { success, response } = await callAPI<LoaderResponse>(request, '/api/dev/admin/db/stat', undefined, 'GET');
  if (!success) {
    return null;
  }
  if (!response.success) {
    console.error(response);
    return null;
  }
  response.fileOptions = response.fileNames.map(fn => {
    return {label: fn.replace('.json',''), value: fn}
  })
  response.fileOptions.unshift({label: 'Current Date', value: ''})

  return response;
}

export async function action({request}: ActionFunctionArgs) {
  const data = await request.json()
  const { success, response } = await callAPI<DbStat>(request, `/api/dev/admin/db/stat/${data.file}`, undefined, 'GET');
  if (success) {
    return response
  }
  return null
}

export function shouldRevalidate() {
  return false
}

export default function DbStatPage() {
  const loaderData = useLoaderData<typeof loader>();
  const [currData, setCurrData] = useState(loaderData?.data!)
  const [currFile, setCurrFile] = useState({label: 'Current Date', value: ''})
  const [loading, setLoading] = useState(false)
  const [dialogData, setDialogData] = useState<ModalProps>({isOpen: false, title: '', onClose: () => setDialogData(prev => ({...prev, isOpen: false}))})
  const fetcher = useFetcher<DbStat | null>()
  useEffect(() => {
    if (fetcher.data) {
      setCurrData(fetcher.data)
    } else if (fetcher.data === null) {
      setDialogData(prev => ({...prev, isOpen: true, title: 'Error', children: <div className="text-center">Failed to fetch data</div>}))
      setCurrFile({label: 'Current Date', value: ''})
    }
    setLoading(false)
  }, [fetcher.data])
  if (loaderData == null) {
    return <ErrorMessage message='Fail to load database statistics' />;
  }
  return (
    <>
      <div className='flex justify-between mb-4 items-center'>
        <div>
          <h2 className="text-2xl">Statistics</h2>
          <p className="text-gray-500">From {currFile.label.replace('.json', '')}</p>
        </div>
        <fetcher.Form className="flex gap-2 py-2">
          <Autocomplete 
            // type="single"
            options={loaderData.fileOptions}
            value={currFile}
            onSelectChange={(opt) => {
              if (opt.value) {
                setLoading(true)
                fetcher.submit({
                  file: opt.value
                }, {
                  method: 'POST',
                  encType: 'application/json'
                })
              } else {
                setCurrData(loaderData.data)
              }
              setCurrFile(opt)
            }}
          />
          <DownloadButton data={currData} fileName={currFile.value || new Date().toISOString()} />
        </fetcher.Form>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
        <Card icon={FaInfoCircle} title='Version' message={currData.version} />
        <Card icon={MdStorage} title='Total storage size' message={currData.dbSize} />
        <TableSizes data={currData.tableSizes} />
        <Extensions data={currData.extensions} />
        <CacheHit data={currData.cacheHit} />
        <DeadTuples data={currData.deadTuples} />
        <SequentialScans data={currData.sequentialScan} />
        <CustomIndexes data={currData.customIndexes} />
        <QueryExecTimes data={currData.execTimes} />
      </div>
      <ModalBox {...dialogData} />
      <Spinner active={loading} />
    </>
  );
}

function DownloadButton({ data, fileName }: { data: DbStat, fileName: string }) {
  function download(content: string, fileName: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <Button
      variant='outline'
      className='flex flex-row items-center gap-2 py-1'
      onClick={() => {
        const filename = `easydairy_db_stat_${fileName}.json`;
        download(JSON.stringify(data), filename, 'application/json');
      }}
    >
      <CiImport />
      Download
    </Button>
  );
}

function CacheHit({ data }: { data: CacheHit }) {
  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <div className='font-semibold'>Cache hit ({data.ratio_percent.slice(0, 6)} %)</div>
      <ResponsiveContainer width='100%' height={250}>
        <PieChart height={250}>
          <Pie
            cx='50%'
            cy='50%'
            data={[
              {
                name: 'Cache Hit',
                value: parseInt(data.heap_hit),
              },
              {
                name: 'Read from disk',
                value: parseInt(data.heap_read),
              },
            ]}
            label
            paddingAngle={5}
            name='name'
            dataKey='value'
          >
            {Array({ length: 2 }).map((_, ix) => (
              <Cell key={ix} fill={colors[colors.length - 1 - ix]} />
            ))}
          </Pie>
          <Legend layout='vertical' align='right' verticalAlign='middle' />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function SequentialScans({ data }: { data: SequentialScan[] }) {
  const [schema, setSchema] = useState('public');
  const schemaList = useMemo(() => {
    return Array.from(new Set(data.map((e) => e.schemaname))).map((e) => ({ label: e, value: e }));
  }, [data]);
  const filtered = useMemo(() => {
    return data.filter((e) => e.schemaname === schema);
  }, [schema, data]);

  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <div className='font-semibold'>Sequential Scan</div>
      <SelectDropdown
        type='single'
        label='Schema'
        name='schema'
        labelClass='hidden'
        placeholder='Select schema'
        options={schemaList}
        value={schema}
        className='text-primary-500 w-full'
        onSelectChange={(val) => {
          setSchema(val.value);
        }}
      />
      <div className='overflow-x-auto h-[300px] overflow-auto'>
        <table className='w-full'>
          <thead>
            <tr className='[&>th]:px-3 [&>th]:py-2 [&>th]:text-left  [&>th]:text-gray-500 [&>th]:font-normal bg-gray-500/5'>
              <th>Name</th>
              <th>Total Seq Scans</th>
              <th>Total Rows</th>
              <th>Avg Row Per Seq Scan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={idx} className='[&>td]:px-3 [&>td]:py-2 [&>th]:text-left'>
                <td>{e.relname}</td>
                <td>{formatNumber(parseInt(e.total_count), 2)}</td>
                <td>{formatNumber(parseInt(e.total_seq_rows), 2)}</td>
                <td>{formatNumber(parseInt(e.avg_seq), 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QueryExecTimes({ data }: { data: ExecTime[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const isOpen = selected != null;
  function downloadSql(query: string) {
    const blob = new Blob([query], {
      type: 'text/plain',
    });
    const a = document.createElement('a');
    a.setAttribute('download', new Date().getTime().toString() + '_query.sql');
    a.setAttribute('href', window.URL.createObjectURL(blob));
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.click();
    a.remove();
  }
  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <Transition
        show={isOpen}
        enter='transition duration-1000 ease-out'
        enterFrom='transform scale-50 opacity-0'
        enterTo='transform scale-100 opacity-100'
        leave='transition duration-1000 ease-out'
        leaveFrom='transform scale-100 opacity-100'
        leaveTo='transform scale-50 opacity-0'
        as={Fragment}
      >
        <Dialog
          open={isOpen}
          onClose={() => {
            setSelected(null);
          }}
          className={`fixed inset-0 z-50 flex  justify-center items-center transition-opacity duration-500 ${
            isOpen ? 'bg-black/30 backdrop-blur-sm' : 'pointer-events-none bg-black/0'
          }`}
        >
          <Dialog.Panel className='bg-white px-8 py-5 rounded-lg shadow-lg text-center mx-auto min-w-[450px] max-w-[90vw] w-[60vw]'>
            <Dialog.Title className='mt-2 text-center font-semibold text-lg font-signika'>Query Statement</Dialog.Title>
            <Dialog.Description className='mt-1 text-start'>
              <pre className='text-start p-3 bg-gray-50 rounded text-sm break-before-all text-wrap h-[200px] overflow-y-auto'>
                {selected}
              </pre>
            </Dialog.Description>
            <div className='mt-3 flex gap-5'>
              <Button className='flex-1' variant='outline' onClick={() => setSelected(null)} type='button'>
                Close
              </Button>
              <Button
                className='flex-1'
                onClick={() => {
                  if (selected != null) {
                    downloadSql(selected);
                  }
                }}
              >
                Download
              </Button>
            </div>
          </Dialog.Panel>
        </Dialog>
      </Transition>
      <div className='font-semibold'>Slowest Queries</div>
      <div className='overflow-x-auto h-[300px] overflow-auto'>
        <table className='w-full'>
          <thead>
            <tr className='[&>th]:px-3 [&>th]:py-2 [&>th]:text-left  [&>th]:text-gray-500 [&>th]:font-normal bg-gray-500/5'>
              <th>User</th>
              <th>Query</th>
              <th>Calls</th>
              <td>Max Time (ms)</td>
              <td>Mean Time (ms)</td>
              <td>Min Time (ms)</td>
              <td>Std Dev Time (ms)</td>
            </tr>
          </thead>
          <tbody>
            {data.map((e, idx) => (
              <tr key={idx} className='[&>td]:px-3 [&>td]:py-2 [&>th]:text-left'>
                <td>{e.userid}</td>
                <td>
                  <button
                    className='text-start text-primary-500 underline underline-offset-4 transition hover:text-primary-500/70'
                    onClick={() => {
                      setSelected(e.query);
                    }}
                    type='button'
                  >
                    {e.query.slice(0, 55)}
                  </button>
                </td>
                <td>{formatNumber(parseInt(e.calls), 2)}</td>
                <td>{e.max_exec_time_ms.toFixed(3)}</td>
                <td>{e.mean_exec_time_ms.toFixed(3)}</td>
                <td>{e.min_exec_time_ms.toFixed(3)}</td>
                <td>{e.stddev_exec_time.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomIndexes({ data }: { data: CustomIndex[] }) {
  const [schema, setSchema] = useState('public');
  const schemaList = useMemo(() => {
    return Array.from(new Set(data.map((e) => e.schema))).map((e) => ({ label: e, value: e }));
  }, [data]);
  const filtered = useMemo(() => {
    return data.filter((e) => e.schema === schema);
  }, [schema, data]);

  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <div className='font-semibold'>Custom Indexes</div>
      <SelectDropdown
        type='single'
        label='Schema'
        name='schema'
        labelClass='hidden'
        placeholder='Select schema'
        options={schemaList}
        value={schema}
        className='text-primary-500 w-full'
        onSelectChange={(val) => {
          setSchema(val.value);
        }}
      />
      <div className='overflow-x-auto h-[300px] overflow-auto'>
        <table className='w-full'>
          <thead>
            <tr className='[&>th]:px-3 [&>th]:py-2 [&>th]:text-left  [&>th]:text-gray-500 [&>th]:font-normal bg-gray-500/5'>
              <th>Table</th>
              <th>Index</th>
              <th>Total Scans</th>
              <th>Index Size</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={idx} className='[&>td]:px-3 [&>td]:py-2 [&>th]:text-left'>
                <td>{e.table}</td>
                <td>{e.index}</td>
                <td>{formatNumber(parseInt(e.idx_scan), 2)}</td>
                <td>{e.index_size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeadTuples({ data }: { data: DeadTuple[] }) {
  const [schema, setSchema] = useState('public');
  const schemaList = useMemo(() => {
    return Array.from(new Set(data.map((e) => e.schemaname))).map((e) => ({ label: e, value: e }));
  }, [data]);
  const filtered = useMemo(() => {
    return data.filter((e) => e.schemaname === schema);
  }, [schema, data]);

  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <div className='font-semibold'>Dead Tuples</div>
      <SelectDropdown
        type='single'
        label='Schema'
        name='schema'
        labelClass='hidden'
        placeholder='Select schema'
        options={schemaList}
        value={schema}
        className='text-primary-500 w-full'
        onSelectChange={(val) => {
          setSchema(val.value);
        }}
      />
      <div className='overflow-x-auto h-[300px] overflow-auto'>
        <table className='w-full'>
          <thead>
            <tr className='[&>th]:px-3 [&>th]:py-2 [&>th]:text-left  [&>th]:text-gray-500 [&>th]:font-normal bg-gray-500/5'>
              <th>Name</th>
              <th>Type</th>
              <th>Waste</th>
              <th>Bloat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={idx} className='[&>td]:px-3 [&>td]:py-2 [&>th]:text-left'>
                <td>{e.object_name}</td>
                <td>{e.type}</td>
                <td>{e.waste}</td>
                <td>{e.bloat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Extensions({ data }: { data: Extension[] }) {
  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <div className='font-semibold'>Installed Extensions</div>
      <div className='overflow-x-auto h-[300px] overflow-auto'>
        <table className='w-full'>
          <thead>
            <tr className='[&>th]:px-3 [&>th]:py-2 [&>th]:text-left  [&>th]:text-gray-500 [&>th]:font-normal bg-gray-500/5'>
              <th>Name</th>
              <th>Version</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e, idx) => (
              <tr key={idx} className='[&>td]:px-3 [&>td]:py-2 [&>th]:text-left'>
                <td>{e.extname}</td>
                <td>{e.version}</td>
                <td>{e.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableSizes({ data }: { data: TableSize[] }) {
  const [schema, setSchema] = useState('public');
  const schemaList = useMemo(() => {
    return Array.from(new Set(data.map((e) => e.schema))).map((e) => ({ label: e, value: e }));
  }, [data]);
  const filtered = useMemo(() => {
    return data.filter((e) => e.schema === schema);
  }, [schema, data]);

  return (
    <div className='p-4 bg-white shadow rounded flex flex-col gap-2 col-span-2'>
      <div className='font-semibold'>Table Sizes</div>
      <SelectDropdown
        type='single'
        label='Schema'
        name='schema'
        labelClass='hidden'
        placeholder='Select schema'
        options={schemaList}
        value={schema}
        className='text-primary-500 w-full'
        onSelectChange={(val) => {
          setSchema(val.value);
        }}
      />
      <div className='overflow-x-auto h-[300px] overflow-auto'>
        <table className='w-full'>
          <thead>
            <tr className='[&>th]:px-3 [&>th]:py-2 [&>th]:text-left  [&>th]:text-gray-500 [&>th]:font-normal bg-gray-500/5'>
              <th>Table</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={idx} className='[&>td]:px-3 [&>td]:py-2 [&>th]:text-left'>
                <td>{e.name}</td>
                <td>{e.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon: FunctionComponent<{ className: string }>;
}) {
  const Icon = icon;
  return (
    <div className='flex flex-col gap-2 p-4 shadow rounded bg-white'>
      <div className='font-semibold flex gap-2 items-center'>
        <Icon className='size-5' />
        {title}
      </div>
      <div className='text-2xl'>{message}</div>
    </div>
  );
}
