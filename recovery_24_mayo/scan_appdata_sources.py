import os

appdata_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli"

if os.path.exists(appdata_dir):
    print(f"Scanning AppData for backup source files...")
    matches = []
    for root, dirs, files in os.walk(appdata_dir):
        # Ignore logs and messages folders to keep it clean
        if any(p in root.lower() for p in [".system_generated", "logs", "messages"]):
            continue
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".bak") or file.endswith(".tmp") or file.endswith(".tsx.old"):
                full_path = os.path.join(root, file)
                size = os.path.getsize(full_path)
                print(f"Found source-like file: {full_path} | Size: {size} bytes")
                matches.append(full_path)
    print(f"Total source-like files found: {len(matches)}")
else:
    print("AppData folder not found")
