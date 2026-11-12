"""Chuva sintetizada (rua à noite): leito de ruído + milhares de gotas + respingos maiores. Uso: python3 rain.py saida.wav dur [intensidade]"""
import sys, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; out = sys.argv[1]; dur = float(sys.argv[2]); inten = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
rng = np.random.default_rng(7); n = int(dur * SR)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bp', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lp', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'hp', fs=SR, output='sos'), x)
L = np.zeros(n); R = np.zeros(n)
# 1) leito: ruído rosa aproximado, filtrado, com leve modulação lenta
for ch in (L, R):
    w = rng.standard_normal(n); pink = lp(w, 900, 1) * 0.9 + bp(w, 300, 2500, 2) * 0.8 + bp(w, 2500, 6000, 2) * 0.25 + lp(w, 250, 2) * 0.5
    mod = 1 + 0.12 * np.sin(2 * np.pi * 0.07 * np.arange(n) / SR + rng.uniform(0, 6)) + 0.05 * lp(rng.standard_normal(n), 2, 1) * 40
    ch += pink * mod * 0.30
# 2) gotas: rajadas curtas filtradas em frequências aleatórias
rate = 450 * inten; cnt = int(rate * dur)
t0 = rng.uniform(0, dur, cnt); f0 = np.exp(rng.uniform(np.log(700), np.log(4500), cnt)); amp = rng.lognormal(-1.9, 0.6, cnt); pan = rng.uniform(-1, 1, cnt)
bank = {}
for k in range(24):  # 24 formas de gota pré-filtradas para velocidade
    fc = np.exp(np.log(700) + (np.log(4500) - np.log(700)) * k / 23); m = int(0.02 * SR)
    g = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0035 * SR)); bank[k] = bp(g, fc * 0.6, min(fc * 1.6, 20000), 2)
for i in range(cnt):
    k = int(np.clip((np.log(f0[i]) - np.log(700)) / (np.log(4500) - np.log(700)) * 23, 0, 23)); g = bank[k] * amp[i]
    s = int(t0[i] * SR); e = min(n, s + len(g)); seg = g[:e - s]
    L[s:e] += seg * np.sqrt((1 - pan[i]) / 2); R[s:e] += seg * np.sqrt((1 + pan[i]) / 2)
# 3) respingos maiores em poças (plinks com tom), esparsos
for i in range(int(dur * 0.6 * inten)):
    s = int(rng.uniform(0, dur) * SR); f = rng.uniform(700, 2400); m = int(0.09 * SR); tt = np.arange(m) / SR
    g = np.sin(2 * np.pi * f * tt * (1 + 0.6 * np.exp(-tt * 60))) * np.exp(-tt * 45) * rng.uniform(0.05, 0.16)
    g += hp(rng.standard_normal(m), 2500) * np.exp(-tt * 120) * 0.08
    p = rng.uniform(-0.8, 0.8); e = min(n, s + m)
    L[s:e] += g[:e - s] * np.sqrt((1 - p) / 2); R[s:e] += g[:e - s] * np.sqrt((1 + p) / 2)
st = np.stack([L, R], 1); st = hp(st.T, 60).T
st /= np.abs(st).max() / 0.6
fade = int(0.05 * SR); st[:fade] *= np.linspace(0, 1, fade)[:, None]; st[-fade:] *= np.linspace(1, 0, fade)[:, None]
wavfile.write(out, SR, (st * 32767).astype(np.int16)); print(out, dur, 's')
