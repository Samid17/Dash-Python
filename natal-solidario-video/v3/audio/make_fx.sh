#!/usr/bin/env bash
# Gera os efeitos do banco do earshot usados no vídeo (sem modelos, sem envio de áudio). Saída: fx/
set -e; mkdir -p fx; cd fx
R() { earshot --threads 1 sfx render "$@" > /dev/null; }
R swipe/cloth -o hand.wav --dur 1.1 --apex 0.35          # mão entrando (cena 4)
R mallet/up4 -o perk.wav --pitch G5                       # orelhas sobem (Sol maior, como "Hope")
for p in G5 B5 D6 E6 Bb5; do R pro_pop/bloop -o pop_$p.wav --pitch $p; done   # corações
R swipe/velvet -o iris.wav --dur 1.2 --apex 0.6           # transições em círculo
for p in G5 D6 Eb6; do R mallet/celesta -o cel_$p.wav --pitch $p; done        # logos
for p in Ab5 C6 Eb6; do R mallet/glock -o glock_$p.wav --pitch $p; done       # chamado (Lá bemol maior)
R pro_pop_in/round -o popin.wav
for p in Ab5 C6 Eb6; do R pro_shimmer/m3 -o shim_$p.wav --pitch $p; R pro_shimmer/m1 -o shimB_$p.wav --pitch $p; done  # fogos
R pro_zip/up -o launch.wav                                # subida dos fogos
R logo_sting/soft_bloom -o title.wav --pitch Ab5          # título
R ui_pop/soft -o rowpop.wav                               # tela final
R pro_shimmer/m3 -o shim_G5.wav --pitch G5                # círculo abre a manhã no abrigo
R notify/m2 -o notify_Ab5.wav --pitch Ab5                 # tela final
R pro_sub_drop/soft -o sub_soft.wav                       # grave sob a virada festiva e o título
