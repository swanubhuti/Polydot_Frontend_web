import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import TableWidget from '~/components/TableWidget';
import { getUserAccessToken } from '~/session.server';

export const meta: MetaFunction = () => {
  return [
    { title: `Easy Dairy Bull Team` },
    { name: "description", content: "Easy Dairy Bull Team" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { headers, isApp } = await getUserAccessToken(request, true);

  return json(
    {
      isApp
    },
    headers
  );
}


function BullsHome() {
  const data = useLoaderData<typeof loader>()
  return <div className=''>
    <div className='mt-8 bg-grey-light py-6 px-4'>
      <div className='px-2 py-10 md:px-4 bg-white'>
        <h2 className='text-2xl'>Bull Team</h2>
        <TableWidget
          type='bulls'
          hideColumnSettings={true}
          isApp={data.isApp}
        /> 
      </div>
    </div>
  </div>;
}

export default BullsHome;
