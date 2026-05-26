import os
import json

appdata = os.environ.get("APPDATA")
if appdata:
    history_path = os.path.join(appdata, "Code", "User", "History")
    if os.path.exists(history_path):
        print(f"Searching VS Code history entries for any .tsx files:")
        
        count = 0
        for root, dirs, files in os.walk(history_path):
            if "entries.json" in files:
                entries_file = os.path.join(root, "entries.json")
                try:
                    with open(entries_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        resource = data.get("resource", "")
                        if "educadores-calle-system" in resource and resource.endswith(".tsx"):
                            count += 1
                            print(f"Found history folder: {root} | Resource: {resource}")
                            # Print files in this folder
                            for file in files:
                                if file != "entries.json":
                                    fpath = os.path.join(root, file)
                                    print(f"  Backup File: {file} | Size: {os.path.getsize(fpath)} bytes")
                except Exception as e:
                    pass
        print(f"Total .tsx files in educadores-calle-system found in history: {count}")
    else:
        print("VS Code history path not found")
else:
    print("APPDATA environment variable not found")
