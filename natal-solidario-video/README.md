# Vídeo "Natal Solidário" — Dog Sweet Home × ASPAN

Reels vertical (1080×1920, 30 fps, cerca de 92 s) montado quadro a quadro a partir de imagens 3D geradas no Canva.

## Estrutura
- `render/index.html`, `render/main.js`: motor de animação. `window.renderAt(t)` desenha o quadro do instante `t`.
- `render/timeline.js`: tempos das cenas e das legendas, gerados por `make_timeline.py`.
- `render/pos.js`: posições dos elementos sobre as imagens (logo, brilhos, monitor).
- `render/img/`: imagens das cenas exportadas do Canva (design "Natal Solidário – cenas do vídeo"; os IDs estão em `images_pro.tsv`).
- `render/ui/`: logos recortados e elementos tirados do card da campanha.
- `music/compose.py`: trilha original (piano melancólico que vira *Jingle Bells*, música de domínio público), renderizada com FluidSynth e FluidR3_GM.
- `sfx.py`: efeitos sonoros sintetizados (monitor cardíaco, fogos, transições).
- `narracao_natal_solidario.md`: texto da narração para gravar.

## Como gerar
```bash
python3 make_timeline.py guide                      # ou: voice <tempos.json>
(cd render && node fwtimes.js > ../fw.json)
python3 sfx.py fw.json sfx.wav
(cd music && python3 compose.py track.mid $(cat ../music_bounds.txt) && \
  fluidsynth -ni -g 0.8 -r 48000 -F track.wav /usr/share/sounds/sf2/FluidR3_GM.sf2 track.mid)
(cd render && node render.js 0 92 ../out/video.mp4 30)
```
Depois junte vídeo, música e efeitos com o ffmpeg (`amix` + `loudnorm`).

## Clipes animados (Imagem para vídeo do Canva)
As páginas 1 a 24 do design seguem a ordem do vídeo, e as notas de cada página têm o texto de movimento.
Exporte cada página animada como MP4 com o nome `pNN.mp4` e rode:
```bash
python3 import_clips.py <pasta_com_os_mp4>
```
O motor passa a usar o clipe no lugar da imagem parada (`render/clips.js`).
