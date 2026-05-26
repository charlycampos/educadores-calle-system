import os
import json

appdata = os.environ.get("APPDATA")
if appdata:
    history_paths = [
        os.path.join(appdata, "Cursor", "User", "History"),
        os.path.join(appdata, "Code", "User", "History"),
        os.path.join(appdata, "Code - Insiders", "User", "History")
    ]
    for hp in history_paths:
        if os.path.exists(hp):
            print(f"Scanning history path: {hp}...")
            count = 0
            found_educadores = []
            for root, dirs, files in os.walk(hp):
                if "entries.json" in files:
                    entries_file = os.path.join(root, "entries.json")
                    try:
                        with open(entries_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            resource = data.get("resource", "")
                            count += 1
                            if "educadores-calle" in resource or "Educadores_calle" in resource:
                                found_educadores.append((root, resource, files))
                    except Exception as e:
                        pass
            print(f"  Total entries in this path: {count}")
            print(f"  Educadores-related entries found: {len(found_educadores)}")
            for root, resource, files in found_educadores:
                print(f"    Folder: {root} | Resource: {resource}")
                for file in files:
                    if file != "entries.json":
                        fpath = os.path.join(root, file)
                        print(f"      File: {file} | Size: {os.path.getsize(fpath)} bytes | mtime: {os.path.getmtime(fpath)}")
else:
    print("APPDATA not found")
