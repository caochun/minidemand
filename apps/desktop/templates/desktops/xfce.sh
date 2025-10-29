#!/bin/bash
# Xfce Desktop Startup Script

echo "Starting Xfce Desktop Environment..."

# Turn off screensaver
xfconf-query -c xfce4-screensaver -p /saver/enabled -n -t bool -s false 2>/dev/null || true
xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/presentation-mode -n -t bool -s true 2>/dev/null || true

# Remove any preconfigured monitors
if [[ -f "${HOME}/.config/monitors.xml" ]]; then
  mv "${HOME}/.config/monitors.xml" "${HOME}/.config/monitors.xml.bak"
fi

# Disable useless services on autostart
AUTOSTART="${HOME}/.config/autostart"
mkdir -p "${AUTOSTART}"

for service in "xfce-polkit" "xfce4-power-manager" "pulseaudio" "gnome-keyring" "light-locker"; do
  if [[ -f "/etc/xdg/autostart/${service}.desktop" ]]; then
    cat "/etc/xdg/autostart/${service}.desktop" <(echo "Hidden=true") > "${AUTOSTART}/${service}.desktop"
  fi
done

# Configure Xfce Terminal to use login shell
if [[ -d "${HOME}/.config/xfce4/terminal" ]]; then
  mkdir -p "${HOME}/.config/xfce4/terminal"
  cat > "${HOME}/.config/xfce4/terminal/terminalrc" << 'EOF'
[Configuration]
CommandLoginShell=TRUE
MiscAlwaysShowTabs=FALSE
MiscBell=FALSE
MiscBordersDefault=TRUE
MiscCursorBlinks=FALSE
MiscCursorShape=TERMINAL_CURSOR_SHAPE_BLOCK
MiscDefaultGeometry=80x24
MiscInheritGeometry=FALSE
MiscMenubarDefault=TRUE
MiscMouseAutohide=FALSE
MiscToolbarDefault=FALSE
MiscConfirmClose=TRUE
MiscCycleTabs=TRUE
MiscTabCloseButtons=TRUE
MiscTabCloseMiddleClick=TRUE
MiscTabPosition=GTK_POS_TOP
MiscHighlightUrls=TRUE
EOF
fi

echo "Launching Xfce session..."
# Start up xfce desktop
startxfce4

