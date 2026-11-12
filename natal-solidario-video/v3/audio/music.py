"""Monta a trilha a partir de trechos escolhidos com o earshot. Uso: python3 music.py saida.wav total tA_end tB_end [fimC]
A = Hope (Yakov Golman) de 0 s; B = Christmas Lullaby (Blik) de 0 s; C = Little Christmas Town (Lobashkov): o instante fimC da faixa cai no fim do vídeo (padrão 211 s)."""
import sys, subprocess, numpy as np
from scipy.io import wavfile
SR = 48000; out = sys.argv[1]; total, tA, tB = map(float, sys.argv[2:5]); endC = float(sys.argv[5]) if len(sys.argv) > 5 else 211.0
def load(path, start, dur, lufs_gain):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur), '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64); return x * 10 ** (lufs_gain / 20)
def place(buf, x, at, fin, fout):
    n = len(x); fi = int(fin * SR); fo = int(fout * SR); env = np.ones(n)
    if fi: env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    if fo: env[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    s = int(at * SR); e = min(len(buf), s + n); buf[s:e] += (x * env[:, None])[:e - s]
buf = np.zeros((int(total * SR) + SR, 2))
X = 2.5  # crossfade
# ganhos para ~-18 LUFS cada (medidos com o earshot: Hope -17.0, Lullaby -13.8, Town -7.6)
A = load('music/hope_yakov_golman.mp3', 0, tA + X, -1.0); place(buf, A, 0, 1.2, X)
B = load('music/christmas_lullaby_blik.mp3', 0, tB - tA + X, -4.2); place(buf, B, tA - X / 2, X, X)
lenC = total - tB + X / 2; startC = endC - lenC
C = load('music/little_xmas_town.mp3', max(0, startC), lenC, -10.4); place(buf, C, tB - X / 2, X, 1.6)
buf = buf[:int(total * SR)]
pk = np.abs(buf).max(); print('pico', round(20 * np.log10(pk), 1), 'dBFS')
if pk > 0.89: buf *= 0.89 / pk
wavfile.write(out, SR, (buf * 32767).astype(np.int16)); print(out, total, 's')
