/**
 * A chave de tradução dos pontos que uma partida ranqueada valeu: ganhou,
 * perdeu ou ficou igual (quem perde sem ter pontos não tem o que perder).
 * Quem usa passa `count` com o valor sem sinal.
 */
export function ratingKey(change: number): string {
    return change > 0 ? 'battle.ratingUp' : change < 0 ? 'battle.ratingDown' : 'battle.ratingSame';
}

/** "2026-11" -> "novembro de 2026", no idioma da tela. */
export function seasonName(season: string, language: string): string {
    const date = new Date(`${season}-01T12:00:00Z`);

    return Number.isNaN(date.getTime()) ? season : date.toLocaleDateString(language, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
