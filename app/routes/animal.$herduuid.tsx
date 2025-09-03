import type { LoaderFunctionArgs } from "@remix-run/node";
import type { GraphQLReturn } from "~/lib/types";
import { callAPI, getUserAccessToken } from "~/session.server";

export async function loader({request, params}: LoaderFunctionArgs) {
    const {accessToken} = await getUserAccessToken(request)

    const { response, success } = await callAPI<GraphQLReturn>(
        request,
        '/api/graphql',
        {
          query: `{
            groupAnimalViews (
                condition: {
                    herdUuid: "${params.herduuid}"
                }
                filter: {
                    status: {in: ["Calf","Yearling","Heifer","In Milk","Dry"]}
                }
            )
            {
                nodes {
                    animalUuid
                    animalId
                    nationalId
                    name
                }
            }
          }`,
        },
        undefined,
        accessToken
    );
    if (success && !('errors' in response)) {
        return response.data.groupAnimalViews.nodes
    }
    return []
}