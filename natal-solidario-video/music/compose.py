"""Trilha original: melancólica (A) -> esperança (B) -> emoção (C) -> final festivo (D, Jingle Bells, domínio público).
Uso: python3 compose.py out.mid tA tB tC tEnd   (instantes em segundos onde começam B, C, D e o fim)"""
import sys, mido

out, tB, tC, tD, tEnd = sys.argv[1], *map(float, sys.argv[2:6])
PPQ = 480
mid = mido.MidiFile(ticks_per_beat=PPQ)
events = []  # (time_sec, msg)

def note(ch, n, t0, dur, vel):
    events.append((t0, mido.Message('note_on', channel=ch, note=n, velocity=vel)))
    events.append((t0 + dur, mido.Message('note_off', channel=ch, note=n, velocity=0)))

def prog(ch, p, t=0.0):
    events.append((t, mido.Message('program_change', channel=ch, program=p)))

def cc(ch, c, v, t=0.0):
    events.append((t, mido.Message('control_change', channel=ch, control=c, value=v)))

PIANO, STR, CEL, GLK, PIZ, BELL, CHOIR = 0, 1, 2, 3, 4, 9, 5
prog(PIANO, 0); prog(STR, 49); prog(CEL, 8); prog(GLK, 9); prog(PIZ, 45); prog(CHOIR, 52)
for ch in (PIANO, STR, CEL, GLK, PIZ, CHOIR):
    cc(ch, 91, 70)  # reverb
cc(STR, 7, 88); cc(CHOIR, 7, 60); cc(PIANO, 7, 112); cc(GLK, 7, 80); cc(CEL, 7, 96)

N = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def p(name, octv):  # p('A',3) -> midi
    acc = 1 if '#' in name else (-1 if 'b' in name[1:] else 0)
    return 12*(octv+1) + N[name[0]] + acc

def fit(t0, t1, target_bpm, beats_per_bar=4):
    dur = t1 - t0
    nbars = max(1, round(dur * target_bpm / 60 / beats_per_bar))
    beat = dur / (nbars * beats_per_bar)
    return nbars, beat

# ---------- A: melancólico, Lá menor ----------
A_chords = [('A',['A','C','E']), ('F',['F','A','C']), ('C',['C','E','G']), ('G',['G','B','D']),
            ('A',['A','C','E']), ('F',['F','A','C']), ('D',['D','F','A']), ('E',['E','G#','B'])]
nb, beat = fit(0, tB, 70)
bar = 4*beat
mel_A = [None, ('E',5,2),('C',5,1),('D',5,1), ('E',5,3),('G',4,1), ('E',5,2),('D',5,2), ('B',4,4),
         ('C',5,2),('A',4,2), ('C',5,2),('E',5,2), ('D',5,3),('F',5,1), ('E',5,4)]
for b in range(nb):
    root, tones = A_chords[b % 8]
    t0 = b*bar
    fade = min(1.0, (b+1)/2)
    note(PIANO, p(root,2), t0, bar*0.98, int(62*fade))
    note(PIANO, p(root,3), t0, bar*0.98, int(48*fade))
    arp = [p(tones[0],4), p(tones[1],4), p(tones[2],4), p(tones[1],4)]*2
    for i, n in enumerate(arp):
        note(PIANO, n, t0 + i*beat/2, beat*0.9, 38 + (6 if i % 4 == 0 else 0))
    if b >= 2:
        for tn in tones:
            note(STR, p(tn,4) if tn != root else p(tn,3), t0, bar, 34 + min(14, b*2))
    # melodia esparsa a partir do 2º ciclo
    if b >= 4 and b < nb-1:
        seg = (b-4) % 8
        beats_used = 0
        mel = [('E',5,2),('D',5,2)] if seg%2==0 else [('C',5,3),('B',4,1)]
        for nm, o, d in mel:
            nn = p(nm, o)
            if root in ('E',) and nm == 'C': nn = p('B',4)
            note(PIANO, nn, t0 + beats_used*beat, d*beat*0.95, 58)
            beats_used += d

# ---------- transição: luzes acendendo (celesta ascendente) ----------
gl = [p(x,o) for x,o in [('C',5),('E',5),('G',5),('C',6),('E',6),('G',6),('C',7)]]
for i, n in enumerate(gl):
    note(CEL, n, tB + 0.3 + i*0.07, 1.4, 74)

# ---------- B: esperança, Dó maior ----------
B_chords = [('C',['C','E','G']), ('G',['G','B','D']), ('A',['A','C','E']), ('F',['F','A','C'])]
nb, beat = fit(tB, tC, 92)
bar = 4*beat
for b in range(nb):
    root, tones = B_chords[b % 4]
    t0 = tB + b*bar
    note(PIANO, p(root,2), t0, bar*0.98, 64)
    arp = [p(tones[0],4), p(tones[1],4), p(tones[2],4), p(tones[0],5)]*2
    for i, n in enumerate(arp):
        note(PIANO, n, t0 + i*beat/2, beat*0.8, 46 + (8 if i % 4 == 0 else 0))
    for tn in tones:
        note(STR, p(tn,4), t0, bar, 46)
    # pizzicato no baixo
    for k in range(4):
        note(PIZ, p(root,3) if k % 2 == 0 else p(tones[2],3), t0 + k*beat, beat*0.5, 62)
    # sininhos leves
    if b >= 1:
        for k in range(8):
            note(BELL, 83, t0 + k*beat/2, 0.1, 30 + (14 if k % 2 == 0 else 0))
    # glockenspiel motivo
    mot = [('E',6),('G',6),('E',6),('D',6)] if b % 2 == 0 else [('C',6),('D',6),('E',6),('G',5)]
    for k, (nm, o) in enumerate(mot):
        note(GLK, p(nm,o), t0 + k*beat, beat*0.8, 52)

# ---------- C: emoção (cena 11), Fá -> Sol -> Dó ----------
C_chords = [('F',['F','A','C']), ('D',['D','F','A']), ('G',['G','B','D']), ('C',['C','E','G'])]
nb, beat = fit(tC, tD, 64)
bar = 4*beat
for b in range(nb):
    root, tones = C_chords[min(b, 3) if nb <= 4 else b % 4]
    t0 = tC + b*bar
    note(PIANO, p(root,2), t0, bar, 70); note(PIANO, p(root,3), t0, bar, 56)
    for i, tn in enumerate(tones + [tones[0]]):
        note(PIANO, p(tn,4) if i < 3 else p(tn,5), t0 + i*beat, beat*1.8, 52)
    for tn in tones:
        note(STR, p(tn,4), t0, bar, 58 + b*6)
        note(STR, p(tn,3), t0, bar, 50 + b*6)
    note(CHOIR, p(tones[2],4), t0, bar, 40 + b*6)
    melC = [('C',6),('A',5),('B',5),('C',6)]
    note(PIANO, p(*melC[b % 4]), t0 + 2*beat, 2*beat*0.95, 66)

# ---------- D: final festivo — Jingle Bells (James Lord Pierpont, 1857, domínio público) ----------
nb_target = 8
dur = tEnd - tD
beat = (dur - 2.5) / (nb_target*4)   # reserva ~2,5 s para o acorde final soar
bar = 4*beat
JB = [  # (nota, oitava, beats)
 ('E',5,1),('E',5,1),('E',5,2), ('E',5,1),('E',5,1),('E',5,2), ('E',5,1),('G',5,1),('C',5,1.5),('D',5,0.5), ('E',5,4),
 ('F',5,1),('F',5,1),('F',5,1),('F',5,1), ('F',5,1),('E',5,1),('E',5,1),('E',5,0.5),('E',5,0.5), ('G',5,1),('G',5,1),('F',5,1),('D',5,1), ('C',5,4)]
JB_ch = ['C','C','C','C','F','C','G','C']
t = tD
for nm, o, d in JB:
    note(GLK, p(nm,o+1), t, d*beat*0.9, 78)
    note(PIANO, p(nm,o), t, d*beat*0.9, 82)
    t += d*beat
chord_tones = {'C':['C','E','G'], 'F':['F','A','C'], 'G':['G','B','D']}
for b in range(nb_target):
    rt = JB_ch[b]; t0 = tD + b*bar
    for k in range(4):
        note(PIZ, p(rt,3) if k % 2 == 0 else p(chord_tones[rt][2],2), t0 + k*beat, beat*0.5, 76)
        for tn in chord_tones[rt]:
            note(PIANO, p(tn,4), t0 + k*beat + beat/2, beat*0.35, 50)
    for tn in chord_tones[rt]:
        note(STR, p(tn,4), t0, bar, 58)
    for k in range(8):
        note(BELL, 83, t0 + k*beat/2, 0.1, 64 if k % 2 == 0 else 44)
# acorde final
tf = tD + nb_target*bar
for tn, o in [('C',2),('C',3),('G',3),('C',4),('E',4),('G',4),('C',5)]:
    note(PIANO, p(tn,o), tf, 2.4, 80)
    note(STR, p(tn,o+1), tf, 2.4, 62)
note(GLK, p('C',7), tf, 2.0, 80); note(CEL, p('G',6), tf+0.12, 2.0, 70); note(CEL, p('C',7), tf+0.24, 2.0, 70)
note(BELL, 83, tf, 0.2, 80)

# ---------- escrever MIDI (tempo fixo 120bpm => 1 beat = 0.5 s) ----------
tr = mido.MidiTrack(); mid.tracks.append(tr)
tr.append(mido.MetaMessage('set_tempo', tempo=500000))
events.sort(key=lambda e: (e[0], 0 if e[1].type != 'note_on' else 1))
last = 0
for ts, msg in events:
    tick = int(round(ts * 2 * PPQ))
    tr.append(msg.copy(time=max(0, tick - last))); last = max(last, tick)
mid.save(out)
print('ok', out, 'dur', tEnd)
