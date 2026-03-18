import os
import sys
import urllib.request
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "ml" / "data" / "raw"

DATASETS = {
    "spamassassin": [
        "https://spamassassin.apache.org/old/publiccorpus/20021010_easy_ham.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20021010_hard_ham.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20021010_spam.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20030228_easy_ham.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20030228_easy_ham_2.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20030228_hard_ham.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20030228_spam.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20030228_spam_2.tar.bz2",
        "https://spamassassin.apache.org/old/publiccorpus/20050311_spam_2.tar.bz2",
    ],
    "enron": [
        "https://www.cs.cmu.edu/~enron/enron_mail_20150507.tar.gz"
    ],
    "nazario_phishing": [
        "https://monkey.org/~jose/phishing/phishing-2023",
        "https://monkey.org/~jose/phishing/phishing-2024",
        "https://monkey.org/~jose/phishing/phishing-2025"
    ]
}

def setup_directories():
    """Create the required directories under ml/data/raw/"""
    directories = ["spamassassin", "enron", "nazario_phishing"]
    for d in directories:
        dir_path = DATA_DIR / d
        dir_path.mkdir(parents=True, exist_ok=True)
        logging.info(f"Ensured directory exists: {dir_path}")

def download_file(url, dest_path):
    """Download a file with a basic progress indicator."""
    if dest_path.exists():
        logging.info(f"File already exists (skipping): {dest_path.name}")
        return

    logging.info(f"Downloading {url} to {dest_path} ...")
    try:
        urllib.request.urlretrieve(url, dest_path)
        logging.info(f"Successfully downloaded {dest_path.name}")
    except Exception as e:
        logging.error(f"Failed to download {url}: {e}")
        # Failure to download an automated file shouldn't silently pass, so we raise
        raise SystemExit(f"Error downloading required file: {e}")

def main():
    logging.info("Starting dataset setup and download...")
    
    setup_directories()

    # Auto-download reliable datasets
    for category, urls in DATASETS.items():
        category_dir = DATA_DIR / category
        for url in urls:
            filename = url.split("/")[-1]
            dest_path = category_dir / filename
            download_file(url, dest_path)

    logging.info("Dataset setup script finished. Run 'python ml/scripts/validate_datasets.py' to verify.")

if __name__ == "__main__":
    main()
