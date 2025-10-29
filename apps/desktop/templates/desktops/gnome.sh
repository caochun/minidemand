#!/bin/bash
# GNOME Desktop Startup Script

echo "Starting GNOME Desktop Environment..."

# Turn off screensaver
gconftool-2 --set -t boolean /apps/gnome-screensaver/idle_activation_enabled false 2>/dev/null || true
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false 2>/dev/null || true

# Use browser window instead in nautilus
gconftool-2 --set -t boolean /apps/nautilus/preferences/always_use_browser true 2>/dev/null || true

# Disable the disk check utility on autostart
mkdir -p "${HOME}/.config/autostart"
if [[ -f "/etc/xdg/autostart/gdu-notification-daemon.desktop" ]]; then
  cat "/etc/xdg/autostart/gdu-notification-daemon.desktop" <(echo "X-GNOME-Autostart-enabled=false") > "${HOME}/.config/autostart/gdu-notification-daemon.desktop"
fi

# Remove any preconfigured monitors
if [[ -f "${HOME}/.config/monitors.xml" ]]; then
  mv "${HOME}/.config/monitors.xml" "${HOME}/.config/monitors.xml.bak"
fi

# GNOME won't start correctly without DBUS_SESSION_BUS_ADDRESS set
if [[ -z "${DBUS_SESSION_BUS_ADDRESS}" ]]; then
  eval $(dbus-launch --sh-syntax)
fi

# Detect OS version and configure session mode
source /etc/os-release 2>/dev/null || true

function classic(){
  export XDG_SESSION_TYPE="${XDG_SESSION_TYPE:-x11}"
  export GNOME_SHELL_SESSION_MODE="${GNOME_SHELL_SESSION_MODE:-classic}"
  export GNOME_SESSION_MODE="${GNOME_SESSION_MODE:-classic}"
}

function wayland() {
  export XDG_SESSION_TYPE="${XDG_SESSION_TYPE:-x11}"
  export GNOME_SHELL_SESSION_MODE="${GNOME_SHELL_SESSION_MODE:-wayland}"
  export GNOME_SESSION_MODE="${GNOME_SESSION_MODE:-wayland}"
}

if [[ "$ID_LIKE" =~ "fedora" ]]; then
  if [[ "$VERSION_ID" < "8.0" ]]; then
    # el7 will crash using wayland
    classic
  else
    wayland
  fi
else
  wayland
fi

echo "Launching GNOME session..."
# Start up Gnome desktop (block until user logs out of desktop)
/etc/X11/xinit/Xsession gnome-session

