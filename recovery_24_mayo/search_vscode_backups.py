import os

appdata = os.environ.get("APPDATA")
if appdata:
    paths_to_check = [
        os.path.join(appdata, "Code", "Backups"),
        os.path.join(appdata, "Code - Insiders", "Backups"),
        os.path.join(os.environ.get("USERPROFILE", ""), ".vscode")
    ]
    
    for base_path in paths_to_check:
        if os.path.exists(base_path):
            print(f"Checking backup path: {base_path}")
            for root, dirs, files in os.walk(base_path):
                for file in files:
                    full_path = os.path.join(root, file)
                    try:
                        # Let's search inside the backup files for NnaCreatePage
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read(1000)
                            if "NnaCreatePage" in content:
                                print(f"Found match: {full_path} | Size: {os.path.getsize(full_path)} bytes")
                    except Exception as e:
                        pass
else:
    print("APPDATA environment variable not found")
