#!/usr/bin/env bash
#
# Publica uma versão do site na máquina. Quem roda é o GitHub Actions
# (.github/workflows/deploy.yml): ele copia o pacote e este script para a
# máquina e executa, pelo SSH, como o usuário "btg":
#
#   bash deploy-app.sh /tmp/pacote.tgz 20261007120000-abc1234
#
# O pacote é a pasta dist que o "npm run build" gerou. O nginx serve a pasta
# para onde o link "current" aponta, então a troca de versão é instantânea.
set -euo pipefail

TARBALL="${1:?Informe o pacote (.tgz)}"
RELEASE_ID="${2:?Informe o identificador da versão}"

# O caminho pode ser trocado pelo ambiente; é o que os testes do script usam.
WEB_DIR="${BTG_WEB_DIR:-/var/www/based-turn-game}"
KEEP=3                       # quantas versões ficam guardadas na máquina

RELEASE="$WEB_DIR/releases/$RELEASE_ID"
SWITCHED=0

# Se algo falhar antes da troca, o site que está no ar continua como estava.
cleanup() {
    local status=$?
    rm -f "$TARBALL"
    if [[ $status -ne 0 && $SWITCHED -eq 0 ]]; then
        rm -rf "$RELEASE"
        echo "Deploy interrompido: o site que estava no ar não foi alterado." >&2
    fi
}
trap cleanup EXIT

rm -rf "$RELEASE"
mkdir -p "$RELEASE"
tar -xzf "$TARBALL" -C "$RELEASE"

[[ -f "$RELEASE/index.html" ]] || { echo "O pacote não tem index.html: o build falhou?" >&2; exit 1; }

# O nginx roda com outro usuário e precisa conseguir ler tudo.
chmod -R a+rX "$RELEASE"

ln -sfn "$RELEASE" "$WEB_DIR/current.new"
mv -T "$WEB_DIR/current.new" "$WEB_DIR/current"
SWITCHED=1

# Guarda só as últimas versões (os nomes começam pela data, então a ordem
# alfabética é a ordem do tempo). A que está no ar nunca é apagada.
CURRENT="$(readlink -f "$WEB_DIR/current")"
# A página "servidor pronto" que o setup deixou não é mais necessária.
rm -rf "${WEB_DIR:?}/releases/inicial"
ls -1 "$WEB_DIR/releases" | sort | head -n -"$KEEP" | while read -r old; do
    [[ "$WEB_DIR/releases/$old" == "$CURRENT" ]] || rm -rf "${WEB_DIR:?}/releases/$old"
done

printf '\n==> Pronto: o site está no ar na versão %s\n' "$RELEASE_ID"
