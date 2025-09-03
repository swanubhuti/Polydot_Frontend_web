import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useRouteError} from "@remix-run/react";
import { callAPI, getUserAccessToken } from "~/session.server";
import type { GenericAPI } from '~/lib/types';
import ErrorMessage from "~/components/ui/ErrorMessage";
import TableWidget from "~/components/TableWidget";

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Admin - Duplicate Animals` },
    { name: "description", content: "Easy Dairy Admin - Duplicate Animals" },
  ];
};

export default function DuplicateAnimals() {
  return (
    <div className="p-2 flex flex-col gap-4">
      <h3 className="md:text-2xl text-xl p-2">Duplicate Animals by RFID</h3>
      <TableWidget
        type='duplicates'
        isApp={false}
        showWithholding={false}
        hideColumnSettings={true}
        print={false}
      />
    </div>
  )
}

export function ErrorBoundary() {
  // Error or new Response
  const error = useRouteError() as { message: string; data: string };
  console.error(error.message || error.data);
  return <ErrorMessage message={error.message || error.data} />;
}

