"""Efeitos sonoros sintetizados, alinhados à linha do tempo (render/timeline.js).
Uso: python3 sfx.py fireworks.json saida.wav"""
import json, sys, os, re
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.loads(re.sub(r"^window\.TL=|;\s*$", "", open(os.path.join(HERE, "render", "timeline.js")).read().strip()))
S = TL["scenes"]; TOTAL = TL["total"]
FW = json.load(open(sys.argv[1]))["fireworks"]
out = np.zeros((int((TOTAL + 2) * SR), 2), dtype=np.float32)
rng = np.random.default_rng(5)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= len(out): return
    sig = sig[: len(out) - i] * gain
    out[i:i + len(sig), 0] += sig * np.sqrt((1 - pan) / 2) * 1.414
    out[i:i + len(sig), 1] += sig * np.sqrt((1 + pan) / 2) * 1.414

def env(n, a=0.004, d=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a)
    if d: e *= np.exp(-t / d)
    return e

def beep(f=1000, dur=.11):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, .005) * np.minimum(1, (dur - t) / .02)

def pop():
    n = int(.09 * SR); t = np.arange(n) / SR
    f = 900 * np.exp(-t * 18) + 250
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .03)

def ding(f=1318.5, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dcy) for m, a, dcy in [(1, 1, 2.5), (2.76, .45, 5), (5.4, .2, 9), (2, .25, 4)])
    return s * env(n, .002) / 1.6

def thud():
    n = int(.25 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (140 * np.exp(-t * 8) + 60) * t) * np.exp(-t * 14)
    click = rng.standard_normal(n) * np.exp(-t * 120) * .3
    return (body + click) * .9

def tick():
    n = int(.02 * SR); t = np.arange(n) / SR
    s = sosfilt(butter(2, 3000, 'hp', fs=SR, output='sos'), rng.standard_normal(n))
    return s * np.exp(-t * 300) * .5

def whoosh(dur=.5):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    parts = []
    for k in range(10):
        seg = slice(k * n // 10, (k + 1) * n // 10)
        fc = 400 + 3500 * (k / 9) ** 1.5
        parts.append(sosfilt(butter(2, [fc * .7, fc * 1.3], 'bp', fs=SR, output='sos'), noise)[seg])
    s = np.concatenate(parts)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return s * e * 1.4

def boom():
    n = int(1.6 * SR); t = np.arange(n) / SR
    low = sosfilt(butter(2, 220, 'lp', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t * 4) * 6
    crack = np.zeros(n)
    for _ in range(70):
        j = int(rng.uniform(.08, 1.3) * SR); k = int(.004 * SR)
        if j + k < n: crack[j:j + k] += rng.standard_normal(k) * rng.uniform(.1, .5) * np.exp(-np.arange(k) / (.0015 * SR))
    crack = sosfilt(butter(2, 1800, 'hp', fs=SR, output='sos'), crack) * np.exp(-t * 1.6)
    return (low + crack * 1.5) * .6

def whistle():
    n = int(.5 * SR); t = np.arange(n) / SR
    f = 900 + 1400 * t / .5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .5) * .12

# --- cena 4: logo e contador
a, b = S["s4"]; d = b - a
add(pop(), a + d * .26, .35); add(ding(1568), a + d * .86, .22)
# --- cena 5: etiquetas
a, b = S["s5"]; d = b - a
for i in range(5): add(pop(), a + i * d / 5 + .1, .16, (-.3, .3, -.2, .2, 0)[i])
# --- cena 6: monitor cardíaco
a, b = S["s6"]; per = 60 / 72; k = 0
while a + k * per < b - .3:
    add(beep(), a + k * per + .02, .07, .3); k += 1
# --- cena 8: o que doar + calendário
a, b = S["s8"]; d = b - a; cut = d * .55
add(pop(), a + .15, .3)
for i in range(3): add(pop(), a + .55 + i * .2, .2, (-.5, 0, .5)[i])
add(whoosh(.45), a + cut - .3, .15); add(ding(1318.5), a + cut + .25, .25); add(pop(), a + d * .8, .25)
# --- cena 9: maquete + van
a, b = S["s9"]; d = b - a; cut = d * .52
add(pop(), a + .35, .35); add(pop(), a + .8, .25)
add(whoosh(.45), a + cut - .3, .14); add(pop(), a + cut + .3, .25); add(pop(), a + cut + .55, .2)
# --- cena 10: PIX no celular
a, b = S["s10"]; d = b - a
add(pop(), a + .1, .28)
for i in range(18): add(tick(), a + .6 + 1.3 * (i + 1) / 18, .5, rng.uniform(-.3, .3))
add(ding(1760), a + 2.0, .2)
# --- cena 12: fogos
for bt in FW:
    if bt > S["s13"][0] - .3: continue
    pan = rng.uniform(-.6, .6)
    add(whistle(), bt - .5, .5, pan); add(boom(), bt, .30, pan)
# --- cena 13: brilho final
a, b = S["s13"]
add(ding(1046.5, 2.5), a + .15, .18); add(ding(1568, 2.5), a + .35, .14)

out = out[: int(TOTAL * SR)]
peak = np.abs(out).max(); print("pico sfx", round(float(peak), 3))
if peak > .95: out *= .95 / peak
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16))
print("ok", sys.argv[2])
