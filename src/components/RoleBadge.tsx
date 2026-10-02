import type { User } from '@/types';

const styles: Record<User['role'], string> = {
    god: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
    administrator: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
    user: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

export function RoleBadge({ role }: { role: User['role'] }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[role]}`}>
            {role}
        </span>
    );
};