import os

pure_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_pure_6977.tsx"

if os.path.exists(pure_file):
    with open(pure_file, 'r', encoding='utf-8') as f:
        lines = f.read().splitlines()
        
    print(f"Total lines: {len(lines)}")
    
    # Let's find missing line ranges
    in_gap = False
    gap_start = 0
    gaps = []
    
    for i, line in enumerate(lines):
        if line.startswith("// MISSING LINE"):
            if not in_gap:
                in_gap = True
                gap_start = i + 1
        else:
            if in_gap:
                in_gap = False
                gaps.append((gap_start, i))
                
    if in_gap:
        gaps.append((gap_start, len(lines)))
        
    print(f"Found {len(gaps)} gaps:")
    for gs, ge in gaps:
        print(f"  Gap: {gs} to {ge} | Size: {ge - gs + 1} lines")
else:
    print("Pure file not found.")
