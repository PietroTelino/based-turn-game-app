import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '@/api/audit';
import type { AuditLog } from '@/types';
import { useTranslation } from 'react-i18next';

interface Filters {
    action: string,
    entity: string,
}

const LIMIT = 15;

export function useAuditLogs() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({ action: '', entity: '' });

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAuditLogs({
                ...(filters.action && { action: filters.action }),
                ...(filters.entity && { entity: filters.entity }),
                limit: LIMIT,
                offset,
            });
            setLogs(data.data);
            setTotal(data.pagination.total);
        } catch {
            setError(t('errors.genericError'));
        } finally {
            setIsLoading(false);
        }
    }, [filters, offset, t]);

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs]);

    function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
        setOffset(0);
    }

    function handleClearFilters() {
        setFilters({ action: '', entity: '' });
        setOffset(0);
    }

    const totalPages = Math.ceil(total / LIMIT);
    const currentPage = Math.min(Math.floor(offset / LIMIT) + 1, totalPages || 1);

    function goToPage(page: number) {
        setOffset((page - 1) * LIMIT);
    }

    return {
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
    };
}