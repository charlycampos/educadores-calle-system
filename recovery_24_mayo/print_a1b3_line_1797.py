import os
import json
import re

a1b3_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

if os.path.exists(a1b3_path):
    print("Extracting Line 1797 view from a1b3d68b...")
    with open(a1b3_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx == 1797:
                try:
                    data = json.loads(line)
                    if data.get("type") == "VIEW_FILE" and "content" in data:
                        content_str = data["content"]
                        lines_dict = parse_view_content(content_str)
                        for k in sorted(lines_dict.keys()):
                            clean_line = lines_dict[k].encode('ascii', errors='replace').decode('ascii')
                            print(f"{k}: {clean_line}")
                except Exception as e:
                    print(f"Error parsing Line 1797: {e}")
else:
    print("a1b3d68b transcript not found.")
