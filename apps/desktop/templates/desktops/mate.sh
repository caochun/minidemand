#!/bin/bash
# MATE Desktop Startup Script

echo "Starting MATE Desktop Environment..."

# Turn off screensaver (this may not exist at all)
gsettings set org.mate.screensaver idle-activation-enabled false 2>/dev/null || true

# Disable gnome-keyring-daemon
gsettings set org.mate.session gnome-compat-startup "['smproxy']" 2>/dev/null || true

# Remove any preconfigured monitors
if [[ -f "${HOME}/.config/monitors.xml" ]]; then
  mv "${HOME}/.config/monitors.xml" "${HOME}/.config/monitors.xml.bak"
fi

# Disable useless services on autostart
AUTOSTART="${HOME}/.config/autostart"
rm -fr "${AUTOSTART}"    # clean up previous autostarts
mkdir -p "${AUTOSTART}"

for service in "gnome-keyring-gpg" "gnome-keyring-pkcs11" "gnome-keyring-secrets" \
               "gnome-keyring-ssh" "mate-volume-control-applet" \
               "polkit-mate-authentication-agent-1" "pulseaudio" "rhsm-icon" \
               "spice-vdagent" "xfce4-power-manager"; do
  if [[ -f "/etc/xdg/autostart/${service}.desktop" ]]; then
    cat "/etc/xdg/autostart/${service}.desktop" <(echo "X-MATE-Autostart-enabled=false") > "${AUTOSTART}/${service}.desktop"
  fi
done

# Run Mate Terminal as login shell (sets proper TERM)
dconf write /org/mate/terminal/profiles/default/login-shell true 2>/dev/null || true

echo "Launching MATE session..."
# Start up mate desktop (block until user logs out of desktop)
mate-session

