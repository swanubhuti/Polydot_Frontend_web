import { callAPI } from '~/session.server';
import type { GraphQLReturn } from '../types';
import { getVisibleHerdsFilter } from '../utils';

export async function requireVisibleHerds(
  req: Request,
  user: { Role: string; Herds: string[] | null, UserID?: string },
  herduuid: string
) {
  if (user.Herds && !user.Herds.includes(herduuid)) {
    console.error(`FATAL ERROR: Not allowed to view herd ${herduuid}`, `source: ${req.url}`, user)
    throw new Response('Not allowed to view this herd', { status: 401 });
  }
  const { response, success } = await callAPI<GraphQLReturn>(req, '/api/graphql', {
    query: `{
			herds (
				first: 1
				condition: { herdUuid: "${herduuid}" }
			) {
				nodes {
					herdUuid
					herdCode
          easyDairyId
          userHerdPermissions(condition: { userId: "${user.UserID}" }) {
						nodes {
							permission
						}
					}
				}
			}
		}`,
  });
  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve herd data for ${herduuid}`, `source: requireVisibleHerds (${req.url})`, response)
    throw new Response('Failed to retrieve herd data', { status: 500 });
  }
  if (response.data.herds.nodes.length == 0) {
    console.error(`FATAL ERROR: No herd found for ${herduuid}`, `source: requireVisibleHerds (${req.url})`)
    throw new Response('No herd found', { status: 404 });
  }

  return {
    currentHerd: response.data.herds.nodes[0].herdUuid,
    currentHerdCode: response.data.herds.nodes[0].herdCode,
    currentHerdPermission: response.data.herds.nodes[0].userHerdPermissions.nodes[0],
    currentEasyDairyId: response.data.herds.nodes[0].easyDairyId
  }
}
