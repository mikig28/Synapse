#!/usr/bin/env python3
"""
Quick installer for missing social media scraper dependencies
"""

import subprocess
import sys
import os

def install_package(package):
    """Install a Python package using pip"""
    try:
        print(f"📦 Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def check_package_installed(package_name):
    """Check if a package is installed"""
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False

def main():
    """Main installation function"""
    print("🔧 Checking and installing missing dependencies for social media scrapers...")
    print("=" * 60)
    
    # Packages to check and install
    packages = {
        'praw': 'praw>=7.0.0',  # Reddit API
        'telegram': 'python-telegram-bot>=20.0',  # Telegram Bot API
        'bs4': 'beautifulsoup4>=4.10.0',  # Web scraping
        'feedparser': 'feedparser>=6.0.0',  # RSS feeds
    }
    
    missing_packages = []
    
    # Check which packages are missing
    for package_import, package_install in packages.items():
        if check_package_installed(package_import):
            print(f"✅ {package_import} is already installed")
        else:
            print(f"❌ {package_import} is NOT installed")
            missing_packages.append(package_install)
    
    if not missing_packages:
        print("\n✅ All dependencies are already installed!")
        return
    
    print(f"\n📋 Missing packages: {', '.join(missing_packages)}")
    print("\n🔄 Installing missing packages...\n")
    
    # Install missing packages
    success_count = 0
    for package in missing_packages:
        if install_package(package):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Installation Summary:")
    print(f"   - Total packages: {len(packages)}")
    print(f"   - Already installed: {len(packages) - len(missing_packages)}")
    print(f"   - Newly installed: {success_count}")
    print(f"   - Failed: {len(missing_packages) - success_count}")
    
    if success_count == len(missing_packages):
        print("\n✅ All missing dependencies have been installed successfully!")
        print("🚀 Social media scrapers should now work properly.")
    else:
        print("\n⚠️ Some installations failed. Please check the error messages above.")
        print("💡 You may need to install them manually or check your Python environment.")

if __name__ == "__main__":
    main() 