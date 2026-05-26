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
                view_count = 0
                with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line in f:
                        if "VIEW_FILE" in line and "NnaCreatePage.tsx" in line:
                            view_count += 1
                if view_count > 0:
                    print(f"Conv: {conv_id} | Total NnaCreatePage.tsx views: {view_count}")
            except Exception as e:
                pass
else:
    print("Brain directory not found")
