"""Importa os clipes animados (Imagem para vídeo do Canva) para o motor de montagem.
Uso: python3 import_clips.py <pasta_com_mp4>
Os arquivos devem se chamar pNN.mp4, onde NN é o número da página no design
"Natal Solidário – cenas do vídeo" (01 a 24). Páginas sem vídeo são ignoradas
(a cena continua usando a imagem parada com movimento de câmera)."""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = ['n01', 's01b', 's02', 'n02', 's03a', 's03b', 's04', 's05a', 's05c', 's05b', 's05d', 's06',
         's07off', 'n08a', 'n08b', 'n09', 's09', 'n10', 's11a', 's11b', 's11c', 'n11', 's12', 'n13']
src = sys.argv[1]
clips = {}
for i, name in enumerate(PAGES, 1):
    f = os.path.join(src, f'p{i:02d}.mp4')
    if not os.path.exists(f):
        continue
    out = os.path.join(HERE, 'render', 'clips', name)
    os.makedirs(out, exist_ok=True)
    for old in os.listdir(out):
        os.remove(os.path.join(out, old))
    # preenche 1080x1920 (corta excesso), 30 fps
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-vf',
                    'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
                    '-q:v', '3', os.path.join(out, '%04d.jpg')], check=True)
    n = len([x for x in os.listdir(out) if x.endswith('.jpg')])
    clips[name] = {'n': n, 'fps': 30}
    print(f'p{i:02d} -> {name}: {n} quadros')
open(os.path.join(HERE, 'render', 'clips.js'), 'w').write('window.CLIPS = ' + json.dumps(clips) + ';\n')
print('clips.js com', len(clips), 'clipes')
