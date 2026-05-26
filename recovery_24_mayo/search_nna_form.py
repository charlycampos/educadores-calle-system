import json

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"

matches = []

with open(transcript_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if "nnaActualForm" in line:
            matches.append(idx)

print(f"Found matches on lines: {matches}")
