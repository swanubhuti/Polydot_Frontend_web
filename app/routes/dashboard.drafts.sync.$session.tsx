import { type LoaderFunctionArgs, json, type ActionFunctionArgs } from '@remix-run/node';
import { requireVisibleHerds } from '~/lib/middleware/herd';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { getVisibleHerdsFilter } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';

export async function loader({params, request}: LoaderFunctionArgs) {
    const { userData, accessToken } = await getUserAccessToken(request, true);
    const sessions = (params.session ?? '').split(',')
    const drafts = await callAPI<GraphQLReturn>(
        request,
        '/api/graphql',
        { query: `query {
            drafts (
                condition: {
                    easyDairyId: "${userData.EasyDairyID[0]}"
                }
                filter: {
                    draftSession: {
                        in: [
                            "${sessions[0]}",
                            "${sessions[1]}"
                        ]
                    }
                }
                orderBy: ANIMAL_ID_ASC
            ) 
            {
                nodes {
                    animalId
                    rfid
                    name
                    draftDate
                    direction
                    draftSession
                    reason
                    draftedDate
                }
                totalCount
            }
        }` },
        undefined,
        accessToken
    );
    if (drafts.success && !('errors' in drafts.response)) {
        const draftList = drafts.response.data.drafts.nodes ?? []
        return json({
            drafts: draftList,
        })
    }
    return json({drafts: []})
}

export async function action({params, request}: ActionFunctionArgs) {
    //animals: {animalUuid: string, direction: number, reason: string}[], session: number, easyDairyId: string
    const { userData, accessToken } = await getUserAccessToken(request, true);
    
    const data = await request.json()

    const resp = await callAPI<GenericAPI>(request, `/api/draft/animal/${userData.EasyDairyID[0]}`, {
        animals: [data]
    }, 'POST', accessToken)
    return json(resp.response)
}