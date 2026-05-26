import os

parent_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle"

for root, dirs, files in os.walk(parent_dir):
    # Ignore node_modules, .git, venv, and cache folders
    if any(p in root.lower() for p in ["node_modules", ".git", "venv", "__pycache__"]):
        continue
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".bak") or file.endswith(".tmp"):
            full_path = os.path.join(root, file)
            try:
                if "NnaCreatePage" in file:
                    print(f"Found match by name: {full_path} | Size: {os.path.getsize(full_path)} bytes")
                else:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(1000)
                        if "NnaCreatePage" in content:
                            print(f"Found match by content: {full_path} | Size: {os.path.getsize(full_path)} bytes")
            except Exception as e:
                pass
