import os
import json
import re

paths_to_transcripts = {
    "6977": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\6977e191-0008-4cac-9a52-14638d4e6515\.system_generated\logs\transcript_full.jsonl",
    "a1b3": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"
}

def is_target_content(content):
    if not content:
        return False
    lines = content.splitlines()
    for line in lines[:8]:
        if "File Path:" in line and "client/src/features/nna/NnaCreatePage.tsx" in line.replace("%20", " ").replace("\\", "/"):
            return True
    return False

def parse_view_content(content):
    lines_found = {}
    for line in content.splitlines():
        match = re.match(r"^(\d+):\s(.*)$", line)
        if match:
            line_num = int(match.group(1))
            line_text = match.group(2)
            lines_found[line_num] = line_text
    return lines_found

# 1. Load pristine views from 6977 (before Step 143)
pristine_6977 = {}
if os.path.exists(paths_to_transcripts["6977"]):
    with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if idx + 1 < 143:
                try:
                    data = json.loads(line)
                    if data.get("type") == "VIEW_FILE" and "content" in data:
                        content_str = data["content"]
                        if is_target_content(content_str):
                            pristine_6977.update(parse_view_content(content_str))
                except:
                    pass

# 2. Load latest views from a1b3 (backwards)
latest_a1b3 = {}
if os.path.exists(paths_to_transcripts["a1b3"]):
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
            if is_target_content(content_str):
                lines_dict = parse_view_content(content_str)
                for k, v in lines_dict.items():
                    if k not in latest_a1b3:
                        latest_a1b3[k] = v

# 3. Load all late views from 6977 and unshift them using the dual-shift model
unshifted_late_6977 = {}
with open(paths_to_transcripts["6977"], 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if idx + 1 in [251, 253, 255, 257]: # Views 250, 252, 254, 256
            try:
                data = json.loads(line)
                lines_dict = parse_view_content(data["content"])
                for k, v in lines_dict.items():
                    if 2800 <= k <= 3600:
                        unshifted_line = k - 276
                        unshifted_late_6977[unshifted_line] = v
                    elif k >= 3601:
                        unshifted_line = k - 635
                        unshifted_late_6977[unshifted_line] = v
            except:
                pass

print(f"Pristine 6977 lines: {len(pristine_6977)}")
print(f"Latest a1b3 lines: {len(latest_a1b3)}")
print(f"Unshifted late 6977 lines: {len(unshifted_late_6977)}")

# 4. Merge them into a single 3634-line file
reconstructed = {}
for i in range(1, 3635):
    if i in pristine_6977:
        reconstructed[i] = pristine_6977[i]
    elif i in unshifted_late_6977:
        reconstructed[i] = unshifted_late_6977[i]
    elif i in latest_a1b3:
        reconstructed[i] = latest_a1b3[i]
    else:
        print(f"Line {i} is MISSING!")

missing = [i for i in range(1, 3635) if i not in reconstructed]
if missing:
    print(f"CRITICAL: {len(missing)} missing lines remain: {missing[:30]}...")
else:
    print("EXCELLENT! Reconstructed a perfect pristine 3634-line baseline file with 0 gaps!")
    
    out_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_pristine_3634.tsx"
    with open(out_file, 'w', encoding='utf-8') as f:
        for i in range(1, 3635):
            f.write(reconstructed[i] + "\n")
    print(f"Saved perfect pristine baseline to: {out_file}")
