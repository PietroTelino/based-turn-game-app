import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface FormState {
    email: string;
    password: string;
}

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

export function useLoginForm() {
    const { t } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState<FormState>({ email: '', password: '' });
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
        const email = form.email ?? '';
        const password = form.password ?? '';

        if (!email.trim()) {
            newErrors.email = t('errors.required', { field: t('auth.login.email') });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = t('errors.invalidEmail');            
        }

        if (!password) {
            newErrors.password = t('errors.required', { field: t('auth.login.password') });
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err: any) {
            console.log('Erro completo:', err);
            console.log('Response:', err?.response);
            console.log('Status:', err?.response?.status);
            console.log('Data:', err?.response?.data);

            const message = err?.response?.data?.message ?? 'Erro ao fazer login';
            setErrors({ general: message });
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