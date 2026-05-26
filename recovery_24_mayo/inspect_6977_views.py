import os
import json
import re

conv_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"
reconstructed_lines = {}

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

if os.path.exists(conv_path):
    print("Scanning 6977e191 views...")
    with open(conv_path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                if data.get("type") == "VIEW_FILE" and "content" in data:
                    content_str = data["content"]
                    if "NnaCreatePage.tsx" in content_str:
                        lines_dict = parse_view_content(content_str)
                        if lines_dict:
                            min_l = min(lines_dict.keys())
                            max_l = max(lines_dict.keys())
                            print(f"  Line {idx} | View range {min_l} to {max_l} | Count: {len(lines_dict)}")
                            reconstructed_lines.update(lines_dict)
            except Exception as e:
                pass
                
    total_lines = len(reconstructed_lines)
    print(f"\nTotal unique lines in 6977e191: {total_lines}")
    if reconstructed_lines:
        min_line = min(reconstructed_lines.keys())
        max_line = max(reconstructed_lines.keys())
        print(f"Line range: {min_line} to {max_line}")
        
        missing = []
        for i in range(1, max_line + 1):
            if i not in reconstructed_lines:
                missing.append(i)
        if missing:
            print(f"Missing lines: {len(missing)}")
            print(f"First 50 missing: {missing[:50]}")
        else:
            print("PERFECT! 6977e191 has a 100% complete set of views with no gaps!")
else:
    print("6977e191 transcript not found.")
