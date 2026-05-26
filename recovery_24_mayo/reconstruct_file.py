import os
import json
import re

b8bb5bb7_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"
conv_6977_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl"

reconstructed_lines = {}

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        # Line numbers in view_file are like "123: text"
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

# 1. Load views from b8bb5bb7
if os.path.exists(b8bb5bb7_path):
    print("Loading chunks from b8bb5bb7...")
    with open(b8bb5bb7_path, 'r', encoding='utf-8', errors='ignore') as f:
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
                            print(f"  Line {idx} | Loaded lines {min_l} to {max_l}")
                            reconstructed_lines.update(lines_dict)
            except Exception as e:
                pass

# 2. Load views from 6977e191
if os.path.exists(conv_6977_path):
    print("Loading chunks from 6977e191...")
    with open(conv_6977_path, 'r', encoding='utf-8', errors='ignore') as f:
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
                            added_count = 0
                            for k, v in lines_dict.items():
                                if k not in reconstructed_lines:
                                    reconstructed_lines[k] = v
                                    added_count += 1
                            if added_count > 0:
                                print(f"  Line {idx} | Added {added_count} new lines from range {min_l} to {max_l}")
            except Exception as e:
                pass

print(f"\nTotal unique lines reconstructed: {len(reconstructed_lines)}")
if reconstructed_lines:
    min_line = min(reconstructed_lines.keys())
    max_line = max(reconstructed_lines.keys())
    print(f"Line range: {min_line} to {max_line}")
    
    # Check for any missing lines in the sequence
    missing = []
    for i in range(min_line, max_line + 1):
        if i not in reconstructed_lines:
            missing.append(i)
    if missing:
        print(f"WARNING: Missing lines in sequence: {missing[:50]}... (total {len(missing)} missing)")
    else:
        print("EXCELLENT! Reconstructed a perfect sequence with 0 missing lines!")
        # Let's save the reconstructed lines to a file!
        output_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"
        with open(output_file, 'w', encoding='utf-8') as out_f:
            for i in range(1, max_line + 1):
                out_f.write(reconstructed_lines[i] + "\n")
        print(f"SUCCESS! Saved reconstructed file to: {output_file}")
