import React from 'react';
import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { FaAngleLeft } from 'react-icons/fa6';
import Accordion, { type AccordionRef } from '~/components/ui/Accordion';
import { callAPI, getUserAccessToken } from '~/session.server';
import type { GraphQLReturn } from '~/lib/types';
import TableWidget from '~/components/TableWidget';

export const meta: MetaFunction = ({matches}) => {
  const lastMatch = matches[matches.length-1]
  return [
    { title: `Easy Dairy Bull Profile${lastMatch.params.id ? ` - Bull ID ${lastMatch.params.id}` : ''}` },
    { name: "description", content: "Easy Dairy Bull Profile" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, headers, isApp } = await getUserAccessToken(request, true);
  const bullQuery = `
    query {
      bullTeamWithHerdViews (
        condition: {
          animalUuid: "${params.id}"
        }
      ) 
      {
        nodes {
          herdCode
          herdName
          bullId
          animalUuid
          displayName
          type
          name
          breed
          stock
        }
      }
    }
  `;
  const bullQueryRes = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    { query: bullQuery },
    undefined,
    accessToken
  );
  if (!bullQueryRes.success || 'errors' in bullQueryRes.response) {
    console.log('Fail to get bull', bullQueryRes.response);
    return redirect('/dashboard/bulls', headers);
  }
  if (!bullQueryRes.response.data.bullTeamWithHerdViews.nodes.length) {
    return redirect('/dashboard/bulls', headers);
  }
  const bull = bullQueryRes.response.data.bullTeamWithHerdViews.nodes[0];

  const infoQuery = `{
    calvings_due: groupAnimalViews (
      condition: {
        lastMatingSireUuid: "${bull.animalUuid}"
      }
    )
    {
      nodes {
        animalUuid
        animalId
        name
      }
      totalCount
    },
    daughters: groupAnimalViews (
      condition: {
        sireUuid: "${bull.animalUuid}"
      }
    )
    {
      nodes {
        animalUuid
        animalId
        name
      }
      totalCount
    }
  }`;
  const infoQueryRes = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    { query: infoQuery },
    undefined,
    accessToken
  );
  console.log('bull', bull);
  console.log('infoQueryRes', JSON.stringify(infoQueryRes, null, 2));

  let calvingsDue = 0;
  let daughters = 0;

  if (infoQueryRes.success && 'data' in infoQueryRes.response) {
    calvingsDue = infoQueryRes.response.data.calvings_due?.totalCount || 0;
    daughters = infoQueryRes.response.data.daughters?.totalCount || 0;
  }
  return json(
    {
      success: true,
      bull,
      isApp,
      calvingsDue,
      daughters,
    },
    headers
  );
}

function BullDetails() {
  const navigate = useNavigate();
  const { bull, calvingsDue, daughters, isApp } = useLoaderData<typeof loader>();

  const [expandedList, setExpandedList] = React.useState<string[]>([]);

  const toggleExpanded = React.useCallback((item: string) => {
    setExpandedList((p) => {
      if (!p.includes(item)) {
        return p.concat(item);
      }
      return p.filter((x) => x != item);
    });
  }, []);

  const accordionRefs = React.useRef<Record<string, AccordionRef | null>>({});
  const accordionRecalculateHeight = (name: string) => {
    accordionRefs.current[name]?.recalcHeight();
  };

  return (
    <>
      <div className='shadow-[0_5px_10px_-5px_rgba(0,0,0,0.3)]'>
        <div className='pt-5 pb-3 px-5'>
          {!isApp && <button
            type='button'
            onClick={() => navigate(-1)}
            className='text-primary-500 underline gap-1 flex items-center font-bold'
          >
            <FaAngleLeft />
            Back
          </button>}
          <div className='my-10 px-2 grid gap-8 grid-cols-1 md:grid-cols-3'>
            <div>
              <h3 className='font-bold'>Display Name</h3>
              <p className='mt-2'>{bull.displayName}</p>
            </div>
            <div>
              <h3 className='font-bold'>Bull ID</h3>
              <p className='mt-2'>{bull.bullId}</p>
            </div>
            <div>
              <h3 className='font-bold'>Type</h3>
              <p className='mt-2'>{bull.type}</p>
            </div>
            <div>
              <h3 className='font-bold'>Name</h3>
              <p className='mt-2'>{bull.name}</p>
            </div>
            <div>
              <h3 className='font-bold'>Breed</h3>
              <p className='mt-2'>{bull.breed}</p>
            </div>
            <div>
              <h3 className='font-bold'>Stock</h3>
              <p className='mt-2'>{bull.stock}</p>
            </div>
          </div>
        </div>
      </div>
      <div className='flex flex-row my-10 gap-6 px-5 justify-end'>
        {expandedList.length > 0 && <button
          type='button'
          onClick={() => {
            setExpandedList([]);
          }}
          className='text-primary-500 underline gap-1 flex items-center font-bold ml-auto'
        >
          Close All Tabs
        </button>}
        {expandedList.length < 2 && <button
          type='button'
          onClick={() => {
            setExpandedList(['Calvings Due', 'Daughters']);
          }}
          className='text-primary-500 underline gap-1 hidden md:flex items-center font-bold '
        >
          Open All Tabs
        </button>}
      </div>
      <div className='flex flex-col px-5'>
        <Accordion
          title={`Calvings Due: ${calvingsDue}`}
          expanded={expandedList.includes('Calvings Due')}
          setExpand={() => {
            toggleExpanded('Calvings Due');
          }}
          ref={(el) => (accordionRefs.current['Calvings Due'] = el)}
        >
          <TableWidget
            hideColumnSettings={true}
            type='bull_calvings_due'
            filterDefault={[{ label: 'lastMatingSireId', value: bull.bullId, name: 'lastMatingSireId' }]}
            refreshOuter={() => accordionRecalculateHeight('Calvings Due')}
          />
        </Accordion>
        <Accordion
          title={`Daughters: ${daughters}`}
          expanded={expandedList.includes('Daughters')}
          setExpand={() => {
            toggleExpanded('Daughters');
          }}
          ref={(el) => (accordionRefs.current['Daughters'] = el)}
        >
          <TableWidget
            hideColumnSettings={true}
            type='bull_daughters'
            filterDefault={[
              { label: 'sireUuid', value: bull.animalUuid, name: 'sireUuid' },
              { label: 'gender', value: "F", name: 'gender' },
            ]}
            refreshOuter={() => accordionRecalculateHeight('Daughters')}
          />
        </Accordion>
      </div>
    </>
  );
}

export default BullDetails;
