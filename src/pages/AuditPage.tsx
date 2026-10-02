import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Pagination } from '@/components/Pagination';
import { useAuditLogs } from '@/hooks/useAuditLogs';

export function AuditPage() {
    const { t } = useTranslation();
    const {
        logs,
        total,
        isLoading,
        error,
        filters,
        currentPage,
        totalPages,
        handleFilterChange,
        handleClearFilters,
        goToPage,
    } = useAuditLogs();

    const hasFilters = !!filters.action || !!filters.entity;

    const ACTION_OPTIONS = [
        { value: '', label: t('audit.filters.allActions') },
        { value: 'USER_REGISTER', label: t('audit.actions.USER_REGISTER') },
        { value: 'USER_LOGIN', label: t('audit.actions.USER_LOGIN') },
        { value: 'USER_LOGOUT', label: t('audit.actions.USER_LOGOUT') },
        { value: 'USER_LOGOUT_ALL', label: t('audit.actions.USER_LOGOUT_ALL') },
        { value: 'USER_CREATE', label: t('audit.actions.USER_CREATE') },
        { value: 'USER_UPDATE', label: t('audit.actions.USER_UPDATE') },
        { value: 'USER_DELETE', label: t('audit.actions.USER_DELETE') },
        { value: 'USER_INACTIVATE', label: t('audit.actions.USER_INACTIVATE') },
        { value: 'USER_REACTIVATE', label: t('audit.actions.USER_REACTIVATE') },
        { value: 'PASSWORD_CHANGE', label: t('audit.actions.PASSWORD_CHANGE') },
        { value: 'PASSWORD_RESET_REQUEST', label: t('audit.actions.PASSWORD_RESET_REQUEST') },
        { value: 'PASSWORD_RESET_CONFIRM', label: t('audit.actions.PASSWORD_RESET_CONFIRM') },
        { value: 'PASSWORD_ADMIN_RESET', label: t('audit.actions.PASSWORD_ADMIN_RESET') },
        { value: 'PREFERENCES_UPDATE', label: t('audit.actions.PREFERENCES_UPDATE') },
        { value: 'SESSION_LOGOUT', label: t('audit.actions.SESSION_LOGOUT') },
    ];

    const ENTITY_OPTIONS = [
        { value: '', label: t('audit.filters.allEntities') },
        { value: 'USER', label: t('audit.entities.USER') },
        { value: 'PASSWORD', label: t('audit.entities.PASSWORD') },
        { value: 'PREFERENCES', label: t('audit.entities.PREFERENCES') },
        { value: 'SESSION', label: t('audit.entities.SESSION') },
    ];

    return (
        <Layout title="Auditoria">
            <div className='flex flex-col gap-6'>
                <div>
                    <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>{t('audit.title')}</h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                        {t('audit.count', { count: total })}
                    </p>
                </div>
                <div className='flex items-center gap-3 flex-wrap'>
                    <select
                        name='action'
                        value={filters.action}
                        onChange={handleFilterChange}
                        className='text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500'
                    >
                        {ACTION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <select
                        name='entity'
                        value={filters.entity}
                        onChange={handleFilterChange}
                        className='text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500'
                    >
                        {ENTITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    {hasFilters && (
                        <button
                            onClick={handleClearFilters}
                            className='text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline'
                        >
                            {t('audit.clearFilters')}
                        </button>
                    )}
                </div>
                {isLoading && (
                    <div className='text-sm text-gray-500 dark:text-gray-400'>{t('audit.loading')}</div>
                )}
                {error && (
                    <div className='px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg'>
                        <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className='flex flex-col gap-4'>
                        <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('audit.table.date')}</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('audit.table.action')}</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('audit.table.entity')}</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('audit.table.user')}</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('audit.table.performedBy')}</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('audit.table.ip')}</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                                    {logs.map((log) => (
                                        <tr key={log.id} className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                                            <td className='px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                                            </td>
                                            <td className='px-4 py-3'>
                                                <span className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono'>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className='px-4 py-3 text-gray-600 dark:text-gray-400'>{log.entity}</td>
                                            <td className='px-4 py-3'>
                                                {log.user ? (
                                                    <div className='flex flex-col'>
                                                        <span className='font-medium text-gray-800 dark:text-gray-200'>{log.user.name}</span>
                                                        <span className='text-xs text-gray-400 dark:text-gray-500'>{log.user.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className='text-gray-400'>—</span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3 text-gray-600'>
                                                {log.performedBy ? (
                                                    <div className='flex flex-col'>
                                                        <span className='font-medium text-gray-800 dark:text-gray-200'>{log.performedBy.name}</span>
                                                        <span className='text-xs text-gray-400 dark:text-gray-500'>{log.performedBy.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className='text-gray-400'>—</span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs'>
                                                {log.ipAddress ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {logs.length === 0 && (
                                <div className='px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500'>
                                    {t('audit.noLogs')}
                                </div>
                            )}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                        />
                    </div>
                )}
            </div>
        </Layout>
    );
}