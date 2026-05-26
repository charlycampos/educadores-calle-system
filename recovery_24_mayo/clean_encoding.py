import os

file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

# Let's read the file as bytes
with open(file_path, 'rb') as f:
    raw_data = f.read()

# Let's decode it as UTF-8, replacing invalid bytes with empty/question mark, or decode as CP1252/latin1
# Since CP1252 decodes everything, let's see:
# If the file was written in CP1252 by python (because windows console default was cp1252),
# let's try decoding as CP1252 and then encoding as UTF-8!
try:
    decoded_cp1252 = raw_data.decode('cp1252')
    print("Decoded CP1252 successfully!")
    
    # Let's fix the specific corrupted words in CP1252 decoded string:
    # "MiǸrcoles" -> "Miércoles"
    # "Sǭbado" -> "Sábado"
    # "cömputo" or similar -> "cómputo"
    # "das" or "dǭas" -> "días"
    # "fsica" or "fǭsica" -> "física"
    # "verificacin" -> "verificación"
    
    replacements = {
        "MiǸrcoles": "Miércoles",
        "Sǭbado": "Sábado",
        "Cmputo": "Cómputo",
        "Cǭmputo": "Cómputo",
        "Das": "Días",
        "Dǭas": "Días",
        "das": "días",
        "dǭas": "días",
        "fsica": "física",
        "fǭsica": "física",
        "verificacin": "verificación",
        "verificaciǭn": "verificación",
        "tutora": "tutoría",
        "tutora": "tutoría"
    }
    
    cleaned_content = decoded_cp1252
    for k, v in replacements.items():
        cleaned_content = cleaned_content.replace(k, v)
        
    # Write back in UTF-8
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(cleaned_content)
    print("Successfully wrote cleaned UTF-8 file!")
except Exception as e:
    print("Error during CP1252 clean:", e)
