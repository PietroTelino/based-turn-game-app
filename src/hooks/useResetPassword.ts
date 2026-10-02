import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/api/users';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from 'react-i18next';

interface FormState {
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    password?: string;
    confirmPassword?: string;
}

export function useResetPassword() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = searchParams.get('token');
    const [form, setForm] = useState<FormState>({
        password: '',
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

        if (!form.password) {
            newErrors.password = t('errors.required', { field: t('auth.resetPassword.password') });
        } else if (form.password.length < 8) {
            newErrors.password = t('errors.passwordMinLength');
        } else if (!/[^a-zA-Z0-9]/.test(form.password)) {
            newErrors.password = t('errors.passwordSpecialChar');
        }

        if (!form.confirmPassword) {
           newErrors.confirmPassword = t('errors.required', { field: t('auth.resetPassword.confirmPassword') });
        } else if (form.password !== form.confirmPassword) {
            newErrors.confirmPassword = t('errors.passwordsMismatch');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        if (!token) {
            showToast(t('error.invalidToken'), 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await resetPassword(token, form.password);
            showToast(t('auth.resetPassword.success'), 'success');
            navigate('/login');
        } catch (error: any) {
            const message = error?.response?.data?.message ?? t('error.genericError');
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        token,
        form,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
    };
}