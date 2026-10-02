import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '@/api/users';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from 'react-i18next';

interface FormState {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
};

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export function useRegisterForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [form, setForm] = useState<FormState>({
        name: '',
        email: '',
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

        if (!form.name.trim()) {
            newErrors.name = t('errors.required', { field: t('auth.register.name') });
        }

        if (!form.email.trim()) {
            newErrors.email = t('errors.required', { field: t('auth.register.email') });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = t('errors.invalidEmail');
        }

        if (!form.password) {
            newErrors.password = t('errors.required', { field: t('auth.register.password') });
        } else if (form.password.length < 8) {
            newErrors.password = t('errors.passwordMinLength');
        } else if (!/[^a-zA-Z0-9]/.test(form.password)) {
            newErrors.password = t('errors.passwordSpecialChar');
        }

        if (!form.confirmPassword) {
            newErrors.confirmPassword = t('errors.required', { field: t('auth.register.confirmPassword') });
        } else if (form.password !== form.confirmPassword) {
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
            await registerUser({
                name: form.name,
                email: form.email,
                password: form.password,
            });
            showToast(t('auth.register.success'), 'success');
            navigate('/login');
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
    };
}