# Natal Solidário Pet (versão 2D, animação de verdade)

Reels vertical (1080×1920, 30 fps, 88,5 s) no estilo de desenho 2D da imagem de referência: contorno marrom-escuro, cores chapadas.
Os personagens são recortes animados por malha com ossos (cada um respira, pisca, mexe a cabeça, as orelhas e o rabo; os pedestres caminham), não fotos com zoom.

## Estrutura
- `render/index.html`, `render/main.js`: cenas, câmera com paralaxe, chuva, efeitos, legendas e transições. `window.renderAt(t)` desenha o quadro do instante `t`.
- `render/puppet.js`: motor de animação (malha deformada por ossos em WebGL, pálpebras e lágrimas).
- `render/rigs.js`: esqueletos dos personagens, gerado por `tools/make_rigs.py` (confira com `tools/viz_rig.py`).
- `render/cut/`: personagens recortados; `render/img/`: cenários. Arte gerada no Canva (design "Natal Solidário – cenas do vídeo", páginas 27 a 46; IDs em `assets_canva.tsv`).
- `render/ui`, `render/fonts`: atalhos para os logos, ícones e fontes da versão anterior (`../render`).
- `tools/`: recorte (`cut_all.sh`, `cutout.py`, `split_pedestres.py`), grade de coordenadas (`grid.py`) e esqueletos.
- `audio/`: trilha (`music.py`), chuva e ração sintetizadas (`rain.py`, `foley.py`), efeitos do banco do earshot (`make_fx.sh`) e mixagem dos efeitos (`sfx_mix.py`).
- Créditos das músicas: `../CREDITS.md`.

## Como gerar
```bash
cd render
for w in 0 1 2; do node render_chunks.js ../out $w 3 30 5 88.5 & done; wait     # blocos de 5 s, retomável
ls ../out/c_*.mp4 | sed "s/^/file '/; s/$/'/" > ../out/lista.txt
ffmpeg -f concat -safe 0 -i ../out/lista.txt -c copy ../out/video_sem_audio.mp4

cd ../audio
bash make_fx.sh && mkdir -p sfx && python3 rain.py sfx/rain30.wav 30 && python3 foley.py kibble sfx/kibble.wav
python3 music.py music.wav 88.5 31.5 55.5 200.781      # Hope → Christmas Lullaby → Little Christmas Town
python3 sfx_mix.py sfx_times.json sfx.wav              # sfx_times.json = window.SFX da página (horários dos efeitos)
ffmpeg -i music.wav -i sfx.wav -filter_complex "amix=inputs=2:normalize=0,volume=3.7dB,alimiter=limit=0.79:attack=4:release=60:level=disabled" mix.wav   # -14 LUFS, -1,7 dBTP
ffmpeg -i ../out/video_sem_audio.mp4 -i mix.wav -c:v copy -c:a aac -b:a 192k -shortest ../out/natal_solidario_pet.mp4
```
O trecho final da terceira música é deslocado por um número inteiro de batidas (129 BPM) para os pulinhos da turma e os textos do chamado caírem no ritmo.

## Revisão do som (earshot)
`earshot critique` no vídeo final: "launch-grade", 23 de 23 métricas dentro da faixa de filmes profissionais (-14,0 LUFS, pico -1,7 dBTP, música presente o tempo todo, acentos sonoros nas grandes mudanças de imagem).
