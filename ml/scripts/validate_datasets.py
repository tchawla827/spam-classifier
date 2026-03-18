import os
import sys
from pathlib import Path
import logging

logging.basicConfig(level=logging.ERROR, format='%(levelname)s: %(message)s')

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "ml" / "data" / "raw"

EXPECTED_FILES = {
    "spamassassin": [
        "20021010_easy_ham.tar.bz2",
        "20021010_hard_ham.tar.bz2",
        "20021010_spam.tar.bz2",
        "20030228_easy_ham.tar.bz2",
        "20030228_easy_ham_2.tar.bz2",
        "20030228_hard_ham.tar.bz2",
        "20030228_spam.tar.bz2",
        "20030228_spam_2.tar.bz2",
        "20050311_spam_2.tar.bz2",
    ],
    "enron": [
        "enron_mail_20150507.tar.gz"
    ],
    "nazario_phishing": [
        "phishing-2023",
        "phishing-2024",
        "phishing-2025"
    ]
}

def main():
    print(f"Validating datasets in: {DATA_DIR}")
    
    missing_files = []
    
    # Check if directories and files exist
    for category, filenames in EXPECTED_FILES.items():
        category_dir = DATA_DIR / category
        
        if not category_dir.exists():
            print(f"[FAIL] Missing directory: {category_dir}")
            missing_files.extend([f"{category}/{fname}" for fname in filenames])
            continue
            
        for filename in filenames:
            file_path = category_dir / filename
            if not file_path.exists():
                print(f"[FAIL] Missing file: {file_path}")
                missing_files.append(f"{category}/{filename}")
            else:
                if not file_path.is_file():
                    print(f"[FAIL] Expected file but found directory or other: {file_path}")
                    missing_files.append(f"{category}/{filename}")
                else:
                    print(f"[OK]   Found {category}/{filename}")

    print("\n--- Validation Summary ---")
    if missing_files:
        print(f"FAILED: {len(missing_files)} required file(s) are missing.")
        for mf in missing_files:
            print(f"  - {mf}")
        sys.exit(1)
    else:
        print("SUCCESS: All required datasets and files are present.")
        sys.exit(0)

if __name__ == "__main__":
    main()
