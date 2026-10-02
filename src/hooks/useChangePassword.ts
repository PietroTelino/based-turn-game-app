import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeMyPassword } from '@/api/users';
import { useToast } from '@/contexts/ToastContext';

interface FormState {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface FormErrors {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}

export function useChangePassword() {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [form, setForm] = useState<FormState>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    function validate(): boolean {
        const newErrors: FormErrors = {};

        if (!form.currentPassword) {
            newErrors.currentPassword = t('errors.required', { field: t('profile.changePassword.current') });
        }

        if (!form.newPassword) {
            newErrors.newPassword = t('errors.required', { field: t('profile.changePassword.new') });
        } else if (form.newPassword.length < 8) {
            newErrors.newPassword = t('errors.passwordMinLength');
        } else if (!/[^a-zA-Z0-9]/.test(form.newPassword)) {
            newErrors.newPassword = t('errors.passwordSpecialChar');
        }

        if (!form.confirmPassword) {
            newErrors.confirmPassword = t('errors.required', { field: t('profile.changePassword.confirm') });
        } else if (form.newPassword !== form.confirmPassword) {
            newErrors.confirmPassword = t('errors.passwordsMismatch');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await changeMyPassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            showToast(t('profile.changePassword.success'), 'success');
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            const message = error?.response?.data?.message ?? t('errors.genericError');
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        form,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
    }
}