import { useTranslation } from 'react-i18next';
import type { Session } from '@/types';

interface SessionCardProps {
    session: Session;
    onLogout: (id: string) => void;
}

function parseUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Dispositivo desconhecido';
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    if (userAgent.includes('Postman')) return 'Postman';

    return 'Navegador desconhecido';
}

function formatDate(date: string) {
    return new Date(date).toLocaleString('pt-BR');
}

function isExpiringSoon(expiresAt: string): boolean {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const oneDayInMs = 1000 * 60 * 60 * 24;
    return diff < oneDayInMs;
}

export function SessionCard( { session, onLogout }: SessionCardProps ) {
    const { t } = useTranslation();
    const expiringSoon = isExpiringSoon(session.expiresAt);

    return (
        <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4'>
            <div className='flex flex-col gap-2 min-w-0'>
                <div className='flex items-center gap-2'>
                    <span className='font-medium text-gray-900 dark:text-white text-sm'>
                        {parseUserAgent(session.userAgent)}
                    </span>
                    {expiringSoon && (
                        <span className='px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'>
                            {t('sessions.expiringSoon')}
                        </span>
                    )}
                </div>

                <div className='flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400'>
                    <span>
                        <span className='font-medium text-gray-600 dark:text-gray-300'>{t('sessions.ip')}: </span>
                        {session.ipAddress ?? '—'}
                    </span>
                    <span>
                        <span className='font-medium text-gray-600 dark:text-gray-300'>{t('sessions.createdAt')}: </span>
                        {formatDate(session.createdAt)}
                    </span>
                    <span>
                        <span className='font-medium text-gray-600 dark:text-gray-300'>{t('sessions.expiresAt')}: </span>
                        {formatDate(session.expiresAt)}
                    </span>
                </div>
            </div>
            <button
                onClick={() => onLogout(session.id)}
                className='shrink-0 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-colors'
            >
                {t('sessions.terminate')}
            </button>
        </div>
    );
}