import { type LoaderFunctionArgs,json} from "@remix-run/node";
import { callAPI } from "~/session.server";
import type { GenericAPI } from '~/lib/types';

export async function loader({request, params}: LoaderFunctionArgs) {
    const searchParams = new URL(request.url).searchParams
    let searchType = ''
    let searchName = ''
    let searchEmail = ''
    searchParams.forEach(
        (val, key) => {
            if(key === 'searchType'){
                searchType = val
            }
            if(key === 'searchEmail'){
                searchEmail = val
            }
            if(key === 'searchName'){
                searchName = val
            }
        }
    )

    const limitQuery = 5
    if(searchType === 'businessName'){    
        const api_resp = await callAPI<GenericAPI>(request, `/api/businesses/?limit=${limitQuery}&status=active&search=${searchName}`, undefined, 'GET');
    
        if(api_resp.success){
            return json(
                {
                    data: api_resp.response.data
                }
            )
        }
    } else if(searchType === 'userEmail') {
        const params = new URLSearchParams();
        params.set('limit', limitQuery.toString());
        params.set('search', searchEmail);

        const roles = ['user,business-admin']
        const status = ['active']

        if (roles?.length) {
            params.set('roles', roles.join(','));
        }
        if (status?.length) {
            params.set('status', status.join(','));
        }
        const queryString = params.toString();
        const api_resp = await callAPI<GenericAPI>(request, `/api/businessesByUserEmail/?${queryString}`, undefined, 'GET');
        //const api_resp = await callAPI<GenericAPI>(request, `/api/businessesByUserEmail/?limit=${limitQuery}&status=active&search=${searchEmail}`, undefined, 'GET');
        if(api_resp.success){
            return json(
                {
                    data: api_resp.response.data
                }
            )
        }
    }

    return json({data: []})
}