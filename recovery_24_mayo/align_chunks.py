import os
import json

b8bb5bb7_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"
baseline_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"

# 1. Load lines 1 to 2400 from b8bb5bb7
b8_lines = {}
def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        import re
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

if os.path.exists(b8bb5bb7_path):
    with open(b8bb5bb7_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get("type") == "VIEW_FILE" and "content" in data:
                    content_str = data["content"]
                    if "NnaCreatePage.tsx" in content_str:
                        lines_dict = parse_view_content(content_str)
                        if lines_dict:
                            b8_lines.update(lines_dict)
            except Exception as e:
                pass

# 2. Load baseline lines
with open(baseline_path, 'r', encoding='utf-8') as f:
    baseline_lines = f.read().splitlines()

print(f"Loaded {len(b8_lines)} lines from b8bb5bb7.")
print(f"Loaded {len(baseline_lines)} lines from baseline.")

# Let's look at the last few lines loaded from b8bb5bb7 in the 2300-2400 range
b8_keys = sorted([k for k in b8_lines.keys() if k >= 2300 and k <= 2400])
print("\nTail of b8bb5bb7 chunk:")
for k in b8_keys[-10:]:
    print(f"  {k}: {b8_lines[k]}")

# Let's search where these lines appear in the baseline
print("\nSearching for matches in baseline...")
for k in b8_keys[-5:]:
    target_text = b8_lines[k].strip()
    if target_text:
        found_at = []
        for b_idx, b_line in enumerate(baseline_lines):
            if b_line.strip() == target_text:
                found_at.append(b_idx + 1)
        print(f"  b8 line {k} matches baseline lines: {found_at}")
