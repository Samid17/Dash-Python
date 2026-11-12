#!/usr/bin/env bash
# Recorta os personagens exportados do Canva (src/*.png, fundo creme liso) para ../render/cut/
set -e; S=${1:-src}; O=../render/cut
for n in caramelo_deitado caramelo_sentado_triste caramelo_farejando caramelo_cobertor caramelo_gorro caramelo_pe gato_rua mao_petisco voluntaria_abraco gato_gorro branco_gorro filhote_gorro pedestres; do
  python3 cutout.py $S/$n.png $O/$n.png
done
# o curativo tem contorno claro: força o polígono do curativo como personagem
python3 cutout.py $S/caramelo_atadura.png $O/caramelo_atadura.png --fg "606,1097;703,1082;711,1130;719,1190;724,1210;737,1252;640,1262;630,1200"
# separa os dois pedestres (componentes desconectados) em pedestre_A e pedestre_B
python3 split_pedestres.py $O/pedestres.png $O && rm $O/pedestres.png
