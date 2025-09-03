import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import moment from "moment";
import { useState } from "react";
import Input from "~/components/ui/Input";
import type { GraphQLReturn } from "~/lib/types";
import { callAPI } from "~/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const {success, response} = await callAPI<GraphQLReturn>(
        request,
        '/api/graphql',
        {
            query: `{
                animalAlertViews 
                {
                    nodes {
                        alertUuid
                        alertName
                        lastChecked
                        animalUuid
                        animalName
                        id
                        herdCode
                    }
                }
            }`
        }
    )
    if (success && !('errors' in response)) {
        return json({list: response.data.animalAlertViews.nodes})
    }
    return json({list: []})
}

export default function DashboardAlertsReport() {
    const data = useLoaderData<typeof loader>()
    const [search, setSearch] = useState('')
    return (
        <div className="px-4">
            <div className="flex gap-2 items-center">
                <Input type="text" placeholder="Search ID" className="mb-3 max-w-xs" onChange={(e) => setSearch(e.target.value)} value={search} />
            </div>
            <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-left">
                    <thead className="bg-primary-500 text-white sticky top-0 z-10">
                        <tr className="[&>th]:p-3 [&>th:first-child]:rounded-l-lg [&>th:last-child]:rounded-r-lg">
                            <th>ID</th>
                            <th>Name</th>
                            <th>Herd</th>
                            <th>Alert</th>
                            <th>Last Checked</th>
                        </tr>
                    </thead>
                    <tbody className="[&>tr:nth-child(even)]:bg-gray-100">
                        {data.list.map((l, i) => 
                            <tr key={`cows-${i}`} className={`[&>td]:px-3 [&>td]:py-2 [&>td]:align-top ${!search || String(l.id).includes(search) ? '' : 'hidden'}`}>
                                <td><Link to={`/dashboard/animal/${l.animalUuid}`} className="text-primary underline">{l.id}</Link></td>
                                <td>{l.animalName}</td>
                                <td>{l.herdCode}</td>
                                <td>{l.alertName}</td>
                                <td>{moment(l.lastChecked).format('DD/MM/YYYY')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
