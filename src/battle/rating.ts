/**
 * A chave de tradução dos pontos que uma partida ranqueada valeu: ganhou,
 * perdeu ou ficou igual (quem perde sem ter pontos não tem o que perder).
 * Quem usa passa `count` com o valor sem sinal.
 */
export function ratingKey(change: number): string {
    return change > 0 ? 'battle.ratingUp' : change < 0 ? 'battle.ratingDown' : 'battle.ratingSame';
}
