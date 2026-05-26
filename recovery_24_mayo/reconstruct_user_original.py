import os
import json
import re

a1b3_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\a1b3d68b-ca31-4d06-9ce0-a97f9c139adc\.system_generated\logs\transcript_full.jsonl"
dest_file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

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

if os.path.exists(a1b3_path):
    print("Reconstructing user's original file from pre-edit views of a1b3:")
    original_lines = {}
    steps = []
    
    with open(a1b3_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                steps.append(json.loads(line))
            except:
                pass
                
    for idx, step in enumerate(steps):
        # We only look at views before step 179 (Line 178 in transcript)
        if idx + 1 < 178:
            if step.get("type") == "VIEW_FILE" and "content" in step:
                content_str = step["content"]
                if is_target_content(content_str):
                    lines_dict = parse_view_content(content_str)
                    original_lines.update(lines_dict)
                    min_l = min(lines_dict.keys())
                    max_l = max(lines_dict.keys())
                    print(f"  Line {idx+1} | Loaded original view range {min_l} to {max_l} | Size: {len(lines_dict)}")
                    
    total_lines = len(original_lines)
    print(f"\nTotal unique lines in original file: {total_lines}")
    if original_lines:
        max_line = max(original_lines.keys())
        print(f"Line range: 1 to {max_line}")
        
        missing = []
        for i in range(1, max_line + 1):
            if i not in original_lines:
                missing.append(i)
        if missing:
            print(f"WARNING: {len(missing)} missing lines remain: {missing[:30]}...")
            
            # Save it with placeholders
            out_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_original_with_gaps.tsx"
            with open(out_file, 'w', encoding='utf-8') as f:
                for i in range(1, max_line + 1):
                    f.write(original_lines.get(i, f"// MISSING LINE {i}") + "\n")
            print(f"Saved incomplete original to {out_file}")
        else:
            print("EXCELLENT! Reconstructed the COMPLETE uncorrupted original file from the user's codebase!")
            out_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_original_clean.tsx"
            with open(out_file, 'w', encoding='utf-8') as f:
                for i in range(1, max_line + 1):
                    f.write(original_lines[i] + "\n")
            print(f"Saved complete original to {out_file}")
else:
    print("a1b3 transcript not found.")
