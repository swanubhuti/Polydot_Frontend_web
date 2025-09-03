import React, { useState } from 'react';
import { z } from 'zod';
import { useFetcher } from '@remix-run/react';
import { ModalBox } from '~/components/ui/Dialog';
import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import { passValidation } from '~/lib/string';

const forcePasswordChangeSchema = z
  .object({
    newPassword: z.string().min(1, 'New Password is required').superRefine(passValidation),
    confirmPassword: z.string().min(1, 'Confirm New Password is required'),
  })
  .refine(
    (data) => {
      return data.newPassword === data.confirmPassword;
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  );

type FormInputError = {
  [k in keyof z.infer<typeof forcePasswordChangeSchema>]?: string;
} & {
  message?: string;
};

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ForcePasswordChangeModal({
  isOpen,
  onClose,
  onSuccess
}: ForcePasswordChangeModalProps) {
  const fetcher = useFetcher<{ success: boolean; errors?: FormInputError; message?: string }>();
  const [errors, setErrors] = useState<FormInputError>({});

  const isSubmitting = fetcher.state === 'submitting';
  const isSuccess = fetcher.data?.success === true;

  // Handle success and redirect
  React.useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onSuccess();
        setErrors({});
        // Reset the form
        const form = document.getElementById('force-password-change-form') as HTMLFormElement;
        form?.reset();
      }, 1500); // Show success message for 1.5 seconds
    }
  }, [isSuccess, onSuccess]);

  // Handle form errors
  React.useEffect(() => {
    if (fetcher.data?.success === false) {
      setErrors(fetcher.data.errors || { message: 'An error occurred' });
    }
  }, [fetcher.data]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    const validation = forcePasswordChangeSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (validation.success === false) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors({
        newPassword: fieldErrors?.newPassword?.[0],
        confirmPassword: fieldErrors?.confirmPassword?.[0],
      });
      return;
    }

    setErrors({});
    fetcher.submit(formData, {
      method: 'post',
      action: '/api/force-change-password'
    });
  };

  return (
    <ModalBox
      isOpen={isOpen}
      onClose={() => {}} // Disable closing - user must change password
      title="Password Change Required"
      classes="max-w-md"
    >
      <div className="px-2">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <p className="text-green-600 font-semibold">Password changed successfully!</p>
            <p className="text-gray-600 text-sm mt-2">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-yellow-500 text-xl mr-3">⚠️</div>
                <div>
                  <p className="text-yellow-800 font-semibold">Password Change Required</p>
                  <p className="text-yellow-700 text-sm">
                    You must change your password before continuing to use the system.
                  </p>
                </div>
              </div>
            </div>

            <fetcher.Form id="force-password-change-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="New Password"
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  error={errors.newPassword}
                />
              </div>
              <div>
                <Input
                  label="Confirm New Password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  error={errors.confirmPassword}
                />
              </div>

              {errors.message && (
                <p className="text-error-500 text-sm text-center">{errors.message}</p>
              )}

              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  *The password must have a minimum of 8 characters and:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-4">
                  <li>Contain at least one upper case alphabetical character.</li>
                  <li>Contain at least one lowercase alphabetical character.</li>
                  <li>Contain at least one numeric character.</li>
                  <li>Contain at least one special character.</li>
                </ul>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </fetcher.Form>
          </div>
        )}
      </div>
    </ModalBox>
  );
}
