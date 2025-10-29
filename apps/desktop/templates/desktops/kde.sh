#!/bin/bash
# KDE Plasma Desktop Startup Script

echo "Starting KDE Plasma Desktop Environment..."

# Disable screen locking
kwriteconfig5 --file kscreenlockerrc --group Daemon --key Autolock false 2>/dev/null || true
kwriteconfig5 --file kscreenlockerrc --group Daemon --key LockOnResume false 2>/dev/null || true

# Disable power management
kwriteconfig5 --file powermanagementprofilesrc --group AC --group SuspendSession --key idleTime 0 2>/dev/null || true
kwriteconfig5 --file powermanagementprofilesrc --group AC --group SuspendSession --key suspendType 0 2>/dev/null || true

# Disable Akonadi (PIM data indexing service)
mkdir -p "${HOME}/.config/akonadi"
cat > "${HOME}/.config/akonadi/akonadiserverrc" << 'EOF'
[%General]
SizeThreshold=0
EOF

# Remove any preconfigured monitors
if [[ -f "${HOME}/.local/share/kscreen/" ]]; then
  rm -rf "${HOME}/.local/share/kscreen/"
fi

# Disable some startup services
AUTOSTART="${HOME}/.config/autostart"
mkdir -p "${AUTOSTART}"

for service in "baloo_file" "krunner" "gmenudbusmenuproxy" "geoclue-demo-agent" \
               "org.kde.plasmashell" "polkit-kde-authentication-agent-1"; do
  if [[ -f "/etc/xdg/autostart/${service}.desktop" ]]; then
    cat "/etc/xdg/autostart/${service}.desktop" <(echo "Hidden=true") > "${AUTOSTART}/${service}.desktop"
  fi
done

# Configure Konsole to use login shell
mkdir -p "${HOME}/.local/share/konsole"
cat > "${HOME}/.local/share/konsole/Shell.profile" << 'EOF'
[General]
Command=/bin/bash -l
Name=Shell
Parent=FALLBACK/
EOF

echo "Launching KDE Plasma session..."
# Start up KDE desktop
startkde

