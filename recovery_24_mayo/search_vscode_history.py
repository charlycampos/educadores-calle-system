import os

appdata = os.environ.get("APPDATA")
if appdata:
    history_path = os.path.join(appdata, "Code", "User", "History")
    if os.path.exists(history_path):
        print(f"Searching VS Code history at: {history_path}")
        matches = []
        for root, dirs, files in os.walk(history_path):
            for file in files:
                full_path = os.path.join(root, file)
                try:
                    # History entries are stored with random hex names but contain the original content
                    # Let's search for unique NnaCreatePage identifiers
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(2000)
                        if "NnaCreatePage" in content and "form" in content:
                            size = os.path.getsize(full_path)
                            mtime = os.path.getmtime(full_path)
                            matches.append((full_path, size, mtime))
                except Exception as e:
                    pass
        
        # Sort matches by modification time (latest first)
        matches.sort(key=lambda x: x[2], reverse=True)
        for path, size, mtime in matches[:20]:
            from datetime import datetime
            dt = datetime.fromtimestamp(mtime)
            print(f"Found history file: {path} | Size: {size} bytes | Saved: {dt}")
    else:
        print(f"VS Code history path not found: {history_path}")
else:
    print("APPDATA environment variable not found")
