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
    print("Extracting gap views from a1b3d68b...")
    with open(a1b3_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("type") == "VIEW_FILE" and "content" in data:
                    content_str = data["content"]
                    if "NnaCreatePage.tsx" in content_str:
                        lines_dict = parse_view_content(content_str)
                        if lines_dict:
                            overlap = [k for k in lines_dict.keys() if 2200 <= k <= 2390]
                            if overlap:
                                print(f"Line {idx} in transcript | Has {len(overlap)} lines in range [2200, 2390]: Min {min(overlap)}, Max {max(overlap)}")
                                # Print a sample
                                for k in sorted(overlap)[:5]:
                                    print(f"  {k}: {lines_dict[k]}")
                                for k in sorted(overlap)[-5:]:
                                    print(f"  {k}: {lines_dict[k]}")
                                print("-" * 40)
            except Exception as e:
                pass
else:
    print("a1b3d68b transcript not found.")
