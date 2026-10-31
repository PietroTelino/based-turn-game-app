import { NavLink } from 'react-router-dom';

export interface ModeTab {
    to: string;
    label: string;
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
    return (
        <nav className='bt-modes' aria-label={label}>
            {tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'bt-modes__tab bt-modes__tab--active' : 'bt-modes__tab')}>
                    {tab.label}
                </NavLink>
            ))}
        </nav>
    );
}
