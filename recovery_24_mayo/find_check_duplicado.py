import os
import json

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"
matches = []

for folder in os.listdir(brain_dir):
    folder_path = os.path.join(brain_dir, folder)
    if os.path.isdir(folder_path):
        transcript_path = os.path.join(folder_path, ".system_generated", "logs", "transcript_full.jsonl")
        if os.path.exists(transcript_path):
            print(f"Searching in transcript: {folder}...")
            with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                for idx, line in enumerate(f):
                    if "checkDuplicadoNna" in line:
                        matches.append((folder, idx, line[:300]))

print(f"\nTotal matches: {len(matches)}")
for m in matches[:30]:
    print(f"Folder: {m[0]} | Line: {m[1]} | Snippet: {m[2]}")
