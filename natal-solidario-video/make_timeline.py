"""Gera render/timeline.js.
Modo guia:     python3 make_timeline.py guide
Modo narração: python3 make_timeline.py voice voice_timing.json
  voice_timing.json = {"s1": [inicio_voz, fim_voz], ...} em segundos no arquivo de narração montado,
  junto com "_scene_starts": {"s1": t, ...} (opcional) — ver sync_voice.py.
Saída também em music_bounds.txt (inícios de B, C, D e fim) para compose.py."""
import json, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
SCENES = [
    ("s1", 6.5, ["Neste Natal, o sol *castiga*.", "E tem quem não tenha *pra onde fugir*."]),
    ("s2", 6.0, ["O Caramelo vive na rua.", "A água acabou…", "e o calor *não dá trégua*."]),
    ("s3", 8.0, ["Gente passa o tempo todo…", "e *ninguém para*.", "Mesmo assim, ele ainda espera", "que *alguém se importe*."]),
    ("s4", 9.0, ["Pra muitos animais como ele,", "esse alguém é a *ASPAN*,", "a Associação de Proteção aos Animais,", "que cuida de *mais de 500* cães e gatos."]),
    ("s5", 6.5, ["*Ração*, *remédios*, *banho*, *consultas*…", "e muito *carinho*, todos os dias."]),
    ("s6", 7.0, ["Alguns chegam fracos, doentes,", "*lutando pela vida*.", "E tudo isso *tem um custo*."]),
    ("s7", 6.0, ["Por isso, neste Natal,", "a *Dog Sweet Home*", "abraçou essa causa."]),
    ("s8", 6.5, ["Até *31 de dezembro*, estamos arrecadando", "*ração*, *medicamentos*", "e *produtos de higiene*."]),
    ("s9", 7.5, ["Traga sua doação na Dog Sweet Home,", "em *Capim Macio*.", "Não pode vir?", "A gente *busca na sua casa*."]),
    ("s10", 6.5, ["Prefere doar em dinheiro?", "Faça um *PIX direto para a ASPAN*.", "A chave está aqui na tela."]),
    ("s11", 9.5, ["Pra você, *pode ser pouco*.", "Pra eles…", "pode significar *continuar vivendo*."]),
    ("s12", 7.0, ["*Natal Solidário*:", "Dog Sweet Home e ASPAN.", "Faça parte dessa *corrente do bem*!"]),
    ("s13", 6.0, []),
]

def to_html(s):
    out = []
    for i, part in enumerate(re.split(r"\*", s)):
        cls = "w hl" if i % 2 == 1 else "w"
        for tok in re.split(r"(\s+)", part):
            if not tok:
                continue
            out.append(" " if tok.isspace() else f'<span class="{cls}">{tok}</span>')
    return "".join(out)

def weight(s):
    return len(s.replace("*", "")) + 6

def build(scene_windows, voice_windows=None, chunk_times=None):
    subs = []
    for sid, _, chunks in SCENES:
        if not chunks:
            continue
        a, b = scene_windows[sid]
        if chunk_times and sid in chunk_times:
            for (t0, t1), c in zip(chunk_times[sid], chunks):
                subs.append({"t0": round(t0, 3), "t1": round(t1, 3), "html": to_html(c), "sid": sid})
            continue
        if voice_windows and sid in voice_windows:
            va, vb = voice_windows[sid]
        else:
            va, vb = a + 0.35, b - 0.45
        tot = sum(weight(c) for c in chunks)
        t = va
        for c in chunks:
            d = (vb - va) * weight(c) / tot
            subs.append({"t0": round(t, 3), "t1": round(t + d, 3), "html": to_html(c), "sid": sid})
            t += d
    # mantém cada legenda até a próxima (dentro da cena)
    for i in range(len(subs) - 1):
        if subs[i + 1]["sid"] == subs[i]["sid"]:
            subs[i]["t1"] = subs[i + 1]["t0"]
        else:
            subs[i]["t1"] = min(subs[i]["t1"] + 0.35, scene_windows[subs[i]["sid"]][1] - 0.05)
    total = max(b for a, b in scene_windows.values())
    js = "window.TL=" + json.dumps({"scenes": scene_windows, "subs": subs, "total": total}, ensure_ascii=False) + ";\n"
    open(os.path.join(HERE, "render", "timeline.js"), "w").write(js)
    sw = scene_windows
    bounds = [sw["s7"][0], sw["s11"][0], sw["s12"][0], total]
    open(os.path.join(HERE, "music_bounds.txt"), "w").write(" ".join(f"{x:.3f}" for x in bounds))
    print("total", total, "music", bounds, "subs", len(subs))

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "guide"
    if mode == "guide":
        t = 0.0
        win = {}
        for sid, d, _ in SCENES:
            win[sid] = [round(t, 3), round(t + d, 3)]
            t += d
        build(win)
    else:
        cfg = json.load(open(sys.argv[2]))
        build(cfg["scenes"], cfg.get("voice"), cfg.get("chunks"))
