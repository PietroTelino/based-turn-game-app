import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateMyPreferences } from '@/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function usePreferences() {
    const { t } = useTranslation();
    const { user, applyTheme, updateUser } = useAuth();
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentTheme = (user?.preferences as any)?.theme ?? 'light';

    async function handleThemeChange(theme: 'light' | 'dark') {
        if (theme === currentTheme) return;
        setIsSubmitting(true);
        try {
            await updateMyPreferences(theme);
            applyTheme(theme);

            updateUser({
                preferences: { ...user?.preferences, theme },
            });

            showToast(t('profile.theme.success'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        currentTheme,
        isSubmitting,
        handleThemeChange,
    };
}