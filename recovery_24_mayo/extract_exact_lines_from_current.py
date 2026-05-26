import os
import json
import re

conv = "ef06d065-2629-43ad-85aa-e97e4e1a41a5"
transcript_path = rf"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\{conv}\.system_generated\logs\transcript_full.jsonl"

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

if os.path.exists(transcript_path):
    print("Extracting correct top lines from current transcript...")
    top_lines = {}
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("type") == "VIEW_FILE" and "content" in data:
                    content_str = data["content"]
                    if "NnaCreatePage.tsx" in content_str:
                        lines_dict = parse_view_content(content_str)
                        # We only want lines < 100
                        for k, v in lines_dict.items():
                            if k < 100:
                                top_lines[k] = v
            except Exception as e:
                pass
                
    for k in sorted(top_lines.keys()):
        print(f"{k}: {top_lines[k]}")
else:
    print("Transcript not found.")
