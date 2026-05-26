import os
import json

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"
matches = []

for folder in os.listdir(brain_dir):
    folder_path = os.path.join(brain_dir, folder)
    if os.path.isdir(folder_path):
        transcript_path = os.path.join(folder_path, ".system_generated", "logs", "transcript_full.jsonl")
        if os.path.exists(transcript_path):
            with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                for idx, line in enumerate(f):
                    if "Homónimos (Comparar)" in line or "Homonimos (Comparar)" in line:
                        matches.append((folder, idx, line))

print(f"\nTotal matches: {len(matches)}")
for m in matches[:10]:
    try:
        data = json.loads(m[2])
        content = data.get("content", "")
        if content:
            content_lines = content.splitlines()
            for c_idx, cl in enumerate(content_lines):
                if "Homónimos (Comparar)" in cl or "Homonimos (Comparar)" in cl:
                    print(f"\nFolder: {m[0]} | Transcript Line: {m[1]} | Content Line: {c_idx}")
                    for offset in range(-20, 20):
                        if 0 <= c_idx + offset < len(content_lines):
                            print(f"  {content_lines[c_idx + offset]}")
                    break
    except Exception as e:
        print(f"Error: {e}")
