import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** O que aparece no lugar de uma partida enquanto o jogador não fez o tutorial. */
export function TutorialLock() {
    const { t } = useTranslation();

    return (
        <section className='bt-panel bt-lock'>
            <LockMark />
            <div className='bt-lock__body'>
                <h3 className='bt-subtitle'>{t('tutorialGate.lockedTitle')}</h3>
                <p className='bt-panel__text'>{t('tutorialGate.lockedText')}</p>
                <Link to='/play/tutorial' className='bt-btn'>
                    {t('tutorialGate.goToTutorial')}
                </Link>
            </div>
        </section>
    );
}

/** Um cadeado. Sozinho, é decorativo; pequeno, marca as abas travadas. */
export function LockMark({ small = false }: { small?: boolean }) {
    return (
        <svg viewBox='0 0 24 24' className={small ? 'bt-lock__icon bt-lock__icon--small' : 'bt-lock__icon'} aria-hidden='true'>
            <path d='M7 10.5V7.8a5 5 0 0 1 10 0v2.7' fill='none' strokeWidth='2.4' strokeLinecap='round' />
            <rect x='4.5' y='10.5' width='15' height='11' rx='2.2' />
            <circle cx='12' cy='15.4' r='1.7' className='bt-lock__keyhole' />
            <path d='M12 16.4v2.4' strokeWidth='1.8' strokeLinecap='round' className='bt-lock__keyhole' />
        </svg>
    );
}
