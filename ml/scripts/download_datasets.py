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
    ],
    "trec05": [
        [
            "https://plg.uwaterloo.ca/~gvcormac/treccorpus/trec05p-1.tgz",
            "https://www.kaggle.com/api/v1/datasets/download/rtatman/fraudulent-email-corpus/trec05p-1.tgz" # Placeholder kaggle URL, we might need a better direct link if this fails
        ]
    ],
    "trec06": [
        [
            "https://plg.uwaterloo.ca/~gvcormac/treccorpus06/trec06p.tgz",
            "https://www.kaggle.com/api/v1/datasets/download/rtatman/fraudulent-email-corpus/trec06p.tgz"
        ]
    ],
}

def setup_directories():
    """Create the required directories under ml/data/raw/"""
    directories = ["spamassassin", "enron", "nazario_phishing", "trec05", "trec06"]
    for d in directories:
        dir_path = DATA_DIR / d
        dir_path.mkdir(parents=True, exist_ok=True)
        logging.info(f"Ensured directory exists: {dir_path}")

def download_file(url_or_urls, dest_path):
    """Download a file, trying multiple URLs if provided as a list."""
    if dest_path.exists():
        logging.info(f"File already exists (skipping): {dest_path.name}")
        return

    urls = url_or_urls if isinstance(url_or_urls, list) else [url_or_urls]
    
    for url in urls:
        logging.info(f"Downloading from {url} to {dest_path} ...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
            logging.info(f"Successfully downloaded {dest_path.name}")
            return
        except Exception as e:
            logging.warning(f"Failed to download from {url}: {e}")
            
    # If all URLs fail, give a custom error for Kaggle datasets
    if "kaggle.com" in str(url_or_urls):
        msg = (
            f"\n\n*** MANUAL DOWNLOAD REQUIRED ***\n"
            f"Automated download failed for {dest_path.name}.\n"
            f"The primary server is down, and the Kaggle fallback requires authentication.\n"
            f"Please download it manually from Kaggle and place it at:\n"
            f"{dest_path.absolute()}\n\n"
            f"URL: {urls[-1]}\n"
        )
        raise SystemExit(msg)
    else:
        raise SystemExit(f"Error: All download attempts failed for {dest_path.name}.")

def main():
    logging.info("Starting dataset setup and download...")
    
    setup_directories()

    # Auto-download reliable datasets
    for category, items in DATASETS.items():
        category_dir = DATA_DIR / category
        for item in items:
            # item could be a string URL or a list of URLs
            urls = item if isinstance(item, list) else [item]
            primary_url = urls[0]
            filename = primary_url.split("/")[-1]
            dest_path = category_dir / filename
            download_file(urls, dest_path)

    logging.info("Dataset setup script finished. Run 'python ml/scripts/validate_datasets.py' to verify.")

if __name__ == "__main__":
    main()
