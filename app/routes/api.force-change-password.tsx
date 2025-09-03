import { type ActionFunctionArgs, json } from '@remix-run/node';
import { callAPI, getUserAccessToken } from '~/session.server';
import type { GenericAPI } from '~/lib/types';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, errors: { message: 'Method not allowed' } }, { status: 405 });
  }

  try {
    const { accessToken } = await getUserAccessToken(request, true);
    const formData = await request.formData();

    const newPassword = formData.get('newPassword');

    if (!newPassword) {
      return json({
        success: false,
        errors: { message: 'New password is required' }
      }, { status: 400 });
    }

    // Call the backend API
    const response = await callAPI<GenericAPI>(
      request,
      '/api/forceChangePassword',
      {
        newPassword: newPassword.toString()
      },
      'POST',
      accessToken
    );

    if (!response.success) {
      return json({
        success: false,
        errors: { message: response.response.errors as string || 'Failed to change password' }
      }, { status: 400 });
    }

    return json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Force change password error:', error);
    return json({
      success: false,
      errors: { message: 'An unexpected error occurred' }
    }, { status: 500 });
  }
}
