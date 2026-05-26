import os
import base64
import json

build_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\dist\assets\index-kIVPLx3l.js"

if os.path.exists(build_file):
    print("Checking for inline source map in build bundle...")
    with open(build_file, 'r', encoding='utf-8', errors='ignore') as f:
        # Source maps are usually at the very end of the file
        # Let's read the last 100,000 characters
        f.seek(max(0, os.path.getsize(build_file) - 100000))
        tail = f.read()
        
        sm_pattern = "sourceMappingURL=data:application/json;base64,"
        if sm_pattern in tail:
            print("Found inline source map! Attempting to decode...")
            idx = tail.find(sm_pattern)
            base64_data = tail[idx + len(sm_pattern):].strip()
            # Remove any trailing comments or clean up
            if "/*" in base64_data:
                base64_data = base64_data.split("/*")[0].strip()
            if "*/" in base64_data:
                base64_data = base64_data.split("*/")[0].strip()
            
            try:
                decoded = base64.b64decode(base64_data).decode('utf-8')
                map_json = json.loads(decoded)
                print("Successfully parsed source map JSON!")
                print(f"Sources in map: {len(map_json.get('sources', []))}")
                
                # Check if NnaCreatePage.tsx is in sources
                for s_idx, src in enumerate(map_json.get('sources', [])):
                    if "NnaCreatePage.tsx" in src:
                        print(f"Found NnaCreatePage.tsx in source map at index {s_idx}!")
                        content = map_json.get('sourcesContent', [])[s_idx]
                        if content:
                            print(f"Found sourcesContent! Length: {len(content)} characters.")
                            # Let's write it to a scratch file first
                            out_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\recovered_from_sourcemap.tsx"
                            with open(out_path, 'w', encoding='utf-8') as out_f:
                                out_f.write(content)
                            print(f"SUCCESS! Wrote recovered file to: {out_path}")
            except Exception as e:
                print(f"Error decoding base64 source map: {e}")
        else:
            print("No inline source map pattern found in the bundle tail.")
else:
    print("Build file not found")
