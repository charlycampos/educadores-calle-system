import os

root_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system"

for root, dirs, files in os.walk(root_dir):
    for d in dirs:
        if "history" in d.lower() or "backup" in d.lower() or "cache" in d.lower():
            print(f"Found directory: {os.path.join(root, d)}")
