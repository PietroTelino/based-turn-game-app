import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@/types';

interface UserFormModalProps {
    isOpen: boolean;
    editingUser: User | null;
    onClose: () => void;
    onCreate: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
    onEdit: (id: string, data: { name: string; email: string }) => Promise<void>;
}

interface FormState {
    name: string;
    email: string;
    password: string;
    role: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
}

export function UserFormModal({ isOpen, editingUser, onClose, onCreate, onEdit }: UserFormModalProps) {
    const { t } = useTranslation();
    const isEditing = !!editingUser;

    const [form, setForm] = useState<FormState>({
        name: '',
        email: '',
        password: '',
        role: 'user',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editingUser) {
            setForm({
                name: editingUser.name,
                email: editingUser.email,
                password: '',
                role: editingUser.role,
            });
        } else {
            setForm({ name: '', email: '', password: '', role: 'user' });
        }
        setErrors({});
    }, [editingUser, isOpen]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    function validate(): boolean {
        const newErrors: FormErrors = {};

        if (!form.name.trim()) {
            newErrors.name = t('errors.required', { field: t('users.form.name') });
        }

        if (!form.email.trim()) {
            newErrors.email = t('errors.required', { field: t('users.form.email') });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = t('errors.invalidEmail');
        }

        if (!isEditing) {
            if (!form.password) {
                newErrors.password = t('errors.required', { field: t('users.form.password') });
            } else if (form.password.length < 8) {
                newErrors.password = t('errors.passwordMinLength');
            } else if (!/[^a-zA-Z0-9]/.test(form.password)) {
                newErrors.password = t('errors.passwordSpecialChar');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            if (isEditing) {
                await onEdit(editingUser.id, { name: form.name, email: form.email });
            } else {
                await onCreate(form);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
            <div className='absolute inset-0 bg-black/40' onClick={onClose} />
            <div className='relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg w-full max-w-md mx-4 p-6 flex flex-col gap-5'>
                <div className='flex items-center justify-between'>
                    <h2 className='text-base font-semibold text-gray-900 dark:text-white'>
                        {isEditing ? t('users.form.editTitle') : t('users.form.createTitle')}
                    </h2>
                    <button
                        onClick={onClose}
                        className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-lg'
                    >
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
                    {[
                        { name: 'name', label: t('users.form.name'), type: 'text', placeholder: t('users.form.namePlaceholder') },
                        { name: 'email', label: t('users.form.email'), type: 'email', placeholder: t('users.form.emailPlaceholder') },
                        ...(!isEditing ? [{ name: 'password', label: t('users.form.password'), type: 'password', placeholder: '••••••••' }] : []),
                    ].map((field) => (
                        <div key={field.name} className='flex flex-col gap-1.5'>
                        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>{field.label}</label>
                        <input
                            name={field.name}
                            type={field.type}
                            value={form[field.name as keyof FormState]}
                            onChange={handleChange}
                            placeholder={field.placeholder}
                            className={`
                                w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                                placeholder:text-gray-400 dark:placeholder:text-gray-600
                                text-gray-900 dark:text-white
                                ${errors[field.name as keyof FormErrors]
                                    ? 'border-red-400 bg-red-50 dark:bg-red-950'
                                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500'
                                }
                            `}
                        />
                        {errors[field.name as keyof FormErrors] && (
                            <p className='text-xs text-red-500'>{errors[field.name as keyof FormErrors]}</p>
                        )}
                        </div>
                    ))}

                    {!isEditing && (
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>{t('users.form.role')}</label>
                            <select
                                name='role'
                                value={form.role}
                                onChange={handleChange}
                                className='w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                            >
                                <option value='user'>{t('users.form.roles.user')}</option>
                                <option value='administrator'>{t('users.form.roles.administrator')}</option>
                            </select>
                        </div>
                    )}

                    <div className='flex gap-2 justify-end pt-1'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type='submit'
                            disabled={isSubmitting}
                            className='px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors'
                        >
                            {isSubmitting ? t('users.form.submitting') : isEditing ? t('users.form.submitEdit') : t('users.form.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}