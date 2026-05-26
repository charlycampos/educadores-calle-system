import os

client_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client"

for root, dirs, files in os.walk(client_dir):
    # Check for dist, build, public, or build-like folders
    if any(p in root.lower() for p in ["node_modules", ".git", "venv", "__pycache__"]):
        continue
    for file in files:
        if file.endswith(".js") or file.endswith(".map"):
            full_path = os.path.join(root, file)
            size = os.path.getsize(full_path)
            if size > 10000: # only print large files
                print(f"Found build file: {full_path} | Size: {size} bytes")
