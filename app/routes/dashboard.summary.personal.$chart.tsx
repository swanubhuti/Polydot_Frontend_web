import { type ActionFunctionArgs, json } from "@remix-run/node";
import { chartList } from "~/lib/chartTypes";
import type { GraphQLReturn } from "~/lib/types";
import { callAPI } from "~/session.server";

export async function action({ request, params }: ActionFunctionArgs) {
    const chartType = params.chart as keyof typeof chartList
    const jsonData = await request.json()
    let query = 'query' in chartList[chartType] ? chartList[chartType].query : ''
    if (jsonData.filters) {
        Object.entries(jsonData.filters).forEach(([k, v]) => {
            if (k === 'dateRange' || k === 'yearRange') {
                const split = String(v).split('_')
                query = query.replace('{start}', split[0]).replace('{end}', split[1])
            } else {
                query = query.replace(`{${k}}`, v as string)
            }
        })
        if (jsonData.filters.herdUuids) {
            jsonData.filters.herdUuids = jsonData.filters.herdUuids.split(',')
        }
    }
    if (jsonData.herdList) {
        query = query.replace('{herdList}', jsonData.herdList.map((h: string) => `"${h}"`).join(','))
    }
    const { response, success } = await callAPI<GraphQLReturn>(
        request,
        'url' in chartList[chartType] ? chartList[chartType]['url'] : '/api/graphql',
        'url' in chartList[chartType] ? jsonData.filters : {
          query: `{
            ${query}
          }`
        }
    , 'POST')

    if (!success || 'errors' in response) {
        return json({ success: false })
    }
    return json({data: response.data})
}