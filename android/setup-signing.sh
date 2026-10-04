#!/usr/bin/env bash
set -euo pipefail
umask 077
repo='abdallrahimbirekdar-rgb/beep-beep-daraya'
command -v gh >/dev/null || { echo 'GitHub CLI (gh) is required.'; exit 1; }
command -v keytool >/dev/null || { echo 'Java keytool is required.'; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'Sign in with gh auth login first.'; exit 1; }
backup_dir="${DARAYA_SIGNING_BACKUP_DIR:-$HOME/daraya-signing-backup}"
mkdir -p "$backup_dir"
key_file="$backup_dir/daraya-release.jks"
password_file="$backup_dir/keystore-password.txt"
if [ -f "$key_file" ] || [ -f "$password_file" ]; then
  [ -s "$key_file" ] && [ -s "$password_file" ] || { echo 'Incomplete backup; restore it before continuing.'; exit 1; }
else
  command -v openssl >/dev/null || { echo 'OpenSSL is required.'; exit 1; }
  openssl rand -hex 32 > "$password_file"
  export DARAYA_KEY_PASSWORD
  DARAYA_KEY_PASSWORD="$(cat "$password_file")"
  keytool -genkeypair -keystore "$key_file" -storetype JKS -alias daraya-release \
    -storepass:env DARAYA_KEY_PASSWORD -keypass:env DARAYA_KEY_PASSWORD \
    -keyalg RSA -keysize 3072 -validity 10000 \
    -dname 'CN=Souq Daraya, O=Souq Daraya, C=DE' >/dev/null 2>&1
fi
export DARAYA_KEY_PASSWORD
DARAYA_KEY_PASSWORD="$(cat "$password_file")"
keytool -list -keystore "$key_file" -alias daraya-release -storepass:env DARAYA_KEY_PASSWORD >/dev/null 2>&1
base64 < "$key_file" | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$repo"
printf '%s' "$DARAYA_KEY_PASSWORD" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$repo"
printf '%s' 'daraya-release' | gh secret set ANDROID_KEY_ALIAS --repo "$repo"
printf '%s' "$DARAYA_KEY_PASSWORD" | gh secret set ANDROID_KEY_PASSWORD --repo "$repo"
unset DARAYA_KEY_PASSWORD
echo "Signing secrets saved. Keep a secure, permanent copy of this folder: $backup_dir"
echo 'Do not delete the backup or replace the key. If using Codespaces, download the backup before deleting the Codespace.'
