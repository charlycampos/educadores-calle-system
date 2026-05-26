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

# Check each view
view_lines = [251, 253, 255, 257]
with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if idx + 1 in view_lines:
            try:
                data = json.loads(line)
                content_str = data["content"]
                lines_dict = parse_view_content(content_str)
                
                # Check shift for this view
                matches = []
                for k69, v69 in lines_dict.items():
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
                    
                dom_shift = max(shifts, key=shifts.get) if shifts else 0
                print(f"View on Line {idx+1} (range {min(lines_dict.keys())}-{max(lines_dict.keys())}):")
                print(f"  Dominant shift: {dom_shift} | Matches: {shifts.get(dom_shift, 0)} out of {len(matches)} total matches")
            except Exception as e:
                print(f"Error for line {idx+1}: {e}")
