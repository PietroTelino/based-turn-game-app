import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { grantResources } from '@/api/progression';
import { CurrencyIcon } from '@/components/battle/Currency';
import { useToast } from '@/contexts/ToastContext';
import { refreshProgression } from '@/hooks/useProgression';

/** Administrador: dá (ou tira, com número negativo) ouro e diamantes de um jogador. */
export function GrantResourcesDialog({ user, onClose }: { user: { id: string; name: string } | null; onClose: () => void }) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const ref = useRef<HTMLDialogElement>(null);
    const [gold, setGold] = useState('0');
    const [diamonds, setDiamonds] = useState('0');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) return;
        if (user && !dialog.open) {
            setGold('0');
            setDiamonds('0');
            dialog.showModal();
        }
        if (!user && dialog.open) dialog.close();
    }, [user]);

    async function save() {
        if (!user) return;

        setIsSaving(true);

        try {
            await grantResources(user.id, Math.trunc(Number(gold) || 0), Math.trunc(Number(diamonds) || 0));
            showToast(t('grant.success', { name: user.name }), 'success');
            void refreshProgression();
            onClose();
        } catch {
            showToast(t('errors.genericError'), 'error');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <dialog
            ref={ref}
            className='ui-dialog'
            aria-labelledby='grant-title'
            onCancel={(event) => {
                event.preventDefault();
                if (!isSaving) onClose();
            }}
        >
            <div className='ui-dialog__box'>
                <h2 id='grant-title' className='ui-dialog__title'>
                    {t('grant.title', { name: user?.name ?? '' })}
                </h2>
                <p className='ui-dialog__text'>{t('grant.text')}</p>
                <div className='ui-grant'>
                    {(
                        [
                            ['gold', gold, setGold],
                            ['diamonds', diamonds, setDiamonds],
                        ] as const
                    ).map(([currency, value, set]) => (
                        <label key={currency} className='ui-grant__field'>
                            <CurrencyIcon currency={currency} />
                            <span>{t(`progression.${currency}`)}</span>
                            <input type='number' step={1} value={value} onChange={(e) => set(e.target.value)} />
                        </label>
                    ))}
                </div>
                <div className='ui-dialog__buttons'>
                    <button type='button' className='ui-dialog__button' disabled={isSaving} onClick={onClose}>
                        {t('grant.cancel')}
                    </button>
                    <button type='button' className='ui-dialog__button ui-dialog__button--primary' disabled={isSaving} onClick={save}>
                        {t('grant.confirm')}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
