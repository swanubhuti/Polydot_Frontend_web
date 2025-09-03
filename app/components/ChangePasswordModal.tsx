import React, { useState } from 'react';
import { z } from 'zod';
import { useFetcher } from '@remix-run/react';
import { ModalBox } from '~/components/ui/Dialog';
import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import { passValidation } from '~/lib/string';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current Password is required'),
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
  [k in keyof z.infer<typeof changePasswordSchema>]?: string;
} & {
  message?: string;
};

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const fetcher = useFetcher<{ success: boolean; errors?: FormInputError; message?: string }>();
  const [errors, setErrors] = useState<FormInputError>({});

  const isSubmitting = fetcher.state === 'submitting';
  const isSuccess = fetcher.data?.success === true;

  // Close modal and reset form on success
  React.useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
        setErrors({});
        // Reset the form
        const form = document.getElementById('change-password-form') as HTMLFormElement;
        form?.reset();
      }, 1500); // Show success message for 1.5 seconds
    }
  }, [isSuccess, onClose]);

  // Handle form errors
  React.useEffect(() => {
    if (fetcher.data?.success === false) {
      setErrors(fetcher.data.errors || { message: 'An error occurred' });
    }
  }, [fetcher.data]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    const validation = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (validation.success === false) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors({
        currentPassword: fieldErrors?.currentPassword?.[0],
        newPassword: fieldErrors?.newPassword?.[0],
        confirmPassword: fieldErrors?.confirmPassword?.[0],
      });
      return;
    }

    setErrors({});
    fetcher.submit(formData, {
      method: 'post',
      action: '/api/change-password'
    });
  };

  return (
    <ModalBox
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      classes="max-w-md"
    >
      <div className="px-2">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <p className="text-green-600 font-semibold">Password changed successfully!</p>
          </div>
        ) : (
          <fetcher.Form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Current Password"
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                error={errors.currentPassword}
              />
            </div>
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

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </fetcher.Form>
        )}
      </div>
    </ModalBox>
  );
}
