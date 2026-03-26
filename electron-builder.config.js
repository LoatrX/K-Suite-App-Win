/**
 * Configuration pour la création de l'installeur Windows (.exe)
 */
module.exports = {
  appId: "ch.schoning.ksuite",
  productName: "K-Suite",
  copyright: "Copyright © 2024 Loatrix",
  directories: {
    output: "dist",
    buildResources: "assets"
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "assets/icons/icon.ico"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: "assets/icons/icon.ico",
    uninstallerIcon: "assets/icons/icon.ico",
    installerHeaderIcon: "assets/icons/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "K-Suite",
    // Utilisation de l'image de fond personnalisée
    installerSidebar: "assets/installer-bg.bmp",
    license: "license.txt"
  }
};