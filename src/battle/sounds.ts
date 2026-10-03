import type { SoundName } from '@/audio/sfx';
import type { SkillFx } from '@/battle/fx';
import type { BattleEvent, SkillElement, StatusKind, TeamId } from '@/types/battle';

/** Um som e o instante em que ele toca, contado do começo do beat (ms). */
export interface Cue {
    sound: SoundName;
    at: number;
}

const ELEMENT_SOUND: Record<SkillElement, SoundName> = {
    physical: 'hit',
    fire: 'fire',
    ice: 'ice',
    lightning: 'lightning',
    nature: 'nature',
    light: 'light',
    shadow: 'shadow',
};

const GOOD_STATUS: StatusKind[] = ['atk_up', 'def_up', 'speed_up'];

/**
 * Os sons de um beat. Os tempos acompanham as animações de battle.css:
 * o golpe corpo a corpo chega no alvo perto do fim do anúncio, o projétil
 * parte aos 300 ms, e o impacto abre o beat seguinte.
 */
export function cuesOf(events: BattleEvent[], skill: SkillFx | null, playerTeam: TeamId): Cue[] {
    const cues = new Map<string, Cue>();

    // O mesmo som no mesmo instante toca uma vez só (ex.: área em três alvos).
    const add = (sound: SoundName, at = 0) => cues.set(`${sound}@${at}`, { sound, at });

    for (const event of events) {
        switch (event.type) {
            case 'turn_started':
                add(event.fury > 0 ? 'berserk' : 'round');
                break;

            case 'unit_activated':
                if (event.team === playerTeam) add('turn');
                break;

            case 'skill_used':
                if (skill?.delivery === 'melee') {
                    add('whoosh', 420);
                } else {
                    add('cast');
                    if (skill?.delivery === 'projectile') add('whoosh', 300);
                }
                break;

            case 'damage':
                add(ELEMENT_SOUND[skill?.element ?? 'physical']);
                if (skill?.delivery === 'melee') add('hit');
                if (event.critical) add('crit');
                break;

            case 'status_damage':
                add('tick');
                break;

            case 'heal':
                if (event.amount > 0) add('heal');
                break;

            case 'status_applied':
                if (event.status === 'shield') add('shield');
                else if (event.status === 'stun') add('stun', 150);
                else add(GOOD_STATUS.includes(event.status) ? 'boon' : 'bane', 150);
                break;

            case 'unit_skipped':
                add('stun');
                break;

            case 'unit_defeated':
                add('down', 250);
                break;

            case 'battle_ended':
                add(event.winner === playerTeam ? 'victory' : 'defeat', 250);
                break;

            case 'order_changed':
                add('select', 350);
                break;

            case 'surrendered':
            case 'status_expired':
            case 'statuses_changed':
                break;
        }
    }

    return [...cues.values()];
}
