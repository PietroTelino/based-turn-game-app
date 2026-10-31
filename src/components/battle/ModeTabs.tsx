import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LockMark } from '@/components/battle/TutorialLock';

export interface ModeTab {
    to: string;
    label: string;
    /** A aba está travada (falta o tutorial): continua clicável, e mostra o porquê. */
    locked?: boolean;
}

interface ModeTabsProps {
    /** O nome do grupo, para leitor de tela ("Modos do multiplayer"). */
    label: string;
    tabs: ModeTab[];
}

/**
 * As abas de um modo de jogo (Partida rápida e Campanha; Casual e Ranqueada).
 * Cada aba é uma rota: dá para voltar direto a ela e o botão de voltar do
 * navegador funciona.
 */
export function ModeTabs({ label, tabs }: ModeTabsProps) {
    const { t } = useTranslation();

    return (
        <nav className='bt-modes' aria-label={label}>
            {tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'bt-modes__tab bt-modes__tab--active' : 'bt-modes__tab')}>
                    {tab.locked && <LockMark small />}
                    {tab.label}
                    {tab.locked && <span className='bt-visually-hidden'> ({t('tutorialGate.lockedTab')})</span>}
                </NavLink>
            ))}
        </nav>
    );
}
