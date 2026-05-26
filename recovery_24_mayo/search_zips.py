import os

search_paths = [
    r"D:\Usuarios\ccampos\Downloads",
    r"D:\Usuarios\ccampos\Documents",
    r"D:\Usuarios\ccampos\Desktop"
]

print("Searching for backup archive files...")
for base in search_paths:
    if os.path.exists(base):
        for root, dirs, files in os.walk(base):
            if any(p in root.lower() for p in ["node_modules", ".git", "venv", "__pycache__"]):
                continue
            for file in files:
                if any(ext in file.lower() for ext in [".zip", ".rar", ".7z", ".tar.gz"]):
                    if "calle" in file.lower() or "educa" in file.lower() or "system" in file.lower():
                        full_path = os.path.join(root, file)
                        print(f"Found archive: {full_path} | Size: {os.path.getsize(full_path)} bytes")
