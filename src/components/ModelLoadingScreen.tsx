import { useTranslation } from 'react-i18next';
import type { LoadProgress } from '@/battle/assets3d';

const MB = 1024 * 1024;

/** A tela entre o login e o jogo, enquanto os personagens 3D baixam e são montados. */
export function ModelLoadingScreen({ progress }: { progress: LoadProgress }) {
    const { t } = useTranslation();
    const { done, total, loaded, bytes } = progress;

    // Baixar pesa mais que montar: 85% da barra é o download, o resto é a montagem.
    const downloaded = bytes ? loaded / bytes : total ? done / total : 0;
    const built = total ? done / total : 0;
    const share = Math.min(1, downloaded * 0.85 + built * 0.15);
    const percent = Math.round(share * 100);
    const downloading = !bytes || loaded < bytes;

    return (
        <main className="model-loading" aria-busy="true">
            <section className="model-loading__card">
                <h1 className="model-loading__title">{t('modelLoading.title')}</h1>
                <p className="model-loading__lead">{t('modelLoading.lead')}</p>

                <div
                    className="model-loading__bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={t('modelLoading.title')}
                >
                    <span className="model-loading__fill" style={{ transform: `scaleX(${share})` }} />
                </div>

                <div className="model-loading__status">
                    <span>
                        {downloading
                            ? bytes
                                ? t('modelLoading.downloading', { loaded: Math.round(loaded / MB), total: Math.round(bytes / MB) })
                                : t('modelLoading.starting')
                            : t('modelLoading.building', { done, total })}
                    </span>
                    <strong>{percent}%</strong>
                </div>

                <p className="model-loading__note">{t('modelLoading.note')}</p>
            </section>
        </main>
    );
}
