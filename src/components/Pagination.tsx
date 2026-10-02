import { useTranslation } from 'react-i18next';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const { t } = useTranslation();

    if (totalPages <= 1) return null;

    return (
        <div className='flex items-center justify-between text-sm text-gray-600 dark:text-gray-400'>
            <span>
                {t('pagination.page', { current: currentPage, total: totalPages })}
            </span>
            <div className='flex items-center gap-1'>
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className='px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed'
                >
                    «
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className='px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed'
                >
                    ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                        return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                        );
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                        if (idx > 0) {
                            const prev = arr[idx - 1];
                            if (prev !== undefined && page - prev > 1) {
                                acc.push('ellipsis');
                            }
                        }
                        acc.push(page);
                        return acc;
                    }, [])
                    .map((item, idx) =>
                        item === 'ellipsis' ? (
                            <span key={`ellipsis-${idx}`} className='px-2 py-1 text-gray-400'>
                                ...
                            </span>
                        ) : (
                            <button
                                key={item}
                                onClick={() => onPageChange(item)}
                                className={`
                                    px-3 py-1 rounded border text-sm
                                    ${item === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300'}
                                `}
                            >
                                {item}
                            </button>
                        )
                    )}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className='px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed'
                >
                    ›    
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className='px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed'
                >
                    »
                </button>
            </div>
        </div>
    );
}