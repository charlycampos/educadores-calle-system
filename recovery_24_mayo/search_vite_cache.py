import os

vite_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\node_modules\.vite"

if os.path.exists(vite_dir):
    print(f"Searching Vite cache at: {vite_dir}...")
    matches = []
    for root, dirs, files in os.walk(vite_dir):
        for file in files:
            full_path = os.path.join(root, file)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(2000)
                    if "NnaCreatePage" in content or "actividadesTiempoLibreLista" in content:
                        size = os.path.getsize(full_path)
                        print(f"Found in Vite cache: {full_path} | Size: {size} bytes")
                        matches.append(full_path)
            except Exception as e:
                pass
    print(f"Vite cache search complete. Found {len(matches)} files.")
else:
    print("Vite cache folder not found")
