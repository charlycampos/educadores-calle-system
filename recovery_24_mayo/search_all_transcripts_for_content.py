import os
import json

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"

if os.path.exists(brain_dir):
    for conv_id in os.listdir(brain_dir):
        conv_path = os.path.join(brain_dir, conv_id)
        if not os.path.isdir(conv_path):
            continue
        transcript_path = os.path.join(conv_path, ".system_generated", "logs", "transcript_full.jsonl")
        if os.path.exists(transcript_path):
            try:
                with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for idx, line in enumerate(f):
                        if "const DIAS" in line or "diasSet" in line or "actividades.forEach" in line:
                            print(f"Match in Conv: {conv_id} | Line {idx}")
                            # Let's print a small part of this line to see context
                            if len(line) > 1000:
                                print(f"  Line len: {len(line)} | snippet: {line[:500]} ... {line[-500:]}")
                            else:
                                print(f"  Line content: {line.strip()}")
            except Exception as e:
                pass
else:
    print("Brain directory not found")
