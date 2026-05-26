import os
import json

b8bb5bb7_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\b8bb5bb7-90ea-457f-b2eb-33d3a34caf08\.system_generated\logs\transcript_full.jsonl"
baseline_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"
output_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

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

# Stitch them together
final_content = []

# Write lines 1 to 2400 from b8_lines
for i in range(1, 2401):
    final_content.append(b8_lines[i])

# Write lines 2146 to the end from baseline_lines (index 2145 in 0-indexed list)
for line in baseline_lines[2145:]:
    final_content.append(line)

# Save to the final destination file
with open(output_file, 'w', encoding='utf-8') as out_f:
    out_f.write("\n".join(final_content) + "\n")

print("SUCCESSFULLY stitched and saved the perfect restored file!")
print(f"Total lines written: {len(final_content)}")
print(f"File size on disk: {os.path.getsize(output_file)} bytes")
