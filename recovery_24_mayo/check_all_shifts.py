import os
import json
import re

paths_to_transcripts = {
    "6977": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl",
    "a1b3": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"
}

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

# Load all views after line 2000 in 6977
views_6977 = {}
with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        # We check lines 250, 252, 254, 256 in 6977 (indices 249, 251, 253, 255)
        if idx + 1 in [251, 253, 255, 257]:
            try:
                data = json.loads(line)
                views_6977.update(parse_view_content(data["content"]))
            except:
                pass

# Load latest views from a1b3
a1b3_latest = {}
steps_a1b3 = []
with open(paths_to_transcripts["a1b3"], 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        try:
            steps_a1b3.append(json.loads(line))
        except:
            pass
for step in reversed(steps_a1b3):
    if step.get("type") == "VIEW_FILE" and "content" in step:
        content_str = step["content"]
        if "client/src/features/nna/NnaCreatePage.tsx" in content_str.replace("%20", " ").replace("\\", "/"):
            lines_dict = parse_view_content(content_str)
            for k, v in lines_dict.items():
                if k not in a1b3_latest:
                    a1b3_latest[k] = v

print(f"Loaded {len(views_6977)} lines from 6977's views after line 2800.")
print(f"Loaded {len(a1b3_latest)} lines from a1b3 latest.")

matches = []
for k69, v69 in views_6977.items():
    v69_clean = v69.strip()
    if len(v69_clean) > 30 and not v69_clean.startswith("//"):
        for ka1, va1 in a1b3_latest.items():
            if va1.strip() == v69_clean:
                matches.append((k69, ka1, k69 - ka1))
                break

shifts = {}
for m in matches:
    shift = m[2]
    shifts[shift] = shifts.get(shift, 0) + 1

print("\nShift distribution:")
for shift, count in sorted(shifts.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"  Shift: {shift} | Count: {count} matches")
