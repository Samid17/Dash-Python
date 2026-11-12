"""Camada de efeitos do vídeo v3 (chuva sintetizada, ração sintetizada e sons do banco do earshot), alinhada aos tempos das cenas.
Uso: python3 sfx_mix.py ../v3/sfx_times.json saida.wav"""
import sys, json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
SR = 48000; T = 88.5; N = int(T * SR)
S = json.load(open(sys.argv[1])); out = np.zeros((N, 2))
def load(f):
    sr, x = wavfile.read(f); assert sr == SR, (f, sr)
    x = x.astype(np.float64) / (32768.0 if x.dtype == np.int16 else 2.0 ** 31 if x.dtype == np.int32 else 1.0)
    return x if x.ndim == 2 else np.stack([x, x], 1)
def place(f, t, db=0.0, pan=0.0, align='onset', x=None):
    x = load(f) if x is None else x
    env = np.abs(x).max(1); pk = env.max()
    off = int(np.argmax(env)) if align == 'peak' else int(np.argmax(env > pk * 10 ** (-30 / 20)))
    g = 10 ** (db / 20); l, r = np.sqrt((1 - pan) / 2) * np.sqrt(2), np.sqrt((1 + pan) / 2) * np.sqrt(2)
    s = int(t * SR) - off; a, b = max(0, s), min(N, s + len(x))
    if b <= a: return
    seg = x[a - s:b - s] * g; seg[:, 0] *= l; seg[:, 1] *= r; out[a:b] += seg
fx = lambda n: 'fx/' + n + '.wav'
# chuva: entra com a imagem, para quando a mão chega (cena 4)
rain = load('sfx/rain30.wav'); n = len(rain); tt = np.arange(n) / SR
env = np.clip(tt / 1.5, 0, 1) * np.where(tt < 25.0, 1, np.cos(np.clip((tt - 25.0) / 4.7, 0, 1) * np.pi / 2) ** 2)
place(None, 0, -11, 0, 'start', x=rain * env[:, None])
# chuva abafada lá fora na cena do cobertor (6b)
sos = butter(2, 700, 'lp', fs=SR, output='sos'); mr = sosfilt(sos, rain[:int(5.4 * SR)], axis=0); m = len(mr); tm = np.arange(m) / SR
mr *= (np.clip(tm / .8, 0, 1) * np.clip((5.4 - tm) / .8, 0, 1))[:, None]; place(None, 40.6, -13, 0, 'start', x=mr)
place(fx('hand'), S['hand'] - .05, -14, -.3)
place(fx('perk'), S['perk'], -13, .1)
for t, p in zip(S['hearts4'], ['G5', 'B5', 'D6', 'E6']): place(fx('pop_' + p), t, -15, .15)
place(fx('iris'), S['iris5'], -15, 0, 'peak')
for t, p in zip(S['logos5'], ['G5', 'D6']): place(fx('cel_' + p), t, -12, -.2 if p == 'G5' else .3)
place('sfx/kibble.wav', S['pour6a'], -9, .35)
for t, p in zip(S['hearts6a'], ['G5', 'Bb5', 'D6']): place(fx('pop_' + p), t, -16, .25)
for t, p in zip(S['hearts6c'], ['G5', 'Bb5', 'D6']): place(fx('pop_' + p), t, -16, .25)
place(fx('iris'), S['iris8'], -15, 0, 'peak')
for t, p in zip(S['cta8'], ['Ab5', 'C6', 'Eb6']): place(fx('popin'), t, -14, 0); place(fx('glock_' + p), t, -13, 0)
pit = ['Ab5', 'C6', 'Eb6']
for i, (t, cx) in enumerate(zip(S['fireworks'], S['fwx'])):
    pan = float(np.clip((cx - 540) / 540 * .7, -.7, .7)); dim = 0 if t < 72.5 else -6
    place(fx('launch'), t - .5, -22 + dim, pan * .6)
    place(fx(('shim_' if i % 2 == 0 else 'shimB_') + pit[i % 3]), t, -15 + dim, pan, 'peak')
place(fx('title'), S['title10'] + .15, -10, 0, 'peak')
place(fx('cel_Eb6'), S['logos10'], -13, .2)
for t in S['rows11']: place(fx('rowpop'), t, -15, 0)
# acentos suaves nas grandes mudanças de imagem (detectadas pelo earshot) e grave sob as revelações
place(fx('shim_G5'), 31.6, -16, 0, 'peak')                    # círculo abre a manhã no abrigo
place(fx('cel_D6'), 41.0, -17, .2); place(fx('cel_G5'), 45.5, -17, -.2)   # cobertor / veterinária
place(fx('notify_Ab5'), 80.5, -15, 0)                          # tela final
place(fx('sub_soft'), 55.62, -9, 0, 'peak'); place(fx('sub_soft'), S['title10'] + .15, -8, 0, 'peak')
pk = np.abs(out).max(); print('pico da camada', round(20 * np.log10(pk + 1e-12), 1), 'dBFS')
wavfile.write(sys.argv[2], SR, (np.clip(out, -1, 1) * 32767).astype(np.int16)); print(sys.argv[2])
