import json
import os

transcript_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain\ef06d065-2629-43ad-85aa-e97e4e1a41a5\.system_generated\logs\transcript_full.jsonl"
file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

replacements = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("source") == "MODEL" and "tool_calls" in data:
                for tc in data["tool_calls"]:
                    if tc.get("name") == "replace_file_content":
                        args = tc.get("args", {})
                        target = args.get("TargetContent")
                        replacement = args.get("ReplacementContent")
                        step = data.get("step_index")
                        replacements[step] = (target, replacement)
        except Exception as e:
            pass

# Let's read current NnaCreatePage.tsx
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Let's perform restoration.
# Step 124 (imports):
target_124, rep_124 = replacements.get(124)
content = content.replace(rep_124, target_124)

# Step 128 (NnaPersonalData interface):
target_128, rep_128 = replacements.get(128)
content = content.replace(rep_128, target_128)

# Step 130 (abrirModalLibre, guardarLibreEnForm, eliminarLibreDelForm):
target_130, rep_130 = replacements.get(130)
content = content.replace(rep_130, target_130)

# Step 134 (useEffect popular):
target_134, rep_134 = replacements.get(134)

# Original CARGAR DATOS was:
original_cargar = """    // CARGAR DATOS SI ES EDICIÓN
    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);"""

# Let's find the start index of either `// CARGAR DATOS SI ES EDICIÓN` or `// POPULAR FORMULARIO CUANDO LLEGAN DATOS`
start_idx = content.find("    // CARGAR DATOS SI ES EDICIÓN")
if start_idx == -1:
    start_idx = content.find("    // POPULAR FORMULARIO CUANDO LLEGAN DATOS")

# Find the end index after `}, [isEditMode, selectedExpediente, reset]);`
end_pattern = "}, [isEditMode, selectedExpediente, reset]);"
end_idx = content.find(end_pattern, start_idx)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_pattern)
    
    # Replacement is original_cargar followed by original_popular (target_134)
    original_popular = target_134.strip()
    replacement = original_cargar + "\n\n" + original_popular
    
    content = content[:start_idx] + replacement + content[end_idx:]
    print("Successfully restored useEffect blocks!")
else:
    print(f"Failed to locate useEffect blocks. start_idx: {start_idx}, end_idx: {end_idx}")

# Write back in UTF-8
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restoration completed successfully!")
