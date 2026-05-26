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

# Load view 250 from 6977
view_250_lines = {}
with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if idx + 1 == 251: # line 251 contains view 250
            data = json.loads(line)
            view_250_lines = parse_view_content(data["content"])

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

print(f"Loaded {len(view_250_lines)} lines from 6977 view 250.")
print(f"Loaded {len(a1b3_latest)} lines from a1b3 latest.")

# Let's find matches
matches = []
for k250, v250 in view_250_lines.items():
    v250_clean = v250.strip()
    if len(v250_clean) > 30 and not v250_clean.startswith("//"):
        # Search in a1b3_latest
        for ka1b3, va1b3 in a1b3_latest.items():
            if va1b3.strip() == v250_clean:
                matches.append((k250, ka1b3, k250 - ka1b3, v250_clean))
                break

print(f"\nFound {len(matches)} exact string matches:")
# Group by shift
shifts = {}
for m in matches:
    shift = m[2]
    shifts[shift] = shifts.get(shift, 0) + 1

for shift, count in sorted(shifts.items(), key=lambda x: x[1], reverse=True):
    print(f"  Shift: {shift} | Count: {count} matches")
    
# Print first 5 matches for the dominant shift
dominant_shift = max(shifts, key=shifts.get) if shifts else 0
print(f"\nDominant shift: {dominant_shift}")
print("Sample matches for dominant shift:")
printed = 0
for m in matches:
    if m[2] == dominant_shift:
        print(f"  6977 line {m[0]} <-> a1b3 line {m[1]} | Code: {m[3][:80]}")
        printed += 1
        if printed >= 5:
            break
