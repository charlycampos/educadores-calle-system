import os
import json

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"

if os.path.exists(brain_dir):
    for root, dirs, files in os.walk(brain_dir):
        for file in files:
            if file.endswith(".jsonl") or file.endswith(".json"):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for idx, line in enumerate(f):
                            if "Actualizar Expediente" in line:
                                print(f"Found in: {full_path} | Line: {idx} | Length: {len(line)}")
                                if len(line) > 50000:
                                    print(f"  This is a very large line! Size: {len(line)} characters. Possible full file!")
                except Exception as e:
                    pass
else:
    print("Brain directory not found")
