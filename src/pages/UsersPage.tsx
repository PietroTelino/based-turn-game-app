import { Layout } from '@/components/Layout';
import { ActiveUsersTab } from '@/components/users/ActiveUsersTab';
import { DeletedUsersTab } from '@/components/users/DeletedUsersTab';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Tab = 'active' | 'deleted';

export function UsersPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('active');

    return (
        <Layout title={t('nav.users')}>
            <div className='flex flex-col gap-6'>
                <div className='flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit'>
                    {([
                        { key: 'active', label: t('users.tabs.active') },
                        { key: 'deleted', label: t('users.tabs.deleted') },
                    ] as { key: Tab; label: string }[]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`
                                px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                                ${activeTab === tab.key
                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {activeTab === 'active' ? <ActiveUsersTab /> : <DeletedUsersTab />}
            </div>
        </Layout>
    );
}