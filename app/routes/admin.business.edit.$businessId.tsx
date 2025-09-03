import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import z from 'zod';
import { callAPI, getUserAccessToken } from '~/session.server';
import type { GenericAPI,  } from '~/lib/types';
import RegisterBusiness, { BusinessLoaderResponse, type EasyDairyResponse, formatHerdData } from './admin.business.add';
import { HEAT_SYSTEM_LIST } from '~/lib/utils';
import { useLoaderData } from '@remix-run/react';

const editBusinessDetailsSchema = z.object({
  businessId: z.string().min(1, 'BusinessId is required'),
  businessName: z.string().min(1, 'Business Name is required'),
  easyDairyIDs: z.string().array(),
  isEasyDraft: z.boolean(),
  heatSystem: z.string().optional()
});

export async function loader({request, params}: LoaderFunctionArgs) {
  const businessId = params.businessId
  const {accessToken, userData, headers} = await getUserAccessToken(request);
  const businessList = await callAPI<GenericAPI>(request, '/api/admin/business/?businessId=' + businessId, undefined, 'GET', accessToken)
  if (businessList.success && businessList.response) {
    const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/easydairyid`, undefined, 'GET');
    if (apiResult.success) {
      (apiResult.response as EasyDairyResponse[]).sort((a, b) => {
        return businessList.response.EasyDairyID.includes(a.easyDairyId) && businessList.response.EasyDairyID.includes(b.easyDairyId) ?
          (a.easyDairyId < b.easyDairyId ? -1 : 1)
          : businessList.response.EasyDairyID.includes(a.easyDairyId)
            ? -1
            : 1
      })
    }
    return json({
      business: businessList.response,
      easydairy: apiResult.success ? apiResult.response : [],
      heatSystem: businessList.response.HeatSystem
    })
  }
  return redirect(userData && userData.Role === 'admin' ? "/admin" : "/dashboard", headers);
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();

  const data = {
    businessId: params.businessId,
    businessName: formData.get("businessName"),
    easyDairyIDs: formData.getAll("easyDairyId"),
    isEasyDraft: formData.get('isEasyDraft') === 'true' ? true : false,
    heatSystem: formData.get("heatsystem") || ''
  }

  const validation = editBusinessDetailsSchema.safeParse(data);
  if (!validation.success) {
    const fieldErrors = validation.error.flatten()?.fieldErrors;
    return json({
      status: 'validation error',
      message: null,
      businessId: null,
      errors: null,
      fieldErrors: fieldErrors,
      easyDairyIds: []
    });
  }

    const businessId = validation.data.businessId
  const res = await callAPI<GenericAPI>(request, `/api/dev/admin/business/editDetails/${businessId}`, validation.data, 'PUT');

  if (!res.success || (res.success && !res.response.business)) {
    const errors = res.response?.errors as string ?? (res.response as any).message ?? 'Something went wrong';
    return json({
      status: 'api error',
      message: 'Error',
      businessId: null,
      errors: errors,
      fieldErrors: null,
      easyDairyIds: []
    });
  }
    const herdData = formatHerdData(formData);

  const resp = await callAPI<GenericAPI>(request, `/api/dev/admin/business/herd`, {
    businessId: res.response.business.BusinessID,
    herds: herdData
  }, 'POST');
  if (!resp.success || resp.response.errors) {
    return json({
      status: 'api error',
      message: !resp.success ? resp.response.errors as string : resp.response.message,
      businessId: res.response.business.BusinessID,
      errors: null,
      fieldErrors: null,
      easyDairyIds: []
    })
  }
    return json({
    status: 'success',
    message: res.response.message,
    businessId: res.response.business?.BusinessID,
    errors: null,
    fieldErrors: null,
    easyDairyIds: formData.getAll("easyDairyId").map(a => String(a))
  });
}

export default function EditBusiness() {
  const loaderData = useLoaderData<BusinessLoaderResponse>()
  return <RegisterBusiness key={`editBusiness-${loaderData.business.BusinessID}`} />
}
