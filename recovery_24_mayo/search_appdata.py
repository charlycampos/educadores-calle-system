import os

appdata_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli"

for root, dirs, files in os.walk(appdata_dir):
    for file in files:
        if "NnaCreatePage" in file:
            full_path = os.path.join(root, file)
            print(f"Found file: {full_path} | Size: {os.path.getsize(full_path)} bytes")
