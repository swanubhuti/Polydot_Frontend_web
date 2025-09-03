import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { callAPI } from '~/session.server';

type GetHerdResponse = {
  EasyDairyID: string,
  HerdUUID: string,
  HerdCode: string,
  HerdName: string,
  LicenseType: string,
  ActiveUntil: string,
  Visible: string|null,
  VisibleAt: string|null,
  Note: string|null
}

export async function loader({request, params}: LoaderFunctionArgs) {
  const resp = await callAPI<{data: GetHerdResponse[]}>(request, `/api/dev/admin/business/${params.businessid}/herd/${params.easydairy}`, undefined, 'GET')
  if (!resp.success || 'errors' in resp.response) {
    throw new Error("Failed to retrieve business herd data")
  }
  return json(resp.response.data)
}