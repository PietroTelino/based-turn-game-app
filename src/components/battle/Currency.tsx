import { useTranslation } from 'react-i18next';
import type { Currency } from '@/api/progression';

/** O ícone do recurso: uma moeda de ouro ou um diamante. */
export function CurrencyIcon({ currency }: { currency: Currency }) {
    return currency === 'gold' ? (
        <svg className='bt-coin' viewBox='0 0 16 16' aria-hidden='true'>
            <circle cx='8' cy='8' r='7' fill='#e7b84a' stroke='#8a6420' strokeWidth='1.2' />
            <circle cx='8' cy='8' r='4.3' fill='none' stroke='#fbe08e' strokeWidth='1' />
        </svg>
    ) : (
        <svg className='bt-coin' viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M4 2h8l3 4-7 9-7-9z' fill='#7fd0ff' stroke='#2a6c9a' strokeWidth='1.1' strokeLinejoin='round' />
            <path d='M1 6h14M5.5 2 8 6l2.5-4M8 6v9' fill='none' stroke='#d8f2ff' strokeWidth='0.8' />
        </svg>
    );
}

/** Uma quantia com o ícone: "1.200 ouro". */
export function Amount({ currency, value }: { currency: Currency; value: number }) {
    const { t, i18n } = useTranslation();

    return (
        <span className={`bt-amount bt-amount--${currency}`}>
            <CurrencyIcon currency={currency} />
            {value.toLocaleString(i18n.language)}
            <span className='bt-visually-hidden'> {t(`progression.${currency}`)}</span>
        </span>
    );
}
