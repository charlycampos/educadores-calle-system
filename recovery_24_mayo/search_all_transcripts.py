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
                    if "NnaCreatePage.tsx" in line:
                        matches.append((folder, idx, line[:200]))
                        # Let's check if it has a write_to_file or a tool call with the full file content!
                        if "write_to_file" in line and "CodeContent" in line:
                            print(f"  --> FOUND write_to_file for NnaCreatePage.tsx in {folder} at line {idx}!")

print(f"\nTotal matches: {len(matches)}")
