#!/usr/bin/env bash
set -euo pipefail

# Use sudo only if needed
SUDO="sudo"
if [ "$(id -u)" -eq 0 ]; then SUDO=""; fi

echo "==> Cleaning bad autostart lines (ssh in bashrc)..."
$SUDO sed -i '/ssh start/d' /etc/bash.bashrc || true
$SUDO sed -i '/systemctl start ssh/d' /etc/bash.bashrc || true
$SUDO sed -i '/^sudo .*ssh/d' /etc/bash.bashrc || true

echo "==> Ensuring systemd is enabled for WSL..."
# Write minimal wsl.conf with systemd=true (safe to overwrite)
$SUDO tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF

echo "==> Repairing apt lists if corrupted, then updating..."
$SUDO rm -rf /var/lib/apt/lists/* || true
$SUDO mkdir -p /var/lib/apt/lists/partial
$SUDO apt-get clean
# Try normal update first; if it fails, retry with gz-only
if ! $SUDO apt-get update -y; then
  $SUDO rm -f /var/lib/apt/lists/partial/* || true
  $SUDO apt-get -o Acquire::CompressionTypes::Order::=gz update -y
fi

echo "==> Installing prerequisites (OpenSSH server, curl)..."
$SUDO apt-get install -y openssh-server curl

echo "==> Installing Tailscale repo (ok if already present)..."
curl -fsSL https://tailscale.com/install.sh | sh || true

# Detect whether systemd is active in this WSL session
if [ ! -d /run/systemd/system ]; then
  echo
  echo "************************************************************"
  echo " Systemd is not active in this WSL session yet."
  echo " Action required (in Windows PowerShell):"
  echo "     wsl --shutdown"
  echo " Then reopen WSL and run:  bash setup-remote.sh"
  echo "************************************************************"
  exit 0
fi

echo "==> Enabling & starting SSH properly via systemd..."
$SUDO systemctl enable --now ssh

echo "==> Installing Tailscale (if not already) and starting daemon..."
if ! command -v tailscale >/dev/null 2>&1; then
  $SUDO apt-get install -y tailscale
fi
$SUDO systemctl enable --now tailscaled

# Bring this WSL distro onto your tailnet (may prompt browser login)
if ! tailscale status >/dev/null 2>&1; then
  echo "==> Running 'sudo tailscale up' (log in with the SAME account as on your iPhone)..."
  $SUDO tailscale up
fi

echo "==> All set. Here are your key details:"
echo "    - SSH service: $(systemctl is-active ssh)"
echo "    - WSL LAN IP(s): $(hostname -I)"
echo "    - WSL Tailscale IPv4: $(tailscale ip -4 2>/dev/null || echo 'N/A')"
echo
echo "Use this in Termius on iPhone:"
echo "  Hostname:  (the 100.x.x.x shown above from 'tailscale ip -4')"
echo "  Port:      22"
echo "  Username:  your WSL username (run 'whoami' in WSL to confirm)"
echo "  Auth:      SSH key (recommended) or password"
