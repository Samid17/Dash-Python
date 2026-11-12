"""Efeitos sintetizados: kibble (ração caindo na tigela de metal) e fogos ao longe. Uso: python3 foley.py kibble|fireworks saida.wav"""
import sys, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; kind, out = sys.argv[1], sys.argv[2]; rng = np.random.default_rng(11)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bp', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lp', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'hp', fs=SR, output='sos'), x)
if kind == 'kibble':
    dur = 2.2; n = int(dur * SR); L = np.zeros(n); R = np.zeros(n)
    modes = [(1120, 9), (2350, 14), (3870, 20), (5230, 28)]   # tigela de metal
    count = 260; ts = np.sort(rng.beta(2.0, 3.2, count) * 1.5 + 0.05)
    for t in ts:
        s = int(t * SR); m = int(0.06 * SR); tt = np.arange(m) / SR
        click = hp(rng.standard_normal(m), 1800) * np.exp(-tt * 900) * 0.6          # grão batendo
        ring = sum(np.sin(2 * np.pi * f * (1 + rng.uniform(-.01, .01)) * tt) * np.exp(-tt * d * 6) * rng.uniform(.05, .2) for f, d in modes)
        g = (click + ring * 0.35) * rng.lognormal(-1.0, 0.5); p = rng.uniform(-.5, .5); e = min(n, s + m)
        L[s:e] += g[:e - s] * np.sqrt((1 - p) / 2); R[s:e] += g[:e - s] * np.sqrt((1 + p) / 2)
    # chiado de grãos rolando
    roll = bp(rng.standard_normal(n), 2500, 9000) * np.interp(np.arange(n) / SR, [0, .1, .9, 1.6, dur], [0, .05, .06, 0, 0])
    L += roll; R += roll
else:
    dur = 7.0; n = int(dur * SR); L = np.zeros(n); R = np.zeros(n)
    tail = rng.standard_normal(int(2.5 * SR)) * np.exp(-np.arange(int(2.5 * SR)) / SR * 2.2); tail = lp(tail, 3000)  # eco de cidade
    for b, t0 in enumerate([0.6, 1.9, 2.7, 4.0, 5.0]):
        p = rng.uniform(-.6, .6)
        # subida: assobio/chiado ascendente
        ml = int(0.8 * SR); tl = np.arange(ml) / SR
        hiss = bp(rng.standard_normal(ml), 2000, 6000) * (tl / 0.8) ** 2 * 0.08
        whist = np.sin(2 * np.pi * np.cumsum(900 + 1200 * tl / 0.8) / SR) * (tl / 0.8) ** 1.5 * 0.03
        s0 = int((t0 - 0.8) * SR)
        if s0 > 0:
            L[s0:s0 + ml] += (hiss + whist) * np.sqrt((1 - p) / 2); R[s0:s0 + ml] += (hiss + whist) * np.sqrt((1 + p) / 2)
        # estouro: ataque suavizado pela distância + corpo grave
        m = int(2.8 * SR); tt = np.arange(m) / SR; att = 1 - np.exp(-tt / 0.012)
        boom = lp(rng.standard_normal(m), 220, 2) * att * np.exp(-tt * 2.0) * 4 + lp(rng.standard_normal(m), 900, 2) * att * np.exp(-tt * 6) * 1.2
        crack = np.zeros(m)
        for _ in range(45):
            j = int(rng.uniform(.25, 2.2) * SR); k = int(.004 * SR)
            if j + k < m: crack[j:j + k] += rng.standard_normal(k) * rng.uniform(.05, .35) * np.exp(-np.arange(k) / (.0015 * SR))
        crack = bp(crack, 2000, 8000) * np.exp(-tt * 0.9)
        g = boom + crack; wet = np.convolve(g, tail)[:m] * 0.004; g = lp(g * 0.7 + wet, 6000)
        s = int(t0 * SR); e = min(n, s + m); amp = rng.uniform(.6, 1.0)
        L[s:e] += amp * g[:e - s] * np.sqrt((1 - p) / 2); R[s:e] += amp * g[:e - s] * np.sqrt((1 + p) / 2)
st = np.stack([L, R], 1); st /= np.abs(st).max() / 0.7
wavfile.write(out, SR, (st * 32767).astype(np.int16)); print(out)
